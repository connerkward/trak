import React from 'react';

const Footer = () => {
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
            <li><a href="#" onClick={(e) => { e.preventDefault(); window.navigateTo && window.navigateTo('privacy'); }}>Privacy Policy</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2024 Dingo Track. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 