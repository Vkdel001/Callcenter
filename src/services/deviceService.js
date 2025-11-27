/**
 * ESP32 Device Service Client
 * Communicates with VPS backend to queue QR commands for devices
 * Uses polling-based architecture for production deployment
 */

const DEVICE_SERVICE_URL = 'http://localhost:5001';
const DEVICE_API_KEY = 'NIC-DEVICE-API-KEY-2024-CHANGE-ME'; // Must match backend service

class DeviceService {
  constructor() {
    this.serviceUrl = DEVICE_SERVICE_URL;
    this.apiKey = DEVICE_API_KEY;
    this.isChecking = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  /**
   * Check device service health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.serviceUrl}/api/device/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return { status: 'offline', device: 'disconnected' };
      }

      const data = await response.json();
      this.lastHealthCheck = {
        ...data,
        checkedAt: new Date()
      };

      return data;
    } catch (error) {
      console.log('Device service offline:', error.message);
      return { status: 'offline', device: 'disconnected', error: error.message };
    }
  }

  /**
   * Check if device service is available and device is connected
   */
  async isAvailable() {
    const health = await this.checkHealth();
    return health.status === 'online' && health.device === 'connected';
  }

  /**
   * Display QR code on ESP32 device
   * @param {string} qrImageUrl - Data URI of the QR code image (base64)
   * @param {object} customerData - Customer information
   */
  async displayQR(qrImageUrl, customerData) {
    try {
      // Get agent ID from localStorage (set during login)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Use email as agent_id if id is not a number
      const agentId = (typeof user.id === 'number') ? user.id : (user.email || user.id || 1);

      console.log('Queueing QR for device:', {
        agent: agentId,
        customer: customerData.name,
        policy: customerData.policyNumber,
        amount: customerData.amountDue
      });

      const fullUrl = `${this.serviceUrl}/api/device/qr`;
      console.log('Fetching:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          agent_id: agentId,
          qr_image: qrImageUrl, // Should be data URI (data:image/png;base64,...)
          customer_name: customerData.name,
          policy_number: customerData.policyNumber,
          amount: customerData.amountDue
        })
      });
      
      console.log('Response status:', response.status);

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✓ QR command queued successfully');
        console.log('Command ID:', data.command_id);
        console.log('Device ID:', data.device_id);
        return {
          success: true,
          message: 'QR queued for device',
          command_id: data.command_id,
          device_id: data.device_id
        };
      } else {
        console.error('✗ Failed to queue QR:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to queue QR command'
        };
      }
    } catch (error) {
      console.error('Device service error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark payment as complete and restart device rotation
   */
  async paymentComplete() {
    try {
      // Get agent ID from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const agentId = (typeof user.id === 'number') ? user.id : (user.email || user.id || 1);

      console.log('Restarting rotation for agent:', agentId);

      const response = await fetch(`${this.serviceUrl}/api/device/rotation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          agent_id: agentId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✓ Rotation restart queued');
      } else {
        console.warn('⚠ Rotation restart failed:', data.error);
      }
      
      return data;
    } catch (error) {
      console.error('Payment complete error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Force device reconnection
   */
  async reconnect() {
    try {
      const response = await fetch(`${this.serviceUrl}/device/reconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Reconnect error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Link device to agent (call this on login)
   * @param {number} agentId - Agent ID
   * @param {string} agentName - Agent name
   */
  async linkDevice(agentId, agentName) {
    try {
      // Get computer name from browser (best effort)
      const computerName = this.getComputerName();
      
      // Use email as agent_id if it's a string (email format)
      const effectiveAgentId = (typeof agentId === 'string' && agentId.includes('@')) ? agentId : agentId;

      console.log('Linking device to agent:', { agentId: effectiveAgentId, agentName, computerName });

      const response = await fetch(`${this.serviceUrl}/api/device/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          agent_id: effectiveAgentId,
          agent_name: agentName,
          computer_name: computerName
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✓ Device linked successfully:', data.device_id);
        // Store device ID in localStorage for reference
        localStorage.setItem('linked_device_id', data.device_id);
        return { success: true, device_id: data.device_id };
      } else {
        console.warn('Device linking failed:', data.error);
        // Not critical - device might not be connected yet
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.warn('Device linking error:', error.message);
      // Don't block login if device linking fails
      return { success: false, error: error.message };
    }
  }

  /**
   * Get computer name (best effort from browser)
   */
  getComputerName() {
    // Try to get from various sources
    // This is limited in browsers for security reasons
    
    // Check if already stored
    const stored = localStorage.getItem('computer_name');
    if (stored) return stored;

    // Generate from user agent and store
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const computerName = `${platform}-${Date.now().toString(36)}`;
    
    localStorage.setItem('computer_name', computerName);
    return computerName;
  }

  /**
   * Get last health check result (cached)
   */
  getLastHealthCheck() {
    return this.lastHealthCheck;
  }
}

// Export singleton instance
export const deviceService = new DeviceService();
