#!/usr/bin/env node
// Quick test: Start a timer and leave it running, then check storage

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const mcpServerPath = path.join(__dirname, 'out', 'main', 'mcp-server.js');

function send(server, method, params = {}) {
  const msg = { jsonrpc: '2.0', id: ++send._id, method, params };
  server.stdin.write(JSON.stringify(msg) + '\n');
  return msg.id;
}
send._id = 0;

async function main() {
  console.log('Starting MCP server...');
  const server = spawn('node', [mcpServerPath], { stdio: ['pipe', 'pipe', 'pipe'] });

  server.stderr.on('data', d => process.stdout.write(String(d)));

  await new Promise(r => setTimeout(r, 1000));

  send(server, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'test', version: '1.0.0' },
  });

  await new Promise(r => setTimeout(r, 200));

  const timerName = 'RunningTest_' + Date.now();

  console.log(`\n1. Adding timer "${timerName}"...`);
  send(server, 'tools/call', { name: 'add_timer', arguments: { name: timerName, calendarId: 'test-cal' } });
  await new Promise(r => setTimeout(r, 500));

  console.log(`\n2. Starting timer "${timerName}"...`);
  send(server, 'tools/call', { name: 'start_stop_timer', arguments: { name: timerName } });
  await new Promise(r => setTimeout(r, 500));

  console.log(`\n3. Checking get_active_timers...`);
  send(server, 'tools/call', { name: 'get_active_timers', arguments: {} });
  await new Promise(r => setTimeout(r, 500));

  console.log(`\n4. Checking storage file...`);
  const storagePath = path.join(require('os').homedir(), 'Library', 'Application Support', '@every-time', 'dingo-track', 'dingo-track-timers.json');
  const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));

  console.log('\nActiveTimers in storage:');
  for (const key of Object.keys(data)) {
    if (key.includes('activeTimers')) {
      console.log(`  ${key}:`, data[key]);
    }
  }

  console.log(`\n✅ Timer "${timerName}" should be running!`);
  console.log('Press Ctrl+C to stop the server and timer will remain running in storage.');

  // Keep server alive
  await new Promise(() => {});
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
