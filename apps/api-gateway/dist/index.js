"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_js_1 = require("./server.js");
const env_js_1 = require("./config/env.js");
const logger = { info: console.log, error: console.error }; // replaced by Pino Day 2
async function main() {
    const server = await (0, server_js_1.buildServer)();
    try {
        await server.listen({ port: env_js_1.env.GATEWAY_PORT, host: env_js_1.env.GATEWAY_HOST });
        logger.info(`🚀 API Gateway running at http://${env_js_1.env.GATEWAY_HOST}:${env_js_1.env.GATEWAY_PORT}`);
        logger.info(`📋 Environment: ${env_js_1.env.NODE_ENV}`);
    }
    catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = async (signal) => {
        logger.info(`Received ${signal} — shutting down gracefully...`);
        try {
            await server.close();
            logger.info('Server closed. Goodbye.');
            process.exit(0);
        }
        catch (err) {
            logger.error('Error during shutdown:', err);
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
    // ── Unhandled rejection guard ──────────────────────────────────────────
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });
}
void main();
