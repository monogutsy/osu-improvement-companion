import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sidebar.css';
import './styles/pages.css';
import './styles/auth.css';
import './styles/responsive.css';
import { logFrontendConfig } from './utils/config';

logFrontendConfig();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);