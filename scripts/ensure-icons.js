const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');
const ICONS_TO_CHECK = [
  'app-icon.png',
  'tray-iconTemplate.png',
  'tray-iconTemplate@2x.png',
  'tray-icon-16.png',
  'tray-icon.png'
];

async function checkIconsExist() {
  const missingIcons = ICONS_TO_CHECK.filter(icon => 
    !fs.existsSync(path.join(ASSETS_DIR, icon))
  );
  
  return missingIcons.length === 0;
}

async function getSourceFileTimestamp() {
  const sourceFiles = [
    path.join(ASSETS_DIR, 'dingo-track-logo.png'),
    path.join(ASSETS_DIR, 'logo_white.svg')
  ];
  
  let latestTime = 0;
  for (const file of sourceFiles) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      latestTime = Math.max(latestTime, stats.mtimeMs);
    }
  }
  return latestTime;
}

async function getOldestIconTimestamp() {
  let oldestTime = Infinity;
  for (const icon of ICONS_TO_CHECK) {
    const iconPath = path.join(ASSETS_DIR, icon);
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      oldestTime = Math.min(oldestTime, stats.mtimeMs);
    }
  }
  return oldestTime === Infinity ? 0 : oldestTime;
}

async function shouldRebuildIcons() {
  // Check if all icons exist
  if (!(await checkIconsExist())) {
    console.log('🔧 Missing icons detected - rebuilding...');
    return true;
  }
  
  // Check if source files are newer than generated icons
  const sourceTime = await getSourceFileTimestamp();
  const iconTime = await getOldestIconTimestamp();
  
  if (sourceTime > iconTime) {
    console.log('🔧 Source files newer than icons - rebuilding...');
    return true;
  }
  
  console.log('✅ Icons up to date - skipping rebuild');
  return false;
}

async function generateIcons() {
  const dingoLogoPath = path.join(ASSETS_DIR, 'dingo-track-logo.png');
  
  if (!fs.existsSync(dingoLogoPath)) {
    console.error('❌ Source logo not found:', dingoLogoPath);
    process.exit(1);
  }
  
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
      .toFile(path.join(ASSETS_DIR, 'app-icon.png'));
    
    console.log('✅ Created app-icon.png');

    // Generate macOS template PNG icons from the cleaned SVG
    const logoWhiteSvgPath = path.join(ASSETS_DIR, 'logo_white.svg');
    if (fs.existsSync(logoWhiteSvgPath)) {
      // 16×16 template PNG
      await sharp(logoWhiteSvgPath)
        .resize(16, 16, { kernel: sharp.kernel.nearest, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(ASSETS_DIR, 'tray-iconTemplate.png'));
      console.log('✅ Created tray-iconTemplate.png (16×16)');
      
      // 32×32 Retina (@2x) template PNG
      await sharp(logoWhiteSvgPath)
        .resize(32, 32, { kernel: sharp.kernel.nearest, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(ASSETS_DIR, 'tray-iconTemplate@2x.png'));
      console.log('✅ Created tray-iconTemplate@2x.png (32×32)');
    } else {
      console.warn('⚠️  logo_white.svg not found; skipped template PNG generation.');
    }

    // Create standard PNG versions for cross-platform compatibility
    await sharp(dingoLogoPath)
      .resize(16, 16, { 
        kernel: sharp.kernel.nearest,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(ASSETS_DIR, 'tray-icon-16.png'));
    console.log('✅ Created tray-icon-16.png (16x16)');

    await sharp(dingoLogoPath)
      .resize(36, 36, { 
        kernel: sharp.kernel.nearest,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .grayscale()
      .png()
      .toFile(path.join(ASSETS_DIR, 'tray-icon.png'));
    console.log('✅ Created tray-icon.png (36x36)');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

async function main() {
  if (await shouldRebuildIcons()) {
    await generateIcons();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { shouldRebuildIcons, generateIcons };