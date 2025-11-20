#!/bin/bash

# Install Payment Notification Service
# Sets up the payment notification service as a systemd service

echo "🚀 Installing NIC Payment Notification Service"
echo "=" | tr '=' '='| head -c 60; echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root or with sudo"
  exit 1
fi

# Get the current directory
CURRENT_DIR=$(pwd)
SERVICE_FILE="/etc/systemd/system/nic-payment-notification.service"
LOG_FILE="/var/log/nic-payment-notification.log"

# Create log file
echo "📝 Creating log file..."
touch $LOG_FILE
chmod 666 $LOG_FILE

# Create systemd service file
echo "📝 Creating systemd service..."
cat > $SERVICE_FILE << EOF
[Unit]
Description=NIC Payment Notification Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/node $CURRENT_DIR/backend-payment-notification.cjs
Restart=always
RestartSec=10
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE

# Environment
Environment=NODE_ENV=production

# Resource limits
MemoryLimit=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chmod 644 $SERVICE_FILE

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable service
echo "✅ Enabling service..."
systemctl enable nic-payment-notification

# Start service
echo "🚀 Starting service..."
systemctl start nic-payment-notification

# Check status
echo ""
echo "📊 Service Status:"
systemctl status nic-payment-notification --no-pager

echo ""
echo "✅ Installation complete!"
echo ""
echo "Service Management Commands:"
echo "  sudo systemctl start nic-payment-notification    - Start service"
echo "  sudo systemctl stop nic-payment-notification     - Stop service"
echo "  sudo systemctl restart nic-payment-notification  - Restart service"
echo "  sudo systemctl status nic-payment-notification   - Check status"
echo ""
echo "Or use the manager script:"
echo "  ./payment-notification-manager.sh start|stop|restart|status|logs|follow"
echo ""
echo "Log file: $LOG_FILE"
echo "  tail -f $LOG_FILE  - Follow logs in real-time"
