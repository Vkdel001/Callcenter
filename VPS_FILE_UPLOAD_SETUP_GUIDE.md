# VPS File Upload Setup Guide - Complete Implementation

**Goal**: Store signed AOD documents on your VPS and save URLs in Xano

**Estimated Time**: 30 minutes

---

## 📋 **Part 1: Xano Changes (5 minutes)**

### **Step 1: Change Field Type**

1. Go to Xano dashboard
2. Open `nic_cc_payment_plan` table
3. Find the `signed_document` field
4. **Change type** from **attachment** to **text**
5. **Save** the table

**Why**: We'll store the file URL as text instead of the actual file.

---

## 📋 **Part 2: VPS Server Setup (15 minutes)**

### **Step 1: Create Upload Directory**

From your project directory `/var/www/nic-callcenter`, run:

```bash
# Navigate to your project directory
cd /var/www/nic-callcenter

# Create directory for uploaded files within your project
mkdir -p uploads/aod-documents

# Set permissions
chmod 755 uploads
chmod 755 uploads/aod-documents

# Set ownership (replace 'www-data' with your web server user if different)
chown -R www-data:www-data uploads
```

---

### **Step 2: Create Upload Service**

Create a new file in your project directory:

```bash
# You're already in /var/www/nic-callcenter
nano aod-upload-service.js
```

Paste this code:

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3002; // Different port from your main app

// Enable CORS for your frontend
app.use(cors({
  origin: ['http://localhost:3000', 'https://payments.niclmauritius.site/'], // Update with your actual domains
  credentials: true
}));

app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/var/www/nic-callcenter/uploads/aod-documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: aod_planId_timestamp.pdf
    const planId = req.body.payment_plan_id || 'unknown';
    const timestamp = Date.now();
    const filename = `aod_${planId}_${timestamp}.pdf`;
    cb(null, filename);
  }
});

// File filter - only allow PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AOD Upload Service' });
});

// Upload endpoint
app.post('/upload-aod', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate public URL
    const fileUrl = `https://payments.niclmauritius.site/uploads/aod-documents/${req.file.filename}`;
    
    console.log('✅ File uploaded:', {
      filename: req.file.filename,
      size: req.file.size,
      url: fileUrl
    });

    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`🚀 AOD Upload Service running on port ${PORT}`);
});
```

**Save and exit** (Ctrl+X, Y, Enter)

---

### **Step 3: Install Dependencies**

```bash
# You're already in /var/www/nic-callcenter
npm install express multer cors
```
# DONE till here 
---

### **Step 4: Create Systemd Service**

Create a service file:

```bash
sudo nano /etc/systemd/system/aod-upload.service
```

Paste this:

```ini
[Unit]
Description=AOD Upload Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nic-callcenter
ExecStart=/usr/bin/node /var/www/nic-callcenter/aod-upload-service.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Save and exit**

---

### **Step 5: Start the Service**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable aod-upload.service

# Start the service
sudo systemctl start aod-upload.service

# Check status
sudo systemctl status aod-upload.service
```

You should see: **Active: active (running)**

---

### **Step 6: Configure Nginx (if using Nginx)**

Add this to your Nginx config:

```bash
sudo nano /etc/nginx/sites-available/your-site
```

Add these locations:

```nginx
# Serve uploaded files
location /uploads/ {
    alias /var/www/nic-callcenter/uploads/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Proxy upload service
location /api/upload-aod {
    proxy_pass http://localhost:3002/upload-aod;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    client_max_body_size 10M;
}
```

**Save and reload Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📋 **Part 3: Frontend Code (I'll do this)**

I'll update the frontend to:
1. Upload file to VPS first
2. Get the URL back
3. Send URL to Xano

---

## 📋 **Part 4: Testing**

### **Test Upload Service:**

```bash
# Test health check
curl http://localhost:3002/health

# Should return: {"status":"ok","service":"AOD Upload Service"}
```

### **Test File Upload:**

```bash
# Create a test PDF
echo "test" > test.pdf

# Upload it
curl -X POST http://localhost:3002/upload-aod \
  -F "document=@test.pdf" \
  -F "payment_plan_id=123"

# Should return JSON with file URL
```

---

## 🔒 **Security Considerations**

### **1. Add Authentication (Optional but Recommended)**

Add this to the upload endpoint:

```javascript
// Simple token authentication
const AUTH_TOKEN = 'your-secret-token-here'; // Store in env variable

app.post('/upload-aod', (req, res, next) => {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}, upload.single('document'), (req, res) => {
  // ... rest of code
});
```

### **2. Update CORS Origins**

Replace `'https://your-domain.com'` with your actual domain.

### **3. Set Up HTTPS**

Make sure your VPS has SSL certificate (Let's Encrypt).

---

## 📊 **File Structure on VPS**

```
/var/www/nic-callcenter/
├── src/                           # Your React app
├── public/                        # Static files
├── aod-upload-service.js          # NEW: Upload service
├── uploads/                       # NEW: Upload directory
│   └── aod-documents/
│       ├── aod_41_1701234567890.pdf
│       ├── aod_42_1701234567891.pdf
│       └── ...
├── package.json
└── ... (your existing files)
```

---

## 🔍 **Troubleshooting**

### **Service won't start:**
```bash
# Check logs
sudo journalctl -u aod-upload.service -f

# Check permissions
ls -la /var/www/uploads
```

### **Upload fails:**
```bash
# Check disk space
df -h

# Check service status
sudo systemctl status aod-upload.service
```

### **Files not accessible:**
```bash
# Check Nginx config
sudo nginx -t

# Check file permissions
ls -la /var/www/uploads/aod-documents/
```

---

## ✅ **Checklist**

Before proceeding, verify:

- [ ] Upload directory created: `/var/www/nic-callcenter/uploads/aod-documents`
- [ ] Permissions set correctly (755)
- [ ] Upload service file created
- [ ] Dependencies installed (express, multer, cors)
- [ ] Systemd service created and enabled
- [ ] Service is running (check with `systemctl status`)
- [ ] Nginx configured to serve `/uploads/` path
- [ ] Nginx configured to proxy `/api/upload-aod`
- [ ] Nginx reloaded
- [ ] Health check works: `curl http://localhost:3002/health`
- [ ] Xano field changed from attachment to text

---

## 🎯 **What's Your VPS Domain?**

Once you complete the VPS setup, share:
1. Your VPS domain (e.g., `https://your-domain.com`)
2. Confirmation that the service is running

Then I'll update the frontend code with the correct URLs!

---

**Ready to start?** Follow the steps above and let me know when you're done! 🚀
