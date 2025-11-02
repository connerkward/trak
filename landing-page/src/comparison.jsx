import React from 'react';
import { createRoot } from 'react-dom/client';
import ComparisonPage from './ComparisonPage.jsx';
import './LandingPage.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ComparisonPage />);
