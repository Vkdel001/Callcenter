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
      
      // Get computer name using improved detection (FALLBACK METHOD)
      const computerName = this.getComputerName();
      
      // Use email as agent_id if it's a string (email format)
      const effectiveAgentId = (typeof agentId === 'string' && agentId.includes('@')) ? agentId : agentId;

      console.log('🔗 Device Linking Debug Info:', { 
        agentId: effectiveAgentId, 
        agentName, 
        previousDeviceId: previousDeviceId || 'null',
        computerName: computerName || 'null',
        localStorage_device_id: localStorage.getItem('linked_device_id'),
        localStorage_computer_name: localStorage.getItem('computer_name'),
        strategy: previousDeviceId ? 'Using stored device_id' : 'Using computer_name detection'
      });

      // Try multiple linking strategies
      const linkingStrategies = [
        // Strategy 1: Use URL parameters (HIGHEST PRIORITY - from Windows client)
        {
          name: 'URL Parameters',
          payload: {
            agent_id: effectiveAgentId,
            agent_name: agentName,
            device_id: this.getDeviceIdFromURL(),
            computer_name: this.getComputerNameFromURL()
          },
          condition: !!(this.getDeviceIdFromURL() || this.getComputerNameFromURL())
        },
        // Strategy 2: Use stored device_id (HIGH PRIORITY)
        {
          name: 'Stored Device ID',
          payload: {
            agent_id: effectiveAgentId,
            agent_name: agentName,
            device_id: previousDeviceId,
            computer_name: computerName
          },
          condition: !!previousDeviceId
        },
        // Strategy 3: Use detected computer name (FALLBACK)
        {
          name: 'Computer Name Detection',
          payload: {
            agent_id: effectiveAgentId,
            agent_name: agentName,
            computer_name: computerName
          },
          condition: !!computerName && !computerName.startsWith('BROWSER-')
        }
      ];

      // Try each strategy
      for (const strategy of linkingStrategies) {
        if (!strategy.condition) {
          console.log(`⏭️ Skipping strategy "${strategy.name}" - condition not met`);
          continue;
        }

        console.log(`🔄 Trying linking strategy: ${strategy.name}`, strategy.payload);

        const response = await fetch(`${this.serviceUrl}/api/device/link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          body: JSON.stringify(strategy.payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log(`✅ Device linked successfully using "${strategy.name}":`, data.device_id);
          // Store device ID in localStorage for future use
          localStorage.setItem('linked_device_id', data.device_id);
          // Also store the computer name that worked
          if (strategy.payload.computer_name) {
            localStorage.setItem('computer_name', strategy.payload.computer_name);
          }
          
          // If URL parameters were used, clean up the URL
          if (strategy.name === 'URL Parameters' && this.isAutoLinkRequested()) {
            this.cleanupURLParameters();
          }
          
          return { success: true, device_id: data.device_id, strategy: strategy.name };
        } else {
          console.warn(`❌ Strategy "${strategy.name}" failed:`, data.error || data.message);
          
          // If device is offline, provide specific guidance
          if ((data.error || '').includes('offline')) {
            console.info('💡 Device found but offline - Windows client may not be running');
          }
        }
      }

      // All strategies failed
      console.error('❌ All device linking strategies failed');
      
      // Provide detailed troubleshooting info
      const troubleshootingInfo = {
        previousDeviceId: previousDeviceId || 'Not stored',
        detectedComputerName: computerName || 'Could not detect',
        urlComputerName: this.getComputerNameFromURL() || 'Not provided',
        urlDeviceId: this.getDeviceIdFromURL() || 'Not provided',
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };
      
      console.log('🔍 Troubleshooting Info:', troubleshootingInfo);
      
      return { 
        success: false, 
        error: 'Device linking failed. Please ensure the Windows device client is running and registered.',
        needsDeviceSetup: true,
        troubleshooting: troubleshootingInfo
      };

    } catch (error) {
      console.error('❌ Device linking error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get computer name (improved detection with multiple strategies)
   */
  getComputerName() {
    // Strategy 1: Check if already stored
    const stored = localStorage.getItem('computer_name');
    if (stored && stored !== 'null' && stored.trim() !== '') {
      console.log('📱 Using stored computer name:', stored);
      return stored;
    }

    // Strategy 2: Try to get from URL parameters (if Windows client passes it)
    const urlComputerName = this.getComputerNameFromURL();
    if (urlComputerName) {
      console.log('🔗 Using URL computer name:', urlComputerName);
      localStorage.setItem('computer_name', urlComputerName);
      return urlComputerName;
    }

    // Strategy 3: Try to get from session storage (if set by Windows client)
    const sessionComputerName = sessionStorage.getItem('computer_name');
    if (sessionComputerName && sessionComputerName !== 'null' && sessionComputerName.trim() !== '') {
      console.log('💾 Using session computer name:', sessionComputerName);
      localStorage.setItem('computer_name', sessionComputerName);
      return sessionComputerName;
    }

    // Strategy 4: Try to detect from hostname (limited browser support)
    try {
      if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const hostname = window.location.hostname.toUpperCase();
        if (!hostname.includes('.') && hostname.length > 3) { // Likely a computer name, not a domain
          console.log('🌐 Using hostname as computer name:', hostname);
          localStorage.setItem('computer_name', hostname);
          return hostname;
        }
      }
    } catch (error) {
      console.log('⚠️ Could not detect hostname:', error.message);
    }

    // Strategy 5: Generate consistent browser fingerprint (fallback)
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    // Create a more detailed fingerprint
    const fingerprint = btoa(`${platform}-${ua}-${screen}-${timezone}-${language}`)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 12);
    
    const computerName = `BROWSER-${platform.replace(/\s+/g, '')}-${fingerprint}`;
    
    console.log('🔍 Generated browser fingerprint computer name:', computerName);
    localStorage.setItem('computer_name', computerName);
    return computerName;
  }

  /**
   * Get computer name from URL parameters
   */
  getComputerNameFromURL() {
    try {
      // Check current URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlComputerName = urlParams.get('computer_name') || urlParams.get('computerName') || urlParams.get('pc_name');
      
      if (urlComputerName && urlComputerName.trim() !== '') {
        return urlComputerName.trim();
      }

      // Check if computer name was passed in hash
      const hash = window.location.hash;
      if (hash.includes('computer_name=')) {
        const match = hash.match(/computer_name=([^&]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }

      return null;
    } catch (error) {
      console.log('⚠️ Error getting computer name from URL:', error.message);
      return null;
    }
  }

  /**
   * Get device ID from URL parameters
   */
  getDeviceIdFromURL() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDeviceId = urlParams.get('device_id') || urlParams.get('deviceId');
      
      if (urlDeviceId && urlDeviceId.trim() !== '') {
        return urlDeviceId.trim();
      }

      return null;
    } catch (error) {
      console.log('⚠️ Error getting device ID from URL:', error.message);
      return null;
    }
  }

  /**
   * Check if auto-linking is requested via URL
   */
  isAutoLinkRequested() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('auto_link') === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up URL parameters after successful auto-linking
   */
  cleanupURLParameters() {
    try {
      const url = new URL(window.location);
      url.searchParams.delete('computer_name');
      url.searchParams.delete('device_id');
      url.searchParams.delete('auto_link');
      
      // Update URL without reloading the page
      window.history.replaceState({}, document.title, url.toString());
      console.log('🧹 URL parameters cleaned up after successful auto-linking');
    } catch (error) {
      console.log('⚠️ Error cleaning up URL parameters:', error.message);
    }
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
