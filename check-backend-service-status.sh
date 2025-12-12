#!/bin/bash

# Backend Service Diagnostic Script
# This script checks the current status of backend reminder service on VPS

echo "🔍 NIC Backend Service Diagnostic Report"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_section() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check current directory
print_section "Current Directory"
pwd
ls -la | grep -E "(backend|reminder|service)"

echo ""

# Check for systemd services
print_section "Systemd Services Check"
echo "Checking for NIC-related services..."

# Check various possible service names
SERVICE_NAMES=("nic-reminder" "nic-reminder-service" "reminder-service" "backend-reminder" "nic-callcenter-reminder")

for service in "${SERVICE_NAMES[@]}"; do
    if systemctl list-unit-files | grep -q "$service"; then
        print_status "Found service: $service"
        systemctl status "$service" --no-pager -l || true
        echo ""
    else
        echo "Service $service: Not found"
    fi
done

echo ""

# Check for any running Node.js processes
print_section "Running Node.js Processes"
ps aux | grep -E "(node|backend|reminder)" | grep -v grep || echo "No Node.js processes found"

echo ""

# Check systemd service files
print_section "Systemd Service Files"
echo "Looking for service files in /etc/systemd/system/..."
ls -la /etc/systemd/system/ | grep -E "(nic|reminder|backend)" || echo "No NIC-related service files found"

echo ""

# Check for service files in project directory
print_section "Project Service Files"
echo "Looking for .service files in current directory..."
ls -la | grep "\.service" || echo "No .service files found in current directory"

echo ""

# Check log files
print_section "Log Files"
echo "Checking for log files..."
if [ -f "/var/log/nic-reminder-service.log" ]; then
    print_status "Found log file: /var/log/nic-reminder-service.log"
    echo "Last 5 lines:"
    tail -5 /var/log/nic-reminder-service.log
else
    print_warning "Log file /var/log/nic-reminder-service.log not found"
fi

echo ""

# Check for other possible log locations
echo "Checking other possible log locations..."
find /var/log -name "*nic*" -o -name "*reminder*" 2>/dev/null || echo "No other NIC/reminder logs found"

echo ""

# Check backend service files
print_section "Backend Service Files"
echo "Looking for backend service files..."
ls -la | grep -E "(backend.*service|reminder.*service)" || echo "No backend service files found"

echo ""

# Check if management script exists and is executable
print_section "Management Script"
if [ -f "reminder-service-manager.sh" ]; then
    print_status "Found management script: reminder-service-manager.sh"
    ls -la reminder-service-manager.sh
    echo ""
    echo "Testing management script..."
    ./reminder-service-manager.sh help 2>/dev/null || echo "Management script not executable or has issues"
else
    print_warning "Management script reminder-service-manager.sh not found"
fi

echo ""

# Check environment file
print_section "Environment Configuration"
if [ -f ".env" ]; then
    print_status "Found .env file"
    echo "Checking for required variables..."
    grep -E "(BREVO|XANO)" .env | sed 's/=.*/=***/' || echo "No Brevo/Xano variables found"
else
    print_warning ".env file not found"
fi

echo ""

# Check if Node.js is installed
print_section "Node.js Installation"
if command -v node &> /dev/null; then
    print_status "Node.js version: $(node --version)"
else
    print_error "Node.js not installed"
fi

echo ""

# Summary and recommendations
print_section "Summary & Recommendations"
echo ""

# Check if any service is actually running
if ps aux | grep -E "(backend.*reminder|reminder.*service)" | grep -v grep > /dev/null; then
    print_status "✅ Backend reminder process appears to be running"
else
    print_warning "❌ No backend reminder process found running"
fi

echo ""
echo "Next steps to check:"
echo "1. Run: sudo systemctl list-unit-files | grep nic"
echo "2. Run: sudo systemctl list-units --type=service | grep nic"
echo "3. Check: ls -la /etc/systemd/system/nic*"
echo "4. If service exists, try: sudo systemctl status <service-name>"
echo "5. If no service exists, you may need to install it first"

echo ""
echo "🔍 Diagnostic complete!"