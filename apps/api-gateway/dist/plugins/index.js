/**
 * Plugin registration barrel.
 *
 * ORDER MATTERS in Fastify — plugins decorate the instance in sequence.
 * The dependency graph here is:
 *
 *   sensible       (no deps — pure decorators)
 *     ↓
 *   helmet         (no deps — sets response headers)
 *     ↓
 *   cors           (no deps — sets response headers)
 *     ↓
 *   requestContext (depends on: Fastify's genReqId being set)
 *
 * Future plugins added here:
 *   Day 8  → rateLimit  (depends on: Redis client)
 *   Day 13 → metrics    (depends on: Prometheus client)
 *   Day 15 → tracing    (depends on: OpenTelemetry SDK)
 */
export { sensiblePlugin } from './sensible.js';
export { helmetPlugin } from './helmet.js';
export { corsPlugin } from './cors.js';
export { requestContextPlugin } from './request-context.js';
