import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

const CART_KEY = 'everythingbyada_cart';
const fieldStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #ded9df', borderRadius: 10, font: 'inherit', background: '#fff' };
const initialDelivery = { full_name: '', phone: '', address: '', city: '', state: '', postal_code: '', notes: '' };
const readCart = () => { try { const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(items) ? items : []; } catch { return []; } };
const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;

function CartPage() {
  const [cart, setCart] = useState(readCart);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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

  const changeQuantity = (index, amount) => {
    const rows = [...document.querySelectorAll('#cart .cart-item')];
    const control = rows[index]?.querySelectorAll('.cart-controls button')[amount > 0 ? 1 : 0];
    if (!control) return;
    control.click();
    window.setTimeout(() => setCart(readCart()), 250);
  };

  const pay = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!cart.length) return setMessage('Your cart is empty. Add products before checkout.');
    if (!supabase) return setMessage('Checkout is unavailable right now. Please contact the store.');

    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;
    if (error || !session?.access_token) {
      window.location.href = '/account';
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

  const field = (label, name, type = 'text', autoComplete = 'shipping address-line1', required = true) => (
    <label key={name} className="cart-checkout-field">{label}{required && <span aria-hidden="true"> *</span>}
      <input name={name} type={type} required={required} autoComplete={autoComplete} value={delivery[name]} onChange={(event) => setDelivery((current) => ({ ...current, [name]: event.target.value }))} style={fieldStyle} />
    </label>
  );

  return (
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
            <div className="cart-page-item-info"><strong>{item.name}</strong><span>{formatPrice(item.price)} each</span><div className="cart-page-quantity"><button type="button" onClick={() => changeQuantity(index, -1)} aria-label={`Remove one ${item.name}`}>−</button><span>{item.qty}</span><button type="button" onClick={() => changeQuantity(index, 1)} aria-label={`Add one ${item.name}`}>+</button></div></div>
            <strong className="cart-page-line-total">{formatPrice(Number(item.price || 0) * Number(item.qty || 0))}</strong>
          </article>)}
        </section>
        <form className="cart-page-checkout" onSubmit={pay}>
          <span className="mini-label">Secure checkout</span><h2>Delivery details</h2><p className="cart-page-subheading">Tell us where to deliver your order.</p>
          {field('Recipient full name', 'full_name', 'text', 'name')}
          {field('Phone number', 'phone', 'tel', 'tel')}
          {field('Street address', 'address', 'text', 'shipping address-line1')}
          <div className="cart-page-field-row">{field('City', 'city', 'text', 'shipping address-level2')}{field('State', 'state', 'text', 'shipping address-level1')}</div>
          {field('Postal code', 'postal_code', 'text', 'shipping postal-code', false)}
          <label className="cart-checkout-field">Delivery instructions <span className="optional-label">(optional)</span><textarea name="notes" rows="3" maxLength="500" value={delivery.notes} onChange={(event) => setDelivery((current) => ({ ...current, notes: event.target.value }))} placeholder="Apartment, landmark, or other helpful details" style={{ ...fieldStyle, resize: 'vertical' }} /></label>
          <div className="cart-page-total"><span>Order total</span><strong>{formatPrice(total)}</strong></div>
          <div className="cart-page-payment"><strong>Online payment with Paystack</strong><span>Pay securely with your bank card or other available payment options.</span></div>
          {message && <p role="alert" className="cart-page-error">{message}</p>}
          <button className="primary-btn full-width" type="submit" disabled={busy || !cart.length}>{busy ? 'Connecting to secure payment…' : 'Continue to secure payment'}</button>
          <small className="cart-page-secure-note">Secure payment processing by Paystack.</small>
        </form>
      </div>
    </main>
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
  details.innerHTML = '<div class="official-footer-contact"><strong>Contact us</strong><a href="tel:09068192327">09068192327</a></div><div class="official-footer-social"><strong>Follow us on TikTok</strong><a href="https://www.tiktok.com/@everythingbodiedbyada01" target="_blank" rel="noopener noreferrer">@everythingbodiedbyada01</a></div><div class="official-footer-bottom">© <span></span> Everything by Ada Body Glow. All rights reserved.</div>';
  details.querySelector('.official-footer-bottom span').textContent = new Date().getFullYear();
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
  // Use a real document navigation so /cart loads as its own URL/page on Vercel.
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
