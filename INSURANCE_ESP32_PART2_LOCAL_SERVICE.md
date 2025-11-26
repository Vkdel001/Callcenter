### Component 4: Local Device Service (HTTP API)

**File**: `insurance_local_service.py`

```python
"""
Local Device Service for Insurance Premium System
HTTP API to handle ESP32 device communication
Runs on agent's computer
"""

from flask import Flask, request, jsonify
import os
import logging
from datetime import datetime
from insurance_esp32_handler import InsuranceESP32Handler
from insurance_qr_generator import InsuranceQRGenerator
from insurance_device_config import SERVICE_CONFIG, API_CONFIG

app = Flask(__name__)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global device handler (persistent connection)
device_handler = None
qr_generator = InsuranceQRGenerator()

def get_device_handler():
    """Get or create persistent device connection"""
    global device_handler
    if device_handler is None:
        device_handler = InsuranceESP32Handler()
        if not device_handler.connect():
            logger.error("Failed to connect to ESP32 device")
            device_handler = None
            return None
    return device_handler

def verify_api_key():
    """Verify API key from request"""
    if not API_CONFIG['require_auth']:
        return True
    
    api_key = request.headers.get('X-API-Key')
    if api_key != API_CONFIG['api_key']:
        return False
    return True

@app.before_request
def check_auth():
    """Check authentication for all requests except health"""
    if request.endpoint == 'health':
        return None
    
    if not verify_api_key():
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid API key'}), 401

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    handler = get_device_handler()
    device_status = 'connected' if handler and handler.is_connected() else 'disconnected'
    
    return jsonify({
        'status': 'online',
        'service': 'Insurance Premium Device Service',
        'device': device_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/device/status', methods=['GET'])
def device_status():
    """Get device status and information"""
    handler = get_device_handler()
    
    if not handler or not handler.is_connected():
        return jsonify({
            'connected': False,
            'message': 'Device not connected'
        }), 503
    
    # Get device info
    memory = handler.get_free_memory()
    
    return jsonify({
        'connected': True,
        'port': handler.com_port,
        'free_memory_kb': memory,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/device/ports', methods=['GET'])
def list_ports():
    """List available COM ports"""
    handler = InsuranceESP32Handler()
    ports = handler.list_available_ports()
    return jsonify({'ports': ports})

@app.route('/qr/generate', methods=['POST'])
def generate_qr():
    """
    Generate QR code and upload to device
    
    Request Body:
    {
        "amount": 1500.00,
        "customer_name": "John Doe",  // optional
        "policy_number": "POL123456",  // optional
        "customer_id": "CUST001",      // optional (for tracking)
        "agent_id": "AGT001"           // optional (for tracking)
    }
    """
    try:
        data = request.json
        
        # Validate required fields
        if not data or 'amount' not in data:
            return jsonify({'error': 'Missing required field: amount'}), 400
        
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        customer_name = data.get('customer_name')
        policy_number = data.get('policy_number')
        customer_id = data.get('customer_id')
        agent_id = data.get('agent_id')
        
        logger.info(f"QR request: MUR {amount} for {customer_name or 'Unknown'} (Policy: {policy_number or 'N/A'})")
        
        # Step 1: Generate QR code
        result = qr_generator.generate_qr_for_premium(
            amount=amount,
            customer_name=customer_name,
            policy_number=policy_number
        )
        
        if not result['success']:
            return jsonify({
                'error': 'QR generation failed',
                'message': result['message']
            }), 500
        
        qr_filename = result['filename']
        
        # Step 2: Upload to device
        handler = get_device_handler()
        if not handler or not handler.is_connected():
            # Clean up QR file
            try:
                os.remove(qr_filename)
            except:
                pass
            return jsonify({
                'error': 'Device not connected',
                'message': 'ESP32 device is not available'
            }), 503
        
        logger.info("Uploading QR to ESP32...")
        upload_success = handler.upload_image(qr_filename)
        
        # If upload failed, try reconnecting once
        if not upload_success:
            logger.warning("Upload failed, attempting to reconnect...")
            global device_handler
            device_handler = None
            handler = get_device_handler()
            if handler:
                upload_success = handler.upload_image(qr_filename)
        
        if upload_success:
            # Stop rotation to display QR
            logger.info("Stopping rotation to display QR...")
            try:
                handler.stop_rotation()
            except Exception as e:
                logger.warning(f"Could not stop rotation: {e}")
            
            # Clean up temp file
            try:
                os.remove(qr_filename)
            except:
                pass
            
            logger.info("✓ QR uploaded and displayed successfully")
            
            return jsonify({
                'success': True,
                'message': f'QR code displayed for MUR {amount}',
                'amount': amount,
                'customer_name': customer_name,
                'policy_number': policy_number,
                'timestamp': datetime.now().isoformat()
            })
        else:
            # Clean up temp file
            try:
                os.remove(qr_filename)
            except:
                pass
            
            logger.error("Failed to upload QR to device")
            return jsonify({
                'error': 'Upload failed',
                'message': 'Could not upload QR to ESP32 device'
            }), 500
        
    except ValueError as e:
        return jsonify({'error': 'Invalid data', 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in generate_qr: {e}")
        return jsonify({'error': 'Internal error', 'message': str(e)}), 500

@app.route('/qr/complete', methods=['POST'])
def payment_complete():
    """
    Mark payment as complete and restart rotation
    
    Request Body:
    {
        "customer_id": "CUST001",  // optional
        "transaction_id": "TXN123"  // optional
    }
    """
    try:
        data = request.json or {}
        customer_id = data.get('customer_id')
        transaction_id = data.get('transaction_id')
        
        logger.info(f"Payment completed (Customer: {customer_id}, Transaction: {transaction_id})")
        
        handler = get_device_handler()
        if handler and handler.is_connected():
            try:
                handler.start_rotation()
                logger.info("Rotation restarted")
            except Exception as e:
                logger.warning(f"Could not restart rotation: {e}")
        
        return jsonify({
            'success': True,
            'message': 'Payment marked as complete, rotation restarted'
        })
        
    except Exception as e:
        logger.error(f"Error in payment_complete: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/device/rotation/start', methods=['POST'])
def start_rotation():
    """Start image rotation on device"""
    try:
        handler = get_device_handler()
        if not handler or not handler.is_connected():
            return jsonify({'error': 'Device not connected'}), 503
        
        handler.start_rotation()
        return jsonify({'success': True, 'message': 'Rotation started'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/device/rotation/stop', methods=['POST'])
def stop_rotation():
    """Stop image rotation on device"""
    try:
        handler = get_device_handler()
        if not handler or not handler.is_connected():
            return jsonify({'error': 'Device not connected'}), 503
        
        handler.stop_rotation()
        return jsonify({'success': True, 'message': 'Rotation stopped'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/device/reconnect', methods=['POST'])
def reconnect_device():
    """Force device reconnection"""
    try:
        global device_handler
        
        # Disconnect existing
        if device_handler:
            device_handler.disconnect()
            device_handler = None
        
        # Reconnect
        handler = get_device_handler()
        if handler and handler.is_connected():
            return jsonify({
                'success': True,
                'message': 'Device reconnected successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to reconnect device'
            }), 503
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def find_available_port(start_port=8080, max_attempts=10):
    """Find an available port"""
    import socket
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

if __name__ == '__main__':
    # Find available port
    port = find_available_port(SERVICE_CONFIG['port'])
    
    if not port:
        logger.error("Could not find available port")
        exit(1)
    
    print("="*60)
    print("INSURANCE PREMIUM DEVICE SERVICE")
    print("="*60)
    print(f"Service URL: http://localhost:{port}")
    print(f"API Key: {API_CONFIG['api_key'][:10]}...")
    print("="*60)
    print("Connecting to ESP32 device...")
    print("="*60)
    
    # Test device connection
    handler = get_device_handler()
    if handler and handler.is_connected():
        print("✓ ESP32 device connected successfully")
        memory = handler.get_free_memory()
        if memory:
            print(f"✓ Device memory: {memory} KB available")
    else:
        print("✗ ESP32 device not found")
        print("  Service will start but QR generation will fail")
        print("  Please check:")
        print("  - ESP32 is connected to USB")
        print("  - COM port is correct in config")
        print("  - No other program is using the port")
    
    print("="*60)
    print("Service is ready!")
    print("="*60)
    
    app.run(
        debug=SERVICE_CONFIG['debug'],
        host=SERVICE_CONFIG['host'],
        port=port
    )
```

