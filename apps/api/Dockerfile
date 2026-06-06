# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=@barokah/api --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
RUN npm run build --workspace=@barokah/shared
RUN npm run build --workspace=@barokah/database
RUN npm run build --workspace=@barokah/api

FROM builder AS migrator
WORKDIR /app/packages/database
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_DATABASE\" = \"true\" ]; then npx tsx prisma/seed.ts; fi"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/database ./packages/database
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]
