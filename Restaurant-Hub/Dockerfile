FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage - تشغيل Nginx كـ root لحل مشكلة الصلاحيات
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Fix permissions by running as root (الحل السريع)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]