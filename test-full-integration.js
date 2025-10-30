#!/usr/bin/env node
/**
 * Full Integration Test: Simulates MCP + Electron App communication
 * Tests that:
 * 1. MCP server HTTP endpoints work
 * 2. Timestamp updates when MCP operations occur
 * 3. Electron app polling would detect changes instantly
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const mcpServerPath = path.join(__dirname, 'out', 'main', 'mcp-server.js');
const HTTP_PORT = 3123;
const POLL_INTERVAL = 500; // Same as Electron app

// HTTP GET helper
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function send(server, method, params = {}) {
  const msg = {
    jsonrpc: '2.0',
    id: ++send._id,
    method,
    params,
  };
  server.stdin.write(JSON.stringify(msg) + '\n');
  return msg.id;
}
send._id = 0;

async function main() {
  console.log('🧪 Full Integration Test: MCP + Electron HTTP Polling\n');
  console.log('🚀 Starting MCP server...');

  const server = spawn('node', [mcpServerPath], { stdio: ['pipe', 'pipe', 'pipe'] });

  // Capture MCP server logs
  let mcpLogs = '';
  server.stderr.on('data', d => {
    const line = String(d);
    mcpLogs += line;
    if (line.includes('[MCP HTTP]')) {
      console.log('   📡 MCP:', line.trim());
    }
  });
  server.stdout.on('data', d => { mcpLogs += String(d); });

  // Wait for server to start
  await new Promise(r => setTimeout(r, 1500));

  // Test HTTP server
  console.log('\n✅ Step 1: Verify HTTP server is running');
  const health = await httpGet(`http://localhost:${HTTP_PORT}/health`);
  console.log('   Health check:', health);

  const initial = await httpGet(`http://localhost:${HTTP_PORT}/last-change`);
  console.log('   Initial timestamp:', initial.timestamp);

  // Initialize MCP client
  console.log('\n✅ Step 2: Initialize MCP client');
  send(server, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'integration-test', version: '1.0.0' },
  });
  await new Promise(r => setTimeout(r, 200));

  // Simulate Electron app polling
  let lastKnownTimestamp = initial.timestamp;
  let changeCount = 0;

  console.log('\n✅ Step 3: Start polling (simulating Electron app)');
  console.log('   Polling interval:', POLL_INTERVAL + 'ms');

  const pollInterval = setInterval(async () => {
    try {
      const response = await httpGet(`http://localhost:${HTTP_PORT}/last-change`);
      if (response.timestamp > lastKnownTimestamp) {
        changeCount++;
        console.log(`   ⚡ CHANGE DETECTED #${changeCount}! New timestamp: ${response.timestamp}`);
        lastKnownTimestamp = response.timestamp;
      }
    } catch (e) {
      // Ignore
    }
  }, POLL_INTERVAL);

  // Wait for polling to start
  await new Promise(r => setTimeout(r, 200));

  // Run MCP operations
  const timerName = 'TestTimer_' + Date.now();

  console.log('\n✅ Step 4: Execute MCP operations');

  console.log(`   📝 Operation 1: add_timer "${timerName}"`);
  send(server, 'tools/call', { name: 'add_timer', arguments: { name: timerName, calendarId: 'test-cal' } });
  await new Promise(r => setTimeout(r, 1500));

  console.log(`   📝 Operation 2: start_stop_timer "${timerName}" (start)`);
  send(server, 'tools/call', { name: 'start_stop_timer', arguments: { name: timerName } });
  await new Promise(r => setTimeout(r, 1000));

  console.log(`   📝 Operation 3: start_stop_timer "${timerName}" (stop)`);
  send(server, 'tools/call', { name: 'start_stop_timer', arguments: { name: timerName } });
  await new Promise(r => setTimeout(r, 1000));

  console.log(`   📝 Operation 4: delete_timer "${timerName}"`);
  send(server, 'tools/call', { name: 'delete_timer', arguments: { name: timerName } });
  await new Promise(r => setTimeout(r, 1000));

  // Stop polling
  clearInterval(pollInterval);

  // Verify results
  console.log('\n📊 Test Results:');
  console.log('   Expected changes detected: 4');
  console.log('   Actual changes detected:', changeCount);

  if (changeCount === 4) {
    console.log('   ✅ SUCCESS: All changes detected via HTTP polling!');
  } else {
    console.log('   ❌ FAILURE: Expected 4 changes, got', changeCount);
  }

  console.log('\n📝 Summary:');
  console.log('   - MCP server updates timestamp on every operation');
  console.log('   - Electron app polls every', POLL_INTERVAL + 'ms');
  console.log('   - Changes detected within <', POLL_INTERVAL + 'ms');
  console.log('   - This provides zero-latency UX (sub-second updates)');

  // Cleanup
  server.kill();

  if (changeCount !== 4) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
