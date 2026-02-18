# ESP32 Multi-Device Issue - Debug Investigation Plan

## 🎯 Objective
Verify if the documented device routing fix was properly deployed and identify why device association breaks during concurrent use.

---

## 📋 Investigation Steps (No Code Changes)

### Step 1: Verify Fix Deployment Status

#### Check if Device Routing Fix is in Current Backend
```bash
# On VPS server
cd /var/www/nic-callcenter

# Search for the documented fix keywords
grep -n -A 5 -B 5 "device stealing" backend-device-service.cjs
grep -n -A 5 -B 5 "Only link to unlinked devices" backend-device-service.cjs
grep -n -A 5 -B 5 "prevent device stealing" backend-device-service.cjs

# Check for the specific fix logic
grep -n -A 10 "(!d.agent_id || String(d.agent_id) === String(agent_id))" backend-device-service.cjs
```

**Expected Result**: Should find the fix logic if properly deployed
**If Not Found**: The fix was documented but never deployed

---

### Step 2: Check Current Device Registry State

#### Examine Device Registry File
```bash
# Check if device registry exists and view current state
ls -la device_data/
cat device_data/device-registry.json | jq '.'

# Check device-agent associations
cat device_data/device-registry.json | jq '.devices[] | {device_id, agent_id, agent_name, status, last_seen}'
```

**Expected Result**: Should show both devices with correct agent associations
**Look For**: 
- Agent 263 → `device_DESKTOP-RSJ243K_4CD717`
- Agent 364 → `device_DESKTOP-6O61KL3_B46921`

---

### Step 3: Monitor Real-Time Device Behavior

#### Watch Logs During QR Generation
```bash
# Terminal 1: Watch device service logs
tail -f /root/.pm2/logs/device-api-out.log

# Terminal 2: Watch device service errors  
tail -f /root/.pm2/logs/device-api-error.log
```

**Test Scenario**: Have both agents generate QR codes simultaneously while watching logs

**Look For**:
- Device linking messages
- "No online device linked" errors
- Agent ID mismatches
- Device reassignment logs

---

### Step 4: Test Device Linking API Behavior

#### Test Agent 263 Device Linking
```bash
curl -X POST https://payments.niclmauritius.site/api/device/link \
  -H "Content-Type: application/json" \
  -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" \
  -d '{"agent_id": 263, "agent_name": "test vk", "computer_name": "DESKTOP-RSJ243K"}'
```

#### Test Agent 364 Device Linking  
```bash
curl -X POST https://payments.niclmauritius.site/api/device/link \
  -H "Content-Type: application/json" \
  -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" \
  -d '{"agent_id": 364, "agent_name": "bornix2", "computer_name": "DESKTOP-6O61KL3"}'
```

#### Check Device List After Linking
```bash
curl -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" \
  https://payments.niclmauritius.site/api/device/list | jq '.'
```

**Expected Result**: Each agent should be linked to their correct device
**Look For**: Device reassignment or agent ID changes

---

### Step 5: Test Concurrent QR Generation

#### Simulate Concurrent QR Requests
```bash
# Terminal 1: Agent 263 QR generation
curl -X POST https://payments.niclmauritius.site/api/device/qr \
  -H "Content-Type: application/json" \
  -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" \
  -d '{"agent_id": 263, "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "customer_name": "Test Agent 263", "policy_number": "TEST-263", "amount": 1000}'

# Terminal 2: Agent 364 QR generation (run simultaneously)
curl -X POST https://payments.niclmauritius.site/api/device/qr \
  -H "Content-Type: application/json" \
  -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" \
  -d '{"agent_id": 364, "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "customer_name": "Test Agent 364", "policy_number": "TEST-364", "amount": 2000}'
```

**Expected Result**: Both should succeed with their respective devices
**Look For**: "No online device linked" errors or wrong device routing

---

### Step 6: Check Backend Service Version and History

#### Check Git History for Device Routing Fix
```bash
# Check recent commits for device routing fixes
git log --oneline --grep="device routing" --since="2024-01-01"
git log --oneline --grep="device stealing" --since="2024-01-01"
git log --oneline --grep="multi-agent" --since="2024-01-01"

# Check if specific files were modified
git log --oneline backend-device-service.cjs --since="2024-01-01"
```

#### Check Current Backend Service Timestamp
```bash
# Check when backend service was last modified
ls -la backend-device-service.cjs
stat backend-device-service.cjs

# Check if PM2 service is running the latest version
pm2 show device-api
pm2 logs device-api --lines 20
```

