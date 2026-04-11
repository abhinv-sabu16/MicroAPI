"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const env_js_1 = require("../config/env.js");
async function healthRoutes(server, _options) {
    /**
     * GET /health
     * Basic liveness probe — just confirms the process is running.
     * Kubernetes uses this: if it fails, the pod is restarted.
     */
    server.get('/health', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
                        service: { type: 'string' },
                        version: { type: 'string' },
                        environment: { type: 'string' },
                        timestamp: { type: 'string' },
                        uptime: { type: 'number' },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        return reply.code(200).send({
            status: 'ok',
            service: 'api-gateway',
            version: process.env['npm_package_version'] ?? '1.0.0',
            environment: env_js_1.env.NODE_ENV,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
        });
    });
    /**
     * GET /health/ready
     * Readiness probe — confirms the service is ready to accept traffic.
     * Kubernetes uses this: if it fails, the pod is removed from the load balancer.
     * Day 18 will add Redis + upstream service checks here.
     */
    server.get('/health/ready', {
        schema: {},
    }, async (_request, reply) => {
        // Placeholder — Day 18 adds real dependency checks (Redis, circuit breakers)
        const checks = {
            redis: 'pending', // will be wired on Day 8
            upstreamServices: 'pending', // will be wired on Day 18
        };
        return reply.code(200).send({
            status: 'ok',
            service: 'api-gateway',
            timestamp: new Date().toISOString(),
            checks,
        });
    });
}
