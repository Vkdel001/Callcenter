# ESP32 Device Integration Guide
## Insurance Premium Collection System

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technical Requirements](#technical-requirements)
4. [Integration Approach](#integration-approach)
5. [Code Components](#code-components)
6. [Implementation Steps](#implementation-steps)
7. [API Specifications](#api-specifications)
8. [Testing Guide](#testing-guide)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)

---

## 📖 Overview

### Current System
- **Frontend**: Agent interface to check customer details
- **Database**: Xano (customer data + outstanding premiums)
- **Payment**: ZwennPay QR generation (working in app)
- **Display**: QR shown on screen only

### Target System
- **Everything above** +
- **ESP32 Device**: Physical display of QR codes on COM3
- **Dual Display**: QR on both screen AND device
- **Agent Workflow**: Search customer → View outstanding → Generate QR → Display on device

### Benefits
1. **Better Customer Experience**: Large, clear QR on dedicated device
2. **Faster Payments**: Customer scans from device while agent continues work
3. **Professional Setup**: Dedicated payment terminal
4. **Persistent Display**: QR stays visible until payment confirmed

---

## 🏗️ System Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                      │
│  (Agent Interface - Customer Search & Premium Details)       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP API Calls
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    BACKEND SERVICE                           │
│  • Xano Database Integration                                │
│  • ZwennPay API Integration                                 │
│  • Business Logic                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ QR Generation Request
                     │
┌────────────────────▼────────────────────────────────────────┐
│              LOCAL DEVICE SERVICE (NEW)                      │
│  • Runs on agent's computer                                  │
│  • Handles ESP32 communication                               │
│  • HTTP API for QR upload                                    │
│  • Port: 8080 (configurable)                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Serial Communication (COM3)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                ESP32 PAYMENT TERMINAL                        │
│  • 320x480 Display                                           │
│  • Shows QR Code                                             │
│  • Image Rotation Support                                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Agent searches customer in frontend
   ↓
2. Frontend fetches data from Xano
   ↓
3. Agent views outstanding premium amount
   ↓
4. Agent clicks "Generate QR"
   ↓
5. Backend calls ZwennPay API
   ↓
6. Backend generates QR image (320x480)
   ↓
7. Backend calls Local Device Service
   ↓
8. Local Service uploads QR to ESP32
   ↓
9. QR displayed on device
   ↓
10. Customer scans and pays
   ↓
11. Agent confirms payment
   ↓
12. Device returns to rotation/standby
```

---

## 🔧 Technical Requirements

### Hardware
- **ESP32 Payment Terminal**
  - Display: 320x480 pixels
  - Connection: USB (appears as COM3)
  - Baud Rate: 9600
  - Protocol: Serial communication

### Software - Agent Computer
- **Operating System**: Windows (COM port support)
- **Python**: 3.7 or higher
- **Dependencies**:
  ```
  pyserial==3.5
  Pillow==10.0.0
  qrcode==7.4.2
  Flask==2.3.3
  requests==2.31.0
  ```

### Network
- **Local Service**: HTTP server on port 8080
- **Frontend Access**: Must reach local service (same network or ngrok)

### Permissions
- **COM Port Access**: May require administrator privileges
- **Firewall**: Allow port 8080 for local service

---

## 🎯 Integration Approach

### Option 1: Direct Integration (Recommended for Single Agent)

**Architecture**: Frontend → Backend → Local Service → ESP32

**Pros**:
- Simple setup
- One service to manage
- Direct control

**Cons**:
- Requires local service on each agent computer
- Network dependency

**Use Case**: Single agent or small team in same office

### Option 2: Centralized Service (Recommended for Multiple Agents)

**Architecture**: Frontend → Backend → Centralized Device Manager → Multiple ESP32s

**Pros**:
- One service manages multiple devices
- Centralized monitoring
- Easier updates

**Cons**:
- More complex setup
- Single point of failure

**Use Case**: Multiple agents, multiple devices, call center setup

### Option 3: Hybrid (Recommended for Your Case)

**Architecture**: Frontend → Backend → Local Service (per agent) → ESP32

**Pros**:
- Each agent has dedicated device
- Independent operation
- Scalable

**Cons**:
- Multiple services to deploy

**Use Case**: Field agents with laptops + devices

---

## 💻 Code Components

### Component 1: Configuration File

**File**: `insurance_device_config.py`

```python
# Insurance Premium ESP32 Device Configuration

# Serial Connection Settings
SERIAL_CONFIG = {
    'port': 'COM3',  # Change if device on different port
    'baudrate': 9600,
    'bytesize': 8,
    'parity': 'N',
    'stopbits': 1,
    'timeout': 5,
    'write_timeout': 5,
    'xonxoff': False,
    'rtscts': False,
    'dsrdtr': False
}

# Local Service Settings
SERVICE_CONFIG = {
    'host': '0.0.0.0',  # Listen on all interfaces
    'port': 8080,       # Service port
    'debug': False      # Set True for development
}

# API Security
API_CONFIG = {
    'api_key': 'your-secure-api-key-here',  # Change this!
    'require_auth': True
}

# ZwennPay Settings (from your existing system)
ZWENNPAY_CONFIG = {
    'merchant_id': 56,  # Your merchant ID
    'api_url': 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR',
    'timeout': 20
}

# Image Settings
IMAGE_CONFIG = {
    'width': 320,
    'height': 480,
    'max_size_kb': 80,
    'qr_size': 250,
    'quality': 70,
    'format': 'JPEG'
}

# Device Settings
DEVICE_CONFIG = {
    'upload_slot': 1,           # Slot for QR codes
    'chunk_size': 1024,         # Upload chunk size
    'rotation_enabled': True,   # Enable image rotation
    'display_timeout': 300      # 5 minutes before auto-return to rotation
}

# Logging
LOGGING_CONFIG = {
    'level': 'INFO',
    'log_file': 'insurance_device_{date}.log',
    'log_to_console': True,
    'log_to_file': True
}

# Company Info (for receipts/display)
COMPANY_INFO = {
    'name': 'Your Insurance Company',
    'phone': '+230 XXXX XXXX',
    'email': 'payments@insurance.mu'
}
```

### Component 2: ESP32 Communication Handler

**File**: `insurance_esp32_handler.py`

```python
"""
ESP32 Communication Handler for Insurance Premium System
Handles all serial communication with ESP32 device
"""

import serial
import serial.tools.list_ports
import logging
import time
import os
from datetime import datetime
from typing import Optional
from PIL import Image
from insurance_device_config import SERIAL_CONFIG, IMAGE_CONFIG, DEVICE_CONFIG

class InsuranceESP32Handler:
    """Handles ESP32 device communication for insurance premium QR display"""
    
    def __init__(self, com_port: str = None):
        self.com_port = com_port or SERIAL_CONFIG['port']
        self.ser: Optional[serial.Serial] = None
        self.setup_logging()
        
        # Image constraints
        self.max_width = IMAGE_CONFIG['width']
        self.max_height = IMAGE_CONFIG['height']
        self.max_file_size_kb = IMAGE_CONFIG['max_size_kb']
    
    def setup_logging(self):
        """Setup logging configuration"""
        log_filename = f"insurance_device_{datetime.now().strftime('%Y%m%d')}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_filename),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def list_available_ports(self):
        """List all available COM ports"""
        ports = serial.tools.list_ports.comports()
        available = []
        for port in ports:
            available.append({
                'port': port.device,
                'description': port.description,
                'hwid': port.hwid
            })
        return available
    
    def connect(self) -> bool:
        """Establish connection to ESP32 device"""
        try:
            self.logger.info(f"Connecting to ESP32 on {self.com_port}...")
            
            self.ser = serial.Serial(
                port=self.com_port,
                baudrate=SERIAL_CONFIG['baudrate'],
                bytesize=SERIAL_CONFIG['bytesize'],
                parity=SERIAL_CONFIG['parity'],
                stopbits=SERIAL_CONFIG['stopbits'],
                timeout=SERIAL_CONFIG['timeout'],
                write_timeout=SERIAL_CONFIG['write_timeout'],
                xonxoff=SERIAL_CONFIG['xonxoff'],
                rtscts=SERIAL_CONFIG['rtscts'],
                dsrdtr=SERIAL_CONFIG['dsrdtr']
            )
            
            # Wait for connection to stabilize
            time.sleep(2)
            
            if self.ser.is_open:
                self.logger.info(f"✓ Connected to ESP32 on {self.com_port}")
                return True
            else:
                self.logger.error("Failed to open serial connection")
                return False
                
        except serial.SerialException as e:
            self.logger.error(f"Serial connection error: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            return False
    
    def disconnect(self):
        """Close connection to ESP32"""
        if self.ser and self.ser.is_open:
            try:
                self.ser.close()
                self.logger.info("ESP32 connection closed")
            except Exception as e:
                self.logger.error(f"Error closing connection: {e}")
    
    def is_connected(self) -> bool:
        """Check if device is connected"""
        return self.ser is not None and self.ser.is_open
    
    def send_command(self, command: str) -> Optional[str]:
        """Send command to ESP32 and read response"""
        if not self.is_connected():
            self.logger.error("Device not connected")
            return None
        
        try:
            self.logger.debug(f"Sending: {command}")
            self.ser.write((command + '\n').encode('utf-8'))
            self.ser.flush()
            
            response = self.ser.readline().decode('utf-8').strip()
            self.logger.debug(f"Received: {response}")
            return response
            
        except Exception as e:
            self.logger.error(f"Command error: {e}")
            return None
    
    def send_command_with_response(self, command: str, timeout_iterations: int = 100) -> str:
        """Send command and wait for complete response ending with 'exit'"""
        if not self.is_connected():
            self.logger.error("Device not connected")
            return ""
        
        try:
            self.logger.debug(f"Sending: {command}")
            self.ser.write((command + '\n').encode('utf-8'))
            self.ser.flush()
            
            response = ""
            for i in range(timeout_iterations):
                try:
                    line = self.ser.readline().decode('utf-8').strip()
                    if line:
                        response += line + "\n"
                        if line.lower().strip() == "exit":
                            break
                    time.sleep(0.1)
                except:
                    break
            
            return response.strip()
            
        except Exception as e:
            self.logger.error(f"Command error: {e}")
            return ""
    
    def validate_image(self, image_path: str) -> bool:
        """Validate image meets ESP32 requirements"""
        try:
            if not os.path.exists(image_path):
                self.logger.error(f"Image not found: {image_path}")
                return False
            
            # Check file size
            file_size_kb = os.path.getsize(image_path) / 1024
            if file_size_kb > self.max_file_size_kb:
                self.logger.error(f"Image too large: {file_size_kb:.1f}KB (max: {self.max_file_size_kb}KB)")
                return False
            
            # Check dimensions
            with Image.open(image_path) as img:
                width, height = img.size
                if width != self.max_width or height != self.max_height:
                    self.logger.error(f"Invalid dimensions: {width}x{height} (required: {self.max_width}x{self.max_height})")
                    return False
            
            self.logger.info(f"Image validation passed: {file_size_kb:.1f}KB")
            return True
            
        except Exception as e:
            self.logger.error(f"Validation error: {e}")
            return False
    
    def upload_image(self, image_path: str, file_number: int = None, chunk_size: int = None) -> bool:
        """Upload image to ESP32 device"""
        try:
            file_number = file_number or DEVICE_CONFIG['upload_slot']
            chunk_size = chunk_size or DEVICE_CONFIG['chunk_size']
            
            if not (1 <= file_number <= 99):
                self.logger.error("File number must be between 1 and 99")
                return False
            
            if not self.validate_image(image_path):
                return False
            
            # Read image file
            with open(image_path, 'rb') as f:
                file_bytes = f.read()
            
            file_size = len(file_bytes)
            filename = f"{file_number}.jpeg"
            
            self.logger.info(f"Uploading {filename} ({file_size} bytes, chunk: {chunk_size})")
            
            # Send upload command
            command = f"sending**{filename}**{file_size}**{chunk_size}"
            response = self.send_command_with_response(command)
            
            if "start" not in response.lower():
                self.logger.error("ESP32 did not confirm upload start")
                return False
            
            self.logger.info("ESP32 ready, sending file data...")
            
            # Send file in chunks
            total_chunks = (file_size + chunk_size - 1) // chunk_size
            
            for i in range(0, file_size, chunk_size):
                chunk_num = (i // chunk_size) + 1
                remaining_bytes = min(chunk_size, file_size - i)
                chunk = file_bytes[i:i + remaining_bytes]
                
                self.logger.info(f"Chunk {chunk_num}/{total_chunks} ({remaining_bytes} bytes)")
                
                # Clear buffer
                try:
                    self.ser.read_all()
                except:
                    pass
                
                # Send chunk
                self.ser.write(chunk)
                self.ser.flush()
                
                # Wait for acknowledgment
                ack_received = False
                for attempt in range(50):
                    try:
                        line = self.ser.readline().decode('utf-8').strip()
                        if line and "ok" in line.lower():
                            ack_received = True
                            break
                    except:
                        pass
                    time.sleep(0.1)
                
                if not ack_received:
                    self.logger.error(f"No acknowledgment for chunk {chunk_num}")
                    return False
            
            self.logger.info("✓ Upload completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Upload error: {e}")
            return False
    
    def stop_rotation(self) -> bool:
        """Stop image rotation to display QR"""
        try:
            response = self.send_command("stoprotation")
            self.logger.info("Rotation stopped")
            return True
        except Exception as e:
            self.logger.error(f"Error stopping rotation: {e}")
            return False
    
    def start_rotation(self) -> bool:
        """Start image rotation"""
        try:
            response = self.send_command("startrotation")
            self.logger.info("Rotation started")
            return True
        except Exception as e:
            self.logger.error(f"Error starting rotation: {e}")
            return False
    
    def get_free_memory(self) -> Optional[int]:
        """Get available memory on ESP32"""
        try:
            response = self.send_command_with_response("freeSize")
            import re
            match = re.search(r'(\d+)\s*exit', response.lower())
            if match:
                memory_kb = int(match.group(1))
                self.logger.info(f"Free memory: {memory_kb} KB")
                return memory_kb
            return None
        except Exception as e:
            self.logger.error(f"Error getting memory: {e}")
            return None
```

### Component 3: QR Generator

**File**: `insurance_qr_generator.py`

```python
"""
QR Code Generator for Insurance Premium Payments
Integrates with ZwennPay API and creates ESP32-compatible images
"""

import requests
import qrcode
from PIL import Image, ImageDraw, ImageFont
import os
from datetime import datetime
from insurance_device_config import ZWENNPAY_CONFIG, IMAGE_CONFIG, COMPANY_INFO

class InsuranceQRGenerator:
    """Generate QR codes for insurance premium payments"""
    
    def __init__(self):
        self.merchant_id = ZWENNPAY_CONFIG['merchant_id']
        self.api_url = ZWENNPAY_CONFIG['api_url']
        self.timeout = ZWENNPAY_CONFIG['timeout']
    
    def generate_qr_for_premium(self, 
                                amount: float, 
                                customer_name: str = None,
                                policy_number: str = None,
                                output_filename: str = None) -> dict:
        """
        Generate QR code for insurance premium payment
        
        Args:
            amount: Premium amount in MUR
            customer_name: Customer name (optional, for display)
            policy_number: Policy number (optional, for display)
            output_filename: Output file path (optional)
        
        Returns:
            dict with 'success', 'filename', 'message', 'qr_data'
        """
        try:
            # Generate filename if not provided
            if not output_filename:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                output_filename = f"insurance_qr_{timestamp}.jpg"
            
            print(f"Generating QR for premium: MUR {amount}")
            
            # Step 1: Call ZwennPay API
            qr_data = self._call_zwennpay_api(amount)
            if not qr_data:
                return {
                    'success': False,
                    'message': 'Failed to get payment data from ZwennPay',
                    'filename': None,
                    'qr_data': None
                }
            
            # Step 2: Generate QR code image
            qr_image = self._create_qr_image(qr_data)
            
            # Step 3: Create 320x480 canvas
            canvas = self._create_canvas(qr_image, amount, customer_name, policy_number)
            
            # Step 4: Save as JPEG
            canvas.save(output_filename, 'JPEG', quality=IMAGE_CONFIG['quality'])
            
            # Verify file size
            file_size_kb = os.path.getsize(output_filename) / 1024
            print(f"✓ QR generated: {output_filename} ({file_size_kb:.1f}KB)")
            
            return {
                'success': True,
                'filename': output_filename,
                'message': f'QR generated for MUR {amount}',
                'qr_data': qr_data,
                'file_size_kb': file_size_kb
            }
            
        except Exception as e:
            print(f"✗ Error generating QR: {e}")
            return {
                'success': False,
                'message': str(e),
                'filename': None,
                'qr_data': None
            }
    
    def _call_zwennpay_api(self, amount: float) -> str:
        """Call ZwennPay API to get payment QR data"""
        try:
            payload = {
                "MerchantId": self.merchant_id,
                "SetTransactionAmount": True,
                "TransactionAmount": str(amount),
                "SetConvenienceIndicatorTip": False,
                "ConvenienceIndicatorTip": 0,
                "SetConvenienceFeeFixed": False,
                "ConvenienceFeeFixed": 0,
                "SetConvenienceFeePercentage": False,
                "ConvenienceFeePercentage": 0,
            }
            
            response = requests.post(
                self.api_url,
                headers={"accept": "text/plain", "Content-Type": "application/json"},
                json=payload,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            qr_data = response.text.strip()
            print(f"✓ Got payment data: {len(qr_data)} characters")
            return qr_data
            
        except requests.exceptions.Timeout:
            print("✗ ZwennPay API timeout")
            return None
        except requests.exceptions.RequestException as e:
            print(f"✗ ZwennPay API error: {e}")
            return None
    
    def _create_qr_image(self, qr_data: str):
        """Create QR code image from data"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        return qr.make_image(fill_color="black", back_color="white")
    
    def _create_canvas(self, qr_image, amount: float, customer_name: str = None, policy_number: str = None):
        """Create 320x480 canvas with QR and text"""
        # Create canvas
        canvas = Image.new('RGB', (IMAGE_CONFIG['width'], IMAGE_CONFIG['height']), 'white')
        
        # Resize and position QR
        qr_size = IMAGE_CONFIG['qr_size']
        qr_resized = qr_image.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        
        x_offset = (IMAGE_CONFIG['width'] - qr_size) // 2
        y_offset = 40  # Top margin
        canvas.paste(qr_resized, (x_offset, y_offset))
        
        # Add text
        draw = ImageDraw.Draw(canvas)
        
        # Try to load font
        try:
            font_large = ImageFont.truetype("arial.ttf", 24)
            font_medium = ImageFont.truetype("arial.ttf", 18)
            font_small = ImageFont.truetype("arial.ttf", 14)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Calculate text positions
        text_y = y_offset + qr_size + 20
        
        # Amount (bold, large)
        amount_text = f"Amount: MUR {amount:.2f}"
        bbox = draw.textbbox((0, 0), amount_text, font=font_large)
        text_width = bbox[2] - bbox[0]
        text_x = (IMAGE_CONFIG['width'] - text_width) // 2
        draw.text((text_x, text_y), amount_text, fill='black', font=font_large)
        text_y += 35
        
        # Customer name (if provided)
        if customer_name:
            name_text = f"Customer: {customer_name}"
            bbox = draw.textbbox((0, 0), name_text, font=font_medium)
            text_width = bbox[2] - bbox[0]
            text_x = (IMAGE_CONFIG['width'] - text_width) // 2
            draw.text((text_x, text_y), name_text, fill='black', font=font_medium)
            text_y += 25
        
        # Policy number (if provided)
        if policy_number:
            policy_text = f"Policy: {policy_number}"
            bbox = draw.textbbox((0, 0), policy_text, font=font_medium)
            text_width = bbox[2] - bbox[0]
            text_x = (IMAGE_CONFIG['width'] - text_width) // 2
            draw.text((text_x, text_y), policy_text, fill='black', font=font_medium)
            text_y += 25
        
        # Company info at bottom
        company_text = COMPANY_INFO['name']
        bbox = draw.textbbox((0, 0), company_text, font=font_small)
        text_width = bbox[2] - bbox[0]
        text_x = (IMAGE_CONFIG['width'] - text_width) // 2
        draw.text((text_x, IMAGE_CONFIG['height'] - 30), company_text, fill='gray', font=font_small)
        
        return canvas
```

---

*Document continues in next part...*
