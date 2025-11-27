#!/usr/bin/env python3
"""
Test Device Service API
"""

import requests
import json

BASE_URL = "http://localhost:5000"
API_KEY = "NIC-LOCAL-DEVICE-KEY-2024"

def test_health():
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print()
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_display_qr():
    print("Testing /qr/display endpoint...")
    try:
        # Use a simple test QR code
        payload = {
            "qr_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST-PAYMENT-1500",
            "customer_name": "Test Customer",
            "policy_number": "TEST123",
            "amount": 1500
        }
        
        response = requests.post(
            f"{BASE_URL}/qr/display",
            headers={
                "X-API-Key": API_KEY,
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print()
        
        if response.status_code == 200:
            print("✓ QR should now be displayed on device!")
            input("Press Enter after checking device...")
            return True
        else:
            print("✗ Failed to display QR")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("DEVICE SERVICE API TEST")
    print("="*60)
    print()
    
    if test_health():
        print("✓ Health check passed")
        print()
        test_display_qr()
    else:
        print("✗ Health check failed - service not running?")
    
    print("="*60)
