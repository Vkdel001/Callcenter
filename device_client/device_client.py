#!/usr/bin/env python3
"""
NIC Device Client - Windows Application
Polls VPS for QR commands and displays on ESP32 device

Usage: Double-click to start, runs in system tray
"""

import sys
import time
import threading
import traceback
from datetime import datetime
from esp32_handler import ESP32Handler
from vps_api import VPSClient
from logger_util import setup_logger
from config import Config

# Check if running with GUI support
try:
    import pystray
    from PIL import Image
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False
    print("Warning: GUI libraries not available. Running in console mode.")

class DeviceClient:
    def __init__(self):
        self.config = Config()
        self.logger = setup_logger(self.config)
        self.esp32 = ESP32Handler(self.config, self.logger)
        self.vps = VPSClient(self.config, self.logger)
        self.device_id = None
        self.icon = None
        self.running = False
        self.poll_thread = None
        self.status_text = "Initializing..."
        
    def start(self):
        """Start the device client"""
        self.logger.info("=" * 60)
        self.logger.info("NIC Device Client Starting...")
        self.logger.info("=" * 60)
        
        # Step 1: Connect to ESP32
        self.status_text = "Connecting to ESP32..."
        self.logger.info("Step 1: Detecting ESP32 device...")
        
        if not self.esp32.connect():
            error_msg = "ESP32 device not found. Please check USB connection."
            self.logger.error(error_msg)
            self.show_error(error_msg)
            return False
        
        self.logger.info(f"[OK] ESP32 connected on {self.esp32.com_port}")
        
        # Step 2: Register with VPS
        self.status_text = "Registering with server..."
        self.logger.info("Step 2: Registering with VPS...")
        
        self.device_id = self.vps.register_device(
            computer_name=self.config.computer_name,
            com_port=self.esp32.com_port
        )
        
        if not self.device_id:
            error_msg = "Cannot connect to server. Please check internet connection."
            self.logger.error(error_msg)
            self.show_error(error_msg)
            return False
        
        self.logger.info(f"[OK] Registered as {self.device_id}")
        
        # Step 3: Start polling
        self.status_text = "Online"
        self.logger.info("Step 3: Starting polling loop...")
        self.running = True
        self.poll_thread = threading.Thread(target=self.polling_loop, daemon=True)
        self.poll_thread.start()
        self.logger.info("[OK] Polling started")
        
        # Step 4: Start system tray (or console mode)
        self.logger.info("=" * 60)
        self.logger.info("NIC Device Client is ONLINE")
        self.logger.info(f"Device ID: {self.device_id}")
        self.logger.info(f"ESP32 Port: {self.esp32.com_port}")
        self.logger.info(f"VPS URL: {self.config.vps_url}")
        self.logger.info("=" * 60)
        
        if GUI_AVAILABLE:
            self.start_system_tray()
        else:
            self.run_console_mode()
        
        return True
    
    def polling_loop(self):
        """Poll VPS for commands every 2 seconds"""
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        while self.running:
            try:
                # Poll for commands
                commands = self.vps.poll_commands(self.device_id)
                
                if commands:
                    self.logger.info(f"Received {len(commands)} command(s)")
                    for command in commands:
                        self.execute_command(command)
                
                # Reset error counter on success
                consecutive_errors = 0
                
                # Wait before next poll
                time.sleep(self.config.poll_interval)
                
            except Exception as e:
                consecutive_errors += 1
                self.logger.error(f"Polling error ({consecutive_errors}/{max_consecutive_errors}): {e}")
                
                if consecutive_errors >= max_consecutive_errors:
                    self.logger.error("Too many consecutive errors. Attempting reconnection...")
                    self.status_text = "Reconnecting..."
                    
                    # Try to reconnect ESP32
                    if not self.esp32.reconnect():
                        self.logger.error("ESP32 reconnection failed")
                    
                    # Try to re-register with VPS
                    new_device_id = self.vps.register_device(
                        computer_name=self.config.computer_name,
                        com_port=self.esp32.com_port
                    )
                    
                    if new_device_id:
                        self.device_id = new_device_id
                        self.logger.info("Reconnection successful")
                        self.status_text = "Online"
                        consecutive_errors = 0
                    else:
                        self.logger.error("VPS reconnection failed")
                
                # Wait longer on error
                time.sleep(5)
    
    def execute_command(self, command):
        """Execute a command from VPS"""
        command_id = command.get('command_id', 'unknown')
        command_type = command.get('type', 'unknown')
        
        try:
            self.logger.info(f"Executing command {command_id}: {command_type}")
            
            if command_type == 'start_rotation':
                # Restart rotation
                self.logger.info("Restarting rotation...")
                success = self.esp32.start_rotation()
                
                # Report status
                self.vps.report_status(
                    device_id=self.device_id,
                    command_id=command_id,
                    status='success' if success else 'failed'
                )
                
                if success:
                    self.logger.info("[OK] Rotation restarted")
                else:
                    self.logger.error("[FAIL] Failed to restart rotation")
            
            elif command_type == 'display_qr':
                # Extract command data
                qr_image = command.get('qr_image')
                customer = command.get('customer_name', 'Customer')
                policy = command.get('policy_number', 'N/A')
                amount = command.get('amount', 0)
                
                if not qr_image:
                    raise ValueError("No QR image data in command")
                
                # Display QR on ESP32
                self.status_text = f"Displaying QR for {customer}..."
                start_time = time.time()
                
                success = self.esp32.display_qr(qr_image)
                
                execution_time = time.time() - start_time
                
                # Report status to VPS
                self.vps.report_status(
                    device_id=self.device_id,
                    command_id=command_id,
                    status='success' if success else 'failed',
                    execution_time=execution_time
                )
                
                if success:
                    self.logger.info(f"[OK] QR displayed for {customer} in {execution_time:.2f}s")
                    self.show_notification(f"QR displayed for {customer}")
                    self.status_text = "Online"
                else:
                    self.logger.error(f"[FAIL] Failed to display QR for {customer}")
                    self.status_text = "Online (last command failed)"
            
            else:
                self.logger.warning(f"Unknown command type: {command_type}")
                self.vps.report_status(
                    device_id=self.device_id,
                    command_id=command_id,
                    status='failed',
                    error=f"Unknown command type: {command_type}"
                )
            
        except Exception as e:
            self.logger.error(f"Command execution error: {e}")
            self.logger.error(traceback.format_exc())
            
            # Report error to VPS
            self.vps.report_status(
                device_id=self.device_id,
                command_id=command_id,
                status='error',
                error=str(e)
            )
            
            self.status_text = "Online (error occurred)"
    
    def start_system_tray(self):
        """Start system tray icon"""
        try:
            # Load or create icon
            try:
                icon_image = Image.open("icon.ico")
            except:
                # Create simple icon if file not found
                icon_image = Image.new('RGB', (64, 64), color='green')
            
            # Create menu
            menu = pystray.Menu(
                pystray.MenuItem(f"Status: {self.status_text}", self.show_status),
                pystray.MenuItem(f"Device: {self.device_id}", self.show_status),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("View Logs", self.view_logs),
                pystray.MenuItem("Restart Connection", self.restart),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Exit", self.stop)
            )
            
            # Create icon
            self.icon = pystray.Icon(
                "NIC Device",
                icon_image,
                "NIC Payment Device - Online",
                menu
            )
            
            # Run (blocks until exit)
            self.icon.run()
            
        except Exception as e:
            self.logger.error(f"System tray error: {e}")
            self.run_console_mode()
    
    def run_console_mode(self):
        """Run in console mode (no GUI)"""
        print("\n" + "=" * 60)
        print("NIC Device Client - Console Mode")
        print("=" * 60)
        print(f"Device ID: {self.device_id}")
        print(f"Status: {self.status_text}")
        print("\nPress Ctrl+C to exit")
        print("=" * 60 + "\n")
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down...")
            self.stop()
    
    def show_status(self):
        """Show status dialog"""
        status = f"""NIC Payment Device

Status: {self.status_text}
Device ID: {self.device_id}
ESP32 Port: {self.esp32.com_port}
VPS: {self.config.vps_url}
Last Poll: {datetime.now().strftime('%H:%M:%S')}

Log File: {self.config.log_file}
"""
        self.show_info(status)
    
    def view_logs(self):
        """Open log file"""
        try:
            import os
            import subprocess
            
            if sys.platform == 'win32':
                os.startfile(self.config.log_file)
            else:
                subprocess.call(['xdg-open', self.config.log_file])
        except Exception as e:
            self.logger.error(f"Failed to open log file: {e}")
    
    def restart(self):
        """Restart connection"""
        self.logger.info("Manual restart requested...")
        self.status_text = "Restarting..."
        
        # Reconnect ESP32
        if self.esp32.reconnect():
            self.logger.info("ESP32 reconnected")
        
        # Re-register with VPS
        new_device_id = self.vps.register_device(
            computer_name=self.config.computer_name,
            com_port=self.esp32.com_port
        )
        
        if new_device_id:
            self.device_id = new_device_id
            self.logger.info("VPS reconnected")
            self.status_text = "Online"
            self.show_notification("Connection restarted successfully")
        else:
            self.logger.error("VPS reconnection failed")
            self.status_text = "Offline"
    
    def stop(self):
        """Stop the client"""
        self.logger.info("Stopping NIC Device Client...")
        self.running = False
        
        if self.icon:
            self.icon.stop()
        
        # Close ESP32 connection
        if self.esp32.device:
            self.esp32.device.close()
        
        self.logger.info("Shutdown complete")
        sys.exit(0)
    
    def show_notification(self, message):
        """Show system notification"""
        try:
            if self.icon:
                self.icon.notify(message, "NIC Device")
        except:
            pass
    
    def show_info(self, message):
        """Show info message"""
        try:
            import tkinter as tk
            from tkinter import messagebox
            root = tk.Tk()
            root.withdraw()
            messagebox.showinfo("NIC Device", message)
            root.destroy()
        except:
            print(message)
    
    def show_error(self, message):
        """Show error message"""
        try:
            import tkinter as tk
            from tkinter import messagebox
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("NIC Device Error", message)
            root.destroy()
        except:
            print(f"ERROR: {message}")

def main():
    """Main entry point"""
    print("\n" + "=" * 60)
    print("NIC Payment Device Client")
    print("Version 1.0")
    print("=" * 60 + "\n")
    
    try:
        client = DeviceClient()
        if not client.start():
            print("\nFailed to start device client. Check logs for details.")
            try:
                input("Press Enter to exit...")
            except:
                pass  # Ignore input errors when running as EXE
            sys.exit(1)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        print(traceback.format_exc())
        try:
            input("Press Enter to exit...")
        except:
            pass  # Ignore input errors when running as EXE
        sys.exit(1)

if __name__ == "__main__":
    main()
