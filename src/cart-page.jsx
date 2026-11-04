import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

const CART_KEY = 'everythingbyada_cart';
const fieldStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #ded9df', borderRadius: 10, font: 'inherit', background: '#fff' };
const initialDelivery = { full_name: '', phone: '', address: '', city: '', state: '', postal_code: '', notes: '' };
const readCart = () => { try { const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(items) ? items : []; } catch { return []; } };
const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const bankDetails = {
  bankName: import.meta.env.VITE_BANK_TRANSFER_BANK_NAME || 'Opay',
  accountName: import.meta.env.VITE_BANK_TRANSFER_ACCOUNT_NAME || 'Kenneth Blessing Amarachi',
  accountNumber: import.meta.env.VITE_BANK_TRANSFER_ACCOUNT_NUMBER || '9013494845',
};
const hasBankDetails = Object.values(bankDetails).every(Boolean);
const whatsappLink = 'https://wa.me/2349068192327';

function CartPage() {
  const [cart, setCart] = useState(readCart);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [showBankTransferPopup, setShowBankTransferPopup] = useState(false);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);

  useEffect(() => {
    const refresh = () => setCart(readCart());
    window.addEventListener('storage', refresh);
    window.addEventListener('everythingbyada-cart-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('everythingbyada-cart-updated', refresh);
    };
  }, []);

  const openBankTransferPopup = () => {
    setShowBankTransferPopup(true);
  };

  const changeQuantity = (index, amount) => {
    const rows = [...document.querySelectorAll('#cart .cart-item')];
    const control = rows[index]?.querySelectorAll('.cart-controls button')[amount > 0 ? 1 : 0];
    if (!control) return;
    control.click();
    window.setTimeout(() => setCart(readCart()), 250);
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setMessage('');
    setOrderMessage('');
    if (!cart.length) return setMessage('Your cart is empty. Add products before checkout.');
    if (!supabase) return setMessage('Checkout is unavailable right now. Please contact the store.');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData?.session;
    const user = session?.user;
    if (sessionError || !session?.access_token || !user) {
      window.location.href = '/account';
      return;
    }

    setBusy(true);
    try {
      const items = cart.map((item) => ({ product_id: item.id, name: item.name, price: Number(item.price), quantity: Number(item.qty) }));
      if (paymentMethod === 'bank_transfer') {
        if (!hasBankDetails) throw new Error('Bank transfer is not available yet. Please contact the store.');
        const orderId = crypto.randomUUID();
        const { error } = await supabase.from('orders').insert({
          id: orderId,
          user_id: user.id,
          customer_name: delivery.full_name,
          customer_email: user.email,
          total,
          status: 'Awaiting bank transfer',
          items,
          delivery_full_name: delivery.full_name,
          delivery_phone: delivery.phone,
          delivery_address: delivery.address,
          delivery_city: delivery.city,
          delivery_state: delivery.state,
          delivery_postal_code: delivery.postal_code,
          delivery_notes: delivery.notes,
        });
        if (error) throw error;
        localStorage.removeItem(CART_KEY);
        setCart([]);
        setPendingOrderId(orderId);
        setShowBankTransferPopup(false);
        setShowWhatsAppPopup(true);
        setOrderMessage(`Your order ${orderId} has been placed. Transfer the exact total using the bank details above and use your order ID as the payment reference. The store will confirm your transfer.`);
        return;
      }

      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(({ product_id, quantity }) => ({ product_id, quantity })), delivery }),
      });
      const result = await response.json();
      if (!response.ok || !result.authorization_url) throw new Error(result.error || 'Could not start secure checkout.');
      window.location.assign(result.authorization_url);
    } catch (error) {
      setMessage(error.message || 'Could not start payment. Please try again.');
      setBusy(false);
    } finally {
      if (paymentMethod !== 'bank_transfer') setBusy(false);
    }
  };

  const field = (label, name, type = 'text', autoComplete = 'shipping address-line1', required = true) => (
    <label key={name} className="cart-checkout-field">{label}{required && <span aria-hidden="true"> *</span>}
      <input name={name} type={type} required={required} autoComplete={autoComplete} value={delivery[name]} onChange={(event) => setDelivery((current) => ({ ...current, [name]: event.target.value }))} style={fieldStyle} />
    </label>
  );

  const continueBankTransfer = () => {
    if (!receiptFile) {
      setMessage('Please upload a receipt image before continuing.');
      return;
    }
    setShowBankTransferPopup(false);
    setShowWhatsAppPopup(true);
  };

  return (
    <>
      {showBankTransferPopup && (
        <div className="receipt-upload-overlay" role="dialog" aria-modal="true" aria-labelledby="bank-transfer-popup-title" onClick={() => setShowBankTransferPopup(false)}>
          <div className="receipt-upload-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="receipt-upload-close" onClick={() => setShowBankTransferPopup(false)} aria-label="Close bank transfer popup">×</button>
            <span className="receipt-upload-step">Bank transfer · payment</span>
            <h3 id="bank-transfer-popup-title">Confirm your transfer</h3>
            <p>Transfer <strong>{formatPrice(total)}</strong> to the account below. Upload proof of payment and then continue.</p>
            <div className="bank-transfer-inline-details">
              <div><span>Bank</span><strong>{bankDetails.bankName}</strong></div>
              <div><span>Account name</span><strong>{bankDetails.accountName}</strong></div>
              <div><span>Account number</span><strong>{bankDetails.accountNumber}</strong></div>
            </div>
            <label className="receipt-upload-picker">
              <span>{receiptFile ? receiptFile.name : 'Upload payment receipt'}</span>
              <input type="file" accept="image/*" onChange={(event) => setReceiptFile(event.target.files?.[0] || null)} />
            </label>
            {receiptFile && <img className="receipt-upload-preview" src={URL.createObjectURL(receiptFile)} alt="Selected payment receipt" />}
            <div className="receipt-upload-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowBankTransferPopup(false)}>Back</button>
              <button type="button" className="primary-btn" onClick={continueBankTransfer}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppPopup && (
        <div className="order-confirmation-overlay" role="dialog" aria-modal="true" aria-labelledby="whatsapp-order-popup-title" onClick={() => setShowWhatsAppPopup(false)}>
          <div className="order-confirmation-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="order-confirmation-close" onClick={() => setShowWhatsAppPopup(false)} aria-label="Close order confirmation">×</button>
            <h3 id="whatsapp-order-popup-title">Order placed</h3>
            <p>Click the link to send your order reference ID and confirm your bank transfer payment.</p>
            <a
              className="order-confirmation-whatsapp"
              href={`${whatsappLink}?text=${encodeURIComponent(`Hello, my order reference ID is ${pendingOrderId || 'pending'}. Please confirm my bank transfer payment.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp us
            </a>
          </div>
        </div>
      )}

      <main className="cart-page" aria-labelledby="cart-page-title">
        <div className="cart-page-heading">
          <div><span className="mini-label">Your shopping bag</span><h1 id="cart-page-title">Cart &amp; checkout</h1><p>Review your items and enter delivery details to pay securely.</p></div>
          <a className="secondary-btn" href="/">Continue shopping</a>
        </div>
        <div className="cart-page-layout">
          <section className="cart-page-items" aria-label="Items in your cart">
            <h2>Order items <span>({cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)})</span></h2>
            {!cart.length && <div className="cart-empty-state"><p>Your cart is empty.</p><a className="primary-btn" href="/">Browse products</a></div>}
            {cart.map((item, index) => <article className="cart-page-item" key={item.id}>
              <img src={item.image || '/brand-mark.svg'} alt="" />
              <div className="cart-page-item-info"><strong>{item.name}</strong><span>{formatPrice(item.price)} each</span><div className="cart-page-quantity"><button type="button" onClick={() => changeQuantity(index, -1)} aria-label={`Decrease quantity for ${item.name}`}>−</button><span>{item.qty}</span><button type="button" onClick={() => changeQuantity(index, 1)} aria-label={`Increase quantity for ${item.name}`}>+</button></div></div>
              <strong className="cart-page-line-total">{formatPrice(Number(item.price || 0) * Number(item.qty || 0))}</strong>
            </article>)}
          </section>
          <form className="cart-page-checkout" onSubmit={submitOrder}>
            <span className="mini-label">Secure checkout</span><h2>Delivery details</h2><p className="cart-page-subheading">Tell us where to deliver your order.</p>
            {field('Recipient full name', 'full_name', 'text', 'name')}
            {field('Phone number', 'phone', 'tel', 'tel')}
            {field('Street address', 'address', 'text', 'shipping address-line1')}
            <div className="cart-page-field-row">{field('City', 'city', 'text', 'shipping address-level2')}{field('State', 'state', 'text', 'shipping address-level1')}</div>
            {field('Postal code', 'postal_code', 'text', 'shipping postal-code', false)}
            <label className="cart-checkout-field">Delivery instructions <span className="optional-label">(optional)</span><textarea name="notes" rows="3" maxLength="500" value={delivery.notes} onChange={(event) => setDelivery((current) => ({ ...current, notes: event.target.value }))} style={{ ...fieldStyle, minHeight: 92, resize: 'vertical' }} /></label>
            <fieldset className="cart-payment-options">
              <legend>Choose payment method</legend>
              <label className="cart-payment-option"><input type="radio" name="payment_method" value="paystack" checked={paymentMethod === 'paystack'} onChange={() => { setPaymentMethod('paystack'); setShowBankTransferPopup(false); }} />Pay online with Paystack</label>
              <label className="cart-payment-option"><input type="radio" name="payment_method" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={() => { setPaymentMethod('bank_transfer'); openBankTransferPopup(); }} />Pay via bank transfer</label>
            </fieldset>
            {paymentMethod === 'bank_transfer' && <section className="bank-transfer-details" aria-live="polite">
              <h3>Company bank details</h3>
              {hasBankDetails ? <dl><div><dt>Bank</dt><dd>{bankDetails.bankName}</dd></div><div><dt>Account name</dt><dd>{bankDetails.accountName}</dd></div><div><dt>Account number</dt><dd>{bankDetails.accountNumber}</dd></div></dl> : <p>Bank transfer is not available yet. Please contact the store.</p>}
              {hasBankDetails && <p>After placing your order, transfer <strong>{formatPrice(total)}</strong>. Use the order ID shown above as the payment reference. Your order remains awaiting confirmation until the transfer is verified.</p>}
            </section>}
            <div className="cart-page-total"><span>Order total</span><strong>{formatPrice(total)}</strong></div>
            {message && <p role="alert" className="cart-page-error">{message}</p>}
            {orderMessage && <p role="status" className="cart-page-order-success">{orderMessage}</p>}
            <button className="primary-btn full-width" type="submit" disabled={busy || !cart.length || (paymentMethod === 'bank_transfer' && !hasBankDetails)}>{busy ? (paymentMethod === 'bank_transfer' ? 'Placing order…' : 'Processing…') : 'Place order'}</button>
            {paymentMethod === 'paystack' && <small className="cart-page-secure-note">Secure payment processing by Paystack.</small>}
          </form>
        </div>
      </main>
    </>
  );
}

