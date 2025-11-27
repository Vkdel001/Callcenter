#!/usr/bin/env python3
"""
ESP32 Device Reset Tool
Attempts to reset the device to get it out of bootloader mode
"""

import serial
import time

COM_PORT = 'COM3'
BAUD_RATE = 9600

def reset_device():
    """Try to reset ESP32 device"""
    print("="*60)
    print("ESP32 DEVICE RESET")
    print("="*60)
    
    try:
        print(f"\n1. Connecting to {COM_PORT}...")
        device = serial.Serial(COM_PORT, BAUD_RATE, timeout=2)
        time.sleep(2)
        print("   ✓ Connected")
        
        print("\n2. Clearing buffers...")
        device.reset_input_buffer()
        device.reset_output_buffer()
        time.sleep(0.5)
        
        print("\n3. Attempting software reset...")
        # Try various reset commands
        reset_commands = [
            b'\x03',  # Ctrl+C
            b'\x04',  # Ctrl+D
            'reset\n',
            'restart\n',
            'reboot\n',
        ]
        
        for cmd in reset_commands:
            if isinstance(cmd, str):
                device.write(cmd.encode('utf-8'))
            else:
                device.write(cmd)
            device.flush()
            time.sleep(0.5)
        
        print("   ✓ Reset commands sent")
        
        print("\n4. Toggling DTR/RTS (hardware reset)...")
        device.setDTR(False)
        device.setRTS(True)
        time.sleep(0.1)
        device.setRTS(False)
        time.sleep(0.5)
        device.setDTR(True)
        time.sleep(2)
        print("   ✓ Hardware reset triggered")
        
        print("\n5. Checking device response...")
        device.reset_input_buffer()
        time.sleep(1)
        
        # Send test command
        device.write(b'stoprotation\n')
        device.flush()
        time.sleep(1)
        
        # Read response
        if device.in_waiting > 0:
            response = device.read(device.in_waiting).decode('utf-8', errors='ignore')
            print(f"   Response: {response[:100]}")
            
            if "ESP32 Chip" in response:
                print("\n❌ Device still in bootloader mode")
                print("\nMANUAL RESET REQUIRED:")
                print("1. Unplug the USB cable")
                print("2. Wait 5 seconds")
                print("3. Plug it back in")
                print("4. Wait 5 seconds")
                print("5. Run this script again")
            else:
                print("\n✓ Device appears to be responding normally")
        else:
            print("   No response")
        
        device.close()
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("1. Try manual reset (unplug/replug)")
    print("2. Check if device has a physical reset button")
    print("3. If still not working, firmware may need to be re-uploaded")
    print("="*60)

if __name__ == "__main__":
    reset_device()
    
    input("\nPress Enter to exit...")
