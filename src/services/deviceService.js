/**
 * ESP32 Device Service Client
 * Communicates with VPS backend to queue QR commands for devices
 * Uses polling-based architecture for production deployment
 */

const DEVICE_SERVICE_URL = 'https://payments.niclmauritius.site';
const DEVICE_API_KEY = '+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI='; // Must match backend service

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
      // Check if we have a previously linked device_id (PRIMARY METHOD)
      const previousDeviceId = localStorage.getItem('linked_device_id');
      
      // Get computer name from browser (FALLBACK METHOD)
      const computerName = this.getComputerName();
      
      // Use email as agent_id if it's a string (email format)
      const effectiveAgentId = (typeof agentId === 'string' && agentId.includes('@')) ? agentId : agentId;

      console.log('Linking device to agent:', { 
        agentId: effectiveAgentId, 
        agentName, 
        deviceId: previousDeviceId,
        computerName: previousDeviceId ? '(using device_id)' : computerName
      });

      const response = await fetch(`${this.serviceUrl}/api/device/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          agent_id: effectiveAgentId,
          agent_name: agentName,
          device_id: previousDeviceId,  // PRIMARY: Use stored device ID first
          computer_name: computerName   // FALLBACK: Keep for new devices
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✓ Device linked successfully:', data.device_id);
        // Store device ID in localStorage for future use
        localStorage.setItem('linked_device_id', data.device_id);
        return { success: true, device_id: data.device_id };
      } else {
        console.warn('Device linking failed:', data.error || data.message);
        
        // If no device found and no previous device_id, show helpful message
        if (!previousDeviceId && (data.error || '').includes('Device not found')) {
          console.info('💡 Tip: Run the Windows device client first to register your device');
          return { 
            success: false, 
            error: 'No device registered. Please run the Windows device client first to register your device.',
            needsDeviceSetup: true
          };
        }
        
        // For other errors, return the original message
        return { success: false, error: data.error || data.message };
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

    // Try to get from URL parameters (if Windows client passes it)
    const urlParams = new URLSearchParams(window.location.search);
    const urlComputerName = urlParams.get('computer_name');
    if (urlComputerName) {
      localStorage.setItem('computer_name', urlComputerName);
      return urlComputerName;
    }

    // Try to get from session storage (if set by Windows client)
    const sessionComputerName = sessionStorage.getItem('computer_name');
    if (sessionComputerName) {
      localStorage.setItem('computer_name', sessionComputerName);
      return sessionComputerName;
    }

    // For browsers, we can't get the real computer name due to security restrictions
    // Instead, we'll use a consistent identifier based on browser fingerprint
    // This ensures the same browser always gets the same "computer name"
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const screen = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create a consistent hash-like identifier
    const fingerprint = btoa(`${platform}-${ua}-${screen}-${timezone}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    const computerName = `BROWSER-${platform}-${fingerprint}`;
    
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
