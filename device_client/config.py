"""
Configuration for NIC Device Client
"""

import os
import socket

class Config:
    def __init__(self):
        # VPS Configuration
        # TODO: Update these with your actual VPS details
        # For local testing, use localhost:5001
        # For production, use your VPS URL
        self.vps_url = os.getenv('VPS_URL', 'https://payments.niclmauritius.site')
        self.api_key = os.getenv('API_KEY', '+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=')
        
        # Computer Information
        self.computer_name = self.get_computer_name()
        
        # Logging Configuration
        self.log_file = os.path.join(os.getcwd(), 'device_client.log')
        self.log_level = 'INFO'
        self.log_max_size = 10 * 1024 * 1024  # 10 MB
        self.log_backup_count = 5
        
        # Polling Configuration
        self.poll_interval = 2  # seconds
        
        # ESP32 Configuration
        self.esp32_baud_rate = 9600
        self.esp32_timeout = 5
        self.device_width = 320
        self.device_height = 480
        self.chunk_size = 1024
        
        # Retry Configuration
        self.max_retries = 3
        self.retry_delay = 5  # seconds
    
    def get_computer_name(self):
        """Get computer name"""
        try:
            return socket.gethostname()
        except:
            return "UNKNOWN-PC"
    
    def validate(self):
        """Validate configuration"""
        errors = []
        
        if 'YOUR_VPS' in self.vps_url:
            errors.append("VPS_URL not configured. Please update config.py with your actual VPS URL.")
        
        if 'CHANGE-ME' in self.api_key:
            errors.append("API_KEY not configured. Please update config.py with your actual API key.")
        
        return errors
    
    def __str__(self):
        """String representation for logging"""
        return f"""Configuration:
  VPS URL: {self.vps_url}
  API Key: {self.api_key[:15]}...
  Computer: {self.computer_name}
  Log File: {self.log_file}
  Poll Interval: {self.poll_interval}s
"""
