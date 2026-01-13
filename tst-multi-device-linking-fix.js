#!/usr/bin/env node

/**
 * Test Multi-Device ESP32 Linking Fix
 * Tests the improved device linking logic for concurrent multi-device scenarios
 */

const API_BASE = 'https://payments.niclmauritius.site';
const API_KEY = 'NIC-DEVICE-API-KEY-2024-CHANGE-ME';

async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function testMultiDeviceLinking() {
  console.log('🧪 Testing Multi-Device ESP32 Linking Fix');
  console.log('=' .repeat(60));

  // Test 1: Check current device registry
  console.log('\n📋 Step 1: Check current device registry');
  const listResult = await makeRequest('/api/device/list');
  if (listResult.status === 200) {
    console.log('✅ Device registry retrieved');
    console.log(`📊 Total devices: ${listResult.data.devices.length}`);
    console.log(`📊 Online devices: ${listResult.data.stats.online_devices}`);
    
    listResult.data.devices.forEach(device => {
      console.log(`   📱 ${device.device_id} (${device.computer_name}) - ${device.status} - Agent: ${device.agent_id || 'unlinked'}`);
    });
  } else {
    console.log('❌ Failed to get device registry:', listResult.data?.error);
    return;
  }

  // Test 2: Simulate device registration for second device
  console.log('\n📋 Step 2: Test device registration');
  const registerResult = await makeRequest('/api/device/register', 'POST', {
    device_id: 'device_TEST-PC2_123456',
    computer_name: 'TEST-PC2',
    com_port: 'COM3'
  });

  if (registerResult.status === 200) {
    console.log('✅ Test device registered successfully');
  } else {
    console.log('⚠️ Device registration result:', registerResult.data);
  }

  // Test 3: Test linking for agent 366 (the failing agent from logs)
  console.log('\n📋 Step 3: Test device linking for agent 366');
  const linkResult = await makeRequest('/api/device/link', 'POST', {
    agent_id: 366,
    agent_name: 'bonrix3',
    computer_name: 'DESKTOP-C2J6KVV' // From the logs
  });

  if (linkResult.status === 200) {
    console.log('✅ Device linked successfully for agent 366');
    console.log(`   📱 Device ID: ${linkResult.data.device_id}`);
    console.log(`   💻 Computer: ${linkResult.data.computer_name}`);
  } else {
    console.log('❌ Device linking failed for agent 366:', linkResult.data?.error);
    if (linkResult.data?.debug_info) {
      console.log('🔍 Debug info:', linkResult.data.debug_info);
    }
  }

  // Test 4: Test QR command for agent 366
  console.log('\n📋 Step 4: Test QR command for agent 366');
  const qrResult = await makeRequest('/api/device/qr', 'POST', {
    agent_id: 366,
    qr_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    customer_name: 'Test Customer',
    policy_number: 'TEST123',
    amount: 1000
  });

  if (qrResult.status === 200) {
    console.log('✅ QR command queued successfully for agent 366');
    console.log(`   📱 Command ID: ${qrResult.data.command_id}`);
    console.log(`   📱 Device ID: ${qrResult.data.device_id}`);
  } else {
    console.log('❌ QR command failed for agent 366:', qrResult.data?.error);
  }

  // Test 5: Check final device registry state
  console.log('\n📋 Step 5: Check final device registry state');
  const finalListResult = await makeRequest('/api/device/list');
  if (finalListResult.status === 200) {
    console.log('✅ Final device registry:');
    finalListResult.data.devices.forEach(device => {
      const status = device.status === 'online' ? '🟢' : '🔴';
      const linked = device.agent_id ? `👤 Agent ${device.agent_id}` : '🔓 Unlinked';
      console.log(`   ${status} ${device.device_id} (${device.computer_name}) - ${linked}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🧪 Multi-Device Linking Test Complete');
}

// Test concurrent linking scenario
async function testConcurrentLinking() {
  console.log('\n🔄 Testing Concurrent Device Linking');
  console.log('-'.repeat(40));

  // Simulate two agents trying to link devices simultaneously
  const promises = [
    makeRequest('/api/device/link', 'POST', {
      agent_id: 364,
      agent_name: 'bornix2',
      computer_name: 'DESKTOP-6O61KL3'
    }),
    makeRequest('/api/device/link', 'POST', {
      agent_id: 366,
      agent_name: 'bonrix3',
      computer_name: 'DESKTOP-C2J6KVV'
    })
  ];

  const results = await Promise.all(promises);
  
  results.forEach((result, index) => {
    const agentId = index === 0 ? 364 : 366;
    if (result.status === 200) {
      console.log(`✅ Agent ${agentId} linked successfully: ${result.data.device_id}`);
    } else {
      console.log(`❌ Agent ${agentId} linking failed: ${result.data?.error}`);
    }
  });
}

// Run tests
async function runTests() {
  try {
    await testMultiDeviceLinking();
    await testConcurrentLinking();
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

runTests();