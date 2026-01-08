FROM node:jod-trixie-slim

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ curl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
