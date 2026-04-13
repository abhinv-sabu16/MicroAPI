FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y git wget && corepack enable

FROM base AS development
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/user-service/package.json ./apps/user-service/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1
COPY packages/shared ./packages/shared
COPY apps/user-service ./apps/user-service
RUN pnpm --filter @repo/shared build
EXPOSE 5002
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:5002/health || exit 1
CMD ["pnpm", "--filter", "@repo/user-service", "run", "dev"]

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/user-service ./apps/user-service
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --child-concurrency 1
RUN pnpm --filter @repo/shared build
RUN pnpm --filter @repo/user-service build

FROM base AS production
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/user-service/dist ./apps/user-service/dist
COPY --from=build /app/apps/user-service/package.json ./apps/user-service/package.json
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 usersvc
USER usersvc
EXPOSE 5002
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:5002/health || exit 1
CMD ["node", "apps/user-service/dist/index.js"]
