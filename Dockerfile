# 1. Aşama: Bağımlılıkların yüklenmesi ve uygulamanın derlenmesi
FROM node:22-alpine AS builder
WORKDIR /app

# Alpine imajlarındaki paketleri güncelliyor ve bağımlılıkları yüklüyoruz
RUN apk update && apk upgrade --no-cache && apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .

# Next.js telemetrisini kapatıyoruz
ENV NEXT_TELEMETRY_DISABLED=1
# Build sırasında geçici lokal veritabanı oluşturularak build aşamasının başarıyla tamamlanması sağlanır
ENV DATABASE_URL="file:local.db"

RUN npm run build

# 2. Aşama: Çalışma zamanı (Production) imajı
FROM node:22-alpine AS runner
WORKDIR /app

# Runner aşamasında da paketleri güncel tutuyoruz
RUN apk update && apk upgrade --no-cache

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Kalıcı veri saklama dizini oluşturulur
RUN mkdir -p /app/data

EXPOSE 3000

# Konteyner başlarken önce veritabanı migration işlemini yapar, ardından Next.js sunucusunu başlatır
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
