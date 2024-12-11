FROM node:lts-alpine3.20 AS base
ENV PNPM_HOME="/pnpm"
RUN corepack enable

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json pnpm-lock.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
ADD package.json pnpm-lock.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN node ace build

# Production stage
FROM base
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app
EXPOSE 8080
CMD ["node", "./bin/server.js"]
