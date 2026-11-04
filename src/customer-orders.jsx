import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;

function CustomerOrders() {
  const [state, setState] = useState({ loading: true, user: null, orders: [], error: '' });

  useEffect(() => {
    if (!supabase) {
      setState({ loading: false, user: null, orders: [], error: 'Orders are currently unavailable.' });
      return undefined;
    }
    let alive = true;
    let requestId = 0;

    const loadOrders = async (user) => {
      const currentRequest = ++requestId;
      if (!user) {
        if (alive) setState({ loading: false, user: null, orders: [], error: '' });
        return;
      }
      if (alive) setState((current) => ({ ...current, loading: true, user, error: '' }));
      // Do not request payment_reference until its migration is installed; older
      // databases should still be able to display this customer's order history.
      const { data, error } = await supabase.from('orders').select('id,total,status,items,created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false });
      if (!alive || currentRequest !== requestId) return;
      setState({ loading: false, user, orders: data || [], error: error?.message || '' });
    };

    supabase.auth.getSession().then(({ data }) => loadOrders(data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => loadOrders(session?.user || null));
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!state.user) return null;
  return (
    <section className="customer-orders" aria-labelledby="customer-orders-title" style={{ marginTop: 24 }}>
      <h3 id="customer-orders-title">Your orders</h3>
      {state.loading && <p>Loading your orders…</p>}
      {state.error && <p role="alert">Could not load your orders: {state.error}</p>}
      {!state.loading && !state.error && state.orders.length === 0 && <p>You have not placed any orders yet.</p>}
      {state.orders.map((order) => (
        <article key={order.id} style={{ padding: 16, marginTop: 12, border: '1px solid rgba(255,43,140,.18)', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <strong>Order {order.id}</strong>
            <span>{order.status}</span>
          </div>
          <p>{new Date(order.created_at).toLocaleString()} · {formatPrice(order.total)}</p>
          <ul>{(Array.isArray(order.items) ? order.items : []).map((item, index) => (
            <li key={`${item.product_id || item.name}-${index}`}>{item.name} × {item.quantity || item.qty || 1}</li>
          ))}</ul>
        </article>
      ))}
    </section>
  );
}

function mountOrders() {
  const card = document.querySelector('.account-page-shell .account-card');
  if (!card || card.querySelector('.customer-orders-root')) return;
  const container = document.createElement('div');
  container.className = 'customer-orders-root';
  card.append(container);
  createRoot(container).render(<CustomerOrders />);
}

const root = document.getElementById('root');
if (root) {
  const observer = new MutationObserver(mountOrders);
  observer.observe(root, { childList: true, subtree: true });
  mountOrders();
}