function makeRecommendations() {
  const shop = document.querySelector('#shop');
  const sourceCards = [...document.querySelectorAll('#shop .product-grid > .product-card')];
  if (!shop || !sourceCards.length) return;
  let section = document.querySelector('.you-may-like');
  if (!section) {
    section = document.createElement('section');
    section.className = 'you-may-like';
    section.innerHTML = '<div class="section-heading"><div><span class="mini-label">Picked for you</span><h3>You may like products</h3></div></div><div class="you-may-like-grid"></div>';
    shop.after(section);
  }
  const grid = section.querySelector('.you-may-like-grid');
  const cards = sourceCards.slice(0, 4);
  if (grid.dataset.productIds === cards.map((card) => card.querySelector('h4')?.textContent).join('|')) return;
  grid.replaceChildren();
  grid.dataset.productIds = cards.map((card) => card.querySelector('h4')?.textContent).join('|');
  cards.forEach((card) => {
    const recommendation = card.cloneNode(true);
    recommendation.classList.remove('clickable-product');
    recommendation.removeAttribute('role');
    recommendation.removeAttribute('tabindex');
    const originalAdd = card.querySelector('.add-btn');
    recommendation.querySelector('.add-btn')?.addEventListener('click', (event) => { event.stopPropagation(); originalAdd?.click(); });
    recommendation.querySelectorAll('button').forEach((button) => { if (!button.classList.contains('add-btn')) button.remove(); });
    grid.append(recommendation);
  });
}

