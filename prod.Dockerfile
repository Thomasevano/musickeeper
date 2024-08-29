FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build
FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
EXPOSE 3000
CMD [ "node", "/app/build/index.js" ]

# FROM node:lts-alpine as build

# WORKDIR /app

# COPY ./package*.json ./
# COPY ./pnpm-lock.yaml ./

# RUN npm install -g pnpm

# RUN pnpm install

# COPY . .

# RUN pnpm build

# FROM node:lts-alpine AS production

# WORKDIR /app

# COPY --from=build /app/build .
# COPY --from=build /app/package.json .
# COPY --from=build /app/pnpm-lock.yaml .

# RUN npm install -g pnpm
# RUN pnpm install --frozen-lockfile

# RUN mkdir -p /app/images
# VOLUME /app/images

# EXPOSE 3000

# CMD ["node", "."]
