const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertIcons() {
  const assetsDir = path.join(__dirname, '../assets');
  const iconSvgPath = path.join(assetsDir, 'icon.svg');
  
  try {
    // Convert to app icon (512x512)
    await sharp(iconSvgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(assetsDir, 'app-icon.png'));
    
    console.log('✅ Created app-icon.png (512x512)');
    
    // Convert to tray icon (32x32)
    await sharp(iconSvgPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(assetsDir, 'tray-icon.png'));
    
    console.log('✅ Created tray-icon.png (32x32)');
    
    // Also create a 16x16 version for smaller displays
    await sharp(iconSvgPath)
      .resize(16, 16)
      .png()
      .toFile(path.join(assetsDir, 'tray-icon-16.png'));
    
    console.log('✅ Created tray-icon-16.png (16x16)');
    
  } catch (error) {
    console.error('❌ Error converting icons:', error.message);
    process.exit(1);
  }
}

convertIcons(); 