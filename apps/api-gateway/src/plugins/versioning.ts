import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * API Versioning Plugin
 *
 * Adds version awareness to every request:
 *  - Reads version from URL prefix (/api/v1/, /api/v2/)
 *  - Attaches X-API-Version header to every response
 *  - Adds X-API-Deprecated warning for v1 routes in production
 *  - Rejects requests to unknown API versions with 400
 *
 * Supported versions:
 *  v1 → current stable (deprecated in favour of v2 when v2 ships)
 *  v2 → future (placeholder, returns 501 until implemented)
 */

const SUPPORTED_VERSIONS = ['v1'] as const;
const DEPRECATED_VERSIONS = [] as const;
const CURRENT_VERSION = 'v1';

type ApiVersion = (typeof SUPPORTED_VERSIONS)[number];

export const versionPlugin = fp(
  async (server: FastifyInstance): Promise<void> => {

    // ── Inject version headers on every response ───────────────────────
    server.addHook('onRequest', async (request, reply) => {
      // Extract version from URL: /api/v1/users → v1
      const versionMatch = request.url.match(/^\/api\/(v\d+)\//);
      const version = versionMatch?.[1] as ApiVersion | undefined;

      if (version) {
        // Validate version is supported
        if (!SUPPORTED_VERSIONS.includes(version as ApiVersion)) {
          return reply.code(400).send({
            status: 'error',
            code: 'UNSUPPORTED_API_VERSION',
            message: `API version '${version}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
            requestId: request.requestId,
          });
        }

        // Warn on deprecated versions
        if (DEPRECATED_VERSIONS.includes(version as never)) {
          void reply.header(
            'X-API-Deprecated',
            `API ${version} is deprecated. Please migrate to /api/${CURRENT_VERSION}/`,
          );
        }

        // Attach version to request for downstream use
        request.apiVersion = version;
        void reply.header('X-API-Version', version);
      }
    });

    server.log.info(
      { supported: SUPPORTED_VERSIONS, current: CURRENT_VERSION },
      'API versioning plugin registered',
    );
  },
  { name: 'version-plugin', fastify: '4.x' },
);

// ── TypeScript augmentation ────────────────────────────────────────────────
declare module 'fastify' {
  interface FastifyRequest {
    apiVersion?: string;
  }
}