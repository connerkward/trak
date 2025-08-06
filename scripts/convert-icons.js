const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const assetsDir = path.join(__dirname, '../assets');
  const dingoLogoPath = path.join(assetsDir, 'dingo-track-logo.png');
  
  try {
    // Create a blue circle background SVG
    const blueCircleSvg = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="256" fill="#007AFF"/>
      </svg>
    `;
    
    // Create blue circle background buffer
    const blueCircleBuffer = await sharp(Buffer.from(blueCircleSvg))
      .resize(512, 512)
      .png()
      .toBuffer();
    
    // Convert to app icon (512x512) with blue circle background
    await sharp(blueCircleBuffer)
      .composite([{
        input: await sharp(dingoLogoPath).resize(384, 384).png().toBuffer(),
        top: 64,
        left: 64,
        blend: 'over'
      }])
      .png()
      .toFile(path.join(assetsDir, 'app-icon.png'));
    
    console.log('✅ Created app-icon.png');

    // Generate macOS template PNG icons from the cleaned SVG
    const logoWhiteSvgPath = path.join(assetsDir, 'logo_white.svg');
    if (fs.existsSync(logoWhiteSvgPath)) {
      // 16×16 template PNG
      await sharp(logoWhiteSvgPath)
        .resize(16, 16, { kernel: sharp.kernel.nearest, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(assetsDir, 'tray-iconTemplate.png'));
      console.log('✅ Created tray-iconTemplate.png (16×16) - macOS template icon');
      // 32×32 Retina (@2x) template PNG
      await sharp(logoWhiteSvgPath)
        .resize(32, 32, { kernel: sharp.kernel.nearest, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(assetsDir, 'tray-iconTemplate@2x.png'));
      console.log('✅ Created tray-iconTemplate@2x.png (32×32) - macOS Retina template icon');
    } else {
      console.warn('⚠️  logo_white.svg not found; skipped template PNG generation.');
    }

    // Create a standard 16x16 PNG version of the tray icon (for Windows/fallback)
    const trayIconPng16Path = path.join(assetsDir, 'tray-icon-16.png');
    await sharp(dingoLogoPath)
      .resize(16, 16, { 
        kernel: sharp.kernel.nearest,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(trayIconPng16Path);
    console.log('✅ Created tray-icon-16.png (16x16) - standard template image');

    // Create a 36x36 PNG version for high-DPI displays (Windows/fallback)
    const trayIconPng36Path = path.join(assetsDir, 'tray-icon.png');
    await sharp(dingoLogoPath)
      .resize(36, 36, { 
        kernel: sharp.kernel.nearest,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .grayscale()
      .png()
      .toFile(trayIconPng36Path);
    console.log('✅ Created tray-icon.png (36x36) - Retina template image');

  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons(); 