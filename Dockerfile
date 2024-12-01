ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-slim AS build

WORKDIR /app

COPY ./src ./src
COPY package*.json .
COPY tsconfig.json .

RUN npm install

RUN npm run build



FROM node:${NODE_VERSION}-slim

WORKDIR /app

COPY package*.json .

RUN npm ci --only=production

COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]
