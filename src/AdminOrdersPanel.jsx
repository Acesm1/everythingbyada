import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './lib/supabase';

const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const filters = ['All', 'Pending', 'Accepted', 'Declined'];

function AdminOrdersPanel() {
  const [host, setHost] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [busyOrder, setBusyOrder] = useState(null);
  const [openingReceipt, setOpeningReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const findPanel = () => {
      const dashboard = document.querySelector('.admin-dashboard-shell');
      if (!dashboard) {
        setHost(null);
        return;
      }
      const heading = [...dashboard.querySelectorAll('h2')].find((element) => element.textContent?.trim() === 'Orders');
      const panel = heading?.closest('.admin-panel-card');
      if (!panel) return;
      let mount = panel.querySelector('[data-admin-orders-mount]');
      if (!mount) {
        mount = document.createElement('div');
        mount.dataset.adminOrdersMount = 'true';
        panel.append(mount);
      }
      [...panel.children].forEach((child) => { if (child !== heading.parentElement && child !== mount) child.style.display = 'none'; });
      setHost((current) => current === mount ? current : mount);
    };
    findPanel();
    const observer = new MutationObserver(findPanel);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    const checkAdmin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) { if (alive) setIsAdmin(false); return; }
      const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (alive) setIsAdmin(Boolean(data));
    };
    checkAdmin();
    const { data: listener } = supabase.auth.onAuthStateChange(() => checkAdmin());
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const loadOrders = async () => {
    if (!supabase || !isAdmin) return;
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.from('orders')
      .select('id,user_id,customer_name,customer_email,total,status,items,created_at,payment_reference,receipt_path,delivery_full_name,delivery_phone,delivery_address,delivery_city,delivery_state,delivery_postal_code,delivery_notes')
      .order('created_at', { ascending: false });
    if (queryError) setError(`Could not load orders: ${queryError.message}`);
    else setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [isAdmin]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return !['Accepted', 'Declined'].includes(order.status);
    return order.status === filter;
  }), [orders, filter]);

  const updateStatus = async (order, status) => {
    if (!supabase || !isAdmin) return;
    setBusyOrder(order.id);
    setError('');
    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (updateError) setError(`Could not update order: ${updateError.message}`);
    else setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    setBusyOrder(null);
  };

  const reviewReceipt = async (order) => {
    if (!supabase || !isAdmin || !order.receipt_path) return;
    setOpeningReceipt(order.id);
    setError('');
    const { data, error: signedUrlError } = await supabase.storage.from('order-receipts').createSignedUrl(order.receipt_path, 60);
    setOpeningReceipt(null);
    if (signedUrlError || !data?.signedUrl) {
      setError(`Could not open receipt for order ${order.id}: ${signedUrlError?.message || 'Unknown error'}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  if (!host || !isAdmin) return null;

  return createPortal(
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 16px' }}>
        {filters.map((name) => <button key={name} type="button" className={filter === name ? 'primary-admin-btn' : 'secondary-admin-btn'} onClick={() => setFilter(name)}>{name} ({name === 'All' ? orders.length : name === 'Pending' ? orders.filter((order) => !['Accepted', 'Declined'].includes(order.status)).length : orders.filter((order) => order.status === name).length})</button>)}
        <button type="button" className="secondary-admin-btn" onClick={loadOrders} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh orders'}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading && orders.length === 0 ? <p>Loading orders…</p> : visibleOrders.length === 0 ? <p>No {filter === 'All' ? '' : `${filter.toLowerCase()} `}orders.</p> : visibleOrders.map((order) => {
        const awaitingBankTransfer = order.status === 'Awaiting bank transfer';
        return <article className="order-row" key={order.id} style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}><strong>Order {order.id}</strong><span>{order.status || 'Pending'}</span></div>
          <p>{order.created_at ? new Date(order.created_at).toLocaleString() : 'Date unavailable'} · {formatPrice(order.total)}</p>
          <div><strong>Customer</strong><p>{order.delivery_full_name || order.customer_name || 'Name unavailable'}{order.customer_email ? ` · ${order.customer_email}` : ''}{order.delivery_phone ? ` · ${order.delivery_phone}` : ''}</p></div>
          {(order.delivery_address || order.delivery_city || order.delivery_state || order.delivery_postal_code) && <div><strong>Delivery address</strong><p>{[order.delivery_address, order.delivery_city, order.delivery_state, order.delivery_postal_code].filter(Boolean).join(', ')}</p></div>}
          {order.delivery_notes && <p><strong>Delivery instructions:</strong> {order.delivery_notes}</p>}
          {Array.isArray(order.items) && order.items.length > 0 && <div><strong>Items</strong><ul>{order.items.map((item, index) => <li key={`${item.product_id || item.name}-${index}`}>{item.name} × {item.quantity || item.qty || 1}{item.price != null ? ` — ${formatPrice(item.price)}` : ''}</li>)}</ul></div>}
          {order.payment_reference && <p><strong>Payment reference:</strong> {order.payment_reference}</p>}
          {order.receipt_path ? <div className="admin-receipt-review"><strong>Transaction receipt</strong><p>Receipt uploaded for this order.</p><button type="button" className="secondary-admin-btn" onClick={() => reviewReceipt(order)} disabled={openingReceipt === order.id}>{openingReceipt === order.id ? 'Opening receipt…' : 'View uploaded receipt'}</button></div> : awaitingBankTransfer && <div className="admin-receipt-review"><strong>Transaction receipt</strong><p>No transaction receipt uploaded yet.</p></div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" className="primary-admin-btn" onClick={() => updateStatus(order, 'Accepted')} disabled={busyOrder === order.id || order.status === 'Accepted' || (awaitingBankTransfer && !order.receipt_path)} title={awaitingBankTransfer && !order.receipt_path ? 'Customer receipt is required before accepting this bank-transfer order.' : ''}>Accept</button>
            <button type="button" className="secondary-admin-btn" onClick={() => updateStatus(order, 'Declined')} disabled={busyOrder === order.id || order.status === 'Declined'}>Decline</button>
          </div>
        </article>;
      })}
    </div>,
    host,
  );
}

export default AdminOrdersPanel;
