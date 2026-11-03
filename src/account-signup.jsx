import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

function SignupForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!supabase) {
      setMessage('Account signup is temporarily unavailable. Please try again later.');
      return;
    }
    if (password.length < 6) {
      setMessage('Use a password with at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMessage(data.session
        ? 'Your account is ready. You are now signed in.'
        : 'Check your email to confirm your new account.');
    } catch (error) {
      setMessage(error.message || 'Could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="customer-signup" aria-labelledby="customer-signup-title">
      <button
        type="button"
        className="signup-toggle secondary-btn"
        aria-expanded={open}
        aria-controls="customer-signup-panel"
        onClick={() => { setOpen((current) => !current); setMessage(''); }}
      >
        {open ? 'Back to sign in' : 'Sign up'}
      </button>
      <div id="customer-signup-panel" className={`signup-panel${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="signup-panel-inner">
          <h3 id="customer-signup-title">Create your account</h3>
          <p>New here? Sign up to manage your orders and account.</p>
          <form className="admin-login-form" onSubmit={submit}>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label>Confirm password<input type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          </form>
          {message && <p className="signup-message" role="status">{message}</p>}
        </div>
      </div>
    </section>
  );
}

function mountSignup() {
  // Only attach signup to the account route, below the existing sign-in form.
  const accountCard = document.querySelector('.account-page-shell .account-card');
  if (!accountCard || accountCard.querySelector('.customer-signup-root')) return;

  [...accountCard.querySelectorAll('p')]
    .find((paragraph) => /new customers can create an account/i.test(paragraph.textContent))
    ?.remove();

  const container = document.createElement('div');
  container.className = 'customer-signup-root';
  accountCard.append(container);
  createRoot(container).render(<SignupForm />);
}

const appRoot = document.getElementById('root');
if (appRoot) {
  const observer = new MutationObserver(mountSignup);
  observer.observe(appRoot, { childList: true, subtree: true });
  mountSignup();
}
