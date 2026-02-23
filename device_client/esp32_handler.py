"""
ESP32 Handler - Serial communication with ESP32 device
Handles QR image upload and display
"""

import serial
import serial.tools.list_ports
import time
import base64
import re
import os
from PIL import Image
from io import BytesIO

class ESP32Handler:
    def __init__(self, config, logger):
        self.config = config
        self.logger = logger
        self.device = None
        self.com_port = None
        self.baud_rate = None  # Will be determined during connection
        self.device_width = 320
        self.device_height = 480
        self.chunk_size = 1024
        self.timeout = 5
    
    def test_esp32_connection(self, port):
        """Test if a COM port has a responsive ESP32 at any supported baud rate"""
        baud_rates = self.config.esp32_baud_rates
        
        for baud in baud_rates:
            self.logger.info(f"Testing {port} at {baud} baud...")
            
            try:
                # Try to open connection
                test_device = serial.Serial(
                    port=port,
                    baudrate=baud,
                    timeout=2
                )
                time.sleep(1)  # Wait for device to initialize
                
                # Clear any pending data
                test_device.reset_input_buffer()
                test_device.reset_output_buffer()
                
                # Send a simple test command
                test_device.write(b"test\n")
                test_device.flush()
                
                # Wait for any response
                response = ""
                for _ in range(10):  # Wait up to 1 second
                    if test_device.in_waiting > 0:
                        try:
                            line = test_device.readline().decode('utf-8', errors='ignore').strip()
                            response += line
                        except:
                            pass
                    time.sleep(0.1)
                
                test_device.close()
                
                # If we got any response, this is likely an ESP32
                if len(response) > 0:
                    self.logger.info(f"ESP32 responded at {baud} baud on {port}")
                    self.baud_rate = baud  # Remember the working baud rate
                    return True
                    
            except Exception as e:
                # Connection failed at this baud rate, try next one
                try:
                    test_device.close()
                except:
                    pass
                continue
        
        self.logger.warning(f"No ESP32 response on {port} at any baud rate")
        return False
    
    def connect(self):
        """Auto-detect and connect to ESP32 with multi-baud rate support"""
        self.logger.info("Detecting ESP32 device...")
        
        # Find ESP32 device (this also determines the baud rate)
        self.com_port = self.detect_esp32()
        if not self.com_port:
            self.logger.error("No ESP32 device found")
            return False
        
        # If baud rate wasn't determined during detection, use default
        if not self.baud_rate:
            self.baud_rate = 9600
        
        try:
            self.device = serial.Serial(
                port=self.com_port,
                baudrate=self.baud_rate,
                timeout=self.timeout
            )
            time.sleep(2)  # Wait for device to initialize
            
            # Clear any pending data
            self.device.reset_input_buffer()
            self.device.reset_output_buffer()
            
            self.logger.info(f"Connected to ESP32 on {self.com_port} at {self.baud_rate} baud")
            return True
            
        except Exception as e:
            self.logger.error(f"Connection error: {e}")
            return False
    
    def detect_esp32(self):
        """Auto-detect ESP32 COM port with enhanced chip detection"""
        ports = serial.tools.list_ports.comports()
        
        # Use enhanced keywords from config
        esp32_keywords = self.config.esp32_keywords
        
        self.logger.info(f"Scanning {len(ports)} COM ports for ESP32 devices...")
        
        # First pass: Look for ESP32-specific USB chips
        for port in ports:
            description = port.description.upper()
            for keyword in esp32_keywords:
                if keyword.upper() in description:
                    self.logger.info(f"Found potential ESP32 on {port.device}: {port.description}")
                    # Test if this port actually has a responsive ESP32
                    if self.test_esp32_connection(port.device):
                        return port.device
        
        # Second pass: If no keyword match, test all available ports
        if ports:
            self.logger.warning("No ESP32 detected by USB chip description. Testing all available ports:")
            for port in ports:
                self.logger.info(f"  Testing {port.device}: {port.description}")
                if self.test_esp32_connection(port.device):
                    return port.device
        
        self.logger.error("No responsive ESP32 device found on any COM port")
        return None
    
    def display_qr(self, qr_image_data):
        """Display QR code on ESP32"""
        try:
            self.logger.info("Processing QR image...")
            
            # Decode base64 data URI
            if qr_image_data.startswith('data:'):
                match = re.match(r'data:image/[^;]+;base64,(.+)', qr_image_data)
                if not match:
                    raise ValueError("Invalid data URI format")
                base64_data = match.group(1)
                image_data = base64.b64decode(base64_data)
            else:
                raise ValueError("Expected data URI format (data:image/...;base64,...)")
            
            self.logger.info(f"Decoded image data: {len(image_data)} bytes")
            
            # Process image
            img = Image.open(BytesIO(image_data))
            self.logger.info(f"Original image: {img.size} {img.mode}")
            
            img = img.convert('RGB')
            img = img.resize((self.device_width, self.device_height), Image.Resampling.LANCZOS)
            
            self.logger.info(f"Resized to: {img.size}")
            
            # Save to temp file
            temp_file = 'temp_qr.jpg'
            img.save(temp_file, 'JPEG', quality=85, optimize=True)
            
            file_size = os.path.getsize(temp_file)
            self.logger.info(f"Saved temp file: {file_size} bytes")
            
            # Upload to device
            success = self.upload_image(temp_file)
            
            # Clean up
            try:
                os.remove(temp_file)
            except:
                pass
            
            return success
            
        except Exception as e:
            self.logger.error(f"Display QR error: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return False
    
    def upload_image(self, image_path):
        """Upload image to ESP32"""
        try:
            # Check if device is still connected
            if not self.is_connected():
                self.logger.warning("Device disconnected, attempting reconnect...")
                if not self.reconnect():
                    self.logger.error("Reconnection failed")
                    return False
            # Read image file
            with open(image_path, 'rb') as f:
                file_bytes = f.read()
            
            file_size = len(file_bytes)
            filename = "1.jpeg"
            
            self.logger.info(f"Uploading {filename} ({file_size} bytes) to ESP32...")
            
            # Send upload command
            command = f"sending**{filename}**{file_size}**{self.chunk_size}"
            self.logger.info(f"Sending command: {command}")
            
            response = self.send_command_with_response(command)
            self.logger.info(f"ESP32 response: {response[:100]}...")
            
            if "start" not in response.lower():
                self.logger.error("ESP32 did not confirm upload start")
                return False
            
            # Send file in chunks
            total_chunks = (file_size + self.chunk_size - 1) // self.chunk_size
            self.logger.info(f"Sending {total_chunks} chunks...")
            
            for i in range(0, file_size, self.chunk_size):
                chunk_num = (i // self.chunk_size) + 1
                remaining_bytes = min(self.chunk_size, file_size - i)
                chunk = file_bytes[i:i + remaining_bytes]
                
                # Clear buffer before sending chunk
                try:
                    self.device.reset_input_buffer()
                except:
                    pass
                
                # Send chunk
                self.device.write(chunk)
                self.device.flush()
                
                # Wait for acknowledgment
                ack_received = False
                for attempt in range(50):
                    try:
                        line = self.device.readline().decode('utf-8', errors='ignore').strip()
                        if line and "ok" in line.lower():
                            ack_received = True
                            break
                    except:
                        pass
                    time.sleep(0.1)
                
                if not ack_received:
                    self.logger.error(f"No acknowledgment for chunk {chunk_num}/{total_chunks}")
                    return False
                
                if chunk_num % 10 == 0 or chunk_num == total_chunks:
                    self.logger.info(f"Progress: {chunk_num}/{total_chunks} chunks")
            
            # Stop rotation to display QR
            self.logger.info("Stopping rotation to display QR...")
            self.send_command("stoprotation")
            time.sleep(0.5)
            
            self.logger.info("Upload completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Upload error: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return False
    
    def send_command_with_response(self, command, timeout_iterations=100):
        """Send command and wait for complete response ending with 'exit'"""
        if not self.device or not self.device.is_open:
            self.logger.warning("Device not connected, attempting reconnect...")
            if not self.reconnect():
                self.logger.error("Reconnection failed")
                return ""
        
        try:
            # Clear buffers and send command (all in one try block)
            try:
                self.device.reset_input_buffer()
                self.device.reset_output_buffer()
                self.device.write((command + '\n').encode('utf-8'))
                self.device.flush()
            except (OSError, PermissionError) as e:
                self.logger.error(f"Serial error (device disconnected): {e}")
                # Mark device as disconnected
                if self.device:
                    try:
                        self.device.close()
                    except:
                        pass
                    self.device = None
                # Try to reconnect
                self.logger.info("Attempting reconnection...")
                if self.reconnect():
                    # Retry the command after reconnection
                    self.logger.info("Reconnected! Retrying command...")
                    self.device.reset_input_buffer()
                    self.device.reset_output_buffer()
                    self.device.write((command + '\n').encode('utf-8'))
                    self.device.flush()
                else:
                    self.logger.error("Reconnection failed, command aborted")
                    return ""
            
            # Read response
            response = ""
            for i in range(timeout_iterations):
                try:
                    line = self.device.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        response += line + "\n"
                        if line.lower().strip() == "exit":
                            break
                    time.sleep(0.1)
                except Exception as e:
                    self.logger.warning(f"Read error: {e}")
                    break
            
            return response.strip()
            
        except Exception as e:
            self.logger.error(f"Unexpected command error: {e}")
            return ""
    
    def send_command(self, command):
        """Send simple command without waiting for response"""
        if not self.device or not self.device.is_open:
            self.logger.warning("Device not connected, attempting reconnect...")
            if not self.reconnect():
                self.logger.error("Reconnection failed")
                return False
        
        try:
            try:
                self.device.write((command + '\n').encode('utf-8'))
                self.device.flush()
                return True
            except (OSError, PermissionError) as e:
                self.logger.error(f"Write error (device disconnected): {e}")
                # Mark device as disconnected
                if self.device:
                    try:
                        self.device.close()
                    except:
                        pass
                    self.device = None
                # Try to reconnect
                if self.reconnect():
                    # Retry the command after reconnection
                    self.device.write((command + '\n').encode('utf-8'))
                    self.device.flush()
                    return True
                else:
                    return False
        except (OSError, PermissionError) as e:
            self.logger.error(f"Serial communication error (device may be disconnected): {e}")
            # Mark device as disconnected
            if self.device:
                try:
                    self.device.close()
                except:
                    pass
                self.device = None
            return False
        except Exception as e:
            self.logger.error(f"Command error: {e}")
            return False
    
    def reconnect(self):
        """Reconnect to device with multi-baud rate support"""
        self.logger.info("Reconnecting to ESP32...")
        
        # Close existing connection
        if self.device:
            try:
                self.device.close()
            except:
                pass
            self.device = None
        
        # Reset baud rate so detection will test all rates again
        self.baud_rate = None
        
        # Wait a bit for device to be ready
        time.sleep(2)
        
        # Try to reconnect up to 3 times
        for attempt in range(3):
            self.logger.info(f"Reconnection attempt {attempt + 1}/3...")
            if self.connect():
                self.logger.info("Reconnection successful!")
                return True
            time.sleep(2)
        
        self.logger.error("Reconnection failed after 3 attempts")
        return False
    
    def start_rotation(self):
        """Start rotation (after QR display)"""
        try:
            self.logger.info("Starting rotation...")
            return self.send_command("startrotation")
        except Exception as e:
            self.logger.error(f"Start rotation error: {e}")
            return False
    
    def is_connected(self):
        """Check if device is connected"""
        return self.device and self.device.is_open
