# Production image for the fully-containerized stack — built and run by
# docker-compose.yml, orchestrated by the Makefile (`make`). This is a
# container-based deployment path in addition to the Vercel path described
# in docs/architecture.md §18 (Vercel doesn't use this file).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Full node_modules (not just the standalone trace) so the Prisma CLI is
# available at startup to run migrations before the server starts.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

# Applies any pending migrations, then serves the already-built production
# app — idempotent, so this is safe to run on every container start.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
