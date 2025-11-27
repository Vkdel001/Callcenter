"""
Test script to verify VPS connection and ESP32 detection
Run this before building to ensure everything is configured correctly
"""

import sys
import requests
from config import Config
from logger_util import setup_logger

def test_configuration():
    """Test configuration"""
    print("\n" + "=" * 60)
    print("NIC Device Client - Configuration Test")
    print("=" * 60)
    
    config = Config()
    
    print("\n[1/4] Checking Configuration...")
    print(f"  VPS URL: {config.vps_url}")
    print(f"  API Key: {config.api_key[:15]}...")
    print(f"  Computer: {config.computer_name}")
    
    errors = config.validate()
    if errors:
        print("\n❌ Configuration Errors:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    print("  ✓ Configuration valid")
    return True

def test_vps_connection(config):
    """Test VPS connection"""
    print("\n[2/4] Testing VPS Connection...")
    print(f"  Connecting to: {config.vps_url}")
    
    try:
        response = requests.get(
            f"{config.vps_url}/api/device/health",
            headers={'X-API-Key': config.api_key},
            timeout=10
        )
        
        if response.ok:
            data = response.json()
            print(f"  ✓ VPS is online")
            print(f"  Service: {data.get('service', 'Unknown')}")
            print(f"  Version: {data.get('version', 'Unknown')}")
            return True
        else:
            print(f"  ❌ VPS returned error: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError as e:
        print(f"  ❌ Cannot connect to VPS")
        print(f"  Error: {e}")
        return False
    except requests.exceptions.Timeout:
        print(f"  ❌ Connection timeout")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_esp32_detection():
    """Test ESP32 detection"""
    print("\n[3/4] Testing ESP32 Detection...")
    
    try:
        import serial.tools.list_ports
        
        ports = serial.tools.list_ports.comports()
        
        if not ports:
            print("  ❌ No COM ports found")
            print("  Make sure ESP32 is connected via USB")
            return False
        
        print(f"  Found {len(ports)} COM port(s):")
        
        esp32_found = False
        for port in ports:
            print(f"    - {port.device}: {port.description}")
            if any(keyword in port.description.upper() for keyword in ['USB', 'CH340', 'CP210', 'UART']):
                print(f"      ✓ Potential ESP32 device")
                esp32_found = True
        
        if esp32_found:
            print("  ✓ ESP32 device detected")
            return True
        else:
            print("  ⚠ No ESP32 detected, but COM ports available")
            print("  The application will try to use the first available port")
            return True
            
    except ImportError:
        print("  ❌ pyserial not installed")
        print("  Run: pip install pyserial")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_dependencies():
    """Test Python dependencies"""
    print("\n[4/4] Testing Dependencies...")
    
    dependencies = {
        'serial': 'pyserial',
        'PIL': 'Pillow',
        'requests': 'requests',
        'pystray': 'pystray'
    }
    
    all_ok = True
    for module, package in dependencies.items():
        try:
            __import__(module)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ❌ {package} not installed")
            all_ok = False
    
    if not all_ok:
        print("\n  Install missing packages:")
        print("  pip install -r requirements.txt")
    
    return all_ok

def main():
    """Run all tests"""
    config = Config()
    
    results = {
        'Configuration': test_configuration(),
        'VPS Connection': test_vps_connection(config),
        'ESP32 Detection': test_esp32_detection(),
        'Dependencies': test_dependencies()
    }
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    all_passed = all(results.values())
    
    print("=" * 60)
    if all_passed:
        print("✓ All tests passed! Ready to build.")
    else:
        print("❌ Some tests failed. Please fix issues before building.")
    print("=" * 60 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