---

## 📡 API Specifications

### Authentication

All endpoints (except `/health`) require API key authentication:

```
Headers:
  X-API-Key: your-secure-api-key-here
```

### Endpoints

#### 1. Health Check
```
GET /health
```

**Response**:
```json
{
  "status": "online",
  "service": "Insurance Premium Device Service",
  "device": "connected",
  "timestamp": "2024-01-15T10:30:00"
}
```

#### 2. Device Status
```
GET /device/status
Headers: X-API-Key: xxx
```

**Response**:
```json
{
  "connected": true,
  "port": "COM3",
  "free_memory_kb": 1024,
  "timestamp": "2024-01-15T10:30:00"
}
```

#### 3. List COM Ports
```
GET /device/ports
Headers: X-API-Key: xxx
```

**Response**:
```json
{
  "ports": [
    {
      "port": "COM3",
      "description": "USB Serial Port",
      "hwid": "USB VID:PID=1234:5678"
    }
  ]
}
```

#### 4. Generate QR (Main Endpoint)
```
POST /qr/generate
Headers: 
  X-API-Key: xxx
  Content-Type: application/json

Body:
{
  "amount": 1500.00,
  "customer_name": "John Doe",
  "policy_number": "POL123456",
  "customer_id": "CUST001",
  "agent_id": "AGT001"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "QR code displayed for MUR 1500.00",
  "amount": 1500.00,
  "customer_name": "John Doe",
  "policy_number": "POL123456",
  "timestamp": "2024-01-15T10:30:00"
}
```

