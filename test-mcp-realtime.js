#!/usr/bin/env node
// Realtime MCP test: verify MCP writes signals for app to consume

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const mcpServerPath = path.join(__dirname, 'out', 'main', 'mcp-server.js');
const signalFile = path.join(os.homedir(), '.config', 'dingo-track', 'mcp-signal.json');

function waitForSignal(timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      try {
        if (fs.existsSync(signalFile)) {
          const content = fs.readFileSync(signalFile, 'utf-8');
          clearInterval(interval);
          resolve(content);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Signal file not found within timeout'));
        }
      } catch (e) {
        clearInterval(interval);
        reject(e);
      }
    }, 100);
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
  await new Promise(r => setTimeout(r, 300));

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

  // Clean any previous signal
  try { if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile); } catch {}

  const timerName = 'ProofTimer_' + Math.floor(Math.random() * 10000);
  console.log('📤 tools/call add_timer', timerName);
  send(server, 'tools/call', { name: 'add_timer', arguments: { name: timerName, calendarId: 'cal_test' } });

  const addSignal = await waitForSignal(4000);
  console.log('✅ Signal after add_timer:\n' + addSignal + '\n');

  // Remove read signal to detect next one
  try { if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile); } catch {}

  console.log('📤 tools/call start_stop_timer (start)');
  send(server, 'tools/call', { name: 'start_stop_timer', arguments: { name: timerName } });

  const startSignal = await waitForSignal(4000);
  console.log('✅ Signal after start_stop_timer(start):\n' + startSignal + '\n');

  try { if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile); } catch {}

  console.log('📤 tools/call start_stop_timer (stop)');
  send(server, 'tools/call', { name: 'start_stop_timer', arguments: { name: timerName } });

  const stopSignal = await waitForSignal(4000);
  console.log('✅ Signal after start_stop_timer(stop):\n' + stopSignal + '\n');

  server.kill();
}

main().catch(err => {
  console.error('❌ Realtime test failed:', err.message);
  process.exit(1);
});
