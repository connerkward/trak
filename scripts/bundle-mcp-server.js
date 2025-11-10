#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Verify MCP server bundle exists and is executable
 * The actual bundling is done by electron-vite
 */

async function verifyMcpServer() {
  const outFile = path.join(__dirname, '..', 'out', 'main', 'mcp-server.js');

  console.log('Verifying MCP server bundle...');
  console.log('Expected file:', outFile);

  try {
    if (!fs.existsSync(outFile)) {
      console.error('❌ MCP server bundle not found!');
      console.error('   Run `electron-vite build` first.');
      process.exit(1);
    }

    // Ensure it's executable
    try {
      fs.chmodSync(outFile, '755');
    } catch (error) {
      console.warn('⚠️  Could not make file executable:', error.message);
    }

    // Check if it has shebang
    const content = fs.readFileSync(outFile, 'utf-8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      console.warn('⚠️  MCP server missing shebang line');
    }

    const stats = fs.statSync(outFile);
    console.log('✅ MCP server bundle verified');
    console.log('   Size:', Math.round(stats.size / 1024), 'KB');
    console.log('   Executable:', (stats.mode & 0o111) !== 0);

    return outFile;
  } catch (error) {
    console.error('❌ Failed to verify MCP server:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  verifyMcpServer().catch(console.error);
}

module.exports = { verifyMcpServer };
