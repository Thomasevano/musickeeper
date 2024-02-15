FROM oven/bun as base
WORKDIR /usr/src/app

# COPY bun.lockb .
# COPY package.json .

# RUN bun install --frozen-lockfile

# COPY . .

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
