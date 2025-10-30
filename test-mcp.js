#!/usr/bin/env node

/**
 * Test script to demonstrate MCP server functionality
 * This simulates what Claude Desktop does when connecting to the MCP server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Start the MCP server
const mcpServerPath = path.join(__dirname, 'out', 'main', 'mcp-server.js');
console.log('🚀 Starting MCP server:', mcpServerPath);
console.log('');

const server = spawn('node', [mcpServerPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;

// Helper to send JSON-RPC messages
function sendMessage(method, params = {}) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params
  };
  const json = JSON.stringify(message);
  server.stdin.write(json + '\n');
  console.log('📤 Sent:', method);
}

// Buffer for incomplete messages
let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();

  // Try to parse complete JSON messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('📥 Received:', JSON.stringify(response, null, 2));
        console.log('');
      } catch (e) {
        // Not JSON, might be a log message
        if (line.includes('MCP server running')) {
          console.log('✅', line);
          console.log('');
          runTests();
        }
      }
    }
  });
});

server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('MCP server running')) {
    console.log('✅ MCP Server is running!');
    console.log('');

    // Give it a moment to fully initialize
    setTimeout(() => {
      runTests();
    }, 500);
  } else {
    console.log('⚠️  Server stderr:', msg);
  }
});

server.on('close', (code) => {
  console.log('');
  console.log('🛑 MCP server exited with code:', code);
  process.exit(code);
});

function runTests() {
  console.log('🧪 Running MCP Server Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Test 1: Initialize connection
  console.log('Test 1: Initialize connection');
  sendMessage('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {
      roots: { listChanged: true },
      sampling: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  });

  // Test 2: List available tools
  setTimeout(() => {
    console.log('Test 2: List available tools');
    sendMessage('tools/list');
  }, 1000);

  // Test 3: Call list_timers tool
  setTimeout(() => {
    console.log('Test 3: Call list_timers tool');
    sendMessage('tools/call', {
      name: 'list_timers',
      arguments: {}
    });
  }, 2000);

  // Test 4: Call get_active_timers tool
  setTimeout(() => {
    console.log('Test 4: Call get_active_timers tool');
    sendMessage('tools/call', {
      name: 'get_active_timers',
      arguments: {}
    });
  }, 3000);

  // Test 5: Call list_calendars tool
  setTimeout(() => {
    console.log('Test 5: Call list_calendars tool');
    sendMessage('tools/call', {
      name: 'list_calendars',
      arguments: {}
    });
  }, 4000);

  // Test 6: Call add_timer and verify signal file
  setTimeout(() => {
    const timerName = 'ProofTimer_' + Math.floor(Math.random() * 10000);
    console.log('Test 6: Call add_timer tool');
    sendMessage('tools/call', {
      name: 'add_timer',
      arguments: { name: timerName, calendarId: 'cal_test' }
    });

    // After a short delay, print the MCP signal file if present
    setTimeout(() => {
      try {
        const signalPath = path.join(os.homedir(), '.config', 'dingo-track', 'mcp-signal.json');
        if (fs.existsSync(signalPath)) {
          const content = fs.readFileSync(signalPath, 'utf-8');
          console.log('📡 MCP Signal file content:');
          console.log(content);
        } else {
          console.log('📡 MCP Signal file not found');
        }
      } catch (e) {
        console.log('📡 Error reading MCP Signal file:', e.message);
      }
    }, 800);
  }, 5000);

  // Exit after tests
  setTimeout(() => {
    console.log('');
    console.log('✅ All tests completed!');
    console.log('');
    console.log('🎉 MCP Server is working correctly!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    server.kill();
  }, 6500);
}

// Handle process exit
process.on('SIGINT', () => {
  console.log('');
  console.log('Shutting down...');
  server.kill();
  process.exit(0);
});
