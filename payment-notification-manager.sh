#!/bin/bash

# Payment Notification Service Manager
# Manages the NIC payment notification service

SERVICE_NAME="nic-payment-notification"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
LOG_FILE="/var/log/nic-payment-notification.log"

case "$1" in
  start)
    echo "Starting payment notification service..."
    sudo systemctl start $SERVICE_NAME
    sudo systemctl status $SERVICE_NAME
    ;;
    
  stop)
    echo "Stopping payment notification service..."
    sudo systemctl stop $SERVICE_NAME
    ;;
    
  restart)
    echo "Restarting payment notification service..."
    sudo systemctl restart $SERVICE_NAME
    sudo systemctl status $SERVICE_NAME
    ;;
    
  status)
    sudo systemctl status $SERVICE_NAME
    ;;
    
  logs)
    echo "Showing last 50 lines of payment notification log..."
    tail -50 $LOG_FILE
    ;;
    
  follow)
    echo "Following payment notification log (Ctrl+C to stop)..."
    tail -f $LOG_FILE
    ;;
    
  enable)
    echo "Enabling payment notification service to start on boot..."
    sudo systemctl enable $SERVICE_NAME
    ;;
    
  disable)
    echo "Disabling payment notification service from starting on boot..."
    sudo systemctl disable $SERVICE_NAME
    ;;
    
  *)
    echo "Payment Notification Service Manager"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs|follow|enable|disable}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the service"
    echo "  stop     - Stop the service"
    echo "  restart  - Restart the service"
    echo "  status   - Show service status"
    echo "  logs     - Show last 50 log lines"
    echo "  follow   - Follow log in real-time"
    echo "  enable   - Enable service on boot"
    echo "  disable  - Disable service on boot"
    exit 1
    ;;
esac

exit 0
