import os
import time
from PIL import Image
from typing import Optional
from payment_terminal import PaymentTerminalController

class ESP32ImageUploader(PaymentTerminalController):
    """Extended controller for uploading images to ESP32 payment terminal"""
    
    def __init__(self, com_port: str = None, serial_config: dict = None):
        super().__init__(com_port, serial_config)
        self.max_width = 320
        self.max_height = 480
        self.max_file_size_kb = 80
    
    def send_command(self, command: str) -> Optional[str]:
        """Send command and read single response (for rotation commands)"""
        if not self.ser or not self.ser.is_open:
            self.logger.error("Serial connection not available")
            return None
        
        try:
            self.logger.info(f"Sending command: {command}")
            self.ser.write((command + '\n').encode('utf-8'))
            self.ser.flush()
            
            # Read single response line
            response = self.ser.readline().decode('utf-8').strip()
            
            if response:
                self.logger.info(f"Received response: {response}")
                return response
            else:
                self.logger.warning("No response received from terminal")
                return None
                
        except Exception as e:
            self.logger.error(f"Error in command communication: {e}")
            return None
    
    def send_command_with_response(self, command: str, timeout_iterations: int = 100) -> str:
        """Send command and wait for complete response ending with 'exit'"""
        if not self.ser or not self.ser.is_open:
            self.logger.error("Serial connection not available")
            return ""
        
        try:
            self.logger.info(f"Sending command: {command}")
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
            
            self.logger.info(f"Received response: {response}")
            return response.strip()
            
        except Exception as e:
            self.logger.error(f"Error in command communication: {e}")
            return ""
    
    def get_free_memory(self) -> Optional[int]:
        """Get available memory on ESP32"""
        try:
            response = self.send_command_with_response("freeSize")
            
            # Extract memory size using regex pattern
            import re
            pattern = r'(\d+)\s*exit'
            match = re.search(pattern, response.lower())
            
            if match:
                memory_kb = int(match.group(1))
                self.logger.info(f"Free memory: {memory_kb} KB")
                return memory_kb
            else:
                self.logger.warning("Could not parse memory response")
                return None
                
        except Exception as e:
            self.logger.error(f"Error getting free memory: {e}")
            return None
    
    def validate_image(self, image_path: str) -> bool:
        """Validate image dimensions and file size"""
        try:
            # Check if file exists
            if not os.path.exists(image_path):
                self.logger.error(f"Image file not found: {image_path}")
                return False
            
            # Check file size
            file_size_kb = os.path.getsize(image_path) / 1024
            if file_size_kb > self.max_file_size_kb:
                self.logger.error(f"Image too large: {file_size_kb:.1f}KB (max: {self.max_file_size_kb}KB)")
                return False
            
            # Check image dimensions
            with Image.open(image_path) as img:
                width, height = img.size
                if width > self.max_width:
                    self.logger.error(f"Image width too large: {width}px (max: {self.max_width}px)")
                    return False
                if height > self.max_height:
                    self.logger.error(f"Image height too large: {height}px (max: {self.max_height}px)")
                    return False
            
            self.logger.info(f"Image validation passed: {width}x{height}, {file_size_kb:.1f}KB")
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating image: {e}")
            return False
    
    def upload_image(self, image_path: str, file_number: int, chunk_size: int = 1024) -> bool:
        """Upload image to ESP32 terminal"""
        try:
            # Validate inputs
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
            
            self.logger.info(f"Starting upload: {filename}, Size: {file_size} bytes, Chunk: {chunk_size}")
            
            # Send initial upload command
            command = f"sending**{filename}**{file_size}**{chunk_size}"
            response = self.send_command_with_response(command)
            
            if "start" not in response.lower():
                self.logger.error("ESP32 did not confirm upload start")
                return False
            
            self.logger.info("ESP32 ready to receive file data")
            
            # Send file in chunks
            total_chunks = (file_size + chunk_size - 1) // chunk_size
            
            for i in range(0, file_size, chunk_size):
                chunk_num = (i // chunk_size) + 1
                remaining_bytes = min(chunk_size, file_size - i)
                chunk = file_bytes[i:i + remaining_bytes]
                
                self.logger.info(f"Sending chunk {chunk_num}/{total_chunks} ({remaining_bytes} bytes)")
                
                # Clear any pending data
                try:
                    self.ser.read_all()
                except:
                    pass
                
                # Send chunk
                self.ser.write(chunk)
                self.ser.flush()
                
                # Wait for acknowledgment
                ack_received = False
                for attempt in range(50):  # Wait up to 5 seconds
                    try:
                        line = self.ser.readline().decode('utf-8').strip()
                        if line and "ok" in line.lower():
                            self.logger.debug(f"Chunk {chunk_num} acknowledged: {line}")
                            ack_received = True
                            break
                    except:
                        pass
                    time.sleep(0.1)
                
                if not ack_received:
                    self.logger.error(f"No acknowledgment for chunk {chunk_num}")
                    return False
            
            self.logger.info("Image upload completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Error uploading image: {e}")
            return False
    
    def delete_image(self, file_number: int) -> bool:
        """Delete image from ESP32"""
        try:
            if not (1 <= file_number <= 99):
                self.logger.error("File number must be between 1 and 99")
                return False
            
            filename = f"{file_number}.jpeg"
            command = f"delete**{filename}"
            response = self.send_command_with_response(command)
            
            self.logger.info(f"Delete command sent for {filename}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error deleting image: {e}")
            return False
    
    def clear_image(self, file_number: int) -> bool:
        """Clear image from ESP32"""
        try:
            if not (1 <= file_number <= 99):
                self.logger.error("File number must be between 1 and 99")
                return False
            
            filename = f"{file_number}.jpeg"
            command = f"clear**{filename}"
            response = self.send_command_with_response(command)
            
            self.logger.info(f"Clear command sent for {filename}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error clearing image: {e}")
            return False
    
    def get_file_info(self) -> str:
        """Get file information from ESP32"""
        try:
            response = self.send_command_with_response("fileinfo")
            return response
        except Exception as e:
            self.logger.error(f"Error getting file info: {e}")
            return ""
    
    def set_timer(self, seconds: int) -> bool:
        """Set timer on ESP32"""
        try:
            command = f"settimer**{seconds}"
            response = self.send_command_with_response(command)
            self.logger.info(f"Timer set to {seconds} seconds")
            return True
        except Exception as e:
            self.logger.error(f"Error setting timer: {e}")
            return False
    
    def start_rotation(self) -> bool:
        """Start image rotation on ESP32"""
        try:
            # Use simple send_command instead of waiting for 'exit'
            response = self.send_command("startrotation")
            self.logger.info("Image rotation started")
            return True
        except Exception as e:
            self.logger.error(f"Error starting rotation: {e}")
            return False
    
    def stop_rotation(self) -> bool:
        """Stop image rotation on ESP32"""
        try:
            # Use simple send_command instead of waiting for 'exit'
            response = self.send_command("stoprotation")
            self.logger.info("Image rotation stopped")
            return True
        except Exception as e:
            self.logger.error(f"Error stopping rotation: {e}")
            return False


def main():
    """Interactive image uploader"""
    uploader = ESP32ImageUploader()
    
    if not uploader.connect():
        print("Failed to connect to ESP32. Please check connection.")
        return
    
    try:
        while True:
            print("\n" + "="*50)
            print("ESP32 IMAGE UPLOADER")
            print("="*50)
            print("1. Upload Image")
            print("2. Delete Image")
            print("3. Clear Image")
            print("4. Get Free Memory")
            print("5. Get File Info")
            print("6. Set Timer")
            print("7. Start Rotation")
            print("8. Stop Rotation")
            print("0. Exit")
            print("="*50)
            
            choice = input("Enter choice (0-8): ").strip()
            
            if choice == '0':
                print("Exiting image uploader...")
                print("Device connection will remain active.")
                # Don't call disconnect - let device stay active
                return  # Exit function without cleanup
            elif choice == '1':
                image_path = input("Enter image path: ").strip()
                file_number = int(input("Enter file number (1-99): "))
                chunk_size = int(input("Enter chunk size (default 1024): ") or "1024")
                
                if uploader.upload_image(image_path, file_number, chunk_size):
                    print("✓ Image uploaded successfully!")
                else:
                    print("✗ Image upload failed!")
                    
            elif choice == '2':
                file_number = int(input("Enter file number to delete (1-99): "))
                if uploader.delete_image(file_number):
                    print("✓ Delete command sent!")
                    
            elif choice == '3':
                file_number = int(input("Enter file number to clear (1-99): "))
                if uploader.clear_image(file_number):
                    print("✓ Clear command sent!")
                    
            elif choice == '4':
                memory = uploader.get_free_memory()
                if memory is not None:
                    print(f"Free memory: {memory} KB")
                else:
                    print("Could not get memory info")
                    
            elif choice == '5':
                info = uploader.get_file_info()
                print(f"File info: {info}")
                
            elif choice == '6':
                seconds = int(input("Enter timer seconds: "))
                if uploader.set_timer(seconds):
                    print("✓ Timer set!")
                    
            elif choice == '7':
                if uploader.start_rotation():
                    print("✓ Rotation started!")
                    
            elif choice == '8':
                if uploader.stop_rotation():
                    print("✓ Rotation stopped!")
            else:
                print("Invalid choice!")
                
    except KeyboardInterrupt:
        print("\nOperation cancelled")
        uploader.disconnect()
    except Exception as e:
        print(f"Error: {e}")
        uploader.disconnect()
    
    # Don't disconnect on normal exit - keep device running
    print("Image uploader closed. Device remains active.")


if __name__ == "__main__":
    main()