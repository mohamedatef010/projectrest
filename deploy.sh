#!/bin/bash

# 🚀 Istanbul Restaurant - Quick Deployment Script
# للاستخدام على السيرفر 5.35.94.240

set -e  # Exit on error

echo "=================================="
echo "🚀 Istanbul Restaurant Deployment"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    print_success "Docker installed successfully"
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose is not installed!"
    print_info "Installing Docker Compose..."
    apt-get install docker-compose-plugin -y
    print_success "Docker Compose installed successfully"
fi

print_info "Docker version: $(docker --version)"
print_info "Docker Compose version: $(docker compose version)"

echo ""
print_info "Stopping existing containers..."
docker compose down -v || true

echo ""
print_info "Building Docker images (this may take a few minutes)..."
docker compose build --no-cache

echo ""
print_info "Starting services..."
docker compose up -d

echo ""
print_info "Waiting for services to be ready..."
sleep 10

echo ""
print_info "Checking service status..."
docker compose ps

echo ""
print_info "Checking Backend health..."
if curl -f http://localhost:3000/api/health &> /dev/null; then
    print_success "Backend is healthy!"
else
    print_error "Backend health check failed!"
    print_info "Checking backend logs..."
    docker compose logs backend --tail=50
fi

echo ""
print_info "Checking Frontend..."
if curl -f http://localhost:80 &> /dev/null; then
    print_success "Frontend is accessible!"
else
    print_error "Frontend check failed!"
    print_info "Checking frontend logs..."
    docker compose logs frontend --tail=50
fi

echo ""
print_info "Checking Database..."
if docker exec restaurant-postgres psql -U postgres -d restaurant_db -c "SELECT 1;" &> /dev/null; then
    print_success "Database is connected!"
else
    print_error "Database connection failed!"
    print_info "Checking database logs..."
    docker compose logs postgres --tail=50
fi

echo ""
echo "=================================="
print_success "Deployment Complete!"
echo "=================================="
echo ""
echo "📍 Access your application:"
echo "   Frontend: http://5.35.94.240"
echo "   Backend API: http://5.35.94.240:3000/api"
echo "   Admin Login: http://5.35.94.240/login"
echo ""
echo "👤 Admin Credentials:"
echo "   Email: admin@istanbul.ru"
echo "   Password: admin123"
echo ""
echo "📊 Useful commands:"
echo "   View logs: docker compose logs -f"
echo "   View status: docker compose ps"
echo "   Restart: docker compose restart"
echo "   Stop: docker compose down"
echo ""
print_info "To view live logs, run: docker compose logs -f"
