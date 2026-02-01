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

# مرحلة Nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
