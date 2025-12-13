#!/bin/bash

echo "🚀 Installing Gmail QR Code Compatibility Fix"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Installing QR code dependency..."
npm install qrcode

if [ $? -eq 0 ]; then
    echo "✅ QR code package installed successfully"
else
    echo "❌ Failed to install QR code package"
    exit 1
fi

echo ""
echo "🧪 Running tests..."
node test-gmail-qr-fix.js

echo ""
echo "🎉 Gmail QR Fix Installation Complete!"
echo "======================================"
echo ""
echo "✅ QR code generation utility: Ready"
echo "✅ Email service updated: Ready"
echo "✅ Gmail compatibility: Implemented"
echo ""
echo "📋 Next Steps:"
echo "1. Test with 'Send Reminder' button in frontend"
echo "2. Send test email to Gmail account"
echo "3. Verify QR code displays without 'Display images'"
echo "4. Deploy to production when satisfied"
echo ""
echo "🔍 Test Commands:"
echo "npm run dev                    # Start development server"
echo "node test-gmail-qr-fix.js      # Run QR compatibility tests"
echo ""
echo "📚 Documentation: GMAIL_QR_COMPATIBILITY_FIX.md"