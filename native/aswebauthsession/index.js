const path = require('path');
const { app } = require('electron');

let nativeModule = null;

try {
  // Try to load the native module
  nativeModule = require('./build/Release/aswebauthsession.node');
} catch (err) {
  console.warn('ASWebAuthenticationSession native module not available:', err.message);
  console.warn('OAuth will fall back to external browser');
}

/**
 * Start an ASWebAuthenticationSession
 * @param {string} url - The OAuth authorization URL
 * @param {string} callbackUrlScheme - The custom URL scheme for callback (e.g., 'http://127.0.0.1')
 * @returns {Promise<string>} - Resolves with the callback URL
 */
async function startAuthSession(url, callbackUrlScheme) {
  if (!nativeModule) {
    throw new Error('ASWebAuthenticationSession native module not available');
  }

  return nativeModule.startAuthSession(url, callbackUrlScheme);
}

/**
 * Cancel the current authentication session
 */
function cancelAuthSession() {
  if (nativeModule) {
    nativeModule.cancelAuthSession();
  }
}

/**
 * Check if ASWebAuthenticationSession is available
 * @returns {boolean}
 */
function isAvailable() {
  return nativeModule !== null && process.platform === 'darwin';
}

module.exports = {
  startAuthSession,
  cancelAuthSession,
  isAvailable
};
