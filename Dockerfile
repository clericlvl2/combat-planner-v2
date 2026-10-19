# syntax=docker/dockerfile:1

FROM node:24-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.34.7 --activate
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_SOURCE_URL
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/domain/package.json packages/domain/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --prod --filter @combat-planner/server...

FROM node:24-slim AS production
ENV NODE_ENV=production \
  PORT=3000 \
  DATABASE_PATH=/data/combat-planner.db \
  STATIC_ROOT=/app/apps/web/dist
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server ./apps/server
COPY --from=prod-deps /app/packages/api ./packages/api
COPY --from=prod-deps /app/packages/domain ./packages/domain
COPY apps/server/src ./apps/server/src
COPY packages/api/src ./packages/api/src
COPY packages/api/drizzle ./packages/api/drizzle
COPY packages/domain/src ./packages/domain/src
COPY --from=build /app/apps/web/dist ./apps/web/dist
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
WORKDIR /app/apps/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/main.ts"]
