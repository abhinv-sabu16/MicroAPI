import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';
/**
 * Helmet Plugin — sets HTTP security headers on every response.
 *
 * Headers applied:
 *  Content-Security-Policy   — restricts resource loading origins
 *  Strict-Transport-Security — forces HTTPS (production only)
 *  X-Content-Type-Options    — prevents MIME sniffing
 *  X-Frame-Options           — clickjacking protection
 *  X-XSS-Protection          — legacy XSS filter (belt-and-suspenders)
 *  Referrer-Policy           — controls Referer header leakage
 *  Permissions-Policy        — disables unused browser features
 *
 * In development the CSP is relaxed to allow easier debugging.
 * In production it is strict — adjust `scriptSrc` if you add
 * external JS (CDN, analytics, etc.) to the gateway's admin UI.
 */
export const helmetPlugin = fp(async (server) => {
    const isProd = env.NODE_ENV === 'production';
    await server.register(helmet, {
        // Content-Security-Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'none'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: isProd ? [] : null,
            },
        },
        // HSTS — only meaningful in production behind TLS
        strictTransportSecurity: isProd
            ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
            : false,
        // Prevent MIME type sniffing
        xContentTypeOptions: true,
        // Clickjacking — deny all framing
        frameguard: { action: 'deny' },
        // Referrer policy — don't leak origin in cross-origin requests
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        // Hide the X-Powered-By: Fastify header
        hidePoweredBy: true,
        // Cross-Origin-Embedder-Policy — isolate browsing context
        crossOriginEmbedderPolicy: isProd,
        // Cross-Origin-Opener-Policy
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        // Cross-Origin-Resource-Policy
        crossOriginResourcePolicy: { policy: 'same-site' },
    });
    // Permissions-Policy — disable unused browser APIs
    // (Helmet doesn't set this natively yet — add it manually)
    server.addHook('onSend', async (_request, reply) => {
        void reply.header('Permissions-Policy', [
            'accelerometer=()',
            'camera=()',
            'geolocation=()',
            'gyroscope=()',
            'magnetometer=()',
            'microphone=()',
            'payment=()',
            'usb=()',
        ].join(', '));
    });
    server.log.info('Helmet security headers plugin registered');
}, {
    name: 'helmet-plugin',
    fastify: '4.x',
});
