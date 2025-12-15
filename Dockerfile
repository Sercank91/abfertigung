# -------- Base image --------
FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# -------- Dependencies (inkl. dev für Build) --------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# -------- Build --------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules

# Prisma & Konfig früh kopieren (bessere Cache-Nutzung als "COPY . .")
COPY prisma ./prisma
COPY next.config.* ./
COPY tsconfig.* ./
# falls du es hast:
COPY src ./src
COPY public ./public
COPY app ./app
COPY pages ./pages
COPY components ./components
COPY lib ./lib
COPY prisma ./prisma
# als Fallback, falls Struktur anders ist, am Ende alles:
COPY . .

RUN npx prisma generate
RUN npm run build

# -------- Production deps (ohne devDependencies) --------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# -------- Production (Runner) --------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.* ./

EXPOSE 8080
CMD ["npm", "run", "start"]
