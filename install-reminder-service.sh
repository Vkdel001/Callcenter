#!/bin/bash

# NIC Call Center - Reminder Service Installation Script
# This script installs the reminder service as a systemd service

set -e

echo "🚀 Installing NIC Reminder Service..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root or with sudo"
    exit 1
fi

# Configuration
SERVICE_NAME="nic-reminder"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
APP_DIR="/var/www/nic-callcenter"
LOG_FILE="/var/log/nic-reminder-service.log"

print_status "Setting up directories and permissions..."

# Create log file
touch "$LOG_FILE"
chown www-data:www-data "$LOG_FILE"
chmod 644 "$LOG_FILE"

# Set permissions for service files
chown www-data:www-data "$APP_DIR/backend-reminder-service.js"
chmod +x "$APP_DIR/backend-reminder-service.js"

print_status "Installing systemd service..."

# Copy service file
cp "$APP_DIR/nic-reminder.service" "$SERVICE_FILE"

# Reload systemd
systemctl daemon-reload

print_status "Enabling and starting service..."

# Enable service to start on boot
systemctl enable "$SERVICE_NAME"

# Start the service
systemctl start "$SERVICE_NAME"

# Wait a moment for service to start
sleep 3

# Check service status
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "✅ Service started successfully!"
    
    echo ""
    echo "Service Status:"
    systemctl status "$SERVICE_NAME" --no-pager -l
    
    echo ""
    print_status "Service Management Commands:"
    echo "  Start:   sudo systemctl start $SERVICE_NAME"
    echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
    echo "  Restart: sudo systemctl restart $SERVICE_NAME"
    echo "  Status:  sudo systemctl status $SERVICE_NAME"
    echo "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
    echo "  Log file: tail -f $LOG_FILE"
    
    echo ""
    print_status "The reminder service is now running and will:"
    echo "  • Check for overdue payments every 30 minutes"
    echo "  • Send signature reminders for pending AODs"
    echo "  • Only operate during business hours (9 AM - 5 PM)"
    echo "  • Automatically start on server reboot"
    echo "  • Log all activities to $LOG_FILE"
    
else
    print_error "❌ Service failed to start!"
    echo ""
    echo "Check the logs for errors:"
    echo "  sudo journalctl -u $SERVICE_NAME -n 20"
    echo "  sudo tail -20 $LOG_FILE"
    exit 1
fi

print_status "Installation completed successfully! 🎉"