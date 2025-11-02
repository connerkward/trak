import React from 'react';
import './PrivacyPolicy.css';

const TermsOfService = () => {
  return (
    <div className="privacy-container">
      <header className="privacy-header">
        <div className="privacy-header-content">
          <a href="/" className="back-link">
            ← Back to Home
          </a>
          <h1>Terms of Service</h1>
          <p className="last-updated">Last Updated: October 12, 2025</p>
        </div>
      </header>

      <div className="privacy-content">
        <section className="privacy-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using Dingo Track ("the App"), you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, do not use the App.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. Description of Service</h2>
          <p>
            Dingo Track is a time tracking application for macOS that allows users to:
          </p>
          <ul>
            <li>Track time through a menu bar interface</li>
            <li>Sync time entries with Google Calendar (when authorized)</li>
            <li>Create and manage multiple timers</li>
            <li>Store timer data locally on your device</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. User Accounts and Google Calendar Integration</h2>
          <h3>Google OAuth Authentication</h3>
          <p>
            To use Google Calendar features, you must authorize the App through Google's OAuth 2.0 system. By doing so:
          </p>
          <ul>
            <li>You grant the App permission to read and create events in your Google Calendar</li>
            <li>You can revoke this access at any time through your Google Account settings or within the App</li>
            <li>The App stores OAuth tokens locally on your device</li>
            <li>We do not collect or store your Google credentials</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. Acceptable Use</h2>
          <p>You agree to use the App only for lawful purposes. You agree NOT to:</p>
          <ul>
            <li>Reverse engineer, decompile, or disassemble the App</li>
            <li>Remove any copyright or proprietary notices from the App</li>
            <li>Use the App in any way that violates applicable laws or regulations</li>
            <li>Attempt to gain unauthorized access to any systems or networks</li>
            <li>Use the App to transmit viruses, malware, or any harmful code</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>5. Data Storage and Privacy</h2>
          <p>
            All timer data and settings are stored locally on your device. We do not operate servers that collect your personal data. 
            For more information, please review our <a href="/privacy-policy.html">Privacy Policy</a>.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Intellectual Property</h2>
          <p>
            The App and its original content, features, and functionality are owned by Dingo Track and are protected by 
            international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. Disclaimers and Limitation of Liability</h2>
          <h3>Provided "As Is"</h3>
          <p>
            The App is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, 
            including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          
          <h3>No Guarantee of Accuracy</h3>
          <p>
            While we strive for accuracy, we do not guarantee that time tracking data will be 100% accurate or that 
            calendar synchronization will always work perfectly.
          </p>
          
          <h3>Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, in no event shall Dingo Track be liable for any indirect, incidental, 
            special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, 
            or business interruption arising out of your use of the App.
          </p>
        </section>

        <section className="privacy-section">
          <h2>8. Google Calendar API Services</h2>
          <p>
            Dingo Track's use and transfer of information received from Google APIs adheres to 
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer"> Google API Services User Data Policy</a>, 
            including the Limited Use requirements.
          </p>
          <p>
            The App uses Google Calendar API to:
          </p>
          <ul>
            <li>Read your calendar list to allow you to select which calendar to use</li>
            <li>Create calendar events based on your timer data</li>
          </ul>
          <p>
            The App does NOT use Google Calendar data for any other purposes, including advertising or data mining.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. Updates and Modifications</h2>
          <p>
            We reserve the right to modify or discontinue the App at any time without notice. We may also update these 
            Terms of Service from time to time. Continued use of the App after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. Termination</h2>
          <p>
            You may stop using the App at any time by uninstalling it from your device. We reserve the right to terminate 
            or suspend your access to the App if you violate these Terms of Service.
          </p>
        </section>

        <section className="privacy-section">
          <h2>11. Third-Party Services</h2>
          <p>
            The App integrates with Google Calendar, a third-party service. Your use of Google Calendar is subject to 
            Google's Terms of Service and Privacy Policy:
          </p>
          <ul>
            <li>
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
                Google Terms of Service
              </a>
            </li>
            <li>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Google Privacy Policy
              </a>
            </li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the United States, 
            without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="privacy-section">
          <h2>13. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <ul>
            <li><strong>Email:</strong> legokink1@gmail.com</li>
            <li><strong>GitHub:</strong> <a href="https://github.com/connerkward/trak" target="_blank" rel="noopener noreferrer">github.com/connerkward/trak</a></li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>14. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or 
            eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
          </p>
        </section>

        <section className="privacy-section">
          <h2>15. Entire Agreement</h2>
          <p>
            These Terms of Service, together with the Privacy Policy, constitute the entire agreement between you and 
            Dingo Track regarding the use of the App.
          </p>
        </section>
      </div>

      <footer className="privacy-footer">
        <p>
          <a href="/">Back to Home</a>
          {' • '}
          <a href="/privacy-policy.html">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
};

export default TermsOfService;

