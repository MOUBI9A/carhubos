# syntax=docker/dockerfile:1
FROM node:22.23.3-trixie-slim AS builder
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Optional cloud proxy CA is mounted only during build, never copied into images.
RUN --mount=type=secret,id=custom_ca,target=/tmp/custom-ca.pem \
    if [ -f /tmp/custom-ca.pem ]; then export NODE_EXTRA_CA_CERTS=/tmp/custom-ca.pem; fi; \
    npm ci
COPY . .
RUN --mount=type=secret,id=custom_ca,target=/tmp/custom-ca.pem \
    if [ -f /tmp/custom-ca.pem ]; then export NODE_EXTRA_CA_CERTS=/tmp/custom-ca.pem; fi; \
    npx prisma generate && npm run build

# Dedicated release target: run once before rolling out the production image.
FROM builder AS migration
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:22.23.3-trixie-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ca-certificates fonts-ipafont-gothic fonts-wqy-zenhei \
    fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts --no-audit && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
USER node
EXPOSE 5406
CMD ["node", "dist/main.js"]
