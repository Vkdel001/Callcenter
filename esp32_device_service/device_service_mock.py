#!/usr/bin/env python3
"""
ESP32 Device Service - Mock Mode
For testing integration without physical device
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from PIL import Image
import requests
from io import BytesIO
import os
import urllib3

# Disable SSL warnings for development
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
SERVICE_PORT = 5000
API_KEY = "NIC-LOCAL-DEVICE-KEY-2024"
DEVICE_WIDTH = 320
DEVICE_HEIGHT = 480

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'device_service_mock_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-API-Key"]
    }
})

# Mock device state
mock_device_connected = True
last_qr_displayed = None

def download_and_resize_image(image_url):
    """Download QR image from URL or decode from data URI"""
    try:
        logger.info(f"[MOCK] Processing image from: {image_url[:100]}...")
        
        # Check if it's a data URI
        if image_url.startswith('data:'):
            logger.info("[MOCK] Detected data URI, decoding base64...")
            import base64
            import re
            
            # Extract base64 data
            match = re.match(r'data:image/[^;]+;base64,(.+)', image_url)
            if not match:
                raise ValueError("Invalid data URI format")
            
            base64_data = match.group(1)
            image_data = base64.b64decode(base64_data)
            logger.info(f"[MOCK] Decoded {len(image_data)} bytes from base64")
            
            # Open image from bytes
            img = Image.open(BytesIO(image_data))
        else:
            # Download from HTTP/HTTPS URL
            logger.info("[MOCK] Downloading from URL...")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/png,image/jpeg,image/*,*/*'
            }
            
            response = requests.get(image_url, headers=headers, timeout=15, verify=False)
            response.raise_for_status()
            
            logger.info(f"[MOCK] Downloaded {len(response.content)} bytes")
            img = Image.open(BytesIO(response.content))
        
        logger.info(f"[MOCK] Original image: {img.size}, mode: {img.mode}")
        
        # Convert and resize
        img = img.convert('RGB')
        img = img.resize((DEVICE_WIDTH, DEVICE_HEIGHT), Image.Resampling.LANCZOS)
        
        # Save to temp file
        temp_filename = f'mock_qr_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg'
        img.save(temp_filename, 'JPEG', quality=85, optimize=True)
        
        file_size_kb = os.path.getsize(temp_filename) / 1024
        logger.info(f"[MOCK] Image prepared: {DEVICE_WIDTH}x{DEVICE_HEIGHT}, {file_size_kb:.1f}KB")
        
        return temp_filename
    except requests.exceptions.RequestException as e:
        logger.error(f"[MOCK] Download error: {e}")
        return None
    except Exception as e:
        logger.error(f"[MOCK] Image processing error: {e}", exc_info=True)
        return None

def mock_upload_to_device(image_path):
    """Simulate upload to ESP32 device"""
    try:
        global last_qr_displayed
        
        if not mock_device_connected:
            logger.error("[MOCK] Device not connected")
            return False
        
        file_size = os.path.getsize(image_path)
        logger.info(f"[MOCK] Simulating upload of {image_path} ({file_size} bytes)")
        
        # Simulate upload process
        import time
        time.sleep(1)  # Simulate upload time
        
        # Store reference to displayed QR
        last_qr_displayed = {
            'file': image_path,
            'size': file_size,
            'timestamp': datetime.now()
        }
        
        logger.info("[MOCK] Upload completed successfully")
        logger.info(f"[MOCK] QR now displayed on virtual device: {image_path}")
        
        return True
    except Exception as e:
        logger.error(f"[MOCK] Upload error: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    device_status = 'connected' if mock_device_connected else 'disconnected'
    return jsonify({
        'status': 'online',
        'service': 'ESP32 Device Service (MOCK MODE)',
        'device': device_status,
        'mode': 'mock',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/qr/display', methods=['POST', 'OPTIONS'])
def display_qr():
    """Receive QR image URL and simulate display on device"""
    # Handle preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    # Verify API key
    if request.headers.get('X-API-Key') != API_KEY:
        logger.warning(f"[MOCK] Unauthorized request from {request.remote_addr}")
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        qr_image_url = data.get('qr_image_url')
        customer_name = data.get('customer_name', 'Customer')
        policy_number = data.get('policy_number', 'N/A')
        amount = data.get('amount', 0)
        
        if not qr_image_url:
            return jsonify({'error': 'Missing qr_image_url'}), 400
        
        logger.info(f"[MOCK] QR display request: {customer_name}, Policy: {policy_number}, Amount: {amount}")
        
        # Check mock device
        if not mock_device_connected:
            return jsonify({
                'success': False,
                'error': 'Mock device not connected'
            }), 503
        
        # Download and resize image
        temp_file = download_and_resize_image(qr_image_url)
        if not temp_file:
            return jsonify({
                'success': False,
                'error': 'Failed to process image'
            }), 500
        
        # Simulate upload to device
        upload_success = mock_upload_to_device(temp_file)
        
        if upload_success:
            return jsonify({
                'success': True,
                'message': f'QR displayed on MOCK device for {customer_name}',
                'amount': amount,
                'policy_number': policy_number,
                'mode': 'mock',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to upload to mock device'
            }), 500
    
    except Exception as e:
        logger.error(f"[MOCK] Display QR error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/qr/complete', methods=['POST'])
def payment_complete():
    """Mark payment as complete"""
    try:
        logger.info("[MOCK] Payment completed")
        return jsonify({
            'success': True,
            'message': 'Payment marked complete (mock mode)'
        })
    except Exception as e:
        logger.error(f"[MOCK] Payment complete error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/device/status', methods=['GET'])
def device_status():
    """Get mock device status"""
    global last_qr_displayed
    return jsonify({
        'connected': mock_device_connected,
        'mode': 'mock',
        'last_qr': last_qr_displayed,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/device/toggle', methods=['POST'])
def toggle_device():
    """Toggle mock device connection for testing"""
    global mock_device_connected
    mock_device_connected = not mock_device_connected
    status = 'connected' if mock_device_connected else 'disconnected'
    logger.info(f"[MOCK] Device toggled to: {status}")
    return jsonify({
        'success': True,
        'device': status
    })

if __name__ == '__main__':
    print("="*60)
    print("ESP32 DEVICE SERVICE (MOCK MODE)")
    print("="*60)
    print(f"Service URL: http://localhost:{SERVICE_PORT}")
    print(f"API Key: {API_KEY[:15]}...")
    print("="*60)
    print("🎭 MOCK MODE ENABLED")
    print("   - No physical device required")
    print("   - Simulates all device operations")
    print("   - Perfect for testing integration")
    print("="*60)
    print("Mock device status: CONNECTED")
    print("="*60)
    print("Service is ready!")
    print("="*60)
    print("\nEndpoints:")
    print(f"  Health: http://localhost:{SERVICE_PORT}/health")
    print(f"  Status: http://localhost:{SERVICE_PORT}/device/status")
    print(f"  Toggle: http://localhost:{SERVICE_PORT}/device/toggle")
    print("="*60)
    
    app.run(
        host='0.0.0.0',
        port=SERVICE_PORT,
        debug=False
    )
