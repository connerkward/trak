import React from 'react';
import { downloadDMG } from './utils/downloadUtils';

const Header = ({ isScrolled }) => {
  const handleDownload = () => {
    // Scroll to download section
    document.getElementById('download-section')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const handleDirectDownload = async () => {
    try {
      await downloadDMG();
    } catch (error) {
      console.error('Download failed:', error);
      alert(error.message || 'Download failed. Please try again.');
    }
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="logo">
          <img src={process.env.NODE_ENV === 'production' ? '/trak/app-icon.png' : '/app-icon.png'} alt="Timer Tracker" className="logo-icon" />
          <span className="logo-text">Timer Tracker</span>
        </div>
        
        <nav className="nav">
          <a href="#features" className="nav-link">Features</a>
          <a href="#download" className="nav-link">Download</a>
        </nav>

        <button className="header-download-btn" onClick={handleDirectDownload}>
          Download for Mac
        </button>
      </div>
    </header>
  );
};

export default Header; 