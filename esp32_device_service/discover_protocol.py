#!/usr/bin/env python3
"""
ESP32 Protocol Discovery Tool
Discovers what commands and protocols your ESP32 device supports
"""

import serial
import serial.tools.list_ports
import time

COM_PORT = 'COM3'
BAUD_RATE = 9600

def list_available_ports():
    """List all available COM ports"""
    print("\n" + "="*60)
    print("AVAILABLE COM PORTS")
    print("="*60)
    ports = serial.tools.list_ports.comports()
    for port in ports:
        print(f"  {port.device}: {port.description}")
        print(f"    Manufacturer: {port.manufacturer}")
        print(f"    VID:PID: {port.vid}:{port.pid}")
    print("="*60)

def test_basic_connection():
    """Test if device responds to anything"""
    print("\n" + "="*60)
    print("BASIC CONNECTION TEST")
    print("="*60)
    
    try:
        device = serial.Serial(
            port=COM_PORT,
            baudrate=BAUD_RATE,
            timeout=2
        )
        time.sleep(2)
        
        print(f"✓ Connected to {COM_PORT} at {BAUD_RATE} baud")
        print(f"  Device open: {device.is_open}")
        print(f"  Timeout: {device.timeout}s")
        
        # Try to read any existing data
        device.reset_input_buffer()
        time.sleep(0.5)
        
        if device.in_waiting > 0:
            data = device.read(device.in_waiting)
            print(f"  Unsolicited data: {data}")
        
        device.close()
        return True
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

def test_command_response(command, wait_time=1.0):
    """Test a single command and capture response"""
    try:
        device = serial.Serial(COM_PORT, BAUD_RATE, timeout=2)
        time.sleep(0.5)
        
        # Clear buffers
        device.reset_input_buffer()
        device.reset_output_buffer()
        
        # Send command
        device.write((command + '\n').encode('utf-8'))
        device.flush()
        
        # Wait for response
        time.sleep(wait_time)
        
        # Read all available data
        responses = []
        while device.in_waiting > 0:
            try:
                line = device.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    responses.append(line)
            except:
                break
        
        device.close()
        return responses
    except Exception as e:
        return [f"ERROR: {e}"]

def discover_commands():
    """Try various command formats"""
    print("\n" + "="*60)
    print("COMMAND DISCOVERY")
    print("="*60)
    
    commands = [
        # Basic info commands
        ("help", "Request help/command list"),
        ("?", "Alternative help"),
        ("info", "Device info"),
        ("status", "Device status"),
        ("version", "Firmware version"),
        
        # Display commands
        ("display", "Display command"),
        ("show", "Show command"),
        ("image", "Image command"),
        ("picture", "Picture command"),
        
        # File/upload commands
        ("upload", "Upload command"),
        ("send", "Send command"),
        ("file", "File command"),
        ("transfer", "Transfer command"),
        
        # Rotation commands (known to work)
        ("stoprotation", "Stop rotation"),
        ("startrotation", "Start rotation"),
        
        # AT commands (common in ESP32)
        ("AT", "AT command"),
        ("AT+GMR", "AT version"),
        ("AT+RST", "AT reset"),
        
        # Custom protocol test
        ("sending**test.jpg**1024**512", "Upload protocol test"),
    ]
    
    results = []
    
    for cmd, description in commands:
        print(f"\nTesting: {cmd}")
        print(f"  Purpose: {description}")
        
        responses = test_command_response(cmd, wait_time=0.8)
        
        if responses and responses[0] != "":
            print(f"  ✓ Response received:")
            for resp in responses:
                print(f"    → {resp}")
            results.append((cmd, responses))
        else:
            print(f"  ✗ No response")
    
    return results

def test_binary_mode():
    """Test if device accepts binary data"""
    print("\n" + "="*60)
    print("BINARY DATA TEST")
    print("="*60)
    
    try:
        device = serial.Serial(COM_PORT, BAUD_RATE, timeout=2)
        time.sleep(0.5)
        
        # Send some test binary data
        test_data = bytes([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD])
        print(f"Sending binary: {test_data.hex()}")
        
        device.write(test_data)
        device.flush()
        
        time.sleep(1)
        
        if device.in_waiting > 0:
            response = device.read(device.in_waiting)
            print(f"✓ Response: {response.hex()}")
        else:
            print("✗ No response to binary data")
        
        device.close()
    except Exception as e:
        print(f"✗ Binary test failed: {e}")

def analyze_results(results):
    """Analyze discovered commands"""
    print("\n" + "="*60)
    print("ANALYSIS")
    print("="*60)
    
    if not results:
        print("❌ No commands returned responses")
        print("\nPossible issues:")
        print("  1. Wrong baud rate (try 115200, 9600, 57600)")
        print("  2. Device expects different line endings (\\r\\n vs \\n)")
        print("  3. Device uses binary protocol, not text")
        print("  4. Device firmware doesn't support serial commands")
        print("  5. Device is in wrong mode")
    else:
        print(f"✓ Found {len(results)} responsive commands:")
        for cmd, responses in results:
            print(f"\n  Command: {cmd}")
            for resp in responses:
                print(f"    → {resp}")
        
        print("\n" + "="*60)
        print("RECOMMENDATIONS")
        print("="*60)
        
        # Check for upload protocol
        upload_found = any('sending' in cmd for cmd, _ in results)
        if upload_found:
            print("✓ Upload protocol appears to be supported")
        else:
            print("⚠ Upload protocol not confirmed")
            print("  Need to check ESP32 firmware documentation")

def main():
    print("="*60)
    print("ESP32 PROTOCOL DISCOVERY TOOL")
    print("="*60)
    print(f"Target: {COM_PORT} @ {BAUD_RATE} baud")
    print("="*60)
    
    # Step 1: List ports
    list_available_ports()
    
    # Step 2: Test connection
    if not test_basic_connection():
        print("\n❌ Cannot connect to device. Check:")
        print("  - Device is plugged in")
        print("  - Correct COM port")
        print("  - No other program using the port")
        return
    
    # Step 3: Discover commands
    results = discover_commands()
    
    # Step 4: Test binary
    test_binary_mode()
    
    # Step 5: Analyze
    analyze_results(results)
    
    print("\n" + "="*60)
    print("NEXT STEPS")
    print("="*60)
    print("1. Check ESP32 firmware documentation")
    print("2. Look for Arduino sketch or source code")
    print("3. Try different baud rates if needed")
    print("4. Consider reflashing ESP32 with known firmware")
    print("="*60)

if __name__ == "__main__":
    main()
