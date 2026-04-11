"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const env_js_1 = require("./config/env.js");
const health_js_1 = require("./routes/health.js");
async function buildServer() {
    const server = (0, fastify_1.default)({
        logger: {
            level: env_js_1.env.LOG_LEVEL,
            ...(env_js_1.env.NODE_ENV === 'development' && {
                transport: {
                    target: 'pino-pretty',
                    options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
                },
            }),
        },
        // Attach a unique request ID to every request for tracing
        genReqId: () => crypto.randomUUID(),
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'requestId',
        trustProxy: true, // Respect X-Forwarded-* headers from Nginx
    });
    // ── Plugins (Day 2 will add cors, helmet, rate-limit) ─────────────────
    await server.register(import('@fastify/sensible'));
    // ── Routes ────────────────────────────────────────────────────────────
    await server.register(health_js_1.healthRoutes);
    // ── 404 handler ───────────────────────────────────────────────────────
    server.setNotFoundHandler((request, reply) => {
        void reply.code(404).send({
            status: 'error',
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${request.method} ${request.url} not found`,
            requestId: request.id,
        });
    });
    // ── Global error handler ───────────────────────────────────────────────
    server.setErrorHandler((error, request, reply) => {
        server.log.error({ err: error, requestId: request.id }, 'Unhandled error');
        const statusCode = error.statusCode ?? 500;
        void reply.code(statusCode).send({
            status: 'error',
            code: error.code ?? 'INTERNAL_SERVER_ERROR',
            message: env_js_1.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
            requestId: request.id,
        });
    });
    return server;
}
