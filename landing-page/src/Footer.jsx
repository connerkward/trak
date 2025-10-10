import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Update year from build info if available
    const basePath = process.env.NODE_ENV === 'production' ? '/trak' : '';
    fetch(`${basePath}/build-info.json`)
      .then(res => res.json())
      .then(data => {
        if (data.buildTime) {
          const buildYear = new Date(data.buildTime).getFullYear();
          setCurrentYear(buildYear);
        }
      })
      .catch(() => {
        // Use current year as fallback
        setCurrentYear(new Date().getFullYear());
      });
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo">
                    <img src={process.env.NODE_ENV === 'production' ? '/trak/header-logo.png' : '/header-logo.png'} alt="Dingo Track" className="footer-icon" />
        <span>Dingo Track</span>
          </div>
          <p className="footer-description">
            Simple time tracking for Mac users.
          </p>
        </div>

        <div className="footer-section">
          <h4>Product</h4>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#download">Download</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Legal</h4>
          <ul>
            <li><a href={process.env.NODE_ENV === 'production' ? '/trak/privacy-policy.html' : '/privacy-policy.html'}>Privacy Policy</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Dingo Track. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 