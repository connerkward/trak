import React from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import './SuggestionsPage.css';

const SuggestionsPage = () => {
  const GITHUB_REPO = 'https://github.com/yourusername/trak'; // Update with your repo
  const GITHUB_NEW_ISSUE = `${GITHUB_REPO}/issues/new?labels=enhancement&template=feature_request.md`;
  const GOOGLE_FORM = 'dingoworks@googlegroups.com'; // Or add actual Google Form URL

  return (
    <div className="suggestions-page">
      <Header />

      <main className="suggestions-content">
        <div className="suggestions-hero">
          <h1>Share Your Ideas</h1>
          <p className="subtitle">
            Help us make Dingo Track better. We'd love to hear your suggestions!
          </p>
        </div>

        <div className="suggestions-options">
          {/* GitHub Issues Option */}
          <div className="suggestion-card">
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
              </svg>
            </div>
            <h2>GitHub Issues</h2>
            <p>
              Create a feature request or suggestion on our GitHub repository.
              Track progress and discuss with the community.
            </p>
            <a
              href={GITHUB_NEW_ISSUE}
              target="_blank"
              rel="noopener noreferrer"
              className="suggestion-btn primary"
            >
              Create GitHub Issue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <span className="badge">Recommended</span>
          </div>

          {/* Email Option */}
          <div className="suggestion-card">
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Email Us</h2>
            <p>
              Send your suggestion directly to our team via email.
              We'll get back to you as soon as possible.
            </p>
            <a
              href={`mailto:${GOOGLE_FORM}?subject=Dingo Track Suggestion`}
              className="suggestion-btn secondary"
            >
              Send Email
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          {/* Twitter/Social Option */}
          <div className="suggestion-card">
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2>Quick Feedback</h2>
            <p>
              Have a quick idea? Drop us a message on social media or
              our community forum.
            </p>
            <a
              href={`mailto:${GOOGLE_FORM}`}
              className="suggestion-btn secondary"
            >
              Contact Us
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="suggestions-faq">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>What kind of suggestions do you accept?</h3>
              <p>
                We welcome all kinds of feedback: feature requests, UX improvements,
                bug reports, and general suggestions to make Dingo Track better.
              </p>
            </div>
            <div className="faq-item">
              <h3>How long does it take to hear back?</h3>
              <p>
                We try to respond to all suggestions within 1-2 weeks. GitHub Issues
                typically get faster responses as they're public and tracked.
              </p>
            </div>
            <div className="faq-item">
              <h3>Will my suggestion be implemented?</h3>
              <p>
                We carefully consider all suggestions! Popular requests and those
                aligned with our roadmap are prioritized for future releases.
              </p>
            </div>
            <div className="faq-item">
              <h3>Can I contribute code?</h3>
              <p>
                Absolutely! Check out our GitHub repository for contribution guidelines.
                We love community contributions!
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SuggestionsPage;
