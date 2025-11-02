import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Update year from build info if available
    fetch('/build-info.json')
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

  const handleFooterLinkClick = (e) => {
    // Find the closest anchor tag
    const anchor = e.target.closest('a');
    if (!anchor) return;
    
    const href = anchor.getAttribute('href');
    // Handle anchor links
    if (href?.startsWith('#')) {
      // Check if we're on the landing page
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        // Prevent default and scroll smoothly to section
        e.preventDefault();
        const targetId = href.substring(1); // Remove the #
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Navigate to landing page with anchor
        e.preventDefault();
        window.location.href = `/${href}`;
      }
    }
  };

  const handleFooterLogoClick = () => {
    window.location.href = '/';
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo" onClick={handleFooterLogoClick} style={{ cursor: 'pointer' }}>
                    <img src="/header-logo.png" alt="Dingo Track" className="footer-icon" />
        <span>Dingo Track</span>
          </div>
          <p className="footer-description">
            Simple time tracking for Mac users.
          </p>
        </div>

        <div className="footer-section">
          <h4>Product</h4>
          <ul onClick={handleFooterLinkClick}>
            <li><a href="#features">Features</a></li>
            <li><a href="#download-section">Download</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Legal</h4>
          <ul>
            <li><a href="/privacy-policy.html">Privacy Policy</a></li>
            <li><a href="/terms-of-service.html">Terms of Service</a></li>
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