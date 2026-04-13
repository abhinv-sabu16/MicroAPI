# Base image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y git wget && corepack enable

# Development stage (hot-reload)
FROM base AS development
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/auth-service/package.json ./apps/auth-service/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1
COPY packages/shared ./packages/shared
COPY apps/auth-service ./apps/auth-service
RUN pnpm --filter @repo/shared build
EXPOSE 5001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1
CMD ["pnpm", "--filter", "@repo/auth-service", "run", "dev"]

# Build stage
FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/auth-service ./apps/auth-service
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1
RUN pnpm --filter @repo/shared build
RUN pnpm --filter @repo/auth-service build

# Production stage
FROM base AS production
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/auth-service/dist ./apps/auth-service/dist
COPY --from=build /app/apps/auth-service/package.json ./apps/auth-service/package.json
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 authsvc
USER authsvc
EXPOSE 5001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1
CMD ["node", "apps/auth-service/dist/index.js"]
