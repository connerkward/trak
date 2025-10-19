require('dotenv').config();

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip notarization if SKIP_NOTARIZE is set (for dev builds)
  if (process.env.SKIP_NOTARIZE === 'true') {
    console.log('⏭️  Skipping notarization: SKIP_NOTARIZE is set');
    return;
  }

  // Skip notarization for temporary universal build dirs
  if (appOutDir.includes('-temp')) {
    console.log('⏭️  Skipping notarization for temporary build:', appOutDir);
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log('🔐 Notarizing application:', appPath);

  // Load from .env file (local) or use env vars (CI)
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('⚠️  Skipping notarization: Apple credentials not found in environment');
    return;
  }

  try {
    // Dynamic import for ES module
    const { notarize } = await import('@electron/notarize');
    
    await notarize({
      tool: 'notarytool',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId
    });
    console.log('✅ Notarization complete');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};

