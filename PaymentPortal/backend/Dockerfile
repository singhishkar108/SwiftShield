FROM node:20-alpine

RUN addgroup -S app && adduser -S app -G app
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

RUN apk add --no-cache curl
HEALTHCHECK --interval=5s --timeout=3s --retries=12 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-4001}/health" || exit 1

USER app
CMD ["node", "src/server.js"]
