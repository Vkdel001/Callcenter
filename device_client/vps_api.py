"""
VPS API Client - Communication with VPS backend
Handles device registration, polling, and status reporting
"""

import requests
import uuid
import socket

class VPSClient:
    def __init__(self, config, logger):
        self.config = config
        self.logger = logger
        self.base_url = config.vps_url.rstrip('/')
        self.api_key = config.api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        })
        self.timeout = 10
    
    def register_device(self, computer_name, com_port):
        """Register device with VPS"""
        try:
            # Generate unique device ID
            mac = self.get_mac_address()
            device_id = f"device_{computer_name}_{mac[:6]}"
            
            self.logger.info(f"Registering device: {device_id}")
            
            response = self.session.post(
                f"{self.base_url}/api/device/register",
                json={
                    'device_id': device_id,
                    'computer_name': computer_name,
                    'com_port': com_port
                },
                timeout=self.timeout
            )
            
            if response.ok:
                data = response.json()
                if data.get('success'):
                    self.logger.info(f"Registration successful: {device_id}")
                    return device_id
                else:
                    self.logger.error(f"Registration failed: {data}")
                    return None
            else:
                self.logger.error(f"Registration HTTP error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.ConnectionError as e:
            self.logger.error(f"Cannot connect to VPS: {e}")
            return None
        except requests.exceptions.Timeout as e:
            self.logger.error(f"VPS connection timeout: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            return None
    
    def poll_commands(self, device_id):
        """Poll VPS for pending commands"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/device/poll",
                params={'device_id': device_id},
                timeout=5
            )
            
            if response.ok:
                data = response.json()
                if data.get('has_commands'):
                    commands = data.get('commands', [])
                    return commands
            
            return []
            
        except requests.exceptions.Timeout:
            # Timeout is expected during polling, don't log as error
            return []
        except requests.exceptions.ConnectionError:
            # Connection errors during polling are common, don't spam logs
            return []
        except Exception as e:
            # Only log unexpected errors
            self.logger.warning(f"Polling error: {e}")
            return []
    
    def report_status(self, device_id, command_id, status, execution_time=None, error=None):
        """Report command execution status to VPS"""
        try:
            payload = {
                'device_id': device_id,
                'command_id': command_id,
                'status': status
            }
            
            if execution_time is not None:
                payload['execution_time'] = execution_time
            
            if error is not None:
                payload['error'] = str(error)
            
            response = self.session.post(
                f"{self.base_url}/api/device/status",
                json=payload,
                timeout=5
            )
            
            if response.ok:
                data = response.json()
                return data.get('success', False)
            else:
                self.logger.error(f"Status report HTTP error: {response.status_code}")
                return False
            
        except Exception as e:
            self.logger.error(f"Status report error: {e}")
            return False
    
    def check_health(self):
        """Check if VPS is reachable"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/device/health",
                timeout=5
            )
            
            if response.ok:
                data = response.json()
                return data.get('status') == 'online'
            
            return False
            
        except Exception as e:
            self.logger.error(f"Health check error: {e}")
            return False
    
    def get_mac_address(self):
        """Get MAC address for device ID generation"""
        try:
            mac = uuid.UUID(int=uuid.getnode()).hex[-12:]
            return mac.upper()
        except:
            # Fallback to random if MAC not available
            import random
            return ''.join([random.choice('0123456789ABCDEF') for _ in range(12)])
    
    def get_computer_name(self):
        """Get computer name"""
        try:
            return socket.gethostname()
        except:
            return "UNKNOWN"
