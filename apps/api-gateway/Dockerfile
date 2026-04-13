# Base image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Development stage
FROM base AS development
WORKDIR /app

# Copy configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api-gateway/package.json ./apps/api-gateway/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api-gateway ./apps/api-gateway

# Build shared package first
RUN pnpm --filter @repo/shared build

# Start the application
WORKDIR /app/apps/api-gateway
CMD ["pnpm", "run", "dev"]

# Production stage
FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/api-gateway ./apps/api-gateway
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1
RUN pnpm --filter @repo/shared build
RUN pnpm --filter api-gateway build

FROM base AS deploy
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=build /app/apps/api-gateway/package.json ./apps/api-gateway/package.json

EXPOSE 5000
CMD ["node", "apps/api-gateway/dist/index.js"]
