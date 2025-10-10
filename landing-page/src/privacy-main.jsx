import React from 'react';
import { createRoot } from 'react-dom/client';
import PrivacyPolicy from './PrivacyPolicy.jsx';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<PrivacyPolicy />);

