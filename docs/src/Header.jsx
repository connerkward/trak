import React from 'react';

const Header = ({ isScrolled }) => {
  const handleDownload = () => {
    // Scroll to download section
    document.getElementById('download-section')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="logo">
          <img src="/app-icon.png" alt="Timer Tracker" className="logo-icon" />
          <span className="logo-text">Timer Tracker</span>
        </div>
        
        <nav className="nav">
          <a href="#features" className="nav-link">Features</a>
          <a href="#download" className="nav-link">Download</a>
        </nav>

        <button className="header-download-btn" onClick={handleDownload}>
          Download for Mac
        </button>
      </div>
    </header>
  );
};

export default Header; 