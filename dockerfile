# syntax=docker/dockerfile:1.7

##############################
# 1) Build stage
##############################
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on lockfile first (leverages Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the sources except files ignored via .dockerignore
COPY . ./

# Accept build-time environment variables without baking local secrets into the image
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_HUNYUAN_T1_SECRET_ID
ARG VITE_HUNYUAN_T1_SECRET_KEY
ARG VITE_HUNYUAN_T1_ENDPOINT
ARG VITE_HUNYUAN_T1_MODEL
ARG VITE_IFLYTEK_APP_ID
ARG VITE_IFLYTEK_API_KEY
ARG VITE_IFLYTEK_API_SECRET
ARG VITE_AMAP_WEB_KEY
ARG VITE_AMAP_WEB_SERVICE_KEY

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_HUNYUAN_T1_SECRET_ID=${VITE_HUNYUAN_T1_SECRET_ID}
ENV VITE_HUNYUAN_T1_SECRET_KEY=${VITE_HUNYUAN_T1_SECRET_KEY}
ENV VITE_HUNYUAN_T1_ENDPOINT=${VITE_HUNYUAN_T1_ENDPOINT}
ENV VITE_HUNYUAN_T1_MODEL=${VITE_HUNYUAN_T1_MODEL}
ENV VITE_IFLYTEK_APP_ID=${VITE_IFLYTEK_APP_ID}
ENV VITE_IFLYTEK_API_KEY=${VITE_IFLYTEK_API_KEY}
ENV VITE_IFLYTEK_API_SECRET=${VITE_IFLYTEK_API_SECRET}
ENV VITE_AMAP_WEB_KEY=${VITE_AMAP_WEB_KEY}
ENV VITE_AMAP_WEB_SERVICE_KEY=${VITE_AMAP_WEB_SERVICE_KEY}
# Build the production bundle
RUN npm run build
##############################
# 2) Runtime stage
##############################
FROM nginx:1.27-alpine AS runtime

WORKDIR /usr/share/nginx/html

# Copy compiled assets from the builder stage
COPY --from=builder /app/dist ./

# Provide a default nginx config that supports SPA history routing
COPY ./server/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
