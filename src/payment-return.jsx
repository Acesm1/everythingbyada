import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

function PaymentReturn() {
  const [state, setState] = useState({ loading: true, error: '', orderId: '' });

  useEffect(() => {
    if (window.location.pathname !== '/payment/callback') return undefined;
    let alive = true;
    const reference = new URLSearchParams(window.location.search).get('reference');

    const verify = async () => {
      if (!reference) {
        if (alive) setState({ loading: false, error: 'No payment reference was returned. Your cart has not been cleared.', orderId: '' });
        return;
      }
      if (!supabase) {
        if (alive) setState({ loading: false, error: 'The store is not configured to verify payment.', orderId: '' });
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (alive) setState({ loading: false, error: 'Sign in to the same customer account to verify this payment.', orderId: '' });
        return;
      }

      try {
        const response = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Payment could not be verified.');
        localStorage.removeItem('everythingbyada_cart');
        if (alive) setState({ loading: false, error: '', orderId: result.order_id || '' });
      } catch (error) {
        if (alive) setState({ loading: false, error: error.message || 'Payment could not be verified.', orderId: '' });
      }
    };

    verify();
    return () => { alive = false; };
  }, []);

  if (window.location.pathname !== '/payment/callback') return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(24,18,22,.58)' }}>
      <section role="status" aria-live="polite" style={{ width: 'min(100%, 520px)', padding: 28, borderRadius: 24, background: '#fff', boxShadow: '0 22px 50px rgba(10,10,10,.2)' }}>
        <h2>{state.loading ? 'Confirming your payment…' : state.orderId ? 'Payment confirmed' : 'Payment needs attention'}</h2>
        {state.loading && <p>Please keep this page open while we securely verify the transaction.</p>}
        {state.orderId && <p>Your paid order has been saved. Order reference: {state.orderId}</p>}
        {state.error && <p>{state.error}</p>}
        {!state.loading && <button className="primary-btn" onClick={() => { window.location.href = '/'; }}>Continue to store</button>}
      </section>
    </div>
  );
}

const container = document.createElement('div');
container.id = 'paystack-return-root';
document.body.append(container);
createRoot(container).render(<PaymentReturn />);