**Response (Error)**:
```json
{
  "error": "Device not connected",
  "message": "ESP32 device is not available"
}
```

#### 5. Payment Complete
```
POST /qr/complete
Headers: X-API-Key: xxx
Content-Type: application/json

Body:
{
  "customer_id": "CUST001",
  "transaction_id": "TXN123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment marked as complete, rotation restarted"
}
```

#### 6. Start Rotation
```
POST /device/rotation/start
Headers: X-API-Key: xxx
```

#### 7. Stop Rotation
```
POST /device/rotation/stop
Headers: X-API-Key: xxx
```

#### 8. Reconnect Device
```
POST /device/reconnect
Headers: X-API-Key: xxx
```

---

## 🔗 Frontend Integration

### JavaScript Example

```javascript
// Configuration
const DEVICE_SERVICE_URL = 'http://localhost:8080';
const API_KEY = 'your-secure-api-key-here';

// Check if device service is online
async function checkDeviceStatus() {
  try {
    const response = await fetch(`${DEVICE_SERVICE_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'online' && data.device === 'connected') {
      console.log('✓ Device service online and connected');
      return true;
    } else {
      console.warn('⚠ Device service online but device disconnected');
      return false;
    }
  } catch (error) {
    console.error('✗ Device service offline:', error);
    return false;
  }
}

// Generate QR on device
async function generateQROnDevice(premiumData) {
  try {
    const response = await fetch(`${DEVICE_SERVICE_URL}/qr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        amount: premiumData.amount,
        customer_name: premiumData.customerName,
        policy_number: premiumData.policyNumber,
        customer_id: premiumData.customerId,
        agent_id: premiumData.agentId
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✓ QR displayed on device');
      return { success: true, data };
    } else {
      console.error('✗ QR generation failed:', data.message);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error('✗ Network error:', error);
    return { success: false, error: error.message };
  }
}

// Mark payment as complete
async function markPaymentComplete(customerId, transactionId) {
  try {
    const response = await fetch(`${DEVICE_SERVICE_URL}/qr/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        customer_id: customerId,
        transaction_id: transactionId
      })
    });
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error marking payment complete:', error);
    return false;
  }
}

