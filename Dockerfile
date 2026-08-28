# ---------------------------------------------------------------------------
# SmartTracer -- image frontend (Vite/React + nginx).
#
# CATATAN PENTING soal memori: build ini memuat ~50 dependency (Radix, Recharts,
# ExcelJS) dan gampang kena OOM di VPS 2 GB. Dua cara aman:
#   1. Build di laptop, lalu kirim image:
#        docker build -t smarttracer-fe ./fe-tracer-study
#        docker save smarttracer-fe | ssh vps 'docker load'
#   2. Build di VPS hanya kalau swap sudah aktif minimal 2 GB.
#
# Seluruh VITE_* dibaca saat BUILD, bukan saat runtime. Mengubah alamat API
# berarti build ulang image, bukan sekadar restart container.
# ---------------------------------------------------------------------------

# --- Tahap 1: build -------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_METABASE_DASHBOARD_URL=
ARG VITE_INSTITUTION_NAME=
ARG VITE_INSTITUTION_SHORT_NAME=
ARG VITE_INSTITUTION_DOMAIN=
ARG VITE_INSTITUTION_APP_DOMAIN=
ARG VITE_INSTITUTION_EMAIL=
ARG VITE_INSTITUTION_PHONE=
ARG VITE_INSTITUTION_ADDRESS=
ARG VITE_INSTITUTION_UNIT=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_METABASE_DASHBOARD_URL=$VITE_METABASE_DASHBOARD_URL \
    VITE_INSTITUTION_NAME=$VITE_INSTITUTION_NAME \
    VITE_INSTITUTION_SHORT_NAME=$VITE_INSTITUTION_SHORT_NAME \
    VITE_INSTITUTION_DOMAIN=$VITE_INSTITUTION_DOMAIN \
    VITE_INSTITUTION_APP_DOMAIN=$VITE_INSTITUTION_APP_DOMAIN \
    VITE_INSTITUTION_EMAIL=$VITE_INSTITUTION_EMAIL \
    VITE_INSTITUTION_PHONE=$VITE_INSTITUTION_PHONE \
    VITE_INSTITUTION_ADDRESS=$VITE_INSTITUTION_ADDRESS \
    VITE_INSTITUTION_UNIT=$VITE_INSTITUTION_UNIT

# Plafon heap Node. Tanpa ini rollup bisa menghabiskan seluruh RAM host saat
# minifikasi bundel Recharts + ExcelJS.
ENV NODE_OPTIONS=--max-old-space-size=1536

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Tahap 2: sajikan statis ---------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Konfigurasi ini hanya mengurus SPA fallback di dalam container FE. Reverse
# proxy ke API diurus nginx edge di deploy/nginx/default.conf.
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/spa.conf /etc/nginx/conf.d/spa.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
