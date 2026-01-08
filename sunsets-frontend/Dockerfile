# Stage 1: Build
FROM node:jod-trixie-slim AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# Installing pnpm
RUN npm install -g pnpm
RUN pnpm install

COPY . .

RUN pnpm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
