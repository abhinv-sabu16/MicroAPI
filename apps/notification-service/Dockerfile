FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y git wget && corepack enable

FROM base AS development
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/notification-service/package.json ./apps/notification-service/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1
COPY packages/shared ./packages/shared
COPY apps/notification-service ./apps/notification-service
RUN pnpm --filter @repo/shared build
EXPOSE 5003
CMD ["pnpm", "--filter", "@repo/notification-service", "run", "dev"]

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/notification-service ./apps/notification-service
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1
RUN pnpm --filter @repo/shared build
RUN pnpm --filter @repo/notification-service build

FROM base AS production
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/notification-service/dist ./apps/notification-service/dist
COPY --from=build /app/apps/notification-service/package.json ./apps/notification-service/package.json
EXPOSE 5003
CMD ["node", "apps/notification-service/dist/index.js"]
