#!/bin/bash

###############################################################################
# NIC Email Service - Installation Script
# 
# This script installs and configures the email service on your VPS
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "NIC Email Service - Installation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/nic-callcenter"
SERVICE_NAME="nic-email-service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
LOG_DIR="/var/log"
LOG_FILE="${LOG_DIR}/nic-email-service.log"

echo "📋 Configuration:"
echo "   App Directory: ${APP_DIR}"
echo "   Service Name: ${SERVICE_NAME}"
echo "   Log File: ${LOG_FILE}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Please run as root (use sudo)${NC}"
  exit 1
fi

# Step 1: Check if backend service file exists
echo "🔍 Step 1: Checking backend service file..."
if [ ! -f "${APP_DIR}/backend-email-service.cjs" ]; then
  echo -e "${RED}❌ backend-email-service.cjs not found in ${APP_DIR}${NC}"
  echo "   Please deploy the file first"
  exit 1
fi
echo -e "${GREEN}✅ Backend service file found${NC}"
echo ""

# Step 2: Check environment file
echo "🔍 Step 2: Checking environment configuration..."
if [ ! -f "${APP_DIR}/.env.email-service" ]; then
  echo -e "${YELLOW}⚠️  .env.email-service not found${NC}"
  echo "   Creating from example..."
  
  if [ -f "${APP_DIR}/.env.email-service.example" ]; then
    cp "${APP_DIR}/.env.email-service.example" "${APP_DIR}/.env.email-service"
    echo -e "${YELLOW}⚠️  Please edit ${APP_DIR}/.env.email-service and add your Brevo API key${NC}"
    echo "   Then run this script again"
    exit 1
  else
    echo -e "${RED}❌ .env.email-service.example not found${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✅ Environment file found${NC}"
echo ""

# Step 3: Verify Brevo API key is set
echo "🔍 Step 3: Verifying Brevo API key..."
if ! grep -q "BREVO_API_KEY=xkeysib-" "${APP_DIR}/.env.email-service"; then
  echo -e "${RED}❌ BREVO_API_KEY not properly set in .env.email-service${NC}"
  echo "   Please add your Brevo API key"
  exit 1
fi
echo -e "${GREEN}✅ Brevo API key configured${NC}"
echo ""

# Step 4: Create log file
echo "📝 Step 4: Setting up log file..."
touch "${LOG_FILE}"
chmod 644 "${LOG_FILE}"
echo -e "${GREEN}✅ Log file created${NC}"
echo ""

# Step 5: Create systemd service
echo "⚙️  Step 5: Creating systemd service..."
cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=NIC Email Service - Secure Brevo API Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/backend-email-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ Systemd service created${NC}"
echo ""

# Step 6: Reload systemd
echo "🔄 Step 6: Reloading systemd..."
systemctl daemon-reload
echo -e "${GREEN}✅ Systemd reloaded${NC}"
echo ""

# Step 7: Enable service
echo "🔄 Step 7: Enabling service..."
systemctl enable ${SERVICE_NAME}
echo -e "${GREEN}✅ Service enabled (will start on boot)${NC}"
echo ""

# Step 8: Start service
echo "🚀 Step 8: Starting service..."
systemctl start ${SERVICE_NAME}
sleep 2
echo -e "${GREEN}✅ Service started${NC}"
echo ""

# Step 9: Check service status
echo "🔍 Step 9: Checking service status..."
if systemctl is-active --quiet ${SERVICE_NAME}; then
  echo -e "${GREEN}✅ Service is running${NC}"
  systemctl status ${SERVICE_NAME} --no-pager -l
else
  echo -e "${RED}❌ Service failed to start${NC}"
  echo "   Check logs: journalctl -u ${SERVICE_NAME} -n 50"
  exit 1
fi
echo ""

# Step 10: Test health endpoint
echo "🧪 Step 10: Testing health endpoint..."
sleep 2
if curl -s http://localhost:3003/health | grep -q "healthy"; then
  echo -e "${GREEN}✅ Health check passed${NC}"
else
  echo -e "${YELLOW}⚠️  Health check failed - service may still be starting${NC}"
fi
echo ""

echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "📋 Service Information:"
echo "   Status: systemctl status ${SERVICE_NAME}"
echo "   Logs:   journalctl -u ${SERVICE_NAME} -f"
echo "   Stop:   systemctl stop ${SERVICE_NAME}"
echo "   Start:  systemctl start ${SERVICE_NAME}"
echo "   Restart: systemctl restart ${SERVICE_NAME}"
echo ""
echo "🧪 Test the service:"
echo "   curl http://localhost:3003/health"
echo "   node ${APP_DIR}/test-email-service.js"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update nginx configuration to proxy /api/email"
echo "   2. Update frontend .env to use VITE_EMAIL_SERVICE_URL"
echo "   3. Rebuild and deploy frontend"
echo "   4. Test email sending from frontend"
echo ""
