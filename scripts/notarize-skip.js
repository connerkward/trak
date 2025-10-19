// Dummy notarize script that does nothing (for dev builds)
exports.default = async function notarizing(context) {
  console.log('⏭️  Skipping notarization (dev build)');
};