---

### Step 7: Analyze Device Data Files

#### Check Command Queue State
```bash
# Check if commands are queuing properly
cat device_data/device-commands.json | jq '.'

# Look for pending commands per device
cat device_data/device-commands.json | jq '.queues'
```

#### Check Device Status Update Logic
```bash
# Check device status timestamps
cat device_data/device-registry.json | jq '.devices[] | {device_id, status, last_seen, agent_id}' | grep -A 3 -B 3 "offline\|online"
```

---

## 🔍 Specific Things to Look For

### 1. **Fix Deployment Verification**
- [ ] Device routing fix code present in backend-device-service.cjs
- [ ] Specific logic: `(!d.agent_id || String(d.agent_id) === String(agent_id))`
- [ ] Enhanced logging for device linking behavior

### 2. **Device Registry Issues**
- [ ] Agent IDs stored as strings vs numbers
- [ ] Device status incorrectly marked as offline
- [ ] Agent-device associations changing unexpectedly
- [ ] Multiple agents linked to same device

### 3. **Concurrent Operation Problems**
- [ ] Race conditions during simultaneous QR generation
- [ ] File locking issues with device registry
- [ ] Command queue corruption
- [ ] Device status update timing conflicts

### 4. **Backend Service Issues**
- [ ] Old version of backend service running
- [ ] PM2 not restarted after code changes
- [ ] Configuration mismatches
- [ ] API key or authentication issues

---

## 📊 Expected Investigation Results

### Scenario A: Fix Not Deployed
**Symptoms**: 
- No device routing fix code found in backend-device-service.cjs
- Device linking logic allows device stealing

**Solution**: Deploy the documented fix

### Scenario B: Fix Deployed But Incomplete
**Symptoms**:
- Fix code present but still getting device conflicts
- Partial implementation of device isolation

**Solution**: Complete the fix implementation

### Scenario C: Race Condition Issue
**Symptoms**:
- Fix deployed correctly
- Issues only occur during simultaneous operations
- Device registry corruption during concurrent access

**Solution**: Add file locking or improve concurrency handling

### Scenario D: Data Type Mismatch
**Symptoms**:
- Agent IDs stored inconsistently (string vs number)
- Device linking works sometimes, fails other times

**Solution**: Standardize agent ID data types

---

## 🎯 Investigation Commands Summary

Run these commands in sequence and document the results:

```bash
# 1. Check fix deployment
grep -n "device stealing\|Only link to unlinked" backend-device-service.cjs

# 2. Check device registry
cat device_data/device-registry.json | jq '.devices[] | {device_id, agent_id, agent_name, status}'

# 3. Test device linking
curl -X POST https://payments.niclmauritius.site/api/device/link -H "Content-Type: application/json" -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" -d '{"agent_id": 263, "agent_name": "test vk"}'

# 4. Check device list
curl -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" https://payments.niclmauritius.site/api/device/list | jq '.devices[] | {device_id, agent_id, agent_name, status}'

# 5. Test concurrent QR (run both simultaneously)
# Terminal 1:
curl -X POST https://payments.niclmauritius.site/api/device/qr -H "Content-Type: application/json" -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" -d '{"agent_id": 263, "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "customer_name": "Test 263", "amount": 1000}'

# Terminal 2:
curl -X POST https://payments.niclmauritius.site/api/device/qr -H "Content-Type: application/json" -H "X-API-Key: +uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=" -d '{"agent_id": 364, "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "customer_name": "Test 364", "amount": 2000}'
```

---

## 📝 Results Documentation Template

```
ESP32 Multi-Device Debug Results
================================

1. Fix Deployment Status:
   [ ] Fix code found in backend-device-service.cjs
   [ ] Specific logic present: (!d.agent_id || String(d.agent_id) === String(agent_id))
   [ ] Enhanced logging present
   
2. Device Registry State:
   Agent 263: device_id=_______, status=_______, agent_id=_______
   Agent 364: device_id=_______, status=_______, agent_id=_______
   
3. Device Linking Test Results:
   Agent 263 link: Success/Failure - _______
   Agent 364 link: Success/Failure - _______
   
4. Concurrent QR Test Results:
   Agent 263 QR: Success/Failure - _______
   Agent 364 QR: Success/Failure - _______
   
5. Identified Issues:
   - _______
   - _______
   - _______
   
6. Root Cause:
   _______
   
7. Recommended Solution:
   _______
```

Let's start with Step 1 - checking if the fix was actually deployed. Can you run the first set of commands to verify the fix deployment status?