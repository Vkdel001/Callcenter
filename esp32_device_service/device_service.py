#!/usr/bin/env python3
"""
ESP32 Device Service - Simplified Version
Receives QR images from web app and displays on ESP32 device
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import serial
import serial.tools.list_ports
import time
import logging
from datetime import datetime
from PIL import Image
import requests
from io import BytesIO
import os

# Configuration
COM_PORT = 'COM3'  # Change based on Device Manager
BAUD_RATE = 9600
SERVICE_PORT = 5000  # Changed from 8080 due to port conflict
API_KEY = 'NIC-LOCAL-DEVICE-KEY-2024'  # Change this!
DEVICE_WIDTH = 320
DEVICE_HEIGHT = 480
MAX_FILE_SIZE_KB = 80
CHUNK_SIZE = 1024

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'device_service_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for local development

# Global device connection
device = None

def connect_device():
    """Connect to ESP32 device"""
    global device
    try:
        logger.info(f"Connecting to ESP32 on {COM_PORT}...")
        device = serial.Serial(
            port=COM_PORT,
            baudrate=BAUD_RATE,
            bytesize=8,
            parity='N',
            stopbits=1,
            timeout=5,
            write_timeout=5
        )
        time.sleep(2)  # Wait for connection to stabilize
        
        if device.is_open:
            logger.info(f"[OK] Connected to ESP32 on {COM_PORT}")
            return True
        else:
            logger.error("Failed to open serial connection")
            return False
    except Exception as e:
        logger.error(f"Device connection error: {e}")
        return False

def is_device_connected():
    """Check if device is connected"""
    return device is not None and device.is_open

def send_command(command):
    """Send command to ESP32 and get single-line response (for rotation commands)"""
    if not is_device_connected():
        return None
    
    try:
        logger.debug(f"Sending: {command}")
        device.write((command + '\n').encode('utf-8'))
        device.flush()
        
        response = device.readline().decode('utf-8').strip()
        logger.debug(f"Received: {response}")
        return response
    except Exception as e:
        logger.error(f"Command error: {e}")
        return None

def send_command_with_response(command, timeout_iterations=100):
    """Send command and wait for complete response ending with 'exit'"""
    if not is_device_connected():
        logger.error("Device not connected")
        return ""
    
    try:
        logger.info(f"Sending command: {command}")
        device.write((command + '\n').encode('utf-8'))
        device.flush()
        
        response = ""
        for i in range(timeout_iterations):
            try:
                line = device.readline().decode('utf-8').strip()
                if line:
                    response += line + "\n"
                    logger.debug(f"Response line: {line}")
                    if line.lower().strip() == "exit":
                        break
                time.sleep(0.1)
            except:
                break
        
        logger.info(f"Complete response received: {response[:200]}...")
        return response.strip()
        
    except Exception as e:
        logger.error(f"Command error: {e}")
        return ""
        return None

def stop_rotation():
    """Stop image rotation"""
    try:
        send_command("stoprotation")
        logger.info("Rotation stopped")
        return True
    except Exception as e:
        logger.error(f"Error stopping rotation: {e}")
        return False

def start_rotation():
    """Start image rotation"""
    try:
        send_command("startrotation")
        logger.info("Rotation started")
        return True
    except Exception as e:
        logger.error(f"Error starting rotation: {e}")
        return False

def download_and_resize_image(image_url):
    """Download QR image from URL or decode from data URI"""
    try:
        logger.info(f"Processing image from: {image_url[:100]}...")
        
        # Check if it's a data URI
        if image_url.startswith('data:'):
            logger.info("Detected data URI, decoding base64...")
            import base64
            import re
            
            # Extract base64 data
            match = re.match(r'data:image/[^;]+;base64,(.+)', image_url)
            if not match:
                raise ValueError("Invalid data URI format")
            
            base64_data = match.group(1)
            image_data = base64.b64decode(base64_data)
            logger.info(f"Decoded {len(image_data)} bytes from base64")
            
            # Open image from bytes
            img = Image.open(BytesIO(image_data))
        else:
            # Download from HTTP/HTTPS URL
            logger.info("Downloading from URL...")
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            logger.info(f"Downloaded {len(response.content)} bytes")
            img = Image.open(BytesIO(response.content))
        
        logger.info(f"Original image: {img.size}, mode: {img.mode}")
        
        # Convert and resize
        img = img.convert('RGB')
        img = img.resize((DEVICE_WIDTH, DEVICE_HEIGHT), Image.Resampling.LANCZOS)
        
        # Save to temp file
        temp_filename = f'temp_qr_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg'
        img.save(temp_filename, 'JPEG', quality=85, optimize=True)
        
        # Check file size
        file_size_kb = os.path.getsize(temp_filename) / 1024
        logger.info(f"Image prepared: {DEVICE_WIDTH}x{DEVICE_HEIGHT}, {file_size_kb:.1f}KB")
        
        if file_size_kb > MAX_FILE_SIZE_KB:
            logger.warning(f"Image too large ({file_size_kb:.1f}KB), reducing quality...")
            img.save(temp_filename, 'JPEG', quality=70, optimize=True)
            file_size_kb = os.path.getsize(temp_filename) / 1024
            logger.info(f"Reduced to {file_size_kb:.1f}KB")
        
        return temp_filename
    except Exception as e:
        logger.error(f"Image processing error: {e}", exc_info=True)
        return None

def upload_image_to_device(image_path, file_number=1):
    """Upload image to ESP32 device"""
    try:
        if not is_device_connected():
            logger.error("Device not connected")
            return False
        
        # Read image file
        with open(image_path, 'rb') as f:
            file_bytes = f.read()
        
        file_size = len(file_bytes)
        filename = f"{file_number}.jpeg"
        
        logger.info(f"Uploading {filename} ({file_size} bytes, chunk: {CHUNK_SIZE})")
        
        # Send upload command and wait for complete response
        command = f"sending**{filename}**{file_size}**{CHUNK_SIZE}"
        response = send_command_with_response(command)
        
        if not response or "start" not in response.lower():
            logger.error("ESP32 did not confirm upload start")
            logger.error(f"Response was: {response}")
            return False
        
        logger.info("ESP32 ready, sending file data...")
        
        # Send file in chunks
        total_chunks = (file_size + CHUNK_SIZE - 1) // CHUNK_SIZE
        
        for i in range(0, file_size, CHUNK_SIZE):
            chunk_num = (i // CHUNK_SIZE) + 1
            remaining_bytes = min(CHUNK_SIZE, file_size - i)
            chunk = file_bytes[i:i + remaining_bytes]
            
            logger.info(f"Chunk {chunk_num}/{total_chunks} ({remaining_bytes} bytes)")
            
            # Clear buffer
            try:
                device.read_all()
            except:
                pass
            
            # Send chunk
            device.write(chunk)
            device.flush()
            
            # Wait for acknowledgment
            ack_received = False
            for attempt in range(50):
                try:
                    line = device.readline().decode('utf-8').strip()
                    if line and "ok" in line.lower():
                        ack_received = True
                        break
                except:
                    pass
                time.sleep(0.1)
            
            if not ack_received:
                logger.error(f"No acknowledgment for chunk {chunk_num}")
                return False
        
        logger.info("[OK] Upload completed successfully")
        return True
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    device_status = 'connected' if is_device_connected() else 'disconnected'
    return jsonify({
        'status': 'online',
        'service': 'ESP32 Device Service (Simplified)',
        'device': device_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/qr/display', methods=['POST'])
def display_qr():
    """Receive QR image URL and display on device"""
    # Verify API key
    if request.headers.get('X-API-Key') != API_KEY:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        qr_image_url = data.get('qr_image_url')
        customer_name = data.get('customer_name', 'Customer')
        policy_number = data.get('policy_number', 'N/A')
        amount = data.get('amount', 0)
        
        if not qr_image_url:
            return jsonify({'error': 'Missing qr_image_url'}), 400
        
        logger.info(f"QR display request: {customer_name}, Policy: {policy_number}, Amount: {amount}")
        
        # Check device
        if not is_device_connected():
            return jsonify({
                'success': False,
                'error': 'Device not connected'
            }), 503
        
        # Download and resize image
        temp_file = download_and_resize_image(qr_image_url)
        if not temp_file:
            return jsonify({
                'success': False,
                'error': 'Failed to process image'
            }), 500
        
        # Upload to device
        upload_success = upload_image_to_device(temp_file)
        
        # Clean up temp file
        try:
            os.remove(temp_file)
        except:
            pass
        
        if upload_success:
            # Stop rotation to display QR
            stop_rotation()
            
            return jsonify({
                'success': True,
                'message': f'QR displayed for {customer_name}',
                'amount': amount,
                'policy_number': policy_number,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to upload to device'
            }), 500
    
    except Exception as e:
        logger.error(f"Display QR error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/qr/complete', methods=['POST'])
def payment_complete():
    """Mark payment as complete and restart rotation"""
    try:
        logger.info("Payment completed, restarting rotation")
        start_rotation()
        return jsonify({
            'success': True,
            'message': 'Rotation restarted'
        })
    except Exception as e:
        logger.error(f"Payment complete error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/device/reconnect', methods=['POST'])
def reconnect():
    """Force device reconnection"""
    global device
    
    try:
        # Disconnect existing
        if device:
            device.close()
            device = None
        
        # Reconnect
        if connect_device():
            return jsonify({
                'success': True,
                'message': 'Device reconnected'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to reconnect'
            }), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("="*60)
    print("ESP32 DEVICE SERVICE (SIMPLIFIED)")
    print("="*60)
    print(f"Service URL: http://localhost:{SERVICE_PORT}")
    print(f"API Key: {API_KEY[:15]}...")
    print("="*60)
    print("Connecting to ESP32 device...")
    print("="*60)
    
    # Connect to device
    if connect_device():
        print("[OK] ESP32 device connected successfully")
    else:
        print("[ERROR] ESP32 device not found")
        print("  Service will start but QR display will fail")
        print("  Please check:")
        print("  - ESP32 is connected to USB")
        print("  - COM port is correct in config")
        print("  - No other program is using the port")
    
    print("="*60)
    print("Service is ready!")
    print("="*60)
    
    app.run(
        host='0.0.0.0',
        port=SERVICE_PORT,
        debug=False
    )
