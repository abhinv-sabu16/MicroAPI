import sensible from '@fastify/sensible';
import fp from 'fastify-plugin';
/**
 * Sensible Plugin
 *
 * Adds HTTP error factories to the Fastify instance and reply:
 *   server.httpErrors.notFound('User not found')
 *   reply.badRequest('Invalid input')
 *   reply.unauthorized()
 *   reply.forbidden()
 *   reply.internalServerError()
 *   ... and 40+ more
 *
 * Also adds:
 *   server.assert(condition, statusCode, message) — assertion helper
 *   server.to(promise) — safe promise unwrapping [error, value]
 *
 * Wrapped with fp() so it decorates the root scope, not a child scope.
 */
export const sensiblePlugin = fp(async (server) => {
    await server.register(sensible);
    server.log.info('Sensible HTTP error helpers registered');
}, {
    name: 'sensible-plugin',
    fastify: '4.x',
});
