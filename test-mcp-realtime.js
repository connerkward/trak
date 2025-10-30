#!/usr/bin/env node
// Realtime MCP test: verify HTTP polling detects MCP changes instantly

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const mcpServerPath = path.join(__dirname, 'out', 'main', 'mcp-server.js');
const HTTP_PORT = 3123;

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

function waitForTimestampChange(lastTimestamp, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(async () => {
      try {
        const response = await httpGet(`http://localhost:${HTTP_PORT}/last-change`);
        if (response.timestamp > lastTimestamp) {
          clearInterval(interval);
          resolve({ timestamp: response.timestamp, latency: Date.now() - start });
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Timestamp did not change within timeout'));
        }
      } catch (e) {
        // HTTP server might not be ready yet
      }
    }, 50); // Poll every 50ms for accurate latency measurement
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
  console.log('🚀 Starting MCP server:', mcpServerPath);
  const server = spawn('node', [mcpServerPath], { stdio: ['pipe', 'pipe', 'pipe'] });

  server.stderr.on('data', d => process.stdout.write(String(d)));
  server.stdout.on('data', d => process.stdout.write(String(d)));

  // Give server time to boot
  await new Promise(r => setTimeout(r, 1000));

  // Check HTTP server is running
  console.log('🔍 Checking HTTP server...');
  const health = await httpGet(`http://localhost:${HTTP_PORT}/health`);
  console.log('✅ HTTP server running:', health);

  // Get initial timestamp
  const initial = await httpGet(`http://localhost:${HTTP_PORT}/last-change`);
  let lastTimestamp = initial.timestamp;
  console.log('📊 Initial timestamp:', lastTimestamp, '\n');

  console.log('📤 initialize');
  send(server, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'realtime-test', version: '1.0.0' },
  });

  await new Promise(r => setTimeout(r, 200));

  console.log('📤 tools/list');
  send(server, 'tools/list');

  await new Promise(r => setTimeout(r, 200));

  const timerName = 'ProofTimer_' + Math.floor(Math.random() * 10000);

  // Test 1: Add timer
  console.log('📝 Test 1: add_timer "' + timerName + '"');
  send(server, 'tools/call', { name: 'add_timer', arguments: { name: timerName, calendarId: 'cal_test' } });

  const addResult = await waitForTimestampChange(lastTimestamp, 2000);
  console.log('✅ Timestamp changed after add_timer!');
  console.log('   Latency:', addResult.latency + 'ms');
  console.log('   New timestamp:', addResult.timestamp, '\n');
  lastTimestamp = addResult.timestamp;

  // Test 2: Start timer
  console.log('📝 Test 2: start_stop_timer (start) "' + timerName + '"');
  send(server, 'tools/call', { name: 'start_stop_timer', arguments: { name: timerName } });

  const startResult = await waitForTimestampChange(lastTimestamp, 2000);
  console.log('✅ Timestamp changed after start_stop_timer!');
  console.log('   Latency:', startResult.latency + 'ms');
  console.log('   New timestamp:', startResult.timestamp, '\n');
  lastTimestamp = startResult.timestamp;

  // Test 3: Stop timer
  console.log('📝 Test 3: start_stop_timer (stop) "' + timerName + '"');
  send(server, 'tools/call', { name: 'start_stop_timer', arguments: { name: timerName } });

  const stopResult = await waitForTimestampChange(lastTimestamp, 2000);
  console.log('✅ Timestamp changed after start_stop_timer!');
  console.log('   Latency:', stopResult.latency + 'ms');
  console.log('   New timestamp:', stopResult.timestamp, '\n');
  lastTimestamp = stopResult.timestamp;

  // Test 4: Delete timer
  console.log('📝 Test 4: delete_timer "' + timerName + '"');
  send(server, 'tools/call', { name: 'delete_timer', arguments: { name: timerName } });

  const deleteResult = await waitForTimestampChange(lastTimestamp, 2000);
  console.log('✅ Timestamp changed after delete_timer!');
  console.log('   Latency:', deleteResult.latency + 'ms');
  console.log('   New timestamp:', deleteResult.timestamp, '\n');

  console.log('🎉 All tests passed!');
  console.log('📊 Summary:');
  console.log('   Average latency:', Math.round((addResult.latency + startResult.latency + stopResult.latency + deleteResult.latency) / 4) + 'ms');
  console.log('   Expected: <500ms (polling interval)');

  server.kill();
}

main().catch(err => {
  console.error('❌ Realtime test failed:', err.message);
  process.exit(1);
});
