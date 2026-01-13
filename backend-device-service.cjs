#!/usr/bin/env node
require('dotenv').config();

/**
 * NIC Device Service - VPS Backend API
 * Manages ESP32 devices via polling architecture
 * 
 * Port: 5001 (internal, proxied through Nginx)
 * Storage: JSON files (simple, no database needed)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.DEVICE_SERVICE_PORT || 5001;
const API_KEY = process.env.DEVICE_API_KEY || 'NIC-DEVICE-API-KEY-2024-CHANGE-ME';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logging
const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...data }));
};

// API Key validation
const validateApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    log('warn', 'Unauthorized access attempt', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// File paths
const DATA_DIR = path.join(__dirname, 'device_data');
const REGISTRY_FILE = path.join(DATA_DIR, 'device-registry.json');
const COMMANDS_FILE = path.join(DATA_DIR, 'device-commands.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    log('error', 'Failed to create data directory', { error: error.message });
  }
}

// Load/Save helpers
async function loadRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { devices: {}, stats: { total_devices: 0, online_devices: 0, total_qr_today: 0 } };
  }
}

async function saveRegistry(data) {
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(data, null, 2));
}

async function loadCommands() {
  try {
    const data = await fs.readFile(COMMANDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { queues: {}, history: {} };
  }
}

async function saveCommands(data) {
  await fs.writeFile(COMMANDS_FILE, JSON.stringify(data, null, 2));
}

// Update device status (mark offline if not seen for 30 seconds)
async function updateDeviceStatuses() {
  const registry = await loadRegistry();
  const now = Date.now();
  let onlineCount = 0;

  for (const deviceId in registry.devices) {
    const device = registry.devices[deviceId];
    const lastSeen = new Date(device.last_seen).getTime();
    const secondsSinceLastSeen = (now - lastSeen) / 1000;

    if (secondsSinceLastSeen > 30) {
      device.status = 'offline';
    } else {
      device.status = 'online';
      onlineCount++;
    }
  }

  registry.stats.online_devices = onlineCount;
  await saveRegistry(registry);
}

// Cleanup old commands (remove completed commands older than 1 hour)
async function cleanupOldCommands() {
  const commands = await loadCommands();
  const oneHourAgo = Date.now() - (60 * 60 * 1000);

  for (const commandId in commands.history) {
    const command = commands.history[commandId];
    const completedAt = new Date(command.completed_at).getTime();
    if (completedAt < oneHourAgo) {
      delete commands.history[commandId];
    }
  }

  await saveCommands(commands);
}

// Run maintenance tasks every minute
setInterval(async () => {
  await updateDeviceStatuses();
  await cleanupOldCommands();
}, 60000);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find device for agent with strict matching rules
 * Prevents agents from being linked to wrong devices
 * FIXED: Handle multi-device concurrent linking properly
 */
