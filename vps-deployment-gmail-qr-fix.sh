#!/bin/bash

# VPS Deployment Script for Gmail QR Fix
# Run this script on your VPS after pushing to GitHub

echo "🖥️  VPS Gmail QR Fix Deployment"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

# Step 1: Navigate to project directory
print_info "Step 1: Navigating to project directory..."
cd /var/www/nic-callcenter || {
    print_error "Failed to navigate to /var/www/nic-callcenter"
    exit 1
}
print_status "In project directory: $(pwd)"

# Step 2: Pull latest changes
print_info "Step 2: Pulling latest changes from GitHub..."
git pull origin main || {
    print_error "Failed to pull from GitHub"
    exit 1
}
print_status "Latest changes pulled from GitHub"

# Step 3: Stop backend service
print_info "Step 3: Stopping backend reminder service..."
systemctl stop nic-reminder.service
print_status "Backend service stopped"

# Step 4: Check for running processes
print_info "Step 4: Checking for any remaining backend processes..."
RUNNING_PROCESSES=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)
if [ $RUNNING_PROCESSES -gt 0 ]; then
    print_warning "Found $RUNNING_PROCESSES running backend processes. Killing them..."
    pkill -f backend-reminder-service
    sleep 2
    REMAINING_PROCESSES=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)
    if [ $REMAINING_PROCESSES -gt 0 ]; then
        print_error "Failed to kill all backend processes"
        ps aux | grep backend-reminder-service | grep -v grep
        exit 1
    fi
    print_status "All backend processes killed"
else
    print_status "No running backend processes found"
fi

# Step 5: Backup current backend file
print_info "Step 5: Backing up current backend file..."
if [ -f "backend-reminder-service.cjs" ]; then
    cp backend-reminder-service.cjs "backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)"
    print_status "Current backend file backed up"
else
    print_warning "No existing backend file found to backup"
fi

# Step 6: Deploy updated backend file
print_info "Step 6: Deploying updated backend file..."
if [ -f "backend-reminder-service-fixed.cjs" ]; then
    cp backend-reminder-service-fixed.cjs backend-reminder-service.cjs
    print_status "Updated backend file deployed"
else
    print_error "backend-reminder-service-fixed.cjs not found!"
    exit 1
fi

# Step 7: Verify file syntax
print_info "Step 7: Verifying backend file syntax..."
node --check backend-reminder-service.cjs || {
    print_error "Backend file has syntax errors!"
    exit 1
}
print_status "Backend file syntax is valid"

# Step 8: Set proper permissions
print_info "Step 8: Setting proper file permissions..."
chmod +x backend-reminder-service.cjs
chown www-data:www-data backend-reminder-service.cjs
print_status "File permissions set"

# Step 9: Start backend service
print_info "Step 9: Starting updated backend service..."
systemctl start nic-reminder.service
sleep 3

# Step 10: Verify service status
print_info "Step 10: Verifying service status..."
if systemctl is-active --quiet nic-reminder.service; then
    print_status "Backend service is running"
else
    print_error "Backend service failed to start!"
    echo "Service status:"
    systemctl status nic-reminder.service
    echo "Recent logs:"
    journalctl -u nic-reminder.service --no-pager -n 20
    exit 1
fi

# Step 11: Check process count
print_info "Step 11: Checking process count..."
PROCESS_COUNT=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)
if [ $PROCESS_COUNT -eq 1 ]; then
    print_status "Exactly 1 backend process running (correct)"
    ps aux | grep backend-reminder-service | grep -v grep
elif [ $PROCESS_COUNT -eq 0 ]; then
    print_error "No backend processes running!"
    exit 1
else
    print_warning "Multiple backend processes running ($PROCESS_COUNT)"
    ps aux | grep backend-reminder-service | grep -v grep
fi

# Step 12: Frontend deployment (if needed)
print_info "Step 12: Checking if frontend needs deployment..."
if [ -f "package.json" ]; then
    print_info "Building frontend..."
    npm run build || {
        print_warning "Frontend build failed, but backend deployment was successful"
    }
    print_status "Frontend built (if successful)"
else
    print_warning "No package.json found, skipping frontend build"
fi

# Step 13: Final verification
print_info "Step 13: Final verification..."
echo ""
echo "🔍 Deployment Summary:"
echo "====================="
echo "✅ Backend service: $(systemctl is-active nic-reminder.service)"
echo "✅ Process count: $(ps aux | grep backend-reminder-service | grep -v grep | wc -l)"
echo "✅ File deployed: backend-reminder-service.cjs"
echo "✅ Syntax check: Passed"
echo ""

print_status "Gmail QR Fix deployment completed successfully!"

echo ""
echo "🧪 Testing Instructions:"
echo "========================"
echo "1. Monitor logs for Gmail compatibility messages:"
echo "   tail -f /var/log/nic-reminder-service.log"
echo ""
echo "2. Test frontend 'Send Reminder' button:"
echo "   • Go to customer with pending installments"
echo "   • Click 'Send Reminder'"
echo "   • Check Gmail - QR should display immediately"
echo ""
echo "3. Wait for automated backend reminder:"
echo "   • Check Gmail account"
echo "   • QR code should display without 'Display images'"
echo "   • Look for: '✅ QR code converted to CID attachment for Gmail'"
echo ""
echo "4. Verify agent CC functionality:"
echo "   • Ensure agent receives CC emails"
echo "   • Check QR codes display in agent's Gmail too"
echo ""

print_info "Monitoring service logs (Ctrl+C to exit)..."
tail -f /var/log/nic-reminder-service.log