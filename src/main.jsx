import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './responsive.css';
import './admin/admin.css';
import './account-signup.jsx';
import './customer-orders.jsx';
import './paystack-checkout.js';
import './payment-return.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