function findDeviceForAgent(registry, agent_id, device_id, computer_name) {
  let device = null;
  
  // Strategy 1: Find by exact device_id (HIGHEST PRIORITY)
  if (device_id) {
    device = registry.devices[device_id];
    if (device) {
      log('info', 'Device found by device_id', { device_id, agent_id });
      return device;
    }
  }
  
  // Strategy 2: Find by exact computer_name match (MEDIUM PRIORITY)
  // FIXED: Only match devices that are NOT already linked to another agent
  if (computer_name) {
    device = Object.values(registry.devices)
      .find(d => d.computer_name === computer_name && !d.agent_id);
    if (device) {
      log('info', 'Device found by computer_name (unlinked)', { computer_name, device_id: device.device_id, agent_id });
      return device;
    }
    
    // If no unlinked device found, check if there's a device with same computer_name already linked to THIS agent
    device = Object.values(registry.devices)
      .find(d => d.computer_name === computer_name && String(d.agent_id) === String(agent_id));
    if (device) {
      log('info', 'Device found by computer_name (already linked to same agent)', { computer_name, device_id: device.device_id, agent_id });
      return device;
    }
  }
  
  // Strategy 3: Find any unlinked device for this agent (FALLBACK for multi-device setup)
  // This handles cases where device registration happened but linking failed
  const unlinkedDevices = Object.values(registry.devices)
    .filter(d => !d.agent_id && d.status === 'online');
  
  if (unlinkedDevices.length > 0) {
    // Sort by most recently registered/seen
    device = unlinkedDevices.sort((a, b) => {
      const timeA = new Date(a.last_seen).getTime();
      const timeB = new Date(b.last_seen).getTime();
      return timeB - timeA; // Most recent first
    })[0];
    
    log('info', 'Device found by fallback (most recent unlinked)', { 
      device_id: device.device_id, 
      computer_name: device.computer_name,
      agent_id,
      total_unlinked: unlinkedDevices.length
    });
    return device;
  }
  
  // Strategy 4: NO MATCH - Log detailed info for debugging
  const totalDevices = Object.keys(registry.devices).length;
  const onlineDevices = Object.values(registry.devices).filter(d => d.status === 'online').length;
  const linkedDevices = Object.values(registry.devices).filter(d => d.agent_id).length;
  
  log('warn', 'No device found with any strategy', { 
    agent_id, 
    device_id: device_id || 'not_provided', 
    computer_name: computer_name || 'not_provided',
    total_devices: totalDevices,
    online_devices: onlineDevices,
    linked_devices: linkedDevices,
    unlinked_devices: totalDevices - linkedDevices
  });
  return null;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// 1. Health Check
app.get('/api/device/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'NIC Device API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Device Registration
app.post('/api/device/register', validateApiKey, async (req, res) => {
  try {
    const { device_id, computer_name, com_port } = req.body;

    if (!device_id || !computer_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const registry = await loadRegistry();

    // Check if device already exists
    const existingDevice = registry.devices[device_id];

    registry.devices[device_id] = {
      device_id,
      computer_name,
      com_port: com_port || 'Unknown',
      status: 'online',
      registered_at: existingDevice?.registered_at || new Date().toISOString(),
      last_seen: new Date().toISOString(),
      qr_count_today: existingDevice?.qr_count_today || 0,
      qr_count_total: existingDevice?.qr_count_total || 0,
      agent_id: existingDevice?.agent_id || null,
      agent_name: existingDevice?.agent_name || null
    };

    registry.stats.total_devices = Object.keys(registry.devices).length;
    await saveRegistry(registry);

    log('info', 'Device registered', { device_id, computer_name });
    res.json({ success: true, device_id });
  } catch (error) {
    log('error', 'Registration error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 3. Device Polling
app.get('/api/device/poll', validateApiKey, async (req, res) => {
  try {
    const { device_id } = req.query;

    if (!device_id) {
      return res.status(400).json({ error: 'Missing device_id' });
    }

    // Update last_seen
    const registry = await loadRegistry();
    if (registry.devices[device_id]) {
      registry.devices[device_id].last_seen = new Date().toISOString();
      registry.devices[device_id].status = 'online';
      await saveRegistry(registry);
    }

    // Get pending commands
    const commands = await loadCommands();
    const deviceQueue = commands.queues[device_id] || [];

    res.json({
      has_commands: deviceQueue.length > 0,
      commands: deviceQueue
    });
  } catch (error) {
    log('error', 'Polling error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 4. Command Status Report
app.post('/api/device/status', validateApiKey, async (req, res) => {
  try {
    const { device_id, command_id, status, execution_time, error } = req.body;

    if (!device_id || !command_id || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const commands = await loadCommands();

    // Remove from queue
    if (commands.queues[device_id]) {
      commands.queues[device_id] = commands.queues[device_id]
        .filter(cmd => cmd.command_id !== command_id);
    }

    // Add to history
    commands.history[command_id] = {
      device_id,
      status,
      completed_at: new Date().toISOString(),
      execution_time: execution_time || 0,
      error: error || null
    };

    await saveCommands(commands);

    // Update device stats
    if (status === 'success') {
      const registry = await loadRegistry();
      if (registry.devices[device_id]) {
        registry.devices[device_id].qr_count_today++;
        registry.devices[device_id].qr_count_total++;
        registry.devices[device_id].last_qr_at = new Date().toISOString();
        registry.stats.total_qr_today++;
        await saveRegistry(registry);
      }
    }

    log('info', 'Command completed', { device_id, command_id, status });
    res.json({ success: true });
  } catch (error) {
    log('error', 'Status update error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 5. Queue QR Command (from web app)
app.post('/api/device/qr', validateApiKey, async (req, res) => {
  try {
    const { agent_id, qr_image, customer_name, policy_number, amount } = req.body;

    if (!agent_id || !qr_image) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find device for this agent
    const registry = await loadRegistry();
    
    // Find all devices linked to this agent (handle both string and number comparison)
    const agentDevices = Object.values(registry.devices)
      .filter(d => {
        // Compare as strings to handle both types
        return String(d.agent_id) === String(agent_id) && d.status === 'online';
      });

    if (agentDevices.length === 0) {
      log('warn', 'No online device linked to agent', { agent_id });
      return res.status(404).json({ 
        success: false,
        error: 'No online device linked to this agent' 
      });
    }

    // If multiple devices, use the most recently linked one
    const device = agentDevices.sort((a, b) => {
      const timeA = new Date(a.linked_at || a.last_seen).getTime();
      const timeB = new Date(b.linked_at || b.last_seen).getTime();
      return timeB - timeA; // Most recent first
    })[0];

    log('info', 'Using device for QR', { 
      device_id: device.device_id,
      agent_id,
      total_devices: agentDevices.length
    });

    // Create command
    const command = {
      command_id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'display_qr',
      qr_image,
      customer_name: customer_name || 'Customer',
      policy_number: policy_number || 'N/A',
      amount: amount || 0,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    // Add to queue
    const commands = await loadCommands();
    if (!commands.queues[device.device_id]) {
      commands.queues[device.device_id] = [];
    }
    commands.queues[device.device_id].push(command);
    await saveCommands(commands);

    log('info', 'QR command queued', { 
      device_id: device.device_id, 
      agent_id, 
      customer_name 
    });

    res.json({ 
      success: true, 
      command_id: command.command_id,
      device_id: device.device_id
    });
  } catch (error) {
    log('error', 'QR command error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 6. Link Device to Agent
app.post('/api/device/link', validateApiKey, async (req, res) => {
  try {
    const { agent_id, agent_name, computer_name, device_id } = req.body;

    if (!agent_id || !agent_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const registry = await loadRegistry();

    // Use improved device matching function
    const device = findDeviceForAgent(registry, agent_id, device_id, computer_name);

    if (!device) {
      // Provide detailed debugging info
      const allDevices = Object.values(registry.devices);
      const onlineDevices = allDevices.filter(d => d.status === 'online');
      const unlinkedDevices = allDevices.filter(d => !d.agent_id && d.status === 'online');
      
      log('warn', 'Device not found for linking - detailed info', { 
        agent_id, 
        computer_name, 
        device_id,
        total_devices: allDevices.length,
        online_devices: onlineDevices.length,
        unlinked_devices: unlinkedDevices.length,
        device_list: allDevices.map(d => ({
          device_id: d.device_id,
          computer_name: d.computer_name,
          status: d.status,
          agent_id: d.agent_id || 'unlinked',
          last_seen: d.last_seen
        }))
      });
      
      return res.status(404).json({ 
        error: 'Device not found',
        message: 'No device found with exact match. Please ensure the Windows client is running and registered.',
        debug_info: {
          total_devices: allDevices.length,
          online_devices: onlineDevices.length,
          unlinked_devices: unlinkedDevices.length
        }
      });
    }

    // Verify device is online (within last 30 seconds)
    const lastSeen = new Date(device.last_seen).getTime();
    const now = Date.now();
    const secondsSinceLastSeen = (now - lastSeen) / 1000;
    
    if (secondsSinceLastSeen > 30) {
      log('warn', 'Device found but offline', { 
        device_id: device.device_id, 
        agent_id, 
        seconds_since_last_seen: secondsSinceLastSeen 
      });
      return res.status(404).json({ 
        error: 'Device offline',
        message: 'Device found but appears to be offline. Please ensure the Windows client is running.'
      });
    }

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

    // Link device to agent
    device.agent_id = parseInt(agent_id);
    device.agent_name = agent_name;
    device.linked_at = new Date().toISOString();

    registry.devices[device.device_id] = device;
    await saveRegistry(registry);

    log('info', 'Device linked to agent successfully', { 
      device_id: device.device_id, 
      computer_name: device.computer_name,
      agent_id, 
      agent_name,
      was_previously_linked: !!device.agent_id
    });

    res.json({ 
      success: true, 
      device_id: device.device_id,
      computer_name: device.computer_name
    });
  } catch (error) {
    log('error', 'Linking error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 7. Restart Rotation (after QR payment complete)
app.post('/api/device/rotation/start', validateApiKey, async (req, res) => {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'Missing agent_id' });
    }

    // Find device for this agent
    const registry = await loadRegistry();
    
    // Find all devices linked to this agent (handle both string and number comparison)
    const agentDevices = Object.values(registry.devices)
      .filter(d => {
        // Compare as strings to handle both types
        return String(d.agent_id) === String(agent_id) && d.status === 'online';
      });

    if (agentDevices.length === 0) {
      log('warn', 'No online device linked to agent', { agent_id });
      return res.status(404).json({ 
        success: false,
        error: 'No online device linked to this agent' 
      });
    }

    // If multiple devices, use the most recently linked one
    const device = agentDevices.sort((a, b) => {
      const timeA = new Date(a.linked_at || a.last_seen).getTime();
      const timeB = new Date(b.linked_at || b.last_seen).getTime();
      return timeB - timeA; // Most recent first
    })[0];

    // Create rotation start command
    const command = {
      command_id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'start_rotation',
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    // Add to queue
    const commands = await loadCommands();
    if (!commands.queues[device.device_id]) {
      commands.queues[device.device_id] = [];
    }
    commands.queues[device.device_id].push(command);
    await saveCommands(commands);

    log('info', 'Rotation start command queued', { 
      device_id: device.device_id, 
      agent_id 
    });

    res.json({ 
      success: true, 
      command_id: command.command_id,
      device_id: device.device_id
    });
  } catch (error) {
    log('error', 'Rotation start error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 8. List All Devices (Admin)
app.get('/api/device/list', validateApiKey, async (req, res) => {
  try {
    const registry = await loadRegistry();
    const commands = await loadCommands();

    // Add queue counts
    const devices = Object.values(registry.devices).map(device => ({
      ...device,
      pending_commands: (commands.queues[device.device_id] || []).length
    }));

    res.json({
      devices,
      stats: registry.stats
    });
  } catch (error) {
    log('error', 'List devices error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  await ensureDataDir();
  
  app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('NIC DEVICE SERVICE - VPS Backend API');
    console.log('='.repeat(60));
    console.log(`Port: ${PORT}`);
    console.log(`API Key: ${API_KEY.substring(0, 15)}...`);
    console.log(`Data Directory: ${DATA_DIR}`);
    console.log('='.repeat(60));
    console.log('Endpoints:');
    console.log(`  GET  /api/device/health`);
    console.log(`  POST /api/device/register`);
    console.log(`  GET  /api/device/poll`);
    console.log(`  POST /api/device/status`);
    console.log(`  POST /api/device/qr`);
    console.log(`  POST /api/device/link`);
    console.log(`  GET  /api/device/list`);
    console.log('='.repeat(60));
    console.log('Service is ready!');
    console.log('='.repeat(60));
    
    log('info', 'Device service started', { port: PORT });
  });
}

startServer();
