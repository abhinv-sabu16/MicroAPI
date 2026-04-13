import fp from 'fastify-plugin';
/**
 * Request Context Plugin
 */
export const requestContextPlugin = fp(async (server) => {
    // ── Incoming request: extract / generate IDs ──────────────────────────
    server.addHook('onRequest', async (request, reply) => {
        const requestId = request.headers['x-request-id'] ?? request.id;
        const correlationId = request.headers['x-correlation-id'] ?? requestId;
        request.requestId = requestId;
        request.correlationId = correlationId;
        void reply.header('X-Request-ID', requestId);
        void reply.header('X-Correlation-ID', correlationId);
        request.log = request.log.child({ requestId, correlationId });
    });
    // ── Request logging: start ────────────────────────────────────────────
    server.addHook('onRequest', async (request) => {
        request.startTime = Date.now();
        request.log.info({
            method: request.method,
            url: request.url,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
        }, 'Incoming request');
    });
    // ── Pre-serialization: add timing headers ────────────────────────────
    server.addHook('onSend', async (request, reply, _payload) => {
        const durationMs = Date.now() - (request.startTime ?? Date.now());
        void reply.header('Server-Timing', `total;dur=${durationMs}`);
    });
    // ── Response logging: duration + status ───────────────────────────────
    server.addHook('onResponse', async (request, reply) => {
        const durationMs = Date.now() - (request.startTime ?? Date.now());
        const logMethod = reply.statusCode >= 500
            ? 'error'
            : reply.statusCode >= 400
                ? 'warn'
                : 'info';
        request.log[logMethod]({
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            durationMs,
            contentLength: reply.getHeader('content-length'),
        }, 'Request completed');
    });
}, {
    name: 'request-context-plugin',
    fastify: '4.x',
});
