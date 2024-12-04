ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-slim AS build

WORKDIR /app

COPY ./src ./src
COPY package*.json ./
COPY tsconfig.json .

RUN set -eux; \
    npm install; \
    npm run build



FROM node:${NODE_VERSION}-slim

WORKDIR /app

COPY package*.json ./
COPY --from=build /app/dist ./dist

RUN set -eux; \
    npm install --omit=dev

CMD ["npm", "start"]
