FROM node:24-trixie-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ curl && \
    corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start"]
