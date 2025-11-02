import React from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

const ComparisonPage = () => {
  const comparisons = [
    {
      category: 'AI Integration',
      trak: 'Native MCP (Model Context Protocol) integration built-in',
      toggl: 'No native AI support - requires third-party plugins and extensions',
      trakWins: true
    },
    {
      category: 'Calendar Integration',
      trak: 'Direct Google Calendar sync - track time against calendar events',
      toggl: 'Calendar integrations available but requires manual setup',
      trakWins: false
    },
    {
      category: 'User Interface',
      trak: 'Minimal menu bar app - zero bloat, instant access',
      toggl: 'Full-featured web and desktop apps with extensive UI',
      trakWins: false
    },
    {
      category: 'Complexity',
      trak: 'Simple, focused time tracking - start/stop timers quickly',
      toggl: 'Comprehensive project management, team features, and reporting',
      trakWins: false
    },
    {
      category: 'Platform',
      trak: 'macOS native app',
      toggl: 'Cross-platform (Web, Windows, Mac, iOS, Android, Browser extensions)',
      trakWins: false
    },
    {
      category: 'Pricing',
      trak: 'Free',
      toggl: 'Free plan available (5 users limit), paid plans for advanced features',
      trakWins: false
    },
    {
      category: 'Team Features',
      trak: 'Individual use focused',
      toggl: 'Full team management, permissions, and collaboration tools',
      trakWins: false
    },
    {
      category: 'Reporting',
      trak: 'Basic time tracking via Google Calendar',
      toggl: 'Advanced analytics, detailed reports, profitability tracking, invoicing',
      trakWins: false
    },
    {
      category: 'Integrations',
      trak: 'Google Calendar, Native MCP for AI tools',
      toggl: '100+ integrations (Jira, Asana, Salesforce, Trello, etc.)',
      trakWins: false
    }
  ];

  const useCases = [
    {
      title: 'Choose Trak if you:',
      items: [
        'Want simple, personal time tracking',
        'Use Google Calendar as your primary scheduling tool',
        'Want AI-powered time tracking without plugins',
        'Prefer a minimal, menu bar interface',
        'Work solo and don\'t need team features',
        'Value native macOS integration'
      ]
    },
    {
      title: 'Choose Toggl Track if you:',
      items: [
        'Need comprehensive team management',
        'Require detailed reporting and analytics',
        'Want cross-platform support',
        'Need invoicing and profitability tracking',
        'Use multiple project management tools',
        'Need integrations with 100+ platforms'
      ]
    }
  ];

  return (
    <div className="comparison-page">
      <Header isScrolled={true} isDownloading={false} downloadProgress={0} />

      <main className="comparison-content">
        <section className="comparison-hero">
          <h1>Trak vs Toggl Track</h1>
          <p className="comparison-subtitle">
            Choose the right time tracking tool for your needs
          </p>
        </section>

        <section className="comparison-table-section">
          <h2>Feature Comparison</h2>
          <div className="comparison-table">
            <div className="comparison-header">
              <div className="comparison-cell category-header">Feature</div>
              <div className="comparison-cell product-header">Trak</div>
              <div className="comparison-cell product-header">Toggl Track</div>
            </div>

            {comparisons.map((item, index) => (
              <div key={index} className="comparison-row">
                <div className="comparison-cell category">{item.category}</div>
                <div className={`comparison-cell ${item.trakWins ? 'highlight' : ''}`}>
                  {item.trak}
                </div>
                <div className="comparison-cell">
                  {item.toggl}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="use-cases-section">
          <h2>Which One Should You Choose?</h2>
          <div className="use-cases-grid">
            {useCases.map((useCase, index) => (
              <div key={index} className="use-case-card">
                <h3>{useCase.title}</h3>
                <ul>
                  {useCase.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="comparison-conclusion">
          <div className="conclusion-content">
            <h2>The Bottom Line</h2>
            <p>
              <strong>Trak</strong> is designed for individuals who want a simple, AI-powered time tracker
              that integrates seamlessly with Google Calendar and lives in your menu bar. With native MCP
              integration, you get AI capabilities without any third-party plugins.
            </p>
            <p>
              <strong>Toggl Track</strong> is a comprehensive solution for teams and businesses that need
              advanced features like detailed reporting, invoicing, cross-platform support, and extensive
              integrations with project management tools.
            </p>
            <div className="cta-section">
              <a href="/" className="back-home-btn">Back to Home</a>
              <a href="#download-section" className="cta-btn">Try Trak Free</a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ComparisonPage;
