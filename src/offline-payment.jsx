import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

const CART_KEY = 'everythingbyada_cart';
const fieldStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #ded9df', borderRadius: 10, font: 'inherit', background: '#fff' };
const initialDelivery = { full_name: '', phone: '', address: '', city: '', state: '', postal_code: '', notes: '' };

function OnlineCheckout() {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const updateDelivery = (event) => setDelivery((current) => ({ ...current, [event.target.name]: event.target.value }));

  const startPayment = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!supabase) {
      setMessage('Checkout is unavailable right now. Please contact the store.');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (sessionError || !session?.access_token) {
      window.location.href = '/account';
      return;
    }

    let cart;
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { cart = []; }
    if (!Array.isArray(cart) || !cart.length) {
      setMessage('Your cart is empty. Add items before checkout.');
      return;
    }

    setBusy(true);
    try {
      const items = cart.map((item) => ({ product_id: item.id, quantity: Number(item.qty) }));
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, delivery }),
      });
      const result = await response.json();
      if (!response.ok || !result.authorization_url) throw new Error(result.error || 'Could not start secure checkout.');
      window.location.assign(result.authorization_url);
    } catch (error) {
      setMessage(error.message || 'Could not start payment. Please try again.');
      setBusy(false);
    }
  };

  const input = (label, name, required = true, type = 'text', autoComplete = 'shipping address-line1') => (
    <label key={name} style={{ display: 'grid', gap: 7, color: '#38343a', fontWeight: 650 }}>
      {label}{required && <span aria-hidden="true" style={{ color: '#d91b78' }}> *</span>}
      <input name={name} type={type} required={required} value={delivery[name]} onChange={updateDelivery} autoComplete={autoComplete} style={fieldStyle} />
    </label>
  );

  return (
    <form onSubmit={startPayment} className="online-checkout" style={{ display: 'grid', gap: 18, marginTop: 16, padding: 18, border: '1px solid #eee5eb', borderRadius: 16, background: '#fff' }}>
      <div>
        <p style={{ margin: '0 0 5px', color: '#d91b78', fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>Secure checkout</p>
        <h3 style={{ margin: 0 }}>Delivery details</h3>
        <p style={{ margin: '6px 0 0', color: '#68616a' }}>Where should we deliver your order?</p>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {input('Recipient full name', 'full_name', true, 'text', 'name')}
        {input('Phone number', 'phone', true, 'tel', 'tel')}
        {input('Street address', 'address', true, 'text', 'shipping address-line1')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {input('City', 'city', true, 'text', 'shipping address-level2')}
          {input('State', 'state', true, 'text', 'shipping address-level1')}
          {input('Postal code', 'postal_code', false, 'text', 'shipping postal-code')}
        </div>
        <label style={{ display: 'grid', gap: 7, color: '#38343a', fontWeight: 650 }}>
          Delivery instructions <span style={{ color: '#777' }}>(optional)</span>
          <textarea name="notes" value={delivery.notes} onChange={updateDelivery} rows="3" maxLength="500" placeholder="Apartment, landmark, or other helpful details" style={{ ...fieldStyle, resize: 'vertical' }} />
        </label>
      </div>

      <div style={{ padding: 14, borderRadius: 12, background: '#fff7fb', border: '1px solid #f4d8e6' }}>
        <strong style={{ display: 'block' }}>Payment method</strong>
        <span style={{ display: 'block', marginTop: 5, color: '#68616a' }}>Pay securely online with Paystack using your bank card or other available payment options.</span>
      </div>

      {message && <p role="alert" style={{ margin: 0, color: '#b42318' }}>{message}</p>}
      <button type="submit" className="primary-btn full-width" disabled={busy}>
        {busy ? 'Connecting to secure payment…' : 'Continue to secure payment'}
      </button>
      <small style={{ color: '#68616a', textAlign: 'center' }}>Your payment is processed securely by Paystack. Your order is confirmed after payment verification.</small>
    </form>
  );
}

function attachOnlineCheckout() {
  const checkout = document.querySelector('.checkout-box');
  if (!checkout || checkout.querySelector('.online-checkout-root')) return;

  checkout.querySelector('button.primary-btn')?.remove();
  [...checkout.querySelectorAll('small')].filter((item) => /payment is not processed/i.test(item.textContent || '')).forEach((item) => item.remove());

  const container = document.createElement('div');
  container.className = 'online-checkout-root';
  checkout.append(container);
  createRoot(container).render(<OnlineCheckout />);
}

const root = document.getElementById('root');
if (root) {
  const observer = new MutationObserver(attachOnlineCheckout);
  observer.observe(root, { childList: true, subtree: true });
  attachOnlineCheckout();
}
