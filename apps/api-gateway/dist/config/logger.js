import { env } from './env.js';
/**
 * Pino logger configuration.
 */
export function buildLoggerConfig() {
    if (env.NODE_ENV === 'test') {
        return { level: 'silent' };
    }
    const base = {
        level: env.LOG_LEVEL,
        base: {
            service: 'api-gateway',
            environment: env.NODE_ENV,
            version: process.env['npm_package_version'] ?? '1.0.0',
        },
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        serializers: {
            req(request) {
                return {
                    method: request.method,
                    url: request.url,
                    hostname: request.hostname,
                    remoteAddress: request.remoteAddress,
                    remotePort: request.remotePort,
                };
            },
            res(reply) {
                return { statusCode: reply.statusCode };
            },
        },
        redact: {
            paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.token',
                'req.body.refreshToken',
                '*.password',
                '*.secret',
                '*.token',
            ],
            censor: '[REDACTED]',
        },
    };
    if (env.NODE_ENV === 'development') {
        return {
            ...base,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss.l',
                    ignore: 'pid,hostname,service,environment,version',
                    messageFormat: '{msg} [requestId={requestId}]',
                    errorLikeObjectKeys: ['err', 'error'],
                    singleLine: false,
                },
            },
        };
    }
    return base;
}
