FROM node:24.18.0-alpine3.23 AS base
ENV PNPM_HOME="/pnpm"
RUN corepack enable

# Runtime only needs the Node binary and its C++ standard library. Keep package
# managers in the builder image so they are not shipped with the application.
FROM alpine:3.23 AS runtime-base
RUN apk add --no-cache libstdc++
COPY --from=base /usr/local/bin/node /usr/local/bin/node


# All deps stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN node ace build

# Production stage
FROM runtime-base
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app
EXPOSE 8080
CMD ["node", "./bin/server.js"]
