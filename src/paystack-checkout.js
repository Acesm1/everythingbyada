import { supabase } from './lib/supabase';

const CART_KEY = 'everythingbyada_cart';

function showPaymentMessage(button, text, isError = true) {
  const checkout = button.closest('.checkout-box');
  if (!checkout) return;
  let status = checkout.querySelector('.payment-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'payment-status';
    status.setAttribute('role', 'status');
    checkout.append(status);
  }
  status.textContent = text;
  status.style.color = isError ? '#b42318' : '#087443';
}

async function startCheckout(button) {
  if (!supabase) throw new Error('Checkout is not configured. Please contact the store.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    window.location.href = '/account';
    return;
  }
  let cart;
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { cart = []; }
  if (!Array.isArray(cart) || !cart.length) throw new Error('Your cart is empty.');

  const items = cart.map((item) => ({ product_id: item.id, quantity: Number(item.qty) }));
  button.disabled = true;
  const previousText = button.textContent;
  button.textContent = 'Connecting to secure checkout…';
  try {
    const response = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const result = await response.json();
    if (!response.ok || !result.authorization_url) throw new Error(result.error || 'Could not start payment.');
    window.location.assign(result.authorization_url);
  } catch (error) {
    showPaymentMessage(button, error.message || 'Could not start payment. Please try again.');
    button.disabled = false;
    button.textContent = previousText;
  }
}

function attachCheckoutHandler() {
  document.querySelectorAll('.checkout-box button.primary-btn').forEach((button) => {
    if (button.dataset.paystackCheckoutBound) return;
    button.dataset.paystackCheckoutBound = 'true';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      startCheckout(button).catch((error) => showPaymentMessage(button, error.message));
    }, true);
  });
}

const root = document.getElementById('root');
if (root) {
  const observer = new MutationObserver(attachCheckoutHandler);
  observer.observe(root, { childList: true, subtree: true });
  attachCheckoutHandler();
}
