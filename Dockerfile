FROM node:20.12-alpine3.18 AS base

ENV NODE_ENV=production

RUN addgroup --system remix --gid 1001 && \
    adduser --system remix --uid 1001 --ingroup remix

# Dependencies installation
FROM base AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

# Production dependencies installation
FROM base AS prod-deps

WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json ./
RUN npm prune --omit=dev

# Building the application
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

ADD prisma .
RUN npx prisma generate

ADD . .
RUN npm run build

# Final stage
FROM base AS runner
USER remix:remix

WORKDIR /app
COPY --from=prod-deps --chown=remix:remix /app/node_modules node_modules
COPY --from=builder --chown=remix:remix /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder --chown=remix:remix /app/build ./build
COPY --from=builder --chown=remix:remix /app/public ./public
COPY --from=builder --chown=remix:remix /app/package*.json ./
COPY --from=builder --chown=remix:remix /app/prisma ./

ENTRYPOINT ["npm", "run", "docker-start"]
