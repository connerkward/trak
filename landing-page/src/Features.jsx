import React from 'react';

const Features = () => {
  const features = [
    {
      icon: '📅',
      title: 'Google Calendar Sync',
      description: 'Seamlessly integrate with Google Calendar to track time against events.'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Start and stop timers instantly. No loading screens or delays.'
    },
    {
      icon: '🤖',
      title: 'Native MCP Integration',
      description: 'Built-in Model Context Protocol support. No third-party plugins required—AI-powered time tracking is native.'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="features-content">
        <div className="features-header">
          <h2>Features</h2>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features; 