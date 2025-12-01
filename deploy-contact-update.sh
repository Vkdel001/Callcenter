#!/bin/bash

# Contact Update Feature Deployment Script
# Run this on your VPS server

echo "🚀 Starting Contact Update Feature Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Pull latest changes
echo -e "${YELLOW}Step 1: Pulling latest changes from GitHub...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed. Please check your connection and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Code updated successfully${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed. Please check for errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Build for production
echo -e "${YELLOW}Step 3: Building for production...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please check for errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"
echo ""

# Step 4: Restart services
echo -e "${YELLOW}Step 4: Restarting services...${NC}"

# Check if PM2 is being used
if command -v pm2 &> /dev/null; then
    echo "Restarting PM2..."
    pm2 restart callcenter
    echo -e "${GREEN}✅ PM2 restarted${NC}"
fi

# Restart Nginx
if command -v nginx &> /dev/null; then
    echo "Restarting Nginx..."
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx restarted${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Clear your browser cache (Ctrl + Shift + R)"
echo "2. Test the contact update feature"
echo "3. Verify emails are being sent correctly"
echo ""
echo "📖 See CONTACT_UPDATE_DEPLOYMENT.md for detailed testing instructions"
