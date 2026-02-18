# ESP32 Shared Device Management - Exact Code Changes

## Overview
This document shows the EXACT code changes needed for the minimal shared device solution.

## File 1: backend-device-service.cjs

### Change Location: Line 409-417 (Device linking conflict check)

**Current Code** (Returns error when device is linked to different agent):
```javascript
// Check if device is already linked to a different agent
if (device.agent_id && String(device.agent_id) !== String(agent_id)) {
  log('warn', 'Device already linked to different agent', { 
    device_id: device.device_id, 
    current_agent: device.agent_id,
    requested_agent: agent_id
  });
  return res.status(409).json({ 
    error: 'Device already linked',
    message: `Device is already linked to agent ${device.agent_id}. Please use a different device or unlink the current one.`
  });
}
```

**New Code** (Allows device transfer for shared workstations):
```javascript
// Check if device is already linked to a different agent
if (device.agent_id && String(device.agent_id) !== String(agent_id)) {
  log('info', 'Device transfer requested - shared workstation scenario', { 
    device_id: device.device_id, 
    previous_agent: device.agent_id,
    new_agent: agent_id,
    computer_name: device.computer_name
  });
  
  // Allow transfer for shared workstations
  // Log the transfer for audit trail
  log('info', 'Transferring device ownership', {
    device_id: device.device_id,
    from_agent: device.agent_id,
    to_agent: agent_id,
    reason: 'shared_workstation'
  });
  
  // Continue with linking (transfer will happen below)
}
```

### Summary of Backend Change:
- **Lines changed**: 1 block (lines 409-417)
- **Risk**: Very low - only changes error response to allow transfer
- **Impact**: Enables device sharing between agents
- **Rollback**: Simply revert this one block

---

## File 2: src/services/deviceService.js

### Change Location: After linkDevice() function (around line 250)

**Add New Function** (Auto-claim device before QR generation):
```javascript
  /**
   * Auto-claim device for current agent (for shared workstations)
   * Call this before QR generation to ensure device is linked
   */
  async autoClaimDevice() {
    try {
      // Get current user
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const agentId = (typeof user.id === 'number') ? user.id : (user.email || user.id || 1);
      const agentName = user.name || user.email || 'Agent';

      console.log('🔄 Auto-claiming device for agent:', agentId);

      // Try to link device (will transfer if already linked to another agent)
      const result = await this.linkDevice(agentId, agentName);

      if (result.success) {
        console.log('✅ Device auto-claimed successfully');
        return { success: true, device_id: result.device_id };
      } else {
        console.warn('⚠️ Device auto-claim failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Auto-claim error:', error);
      return { success: false, error: error.message };
    }
  }
```

### Change Location: Inside displayQR() function (around line 50)

**Current Code** (Directly tries to queue QR):
```javascript
async displayQR(qrImageUrl, customerData) {
  try {
    // Get agent ID from localStorage (set during login)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const agentId = (typeof user.id === 'number') ? user.id : (user.email || user.id || 1);

    console.log('Queueing QR for device:', {
      agent: agentId,
      customer: customerData.name,
      policy: customerData.policyNumber,
      amount: customerData.amountDue
    });

    const fullUrl = `${this.serviceUrl}/api/device/qr`;
```

**New Code** (Auto-claims device first, then queues QR):
```javascript
async displayQR(qrImageUrl, customerData) {
  try {
    // Auto-claim device before QR generation (for shared workstations)
    const claimResult = await this.autoClaimDevice();
    if (!claimResult.success) {
      console.warn('⚠️ Device auto-claim failed, attempting QR anyway:', claimResult.error);
      // Continue anyway - might still work if device was already linked
    }

    // Get agent ID from localStorage (set during login)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const agentId = (typeof user.id === 'number') ? user.id : (user.email || user.id || 1);

    console.log('Queueing QR for device:', {
      agent: agentId,
      customer: customerData.name,
      policy: customerData.policyNumber,
      amount: customerData.amountDue
    });

    const fullUrl = `${this.serviceUrl}/api/device/qr`;
```

### Summary of Frontend Changes:
- **New function added**: `autoClaimDevice()` (15 lines)
- **Modified function**: `displayQR()` - added 5 lines at the beginning
- **Risk**: Very low - only adds auto-claim before QR generation
- **Impact**: Automatic device transfer when needed
- **Rollback**: Remove the 5 lines from displayQR() and delete autoClaimDevice()

---

## Testing the Changes

### Test 1: Single Agent (No Conflict)
1. Agent 24 logs in on PC1
2. Generates QR
3. **Expected**: Auto-claim succeeds, QR displays

### Test 2: Agent Switch (Conflict Resolution)
1. Agent 364 logs in on PC1, generates QR (works)
2. Agent 364 logs out
3. Agent 24 logs in on same PC1
4. Agent 24 generates QR
5. **Expected**: Device automatically transfers from 364 to 24, QR displays

### Test 3: Concurrent Agents (Edge Case)
1. Agent 364 is using PC1
2. Agent 24 tries to use same PC1 simultaneously
3. **Expected**: Device transfers to Agent 24 (last one wins)

---

## Deployment Checklist

- [ ] Review code changes above
- [ ] Approve changes
- [ ] Implement backend change (1 block)
- [ ] Implement frontend changes (1 new function + 5 lines)
- [ ] Test locally
- [ ] Commit to GitHub
- [ ] Deploy to VPS
- [ ] Test with real agents
- [ ] Monitor logs for 24 hours

---

## Rollback Instructions

### If Issues Occur:

**Backend Rollback**:
```javascript
// Restore original error response (lines 409-417)
if (device.agent_id && String(device.agent_id) !== String(agent_id)) {
  log('warn', 'Device already linked to different agent', { 
    device_id: device.device_id, 
    current_agent: device.agent_id,
    requested_agent: agent_id
  });
  return res.status(409).json({ 
    error: 'Device already linked',
    message: `Device is already linked to agent ${device.agent_id}. Please use a different device or unlink the current one.`
  });
}
```

**Frontend Rollback**:
```javascript
// Remove auto-claim lines from displayQR() (restore to original)
async displayQR(qrImageUrl, customerData) {
  try {
    // Get agent ID from localStorage (set during login)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const agentId = (typeof user.id === 'number') ? user.id : (user.email || user.id || 1);
    // ... rest of original code
```

---

## Summary

**Total Changes**:
- Backend: 1 code block modified (8 lines)
- Frontend: 1 function added (15 lines) + 1 function modified (5 lines added)
- **Total**: ~28 lines of code

**Risk Level**: Very Low
**Implementation Time**: 15 minutes
**Testing Time**: 15 minutes
**Deployment Time**: 10 minutes

**Impact**: Eliminates manual localStorage fixes for 100+ shared workstations