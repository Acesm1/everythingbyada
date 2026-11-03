import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

function SignupForm() {
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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);

    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      setMessage('Your account is ready. You are now signed in.');
    } else {
      setMessage('Check your email to confirm your new account.');
    }
  };

  return (
    <section className="customer-signup" aria-labelledby="customer-signup-title">
      <h3 id="customer-signup-title">Create your account</h3>
      <p>Sign up here to manage your orders and account.</p>
      <form className="admin-login-form" onSubmit={submit}>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Confirm password<input type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
      </form>
      {message && <p className="signup-message" role="status">{message}</p>}
    </section>
  );
}

function mountSignup() {
  const card = document.querySelector('.account-page-shell .account-card');
  if (!card || card.querySelector('.customer-signup-root')) return;

  // Remove the old note suggesting that an administrator must create accounts.
  [...card.querySelectorAll('p')].find((paragraph) => /new customers can create an account/i.test(paragraph.textContent))?.remove();
  const container = document.createElement('div');
  container.className = 'customer-signup-root';
  card.append(container);
  createRoot(container).render(<SignupForm />);
}

const observer = new MutationObserver(mountSignup);
observer.observe(document.getElementById('root'), { childList: true, subtree: true });
mountSignup();
