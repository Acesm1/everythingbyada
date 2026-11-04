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

    const updateReceiptControls = async () => {
      if (checking || !await isAdmin()) return;
      const dashboard = document.querySelector('.admin-dashboard-shell');
      if (!dashboard) return;
      const ordersHeading = [...dashboard.querySelectorAll('h2')].find((item) => item.textContent?.trim() === 'Orders');
      const ordersPanel = ordersHeading?.closest('.admin-panel-card');
      const mount = ordersPanel?.querySelector('[data-admin-orders-mount]');
      if (!mount) return;

      checking = true;
      const { data: orders, error } = await supabase.from('orders').select('id,status,receipt_path');
      if (error || !alive) {
        checking = false;
        return;
      }
      const orderById = new Map((orders || []).map((order) => [String(order.id), order]));

      mount.querySelectorAll('article.order-row').forEach((card) => {
        const label = card.querySelector('strong')?.textContent?.trim() || '';
        if (!label.startsWith('Order ')) return;
        const order = orderById.get(label.slice('Order '.length));
        if (!order) return;

        const acceptButton = [...card.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Accept');
        const receiptNeeded = order.status === 'Awaiting bank transfer';
        if (acceptButton) {
          acceptButton.disabled = acceptButton.disabled || (receiptNeeded && !order.receipt_path);
          acceptButton.title = receiptNeeded && !order.receipt_path ? 'Customer receipt is required before accepting this bank-transfer order.' : '';
        }

        let receiptButton = card.querySelector('[data-order-receipt-review]');
        if (!receiptButton && receiptNeeded) {
          receiptButton = document.createElement('button');
          receiptButton.type = 'button';
          receiptButton.dataset.orderReceiptReview = 'true';
          receiptButton.className = 'secondary-admin-btn';
          receiptButton.style.marginTop = '10px';
          const actions = [...card.querySelectorAll('div')].find((element) => [...element.children].some((child) => child.tagName === 'BUTTON' && ['Accept', 'Decline'].includes(child.textContent?.trim())));
          (actions || card).append(receiptButton);
        }
        if (!receiptButton) return;

        if (!order.receipt_path) {
          receiptButton.textContent = 'Receipt not uploaded';
          receiptButton.disabled = true;
          receiptButton.onclick = null;
          return;
        }
        receiptButton.textContent = 'Review transaction receipt';
        receiptButton.disabled = false;
        receiptButton.onclick = async () => {
          receiptButton.disabled = true;
          const { data, error: signedUrlError } = await supabase.storage.from('order-receipts').createSignedUrl(order.receipt_path, 60);
          receiptButton.disabled = false;
          if (signedUrlError || !data?.signedUrl) {
            window.alert(`Could not open receipt: ${signedUrlError?.message || 'Unknown error'}`);
            return;
          }
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        };
      });
      checking = false;
    };

    updateReceiptControls();
    const observer = new MutationObserver(updateReceiptControls);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    const timer = window.setInterval(updateReceiptControls, 10000);
    return () => {
      alive = false;
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

export default AdminReceiptReview;
