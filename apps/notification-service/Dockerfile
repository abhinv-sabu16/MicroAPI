# Base image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Development stage
FROM base AS development
WORKDIR /app

# Copy configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/notification-service/package.json ./apps/notification-service/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/notification-service ./apps/notification-service

# Build shared package first
RUN pnpm --filter @repo/shared build

# Start the application
WORKDIR /app/apps/notification-service
CMD ["pnpm", "run", "dev"]

# Production stage
FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared ./packages/shared
COPY apps/notification-service ./apps/notification-service
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @repo/shared build
RUN pnpm --filter notification-service build

FROM base AS deploy
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/notification-service/dist ./apps/notification-service/dist
COPY --from=build /app/apps/notification-service/package.json ./apps/notification-service/package.json

EXPOSE 5003
CMD ["node", "apps/notification-service/dist/index.js"]
