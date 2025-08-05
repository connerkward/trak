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

export const getDMGDownloadUrl = () => {
  const baseUrl = process.env.NODE_ENV === 'production' ? '/trak/downloads' : '/downloads';
  const architecture = detectSystemArchitecture();
  
  // For now, we'll use the universal DMG since electron-builder creates one file
  // that works on both architectures
  return `${baseUrl}/Timer Tracker-1.0.0.dmg`;
};

export const getDMGFilename = () => {
  return 'Timer Tracker-1.0.0.dmg';
};

export const checkDMGAvailability = async () => {
  try {
    const dmgUrl = getDMGDownloadUrl();
    const response = await fetch(dmgUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking DMG availability:', error);
    return false;
  }
};

export const downloadDMG = async () => {
  try {
    const dmgUrl = getDMGDownloadUrl();
    const filename = getDMGFilename();
    
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