function enhanceFooter() {
  const footer = document.querySelector('.site-footer');
  if (!footer || footer.querySelector('.official-footer-details')) return;
  const details = document.createElement('div');
  details.className = 'official-footer-details';
  details.innerHTML = '<div class="official-footer-contact"><strong>Contact us</strong><a href="tel:09068192327">09068192327</a></div><div class="official-footer-social"><strong>Follow us on TikTok</strong><a href="https://www.tiktok.com/@everythingbyada" target="_blank" rel="noreferrer">@everythingbyada</a></div><div class="official-footer-bottom"><span>© <span></span> Everything By Ada.</span><span>Fresh beauty, delivered with care.</span></div>';
  details.querySelector('.official-footer-bottom span:first-child span').textContent = new Date().getFullYear();
  footer.append(details);
  footer.classList.add('official-footer');
}

function syncCartPage() {
  const app = document.querySelector('#root .app-shell');
  const active = window.location.pathname === '/cart';
  if (!app) return;
  app.classList.toggle('cart-page-active', active);
  let container = document.getElementById('separate-cart-page-root');
  if (active && !container) {
    container = document.createElement('div');
    container.id = 'separate-cart-page-root';
    document.body.append(container);
    createRoot(container).render(<CartPage />);
  } else if (!active && container) {
    container.remove();
  }
}

function handleCartNavigation(event) {
  const button = event.target.closest('.cart-btn');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign('/cart');
}

const root = document.getElementById('root');
if (root) {
  root.addEventListener('click', handleCartNavigation, true);
  const update = () => {
    syncCartPage();
    if (window.location.pathname !== '/cart') {
      makeRecommendations();
      enhanceFooter();
    }
  };
  const observer = new MutationObserver(update);
  observer.observe(root, { childList: true, subtree: true });
  window.addEventListener('popstate', update);
  update();
}
