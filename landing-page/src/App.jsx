import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';
import './LandingPage.css';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
      const path = window.location.pathname;
      const basePath = process.env.NODE_ENV === 'production' ? '/trak' : '';
      
      if (path === `${basePath}/privacy-policy` || path === `${basePath}/privacy-policy.html`) {
        setCurrentPage('privacy');
      } else {
        setCurrentPage('home');
      }
    };

    handlePopState(); // Set initial page
    window.addEventListener('popstate', handlePopState);
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    const basePath = process.env.NODE_ENV === 'production' ? '/trak' : '';
    
    if (page === 'privacy') {
      window.history.pushState({}, '', `${basePath}/privacy-policy`);
    } else {
      window.history.pushState({}, '', basePath || '/');
    }
    
    window.scrollTo(0, 0);
  };

  // Expose navigation globally for links
  useEffect(() => {
    window.navigateTo = navigateTo;
  }, []);

  if (currentPage === 'privacy') {
    return <PrivacyPolicy />;
  }

  return <LandingPage />;
};

export default App;

