# syntax=docker/dockerfile:1
FROM node:22.23.3-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Optional cloud proxy CA is mounted only during build, never copied into images.
RUN --mount=type=secret,id=custom_ca,target=/tmp/custom-ca.pem \
    if [ -f /tmp/custom-ca.pem ]; then export NODE_EXTRA_CA_CERTS=/tmp/custom-ca.pem; fi; \
    npm ci
COPY . .
# Public client configuration is embedded at build time; never pass secrets here.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN --mount=type=secret,id=custom_ca,target=/tmp/custom-ca.pem \
    if [ -f /tmp/custom-ca.pem ]; then export NODE_EXTRA_CA_CERTS=/tmp/custom-ca.pem; fi; \
    npm run build

FROM node:22.23.3-alpine AS runner
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
