/**
 * Plugin registration barrel.
 *
 * Order:
 *   sensible        → HTTP error helpers
 *   helmet          → security headers
 *   cors            → CORS policy
 *   requestContext  → requestId + timing
 *   rateLimit       → Redis rate limiting  ← Day 8 (before jwt so limits apply to all)
 *   jwt             → authenticate / requireRole decorators
 *   proxy           → upstream service routing
 *
 * Future:
 *   Day 13 → metrics    (Prometheus)
 *   Day 15 → tracing    (OpenTelemetry)
 */
export { sensiblePlugin }       from './sensible.js';
export { helmetPlugin }         from './helmet.js';
export { corsPlugin }           from './cors.js';
export { requestContextPlugin } from './request-context.js';
export { rateLimitPlugin }      from './rate-limit.js';
export { jwtPlugin }            from './jwt.js';
export { proxyPlugin }          from './proxy.js';  