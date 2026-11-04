import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './lib/supabase';

const STAGED_RECEIPT_KEY = 'everythingbyada_staged_transfer_receipt';
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

function BankTransferReceiptGate() {
  const [dialog, setDialog] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bypassNextSubmit = useRef(false);
  const formRef = useRef(null);
  const linkedOrders = useRef(new Set());

  useEffect(() => {
    const interceptCheckout = (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches('.cart-page-checkout')) return;
      if (form.querySelector('input[name="payment_method"]:checked')?.value !== 'bank_transfer') return;
      if (bypassNextSubmit.current) {
        bypassNextSubmit.current = false;
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      formRef.current = form;
      setFile(null);
      setError('');
      setDialog('receipt');
    };

    document.addEventListener('submit', interceptCheckout, true);
    return () => document.removeEventListener('submit', interceptCheckout, true);
  }, []);

  useEffect(() => {
    const linkReceiptToPlacedOrder = async () => {
      if (!supabase) return;
      const success = document.querySelector('.cart-page-order-success');
      const match = success?.textContent?.match(/Your order ([\w-]+) has been placed/i);
      const receiptPath = sessionStorage.getItem(STAGED_RECEIPT_KEY);
      if (!match || !receiptPath || linkedOrders.current.has(match[1])) return;

      linkedOrders.current.add(match[1]);
      const { error: rpcError } = await supabase.rpc('attach_order_receipt', {
        p_order_id: match[1],
        p_receipt_path: receiptPath,
      });

      if (!rpcError) {
        sessionStorage.removeItem(STAGED_RECEIPT_KEY);
        return;
      }

      linkedOrders.current.delete(match[1]);
      const modal = document.querySelector('.order-confirmation-modal');
      if (modal && !modal.querySelector('[data-receipt-link-error]')) {
        const notice = document.createElement('p');
        notice.dataset.receiptLinkError = 'true';
        notice.setAttribute('role', 'alert');
        notice.textContent = 'Your order was placed, but the receipt could not be attached. Please contact the store and provide your order reference.';
        modal.append(notice);
      }
    };

    const observer = new MutationObserver(linkReceiptToPlacedOrder);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(linkReceiptToPlacedOrder, 1200);
    linkReceiptToPlacedOrder();
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  const continueCheckout = async () => {
    if (!file) {
      setError('Please choose your payment receipt image before continuing.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for your receipt.');
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      setError('Receipt images must be 5 MB or smaller.');
      return;
    }
    if (!supabase) {
      setError('Receipt upload is unavailable. Please contact the store.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (sessionError || !user) throw new Error('Sign in again before uploading your receipt.');

      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('order-receipts').upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      sessionStorage.setItem(STAGED_RECEIPT_KEY, path);
      const form = formRef.current;
      if (!form?.isConnected) throw new Error('Checkout form is no longer available. Please retry checkout.');

      setDialog(null);
      bypassNextSubmit.current = true;
      form.requestSubmit();
    } catch (uploadError) {
      setError(uploadError.message || 'Could not upload your receipt. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!dialog) return null;

  return createPortal(
    <div className="receipt-upload-overlay" role="dialog" aria-modal="true" aria-labelledby="receipt-upload-title" onClick={(event) => {
      if (event.target === event.currentTarget) setDialog(null);
    }}>
      <section className="receipt-upload-modal" role="document">
        <button type="button" className="receipt-upload-close" onClick={() => setDialog(null)} aria-label="Close receipt upload" disabled={busy}>×</button>
        <span className="receipt-upload-step">Bank transfer · final step</span>
        <h2 id="receipt-upload-title">Confirm your payment</h2>
        <p>Before completing your order, make payment and send your transaction receipt. Upload the receipt, then click Next to proceed.</p>
        <label className="receipt-upload-picker">
          <span>{file ? file.name : 'Choose receipt image (max 5 MB)'}</span>
          <input type="file" accept="image/*" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        {file && <img className="receipt-upload-preview" src={URL.createObjectURL(file)} alt="Selected payment receipt preview" />}
        {error && <p className="receipt-upload-error" role="alert">{error}</p>}
        <div className="receipt-upload-actions">
          <button type="button" className="secondary-btn" onClick={() => setDialog(null)} disabled={busy}>Back</button>
          <button type="button" className="primary-btn" onClick={continueCheckout} disabled={busy}>{busy ? 'Uploading receipt…' : 'Next'}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default BankTransferReceiptGate;
