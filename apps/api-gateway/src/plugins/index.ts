/**
 * Plugin registration barrel.
 *
 * Order is critical in Fastify — each plugin decorates the instance
 * for the ones that follow it.
 *
 *   sensible        → HTTP error helpers (no deps)
 *   helmet          → security headers (no deps)
 *   cors            → CORS policy (no deps)
 *   requestContext  → requestId + timing (no deps)
 *   jwt             → authenticate/requireRole decorators (needs requestContext)
 *
 * Future:
 *   Day 8  → rateLimit  (needs Redis)
 *   Day 13 → metrics    (needs Prometheus)
 *   Day 15 → tracing    (needs OpenTelemetry)
 */
export { sensiblePlugin }       from './sensible.js';
export { helmetPlugin }         from './helmet.js';
export { corsPlugin }           from './cors.js';
export { requestContextPlugin } from './request-context.js';
export { jwtPlugin }            from './jwt.js';