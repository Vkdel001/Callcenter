#!/bin/bash

# NIC Reminder Service Manager
# Easy management script for the reminder service

SERVICE_NAME="nic-reminder"
LOG_FILE="/var/log/nic-reminder-service.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  NIC Reminder Service Manager  ${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    systemctl status $SERVICE_NAME --no-pager -l
    echo ""
}

show_logs() {
    local lines=${1:-20}
    echo -e "${BLUE}Recent Service Logs (last $lines lines):${NC}"
    echo "----------------------------------------"
    if [[ -f "$LOG_FILE" ]]; then
        tail -n $lines "$LOG_FILE"
    else
        echo "Log file not found: $LOG_FILE"
    fi
    echo ""
    
    echo -e "${BLUE}System Journal Logs:${NC}"
    echo "--------------------"
    journalctl -u $SERVICE_NAME -n $lines --no-pager
    echo ""
}

start_service() {
    print_status "Starting $SERVICE_NAME service..."
    if sudo systemctl start $SERVICE_NAME; then
        print_status "✅ Service started successfully"
        sleep 2
        show_status
    else
        print_error "❌ Failed to start service"
        show_logs 10
    fi
}

stop_service() {
    print_status "Stopping $SERVICE_NAME service..."
    if sudo systemctl stop $SERVICE_NAME; then
        print_status "✅ Service stopped successfully"
        show_status
    else
        print_error "❌ Failed to stop service"
    fi
}

restart_service() {
    print_status "Restarting $SERVICE_NAME service..."
    if sudo systemctl restart $SERVICE_NAME; then
        print_status "✅ Service restarted successfully"
        sleep 2
        show_status
    else
        print_error "❌ Failed to restart service"
        show_logs 10
    fi
}

enable_service() {
    print_status "Enabling $SERVICE_NAME service to start on boot..."
    if sudo systemctl enable $SERVICE_NAME; then
        print_status "✅ Service enabled successfully"
    else
        print_error "❌ Failed to enable service"
    fi
}

disable_service() {
    print_warning "Disabling $SERVICE_NAME service from starting on boot..."
    if sudo systemctl disable $SERVICE_NAME; then
        print_status "✅ Service disabled successfully"
    else
        print_error "❌ Failed to disable service"
    fi
}

follow_logs() {
    echo -e "${BLUE}Following live logs (Ctrl+C to exit):${NC}"
    echo "-------------------------------------"
    tail -f "$LOG_FILE" 2>/dev/null &
    TAIL_PID=$!
    journalctl -u $SERVICE_NAME -f &
    JOURNAL_PID=$!
    
    # Wait for Ctrl+C
    trap "kill $TAIL_PID $JOURNAL_PID 2>/dev/null; exit 0" INT
    wait
}

show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     - Start the reminder service"
    echo "  stop      - Stop the reminder service"
    echo "  restart   - Restart the reminder service"
    echo "  status    - Show service status"
    echo "  logs      - Show recent logs"
    echo "  follow    - Follow live logs"
    echo "  enable    - Enable service to start on boot"
    echo "  disable   - Disable service from starting on boot"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 restart"
    echo "  $0 logs"
    echo "  $0 follow"
}

# Main script
print_header

case "${1:-status}" in
    "start")
        start_service
        ;;
    "stop")
        stop_service
        ;;
    "restart")
        restart_service
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs ${2:-20}
        ;;
    "follow")
        follow_logs
        ;;
    "enable")
        enable_service
        ;;
    "disable")
        disable_service
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac