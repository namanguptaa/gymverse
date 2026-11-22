# GymVerse: self-hosted gym management
# Build: docker build -t gymverse .     Run: docker compose up -d
FROM node:24-alpine

LABEL org.opencontainers.image.title="GymVerse" \
      org.opencontainers.image.description="Open-source, self-hosted gym management" \
      org.opencontainers.image.source="https://github.com/namanguptaa/gymverse" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data

WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public

RUN mkdir -p /data && chown -R node:node /data
USER node

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
