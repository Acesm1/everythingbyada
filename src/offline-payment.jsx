import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

const CART_KEY = 'everythingbyada_cart';
const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;

function PaymentOptions() {
  const [method, setMethod] = useState('bank_transfer');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const placeOrder = async () => {
    setMessage('');
    if (!supabase) {
      setMessage('Ordering is unavailable right now. Please contact the store.');
      return;
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (sessionError || !user) {
      window.location.href = '/account';
      return;
    }

    let cart;
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { cart = []; }
    if (!Array.isArray(cart) || !cart.length) {
      setMessage('Your cart is empty. Add items before placing an order.');
      return;
    }

    setBusy(true);
    try {
      const ids = [...new Set(cart.map((item) => item.id))];
      const { data: products, error: productError } = await supabase
        .from('products').select('id,name,price').in('id', ids);
      if (productError) throw productError;
      if (!products || products.length !== ids.length) throw new Error('Some cart items are no longer available. Please refresh your cart.');

      const quantities = new Map();
      for (const item of cart) {
        const quantity = Number(item.qty);
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Your cart contains an invalid quantity.');
        quantities.set(String(item.id), (quantities.get(String(item.id)) || 0) + quantity);
      }
      const items = products.map((product) => ({
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: quantities.get(String(product.id)),
      }));
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (!Number.isFinite(total) || total <= 0) throw new Error('The order total is invalid.');

      const { error: insertError } = await supabase.from('orders').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        customer_name: user.user_metadata?.full_name || user.email,
        customer_email: user.email,
        total,
        status: method === 'bank_transfer' ? 'Awaiting bank transfer' : 'Cash on delivery',
        items,
      });
      if (insertError) throw insertError;

      localStorage.removeItem(CART_KEY);
      window.location.reload();
    } catch (error) {
      setMessage(error.message || 'Could not place your order. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="offline-payment-options" style={{ marginTop: 16, padding: 16, border: '1px solid rgba(255,43,140,.18)', borderRadius: 16, background: '#fff9fc' }}>
      <h4 style={{ marginTop: 0 }}>Choose how to pay</h4>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <input type="radio" name="offline-payment-method" value="bank_transfer" checked={method === 'bank_transfer'} onChange={() => setMethod('bank_transfer')} />
        Bank transfer
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="radio" name="offline-payment-method" value="cash_on_delivery" checked={method === 'cash_on_delivery'} onChange={() => setMethod('cash_on_delivery')} />
        Cash on delivery
      </label>
      {method === 'bank_transfer' && <p>After placing the order, contact the store for bank details and use the order number as your payment reference. The order will remain unpaid until the store confirms your transfer.</p>}
      {method === 'cash_on_delivery' && <p>Your order will be marked for cash on delivery. Pay the delivery agent when your order arrives.</p>}
      {message && <p role="alert" style={{ color: '#b42318' }}>{message}</p>}
      <button type="button" className="primary-btn full-width" disabled={busy} onClick={placeOrder}>
        {busy ? 'Placing order…' : method === 'bank_transfer' ? 'Place bank transfer order' : 'Place cash-on-delivery order'}
      </button>
      <small style={{ display: 'block', marginTop: 10 }}>No online payment will be taken.</small>
    </section>
  );
}

function attachPaymentOptions() {
  const checkout = document.querySelector('.checkout-box');
  if (!checkout || checkout.querySelector('.offline-payment-root')) return;
  const oldButton = checkout.querySelector('button.primary-btn');
  const oldNote = [...checkout.querySelectorAll('small')].find((item) => /payment is not processed/i.test(item.textContent || ''));
  oldButton?.remove();
  oldNote?.remove();
  const container = document.createElement('div');
  container.className = 'offline-payment-root';
  checkout.append(container);
  createRoot(container).render(<PaymentOptions />);
}

const root = document.getElementById('root');
if (root) {
  const observer = new MutationObserver(attachPaymentOptions);
  observer.observe(root, { childList: true, subtree: true });
  attachPaymentOptions();
}
