import React from 'react';

const Header = ({ isScrolled }) => {
  const handleDownload = () => {
    // Scroll to download section
    document.getElementById('download-section')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const handleDirectDownload = () => {
    const dmgUrl = process.env.NODE_ENV === 'production' 
      ? '/trak/downloads/Timer Tracker-1.0.0.dmg'
      : '/downloads/Timer Tracker-1.0.0.dmg';
    
    const link = document.createElement('a');
    link.href = dmgUrl;
    link.download = 'Timer Tracker-1.0.0.dmg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        <button className="header-download-btn" onClick={handleDirectDownload}>
          Download for Mac
        </button>
      </div>
    </header>
  );
};

export default Header; 