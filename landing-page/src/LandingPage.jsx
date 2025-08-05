import React, { useState, useEffect } from 'react';
import MockDemo from './MockDemo.jsx';
import Features from './Features.jsx';
import DownloadSection from './DownloadSection.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleHeroDownload = () => {
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
    <div className="landing-page">
      <Header isScrolled={isScrolled} />
      
      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Timer Tracker for Mac</h1>
              <p className="hero-subtitle">
                Track time directly from your menu bar. Simple, fast, and always accessible.
              </p>
              <div className="hero-actions">
                <button className="download-btn primary" onClick={handleHeroDownload}>
                  <span className="download-icon">⬇</span>
                  Download for Mac
                </button>
              </div>
              <div className="hero-features">
                <span className="feature-tag">Google Calendar Sync</span>
                <span className="feature-tag">Menu Bar Access</span>
                <span className="feature-tag">Coming Soon: MCP Integration</span>
              </div>
            </div>
            <div className="hero-demo">
              <MockDemo />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <Features />

        {/* Download Section */}
        <DownloadSection />
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage; 