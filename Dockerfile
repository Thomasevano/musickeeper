FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# RUN --mount=type=secret,id=spotify_client_id \
#   SPOTIFY_CLIENT_ID=$(cat /run/secrets/spotify_client_id) \
#   cat $SPOTIFY_CLIENT_ID

# RUN  --mount=type=secret,id=public_spotify_base_url \
#   PUBLIC_SPOTIFY_BASE_URL=$(cat /run/secrets/public_spotify_base_url) \
#   RUN  --mount=type=secret,id=spotify_client_secret \
#   SPOTIFY_CLIENT_SECRET=$(cat /run/secrets/spotify_client_secret) \
#   RUN  --mount=type=secret,id=spotify_basic_token \
#   SPOTIFY_BASIC_TOKEN=$(cat /run/secrets/spotify_basic_token) \
#   RUN  --mount=type=secret,id=vite_base_url \
#   VITE_BASE_URL=$(cat /run/secrets/vite_base_url) \

RUN  --mount=type=secret,id=vite_turso_database_url \
  echo "VITE_TURSO_DATABASE_URL=$(cat /run/secrets/vite_turso_database_url)" >> .env.production

RUN  --mount=type=secret,id=vite_turso_auth_token \
  echo "VITE_TURSO_AUTH_TOKEN=$(cat /run/secrets/vite_turso_auth_token)" >> .env.production

# RUN --mount=type=secret,id=vite_turso_database_url \
#   cat /run/secrets/vite_turso_database_url

RUN pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
EXPOSE 3000
CMD [ "node", "/app/build/index.js" ]