// Example usage in your application
async function handleGenerateQR() {
  // Get customer data from your Xano database
  const customerData = {
    amount: 1500.00,
    customerName: 'John Doe',
    policyNumber: 'POL123456',
    customerId: 'CUST001',
    agentId: getCurrentAgentId()
  };
  
  // Check device status first
  const deviceOnline = await checkDeviceStatus();
  if (!deviceOnline) {
    alert('Payment device is not connected. Please check the device.');
    return;
  }
  
  // Show loading indicator
  showLoading('Generating QR on device...');
  
  // Generate QR on device
  const result = await generateQROnDevice(customerData);
  
  hideLoading();
  
  if (result.success) {
    // Show success message
    showSuccess('QR code displayed on payment device. Customer can now scan and pay.');
    
    // Enable "Payment Complete" button
    enablePaymentCompleteButton(customerData.customerId);
  } else {
    // Show error
    showError(`Failed to display QR: ${result.error}`);
  }
}

// When payment is confirmed
async function handlePaymentConfirmed(customerId, transactionId) {
  await markPaymentComplete(customerId, transactionId);
  
  // Update your Xano database
  await updatePaymentStatus(customerId, transactionId, 'completed');
  
  // Show success
  showSuccess('Payment recorded successfully!');
  
  // Reset UI for next customer
  resetForm();
}
```

### React Example

```jsx
import React, { useState, useEffect } from 'react';

const DEVICE_SERVICE_URL = 'http://localhost:8080';
const API_KEY = 'your-secure-api-key-here';

function PremiumPaymentComponent({ customer, premium }) {
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrDisplayed, setQrDisplayed] = useState(false);
  
  // Check device status on mount
  useEffect(() => {
    checkDeviceStatus();
    const interval = setInterval(checkDeviceStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);
  
  const checkDeviceStatus = async () => {
    try {
      const response = await fetch(`${DEVICE_SERVICE_URL}/health`);
      const data = await response.json();
      setDeviceOnline(data.status === 'online' && data.device === 'connected');
    } catch (error) {
      setDeviceOnline(false);
    }
  };
  
  const generateQR = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${DEVICE_SERVICE_URL}/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          amount: premium.amount,
          customer_name: customer.name,
          policy_number: customer.policyNumber,
          customer_id: customer.id,
          agent_id: getCurrentAgentId()
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setQrDisplayed(true);
        alert('QR code displayed on payment device!');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const confirmPayment = async () => {
    try {
      // Mark payment complete on device
      await fetch(`${DEVICE_SERVICE_URL}/qr/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          customer_id: customer.id,
          transaction_id: generateTransactionId()
        })
      });
      
      // Update your Xano database
      await updatePaymentInXano(customer.id, premium.amount);
      
      setQrDisplayed(false);
      alert('Payment confirmed successfully!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  return (
    <div className="premium-payment">
      <h3>Premium Payment</h3>
      
      <div className="device-status">
        {deviceOnline ? (
          <span className="status-online">✓ Device Connected</span>
        ) : (
          <span className="status-offline">✗ Device Offline</span>
        )}
      </div>
      
      <div className="customer-info">
        <p><strong>Customer:</strong> {customer.name}</p>
        <p><strong>Policy:</strong> {customer.policyNumber}</p>
        <p><strong>Amount Due:</strong> MUR {premium.amount.toFixed(2)}</p>
      </div>
      
      <div className="actions">
        <button 
          onClick={generateQR}
          disabled={!deviceOnline || loading || qrDisplayed}
          className="btn-primary"
        >
          {loading ? 'Generating...' : 'Generate QR on Device'}
        </button>
        
        {qrDisplayed && (
          <button 
            onClick={confirmPayment}
            className="btn-success"
          >
            Confirm Payment Received
          </button>
        )}
      </div>
    </div>
  );
}

export default PremiumPaymentComponent;
```

---

*Document continues...*
