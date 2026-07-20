

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN mkdir -p /app/.next /app/uploads && chown -R node:node /app
COPY --chown=node:node . .
USER node
EXPOSE 3000


CMD ["npm", "run", "dev"]
