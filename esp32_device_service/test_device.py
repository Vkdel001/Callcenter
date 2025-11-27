#!/usr/bin/env python3
"""
Test ESP32 Device Connection
"""

import serial
import serial.tools.list_ports
import time

COM_PORT = 'COM3'  # Change if needed
BAUD_RATE = 9600

def list_ports():
    """List all available COM ports"""
    print("\nAvailable COM ports:")
    ports = serial.tools.list_ports.comports()
    for port in ports:
        print(f"  {port.device}: {port.description}")
    print()

def test_connection():
    """Test connection to ESP32"""
    print("="*60)
    print("ESP32 DEVICE CONNECTION TEST")
    print("="*60)
    
    list_ports()
    
    print(f"Attempting to connect to {COM_PORT}...")
    
    try:
        device = serial.Serial(
            port=COM_PORT,
            baudrate=BAUD_RATE,
            timeout=5
        )
        
        time.sleep(2)  # Wait for connection
        
        if device.is_open:
            print(f"✓ Connected successfully to {COM_PORT}")
            print(f"  Baudrate: {BAUD_RATE}")
            print(f"  Timeout: 5 seconds")
            
            # Test rotation commands
            print("\nTesting rotation commands...")
            
            device.write(b"stoprotation\n")
            device.flush()
            print("  ✓ Stop rotation command sent")
            time.sleep(1)
            
            device.write(b"startrotation\n")
            device.flush()
            print("  ✓ Start rotation command sent")
            
            device.close()
            print("\n✓ All tests passed!")
            print("\nYou can now run device_service.py")
            return True
        else:
            print("✗ Failed to open connection")
            return False
    
    except serial.SerialException as e:
        print(f"✗ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check USB cable is connected")
        print("  2. Verify COM port in Device Manager")
        print("  3. Try a different USB port")
        print("  4. Run as administrator")
        print("  5. Close other programs using the port")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    test_connection()
