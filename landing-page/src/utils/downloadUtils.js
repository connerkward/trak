// Utility functions for download handling

export const detectSystemArchitecture = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'universal'; // Default for SSR
  }

  // Check for Apple Silicon (ARM64)
  if (navigator.platform.includes('Mac') && navigator.userAgent.includes('AppleWebKit')) {
    // Try to detect ARM64 vs Intel
    if (navigator.userAgent.includes('ARM64') || 
        (navigator.userAgent.includes('Mac OS X') && navigator.userAgent.includes('AppleWebKit'))) {
      // For better detection, we can check if the user is on Apple Silicon
      // This is a heuristic - ARM64 Macs typically have different user agent patterns
      if (navigator.userAgent.includes('Mac OS X 11_') || 
          navigator.userAgent.includes('Mac OS X 12_') || 
          navigator.userAgent.includes('Mac OS X 13_') || 
          navigator.userAgent.includes('Mac OS X 14_')) {
        return 'arm64';
      }
    }
  }

  // Default to universal for Mac
  if (navigator.platform.includes('Mac')) {
    return 'universal';
  }

  return 'universal';
};

// Fetch build info to get current version
let cachedVersion = '1.0.1'; // Fallback version

export const getBuildInfo = async () => {
  try {
    const response = await fetch('/build-info.json');
    if (response.ok) {
      const data = await response.json();
      cachedVersion = data.version;
      return data;
    }
  } catch (error) {
    console.log('Using fallback version:', cachedVersion);
  }
  return { version: cachedVersion };
};

export const getDMGDownloadUrl = async () => {
  const baseUrl = '/downloads';
  const buildInfo = await getBuildInfo();
  const version = buildInfo.version || cachedVersion;
  
  // Universal DMG that works on both Intel and Apple Silicon
  return `${baseUrl}/Dingo Track-${version}-universal.dmg`;
};

export const getDMGFilename = async () => {
  const buildInfo = await getBuildInfo();
  const version = buildInfo.version || cachedVersion;
  return `Dingo Track-${version}-universal.dmg`;
};

export const checkDMGAvailability = async () => {
  try {
    const dmgUrl = await getDMGDownloadUrl();
    const response = await fetch(dmgUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking DMG availability:', error);
    return false;
  }
};

export const downloadDMG = async () => {
  try {
    const dmgUrl = await getDMGDownloadUrl();
    const filename = await getDMGFilename();
    
    // Check if the file exists first
    const response = await fetch(dmgUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('DMG file not available yet. Please try again later.');
    }
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = dmgUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}; 