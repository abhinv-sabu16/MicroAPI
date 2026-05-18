# ADR-004: Nginx as Reverse Proxy in Front of Fastify Gateway

**Date:** 2024-04-19
**Status:** Accepted

## Context

The Fastify API Gateway handles business logic (auth, routing, rate limiting).
We need a layer in front of it to handle:
- TLS termination (so Node.js never deals with SSL)
- Static file serving
- Connection-level rate limiting
- Gzip compression
- Access logging in a format ELK can ingest directly

## Decision

Use **Nginx 1.25** as the reverse proxy in front of the Fastify gateway.

## Architecture

```
Internet → Nginx:443 (TLS) → Fastify:5000 → Upstream Services
                ↓
         Access logs → ELK (Day 16)
```

## Two-Layer Rate Limiting

| Layer | Tool | Limit | Purpose |
|---|---|---|---|
| Layer 1 | Nginx | 200 req/min global | Block abuse before Node.js |
| Layer 2 | Fastify | 100 req/min per route | Fine-grained business logic |

Nginx limits are coarser but faster — they reject requests before
any Node.js code runs, saving CPU on obvious abuse patterns.

## Consequences

**Positive:**
- TLS handled outside Node.js — no `https` module complexity
- Nginx serves static assets at ~10x the throughput of Node.js
- Access logs in JSON format ready for Logstash (Day 16)
- `X-Request-ID` threaded from Nginx → Gateway → Services

**Negative:**
- Extra hop adds ~0.1ms latency (negligible)
- Two configs to maintain (nginx.conf + Fastify plugins)

## Alternatives Considered

- **Traefik** — better Kubernetes integration but more complex config
- **Caddy** — automatic HTTPS but less battle-tested at scale
- **AWS ALB** — cloud-native but ties us to AWS