import { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const defaultProfile = { name: '', email: '', password: '', phone: '', address: '', city: '' };
const CART_KEY = 'everythingbyada_cart';
const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const routeFromPath = () => window.location.pathname.startsWith('/admin') ? 'admin' : 'store';
const readCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
};
const fromRow = (row) => ({
  ...row,
  oldPrice: Number(row.old_price ?? row.price ?? 0),
  price: Number(row.price ?? 0),
  stock: Number(row.stock ?? 0),
  rating: Number(row.rating ?? 4.8),
  reviews: Number(row.reviews ?? 0),
});

export default function DatabaseApp() {
  const [view, setView] = useState(routeFromPath);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState(readCart);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(defaultProfile);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(defaultProfile);
  const [isRegistering, setIsRegistering] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', category: '', price: '', old_price: '', stock: '', image: '', feature: '', description: '' });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const categoryFilters = useMemo(() => ['All', ...categories], [categories]);
  const visibleProducts = useMemo(() => products.filter((item) =>
    (selectedCategory === 'All' || item.category === selectedCategory) &&
    item.name.toLowerCase().includes(search.toLowerCase())), [products, selectedCategory, search]);

  const loadCatalog = async () => {
    if (!supabase) return;
    const [{ data: productRows, error: productError }, { data: categoryRows, error: categoryError }] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      supabase.from('categories').select('name').order('name'),
    ]);
    if (productError) throw productError;
    if (categoryError) throw categoryError;
    setProducts((productRows || []).map(fromRow));
    setCategories((categoryRows || []).map((row) => row.name));
  };

  const loadOrders = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    setOrders(data || []);
  };

  const checkAdmin = async (targetUser) => {
    if (!supabase || !targetUser) return false;
    const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', targetUser.id).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  };

  useEffect(() => {
    const syncRoute = () => setView(routeFromPath());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    const initialize = async () => {
      try {
        const [{ data: sessionData },] = await Promise.all([supabase.auth.getSession(), loadCatalog()]);
        if (alive) setUser(sessionData.session?.user ?? null);
      } catch (error) {
        if (alive) setMessage(`Could not load Supabase data: ${error.message}`);
      }
    };
    initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session?.user ?? null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    let alive = true;
    const loadUserData = async () => {
      const { data, error } = await supabase.from('customer_profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) { if (alive) setMessage(`Could not load profile: ${error.message}`); return; }
      if (alive) {
        const next = { id: user.id, name: data?.full_name || user.user_metadata?.full_name || '', email: user.email || '', phone: data?.phone || '', address: data?.address || '', city: data?.city || '' };
        setProfile(next);
        setProfileForm({ ...next, password: '' });
      }
    };
    loadUserData();
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (view !== 'admin' || !user) { setCheckingAdmin(false); return; }
    let alive = true;
    setCheckingAdmin(true);
    checkAdmin(user).then((allowed) => {
      if (!alive) return;
      setIsAdmin(allowed);
      setCheckingAdmin(false);
      if (!allowed) setMessage('This Supabase account is not authorized for the admin dashboard.');
      else loadOrders().catch((error) => setMessage(`Could not load orders: ${error.message}`));
    }).catch((error) => {
      if (alive) { setIsAdmin(false); setCheckingAdmin(false); setMessage(`Could not verify admin access: ${error.message}`); }
    });
    return () => { alive = false; };
  }, [view, user]);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setView(routeFromPath());
    setMessage('');
  };

  const changeCart = (product, amount) => setCart((current) => {
    const existing = current.find((item) => item.id === product.id);
    if (!existing && amount > 0) return [...current, { ...product, qty: amount }];
    return current.map((item) => item.id === product.id ? { ...item, qty: item.qty + amount } : item).filter((item) => item.qty > 0);
  });

  const submitCustomerAuth = async (event) => {
    event.preventDefault();
    if (!supabase) { setMessage('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'); return; }
    setBusy(true); setMessage('');
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email: registerForm.email.trim(), password: registerForm.password,
          options: { data: { full_name: registerForm.name.trim(), phone: registerForm.phone.trim(), address: registerForm.address.trim(), city: registerForm.city.trim() } },
        });
        if (error) throw error;
        setIsRegistering(false);
        setAuthForm({ email: registerForm.email.trim(), password: '' });
        setMessage('Account created. Check your email and confirm the address before signing in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password });
        if (error) throw error;
        setMessage('Signed in successfully.');
      }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!supabase || !user) return;
    setBusy(true); setMessage('');
    const values = { id: user.id, full_name: profileForm.name.trim(), phone: profileForm.phone.trim(), address: profileForm.address.trim(), city: profileForm.city.trim(), updated_at: new Date().toISOString() };
    const { error } = await supabase.from('customer_profiles').upsert(values);
    setBusy(false);
    if (error) { setMessage(`Could not save profile: ${error.message}`); return; }
    setProfile({ ...profileForm, id: user.id, name: values.full_name });
    setMessage('Profile saved to your account.');
  };

  const submitAdminLogin = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: adminForm.email.trim(), password: adminForm.password });
      if (error) throw error;
      const allowed = await checkAdmin(data.user);
      if (!allowed) {
        await supabase.auth.signOut();
        throw new Error('This account is not on the admin allowlist. Add its Supabase Auth user to public.admin_users.');
      }
      setIsAdmin(true);
      setMessage('Admin signed in.');
      await loadOrders();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    const category = productForm.category.trim();
    if (!productForm.name.trim() || !category) { setMessage('Product name and category are required.'); return; }
    setBusy(true); setMessage('');
    const payload = {
      name: productForm.name.trim(), category, price: Number(productForm.price) || 0,
      old_price: Number(productForm.old_price) || Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0, image: productForm.image.trim(),
      feature: productForm.feature.trim(), description: productForm.description.trim(),
    };
    const result = editingProduct
      ? await supabase.from('products').update(payload).eq('id', editingProduct)
      : await supabase.from('products').insert(payload);
    if (!result.error) {
      const { error: categoryError } = await supabase.from('categories').upsert({ name: category }, { onConflict: 'name' });
      if (categoryError) result.error = categoryError;
    }
    if (result.error) setMessage(`Could not save product: ${result.error.message}`);
    else {
      setProductForm({ name: '', category: '', price: '', old_price: '', stock: '', image: '', feature: '', description: '' });
      setEditingProduct(null);
      try { await loadCatalog(); setMessage('Product saved to Supabase.'); }
      catch (error) { setMessage(`Product saved, but refresh failed: ${error.message}`); }
    }
    setBusy(false);
  };

  const editProduct = (product) => {
    setEditingProduct(product.id);
    setProductForm({ name: product.name, category: product.category, price: product.price, old_price: product.oldPrice, stock: product.stock, image: product.image || '', feature: product.feature || '', description: product.description || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Remove this product from the catalog?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) setMessage(`Could not remove product: ${error.message}`);
    else { await loadCatalog(); setMessage('Product removed.'); }
  };

  const placeOrder = async () => {
    if (!user || !profile) { navigate('/account'); setMessage('Sign in before placing an order.'); return; }
    if (!cart.length) { setMessage('Your cart is empty.'); return; }
    setBusy(true); setMessage('');
    const order = {
      id: crypto.randomUUID(), user_id: user.id, customer_name: profile.name,
      customer_email: user.email, total: subtotal, status: 'Pending',
      items: cart.map(({ id, name, price, qty }) => ({ product_id: id, name, price, quantity: qty })),
    };
    const { error } = await supabase.from('orders').insert(order);
    setBusy(false);
    if (error) { setMessage(`Could not save order: ${error.message}`); return; }
    setCart([]);
    setMessage('Order saved. Payment has not been processed; contact the store to complete payment.');
  };

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) setMessage(`Could not update order: ${error.message}`);
    else await loadOrders();
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsAdmin(false); setProfile(null); navigate('/');
  };

  if (!isSupabaseConfigured) return <main className="account-page-shell"><section className="account-card"><h2>Supabase setup needed</h2><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment environment and restart/redeploy the site.</p></section></main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block"><div className="logo-ring"><span>EB</span></div><div className="brand-copy"><strong>Everything</strong><span>bodiedbyAda</span><em>Body Glow</em></div></div>
        <nav className="main-nav" aria-label="Main navigation"><button className="nav-link" onClick={() => navigate('/')}>Home / Shop</button><button className="nav-link" onClick={() => navigate('/account')}>{user ? 'My account' : 'Sign in'}</button><button className="nav-link" onClick={() => navigate('/admin')}>Admin</button></nav>
        <div className="header-actions"><span>Cart: {cartCount}</span></div>
      </header>

      {message && <div className="auth-error" role="status">{message}</div>}

      {view === 'admin' ? (checkingAdmin ? <main className="account-page-shell"><section className="account-card">Checking admin access…</section></main> : !isAdmin ? (
        <main className="admin-login-shell"><section className="admin-login-card"><span className="mini-label">Restricted area</span><h2>Admin dashboard login</h2><p>Sign in with the Supabase Auth email that has admin access.</p><form className="admin-login-form" onSubmit={submitAdminLogin}><label>Email<input type="email" required value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} /></label><label>Password<input type="password" required value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} /></label><button className="primary-btn full-width" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to admin'}</button></form></section></main>
      ) : (
        <main className="admin-dashboard-shell">
          <header className="admin-topbar"><div><span className="admin-badge">Supabase admin</span><h1>Marketplace dashboard</h1></div><div className="admin-topbar-actions"><button className="ghost-admin-btn" onClick={() => navigate('/')}>View storefront</button><button className="danger-admin-btn" onClick={logout}>Log out</button></div></header>
          <section className="admin-grid">
            <div className="admin-panel-card"><div className="panel-header-row"><h2>{editingProduct ? 'Edit product' : 'Add product'}</h2></div><form className="product-form" onSubmit={saveProduct}>
              <label>Product name<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
              <label>Category<input required list="category-options" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="Type a category" /><datalist id="category-options">{categories.map((name) => <option key={name} value={name} />)}</datalist></label>
              <div className="two-col-inputs"><label>Price<input type="number" min="0" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label><label>Old price<input type="number" min="0" value={productForm.old_price} onChange={(e) => setProductForm({ ...productForm, old_price: e.target.value })} /></label></div>
              <div className="two-col-inputs"><label>Stock<input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label><label>Image URL<input type="url" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} /></label></div>
              <label>Feature<input value={productForm.feature} onChange={(e) => setProductForm({ ...productForm, feature: e.target.value })} /></label><label>Description<textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
              <div className="product-form-actions"><button className="primary-admin-btn" disabled={busy}>{editingProduct ? 'Update product' : 'Save product'}</button>{editingProduct && <button type="button" className="secondary-admin-btn" onClick={() => { setEditingProduct(null); setProductForm({ name: '', category: '', price: '', old_price: '', stock: '', image: '', feature: '', description: '' }); }}>Cancel</button>}</div>
            </form></div>
            <div className="admin-panel-card"><div className="panel-header-row"><h2>Orders ({orders.length})</h2></div><div className="order-list">{orders.map((order) => <div className="order-row" key={order.id}><div><strong>{order.customer_name || order.customer_email}</strong><p>{new Date(order.created_at).toLocaleDateString()}</p></div><span>{formatPrice(order.total)}</span><select aria-label={`Order ${order.id} status`} value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}><option>Pending</option><option>Paid</option><option>Packed</option><option>Shipped</option><option>Cancelled</option></select></div>)}</div></div>
          </section>
          <section className="admin-panel-card inventory-panel"><div className="panel-header-row inventory-header"><h2>Inventory ({products.length})</h2><input className="inventory-search" placeholder="Search inventory" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.category}</td><td>{formatPrice(p.price)}</td><td>{p.stock}</td><td><div className="row-actions"><button className="row-edit-btn" onClick={() => editProduct(p)}>Edit</button><button className="row-delete-btn" onClick={() => deleteProduct(p.id)}>Remove</button></div></td></tr>)}</tbody></table></div></section>
        </main>
      )) : view === 'account' ? (
        <main className="account-page-shell"><section className="account-card"><div className="account-header-row"><div><span className="mini-label">My account</span><h2>{user ? 'Your profile' : isRegistering ? 'Create account' : 'Sign in'}</h2></div>{user && <button className="secondary-btn" onClick={logout}>Log out</button>}</div>
          {!user ? <><div className="account-form-switch"><button className={!isRegistering ? 'switch-btn active' : 'switch-btn'} onClick={() => setIsRegistering(false)}>Sign in</button><button className={isRegistering ? 'switch-btn active' : 'switch-btn'} onClick={() => setIsRegistering(true)}>Create account</button></div><form className="account-form" onSubmit={submitCustomerAuth}>{isRegistering && <><label>Full name<input required value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} /></label><label>Phone<input value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} /></label><label>Address<input value={registerForm.address} onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })} /></label><label>City<input value={registerForm.city} onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })} /></label></>}<label>Email<input type="email" required value={isRegistering ? registerForm.email : authForm.email} onChange={(e) => isRegistering ? setRegisterForm({ ...registerForm, email: e.target.value }) : setAuthForm({ ...authForm, email: e.target.value })} /></label><label>Password<input type="password" required minLength="6" value={isRegistering ? registerForm.password : authForm.password} onChange={(e) => isRegistering ? setRegisterForm({ ...registerForm, password: e.target.value }) : setAuthForm({ ...authForm, password: e.target.value })} /></label><button className="primary-btn full-width" disabled={busy}>{busy ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}</button></form></> : <form className="account-form" onSubmit={saveProfile}><p>{user.email}</p><label>Full name<input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></label><label>Phone<input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></label><label>Address<input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} /></label><label>City<input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} /></label><button className="primary-btn" disabled={busy}>Save profile</button></form>}</section></main>
      ) : (
        <main><section className="hero"><div className="hero-copy"><div className="badge">Premium wellness & beauty</div><h1>What are <span>your</span> body goals?</h1><p>Discover products designed to support your wellness and body goals.</p><button className="primary-btn" onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}>Shop products</button></div></section><section className="marketplace" id="shop"><div className="section-heading"><div><span className="mini-label">Top picks</span><h3>Marketplace products</h3></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" /></div><div className="filter-row">{categoryFilters.map((category) => <button key={category} className={selectedCategory === category ? 'filter-chip active' : 'filter-chip'} onClick={() => setSelectedCategory(category)}>{category}</button>)}</div><div className="shop-layout"><div className="product-grid">{visibleProducts.map((p) => <article className="product-card" key={p.id}><div className="product-image-wrap"><img src={p.image} alt={p.name} /></div><div className="product-info"><div className="meta-row"><span>{p.category}</span><span>{p.feature}</span></div><h4>{p.name}</h4><p>{p.description}</p><div className="price-row"><strong>{formatPrice(p.price)}</strong><span>{formatPrice(p.oldPrice)}</span></div><button className="add-btn" onClick={() => changeCart(p, 1)}>Add to cart</button></div></article>)}</div><aside className="cart-panel"><div className="section-heading compact"><h3>Cart</h3></div>{cart.map((item) => <div className="cart-item" key={item.id}><strong>{item.name}</strong><div className="cart-controls"><button onClick={() => changeCart(item, -1)}>-</button><span>{item.qty}</span><button onClick={() => changeCart(item, 1)}>+</button></div><strong>{formatPrice(item.price * item.qty)}</strong></div>)}<div className="checkout-box"><div className="checkout-row total"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div><button className="primary-btn full-width" disabled={busy || !cart.length} onClick={placeOrder}>Place order</button><small>Placing an order records it; payment is not processed on this site.</small></div></aside></div></section></main>
      )}
      <footer className="site-footer"><div><strong>Everything bodiedbyAda</strong></div><div className="footer-links"><button className="footer-link" onClick={() => navigate('/')}>Shop</button><button className="footer-link" onClick={() => navigate('/account')}>Account</button><button className="footer-link" onClick={() => navigate('/admin')}>Admin</button></div></footer>
    </div>
  );
}
