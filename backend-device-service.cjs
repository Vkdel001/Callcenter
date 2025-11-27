#!/usr/bin/env node
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
    const device = Object.values(registry.devices)
      .find(d => d.agent_id === parseInt(agent_id));

    if (!device) {
      log('warn', 'No device linked to agent', { agent_id });
      return res.status(404).json({ 
        success: false,
        error: 'No device linked to this agent' 
      });
    }

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

    // Find device by computer_name or device_id
    let device;
    if (device_id) {
      device = registry.devices[device_id];
    } else if (computer_name) {
      device = Object.values(registry.devices)
        .find(d => d.computer_name === computer_name);
    }

    if (!device) {
      log('warn', 'Device not found for linking', { agent_id, computer_name, device_id });
      return res.status(404).json({ error: 'Device not found' });
    }

    // Link device to agent
    device.agent_id = parseInt(agent_id);
    device.agent_name = agent_name;
    device.linked_at = new Date().toISOString();

    registry.devices[device.device_id] = device;
    await saveRegistry(registry);

    log('info', 'Device linked to agent', { 
      device_id: device.device_id, 
      agent_id, 
      agent_name 
    });

    res.json({ 
      success: true, 
      device_id: device.device_id 
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
    const device = Object.values(registry.devices)
      .find(d => d.agent_id === parseInt(agent_id));

    if (!device) {
      log('warn', 'No device linked to agent', { agent_id });
      return res.status(404).json({ 
        success: false,
        error: 'No device linked to this agent' 
      });
    }

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
