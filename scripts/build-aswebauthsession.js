const { execSync } = require('child_process');
const path = require('path');

const moduleDir = path.resolve(__dirname, '../native/aswebauthsession');

if (process.platform !== 'darwin') {
  console.log('Skipping ASWebAuthenticationSession build (macOS only).');
  process.exit(0);
}

const env = {
  ...process.env,
  ARCHFLAGS: process.env.ARCHFLAGS || '-arch x86_64 -arch arm64',
  LDFLAGS: process.env.LDFLAGS || '-arch x86_64 -arch arm64'
};

console.log('🔨 Building ASWebAuthenticationSession native module (universal)...');

try {
  execSync('npx node-gyp rebuild', {
    cwd: moduleDir,
    stdio: 'inherit',
    env
  });
  console.log('✓ ASWebAuthenticationSession module built successfully');
} catch (error) {
  console.error('❌ Failed to build ASWebAuthenticationSession native module');
  throw error;
}

