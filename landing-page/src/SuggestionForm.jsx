import React, { useState } from 'react';
import './SuggestionForm.css';

const SuggestionForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    suggestion: ''
  });
  const [status, setStatus] = useState('idle'); // idle, sending, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');

    try {
      // Create mailto link with form data
      const subject = encodeURIComponent(`Dingo Track Suggestion from ${formData.name || 'Anonymous'}`);
      const body = encodeURIComponent(
        `Name: ${formData.name || 'Not provided'}\n` +
        `Email: ${formData.email || 'Not provided'}\n\n` +
        `Suggestion:\n${formData.suggestion}`
      );

      const mailtoLink = `mailto:dingoworks@googlegroups.com?subject=${subject}&body=${body}`;

      // Open mailto link
      window.location.href = mailtoLink;

      // Reset form after a brief delay
      setTimeout(() => {
        setStatus('success');
        setFormData({ name: '', email: '', suggestion: '' });
        setTimeout(() => setStatus('idle'), 3000);
      }, 500);

    } catch (error) {
      console.error('Error submitting suggestion:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <section className="suggestion-section">
      <div className="suggestion-container">
        <div className="suggestion-header">
          <h2>Have a Suggestion?</h2>
          <p>We'd love to hear your ideas for making Dingo Track better!</p>
        </div>

        <form className="suggestion-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Name (Optional)</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                disabled={status === 'sending'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email (Optional)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                disabled={status === 'sending'}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="suggestion">Your Suggestion *</label>
            <textarea
              id="suggestion"
              name="suggestion"
              value={formData.suggestion}
              onChange={handleChange}
              placeholder="Tell us your idea..."
              rows="5"
              required
              disabled={status === 'sending'}
            />
          </div>

          <button
            type="submit"
            className={`submit-btn ${status}`}
            disabled={status === 'sending' || !formData.suggestion.trim()}
          >
            {status === 'idle' && 'Send Suggestion'}
            {status === 'sending' && 'Opening email...'}
            {status === 'success' && '✓ Thank you!'}
            {status === 'error' && '✗ Please try again'}
          </button>

          {status === 'success' && (
            <p className="success-message">
              Your email client should open. Please send the email to complete your suggestion.
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default SuggestionForm;
