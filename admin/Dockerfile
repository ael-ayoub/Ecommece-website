FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4322

# -s = SPA fallback: unmatched routes (client-side React Router paths) serve index.html
CMD ["npx", "serve", "-s", "dist", "-l", "4322"]
