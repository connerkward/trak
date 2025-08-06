import React, { useState, useEffect } from 'react';
import { downloadDMG } from './utils/downloadUtils';
import MockDemo from './MockDemo.jsx';
import Features from './Features.jsx';
import DownloadSection from './DownloadSection.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

const ACTIVITY_WORDS = [
  'Working', 
  'Studying', 
  'Cooking', 'Walking', 
  'Running', 'Thinking', 
  'Designing', 
  'Planning',
  'Focusing',
  'Reading', 'Writing', 
  'Learning', 'Building', 
  'Drawing', 'Playing', 
  'Resting', 'Coding'
];

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const word = ACTIVITY_WORDS[currentWordIndex];
    const speed = isDeleting ? 100 : 150; // Faster when deleting

    if (!isDeleting && currentText !== word) {
      // Typing
      const timeout = setTimeout(() => {
        setCurrentText(word.slice(0, currentText.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else if (isDeleting && currentText !== '') {
      // Deleting
      const timeout = setTimeout(() => {
        setCurrentText(currentText.slice(0, -1));
      }, speed);
      return () => clearTimeout(timeout);
    } else if (!isDeleting && currentText === word) {
      // Finished typing, wait then start deleting
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timeout);
    } else if (isDeleting && currentText === '') {
      // Finished deleting, move to next word
      setIsDeleting(false);
      setCurrentWordIndex((prevIndex) => 
        (prevIndex + 1) % ACTIVITY_WORDS.length
      );
    }
  }, [currentText, currentWordIndex, isDeleting]);

  const handleHeroDownload = async () => {
    try {
      await downloadDMG();
    } catch (error) {
      console.error('Download failed:', error);
      alert(error.message || 'Download failed. Please try again.');
    }
  };

  return (
    <div className="landing-page">
      <Header isScrolled={isScrolled} />
      
      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-text">
              <h1>
                <div className="word-carousel">
                  <span className="typewriter-text">
                    {currentText}
                    {!isDeleting && <span className="cursor">|</span>}
                  </span>
                </div>
                <span className="static-text"> Tracker</span>
              </h1>
              <p className="hero-subtitle">
                Track time directly from your menu bar. Simple, fast, and always accessible.
              </p>
              <div className="hero-actions">
                <button className="download-btn primary" onClick={() => handleHeroDownload()}>
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