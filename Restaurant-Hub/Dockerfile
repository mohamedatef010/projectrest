# Dockerfile frontend

FROM node:20 AS builder
WORKDIR /app

# نسخ الحزم والبناء
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_APP_NAME
RUN npm run build

# مرحلة Nginx - مخرجات Vite تكون في dist/public (حسب vite.config outDir)
FROM nginx:stable-alpine
# إزالة صفحة nginx الافتراضية حتى لا تظهر "Welcome to nginx!"
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
