import { useEffect } from 'react';
import { supabase } from './lib/supabase';

function AdminReceiptReview() {
  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    let checking = false;

    const isAdmin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return false;
      const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      return Boolean(data);
    };

    const refreshOrders = async () => {
      if (checking) return;
      checking = true;
      try {
        if (!await isAdmin()) return;
        const dashboard = document.querySelector('.admin-dashboard-shell');
        const heading = [...(dashboard?.querySelectorAll('h2') || [])].find((item) => item.textContent?.trim() === 'Orders');
        const mount = heading?.closest('.admin-panel-card')?.querySelector('[data-admin-orders-mount]');
        if (!mount) return;
        mount.dispatchEvent(new CustomEvent('admin-orders-receipts-refresh'));
      } finally {
        checking = false;
      }
    };

    refreshOrders();
    const observer = new MutationObserver(refreshOrders);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    const timer = window.setInterval(refreshOrders, 15000);
    return () => {
      alive = false;
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);
  return null;
}

export default AdminReceiptReview;
