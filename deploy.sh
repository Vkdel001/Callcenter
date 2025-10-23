#!/bin/bash

# NIC Call Center Deployment Script for Ubuntu VPS
# This script pulls latest code from GitHub and deploys the application

set -e  # Exit on any error

echo "🚀 Starting NIC Call Center Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/nic-callcenter"
BACKUP_DIR="/var/backups/nic-callcenter"
SERVICE_NAME="nic-callcenter"
NGINX_CONFIG="/etc/nginx/sites-available/nic-callcenter"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Consider using a non-root user with sudo privileges."
fi

# Create backup of current deployment
create_backup() {
    print_status "Creating backup of current deployment..."
    if [ -d "$APP_DIR" ]; then
        sudo mkdir -p "$BACKUP_DIR"
        sudo cp -r "$APP_DIR" "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)"
        print_status "Backup created successfully"
    else
        print_warning "No existing deployment found to backup"
    fi
}

# Pull latest code from GitHub
pull_code() {
    print_status "Pulling latest code from GitHub..."
    
    if [ -d "$APP_DIR" ]; then
        cd "$APP_DIR"
        sudo git fetch origin
        sudo git reset --hard origin/main
        sudo git pull origin main
    else
        print_status "Cloning repository for first time..."
        sudo mkdir -p "$APP_DIR"
        sudo git clone https://github.com/Vkdel001/Callcenter.git "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    print_status "Code updated successfully"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    cd "$APP_DIR"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    sudo npm install
    print_status "Dependencies installed successfully"
}

# Build the application
build_app() {
    print_status "Building the application..."
    cd "$APP_DIR"
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating template..."
        sudo cp .env.example .env 2>/dev/null || echo "# Environment variables for production" | sudo tee .env
        print_warning "Please update .env file with your production settings"
    fi
    
    sudo npm run build
    print_status "Application built successfully"
}

# Setup Nginx configuration
setup_nginx() {
    print_status "Setting up Nginx configuration..."
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        print_warning "Nginx is not installed. Installing Nginx..."
        sudo apt update
        sudo apt install -y nginx
    fi
    
    # Create Nginx configuration
    sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain
    
    root $APP_DIR/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF
    
    # Enable the site
    sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    print_status "Nginx configuration updated"
}

# Setup PM2 for process management (optional)
setup_pm2() {
    print_status "Setting up PM2 for process management..."
    
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    # Create PM2 ecosystem file
    cd "$APP_DIR"
    sudo tee ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'nic-callcenter',
    script: 'serve',
    args: '-s dist -l 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF
    
    # Install serve globally if not installed
    if ! command -v serve &> /dev/null; then
        sudo npm install -g serve
    fi
    
    print_status "PM2 configuration created"
}

# Set proper permissions
set_permissions() {
    print_status "Setting proper permissions..."
    sudo chown -R www-data:www-data "$APP_DIR"
    sudo chmod -R 755 "$APP_DIR"
    print_status "Permissions set successfully"
}

# Main deployment function
deploy() {
    print_status "Starting deployment process..."
    
    create_backup
    pull_code
    install_dependencies
    build_app
    setup_nginx
    set_permissions
    
    print_status "✅ Deployment completed successfully!"
    print_status "Your application is now available at your server's IP address or domain"
    print_warning "Don't forget to:"
    echo "  1. Update your .env file with production settings"
    echo "  2. Configure your domain in Nginx config"
    echo "  3. Set up SSL certificate (Let's Encrypt recommended)"
    echo "  4. Configure firewall rules"
}

# Check command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "backup")
        create_backup
        ;;
    "pull")
        pull_code
        ;;
    "build")
        build_app
        ;;
    "nginx")
        setup_nginx
        ;;
    "pm2")
        setup_pm2
        ;;
    *)
        echo "Usage: $0 {deploy|backup|pull|build|nginx|pm2}"
        echo "  deploy  - Full deployment (default)"
        echo "  backup  - Create backup only"
        echo "  pull    - Pull code only"
        echo "  build   - Build app only"
        echo "  nginx   - Setup Nginx only"
        echo "  pm2     - Setup PM2 only"
        exit 1
        ;;
esac