import React, { useState } from 'react';

const DownloadSection = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // In a real implementation, this would trigger the actual DMG download
    // For now, we'll simulate it
    setTimeout(() => {
      clearInterval(interval);
      setIsDownloading(false);
      setDownloadProgress(100);
      
      // Show success message
      alert('Download completed! Check your Downloads folder for the DMG file.');
    }, 2000);
  };

  const systemRequirements = [
    'macOS 10.15 (Catalina) or later',
    'Intel or Apple Silicon Mac',
    'Google account for calendar integration'
  ];

  return (
    <section id="download-section" className="download-section">
      <div className="download-content">
        <div className="download-header">
          <h2>Download for Mac</h2>
          <p>Get started with time tracking</p>
        </div>

        <div className="download-card">
          <div className="download-info">
            <img src="/app-icon.png" alt="Timer Tracker" className="download-app-icon" />
            <div className="download-details">
              <h3>Timer Tracker</h3>
              <p className="version">Version 1.0.0</p>
              <p className="platform">macOS • Universal (Intel + Apple Silicon)</p>
            </div>
          </div>

          <div className="download-actions">
            <button 
              className={`download-button ${isDownloading ? 'downloading' : ''}`}
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <div className="download-progress">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                  <span>Downloading... {downloadProgress}%</span>
                </>
              ) : (
                <>
                  <span className="download-icon">⬇</span>
                  Download for Mac
                </>
              )}
            </button>
            
            <p className="download-note">
              Free download • No registration required
            </p>
          </div>
        </div>

        <div className="system-requirements">
          <h4>System Requirements</h4>
          <ul>
            {systemRequirements.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
        </div>

        <div className="installation-steps">
          <h4>Installation</h4>
          <ol>
            <li>Download the DMG file</li>
            <li>Double-click to mount the disk image</li>
            <li>Drag Timer Tracker to your Applications folder</li>
            <li>Launch from Applications or Spotlight</li>
          </ol>
        </div>
      </div>
    </section>
  );
};

export default DownloadSection; 