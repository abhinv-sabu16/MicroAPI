import { env } from '../config/env.js';
export async function healthRoutes(server, _options) {
    /**
     * GET /
     * Basic landing info for the API Gateway.
     */
    server.get('/', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        status: { type: 'string' },
                        health: { type: 'string' },
                        timestamp: { type: 'string' },
                        requestId: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        return reply.code(200).send({
            message: 'MicroAPI Gateway is running',
            status: 'ok',
            health: '/health',
            timestamp: new Date().toISOString(),
            requestId: request.requestId,
        });
    });
    /**
     * GET /health
     * Liveness probe — confirms the process is alive.
     * Kubernetes: restarts the pod if this returns non-2xx.
     */
    server.get('/health', {
        schema: {},
    }, async (request, reply) => {
        return reply.code(200).send({
            status: 'ok',
            service: 'api-gateway',
            version: process.env['npm_package_version'] ?? '1.0.0',
            environment: env.NODE_ENV,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            requestId: request.requestId,
        });
    });
    /**
     * GET /health/ready
     * Readiness probe — confirms the service is ready to accept traffic.
     * Day 8  -> adds Redis connectivity check
     * Day 18 -> adds circuit breaker state check
     */
    server.get('/health/ready', {
        schema: {},
    }, async (request, reply) => {
        const checks = {
            redis: 'pending',
            upstreamServices: 'pending',
        };
        const hasError = Object.values(checks).some((v) => v === 'error');
        const status = hasError ? 'error' : 'ok';
        const statusCode = hasError ? 503 : 200;
        return reply.code(statusCode).send({
            status,
            service: 'api-gateway',
            timestamp: new Date().toISOString(),
            requestId: request.requestId,
            checks,
        });
    });
    /**
     * GET /health/metrics
     * Quick Node.js process stats — not the Prometheus endpoint (Day 13).
     */
    server.get('/health/metrics', {
        schema: {},
    }, async (request, reply) => {
        const mem = process.memoryUsage();
        return reply.code(200).send({
            requestId: request.requestId,
            timestamp: new Date().toISOString(),
            process: {
                uptime: Math.floor(process.uptime()),
                pid: process.pid,
                nodeVersion: process.version,
            },
            memory: {
                heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
                rssMb: Math.round(mem.rss / 1024 / 1024),
                externalMb: Math.round(mem.external / 1024 / 1024),
            },
        });
    });
}
