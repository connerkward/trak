import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo">
            <img src="/app-icon.png" alt="Timer Tracker" className="footer-icon" />
            <span>Timer Tracker</span>
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
          <h4>Future</h4>
          <ul>
            <li><a href="#mcp">MCP Integration</a></li>
            <li><a href="#ai">AI Features</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2024 Timer Tracker</p>
      </div>
    </footer>
  );
};

export default Footer; 