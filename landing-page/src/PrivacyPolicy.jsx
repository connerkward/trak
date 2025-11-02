import React, { useState, useEffect } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import './LandingPage.css';

const PrivacyPolicy = () => {
  const [buildInfo, setBuildInfo] = useState({ buildTime: null });

  useEffect(() => {
    fetch('/build-info.json')
      .then(res => res.json())
      .then(data => setBuildInfo(data))
      .catch(err => console.log('Build info not available:', err));
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'October 10, 2024';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="landing-page">
      <Header isScrolled={true} isDownloading={false} downloadProgress={0} />
      
      <main style={{ paddingTop: '64px' }}>
        <div className="privacy-container">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: {formatDate(buildInfo.buildTime)}</p>

          <section>
            <h2>Introduction</h2>
            <p>
              Dingo Track ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we handle information when you use our 
              time tracking application for macOS.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>
            <p>
              Dingo Track is designed with privacy in mind. We do not collect, store, or 
              transmit any personal information to our servers. All data remains on your device.
            </p>
            
            <h3>Data Stored Locally</h3>
            <ul>
              <li><strong>Timer configurations:</strong> Names and calendar associations for your timers</li>
              <li><strong>Timer sessions:</strong> Start times, end times, and durations of completed timers</li>
              <li><strong>Google OAuth tokens:</strong> Stored securely on your device to access Google Calendar</li>
            </ul>

            <h3>Google Calendar Access</h3>
            <p>
              When you connect your Google account, we request permission to:
            </p>
            <ul>
              <li>Read your calendar list</li>
              <li>Create calendar events in calendars you select</li>
            </ul>
            <p>
              We use Google OAuth 2.0 for authentication. Your Google credentials are never 
              stored by our application - they are handled securely by Google's authentication system.
            </p>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <p>
              All information is used solely for the purpose of providing time tracking functionality:
            </p>
            <ul>
              <li>Creating calendar events when you stop timers</li>
              <li>Displaying your timer history</li>
              <li>Maintaining your timer configurations</li>
            </ul>
          </section>

          <section>
            <h2>Data Storage and Security</h2>
            <ul>
              <li><strong>Local storage only:</strong> All data is stored on your Mac using macOS secure storage mechanisms</li>
              <li><strong>No cloud backup:</strong> We do not upload or sync your data to any cloud service</li>
              <li><strong>Sandboxed application:</strong> The app runs in Apple's App Sandbox for enhanced security</li>
              <li><strong>Encrypted credentials:</strong> Google OAuth tokens are stored securely in your system keychain</li>
            </ul>
          </section>

          <section>
            <h2>Third-Party Services</h2>
            <h3>Google Calendar API</h3>
            <p>
              When you authorize access to Google Calendar, your data is transmitted directly 
              between your device and Google's servers. We do not intercept, store, or access 
              this data. Google's use of your data is governed by their own Privacy Policy:
            </p>
            <p>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Google Privacy Policy
              </a>
            </p>
          </section>

          <section>
            <h2>Data Sharing</h2>
            <p>
              We do not share, sell, rent, or trade any information with third parties. 
              Your data never leaves your device except when communicating directly with 
              Google Calendar API (when you choose to use this feature).
            </p>
          </section>

          <section>
            <h2>Your Rights and Choices</h2>
            <ul>
              <li><strong>Disconnect Google Account:</strong> You can disconnect your Google account at any time from the app settings</li>
              <li><strong>Delete Data:</strong> All app data can be deleted by uninstalling the application</li>
              <li><strong>Export Data:</strong> Your timer data is stored in standard formats on your device</li>
            </ul>
          </section>

          <section>
            <h2>Children's Privacy</h2>
            <p>
              Our application is not directed to children under 13. We do not knowingly 
              collect information from children under 13.
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of 
              any changes by updating the "Last updated" date at the top of this policy.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p>
              <a href="mailto:legokink1@gmail.com">legokink1@gmail.com</a>
            </p>
          </section>

          <section>
            <h2>Data Collection Summary</h2>
            <p className="summary-box">
              <strong>In Summary:</strong> Dingo Track does not collect, transmit, or store 
              any personal information on our servers. All your data stays on your Mac. 
              The only network requests made are directly to Google Calendar API when you 
              choose to use calendar integration.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
