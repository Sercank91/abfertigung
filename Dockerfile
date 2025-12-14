# -------- Base image --------
    FROM node:20-alpine AS base

    WORKDIR /app
    
    # -------- Dependencies --------
    FROM base AS deps
    COPY package.json package-lock.json ./
    RUN npm ci
    
    # -------- Build --------
    FROM base AS builder
    COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
    
    # -------- Production --------
    FROM base AS runner
    ENV NODE_ENV=production
    
    # Cloud Run nutzt PORT
    ENV PORT=8080
    
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package.json ./package.json
    COPY --from=builder /app/next.config.js ./next.config.js
    
    EXPOSE 8080
    
    CMD ["npm", "run", "start"]
    