import { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import './storefront.css';
import './special-category-mobile.css';

const CART_KEY = 'everythingbyada_cart';
const emptyProduct = { name: '', category: '', price: '', old_price: '', stock: '', feature: '', description: '', best_seller: false };
const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const routeFromPath = () => window.location.pathname.startsWith('/admin') ? 'admin' : window.location.pathname.startsWith('/account') ? 'account' : 'store';
const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } };
const fromRow = (row) => ({ ...row, price: Number(row.price || 0), oldPrice: Number(row.old_price ?? row.price ?? 0), stock: Number(row.stock || 0), best_seller: Boolean(row.best_seller) });

export default function DatabaseApp() {
  const [view, setView] = useState(routeFromPath);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(readCart);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [form, setForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [categorySpecial, setCategorySpecial] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.qty, 0);
  const bestSellers = products.filter((product) => product.best_seller);
  const featured = bestSellers.length ? bestSellers[featuredIndex % bestSellers.length] : null;
  const specialCategories = categories.filter((category) => category.is_special);
  const visibleProducts = useMemo(() => products.filter((item) =>
    (selectedCategory === 'All' || item.category === selectedCategory) &&
    `${item.name} ${item.feature || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [products, selectedCategory, search]);

  const loadCatalog = async () => {
    if (!supabase) return;

    // Products are the storefront's essential data: load and publish them before
    // querying optional category metadata so a category schema issue can't hide the catalog.
    const { data: productRows, error: productError } = await supabase.from('products').select('*').order('id');
    if (productError) throw productError;
    setProducts((productRows || []).map(fromRow));

    let { data: categoryRows, error: categoryError } = await supabase
      .from('categories').select('name,is_special').order('name');
    if (categoryError) {
      const fallback = await supabase.from('categories').select('name').order('name');
      categoryRows = fallback.error
        ? []
        : (fallback.data || []).map((category) => ({ ...category, is_special: false }));
    }
    setCategories(categoryRows || []);
  };

  useEffect(() => {
    const sync = () => setView(routeFromPath());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setUser(data.session?.user || null); });
    loadCatalog().catch((error) => { if (alive) setMessage(`Could not load catalog: ${error.message}`); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) setUser(session?.user || null); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!supabase || !user) { setIsAdmin(false); return; }
    supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);
  useEffect(() => {
    if (bestSellers.length < 2) return undefined;
    const timer = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % bestSellers.length), 5000);
    return () => window.clearInterval(timer);
  }, [bestSellers.length]);

  const navigate = (path) => { window.history.pushState({}, '', path); setView(routeFromPath()); setMessage(''); window.scrollTo(0, 0); };
  const changeCart = (product, amount) => setCart((current) => {
    const item = current.find((entry) => entry.id === product.id);
    if (!item && amount > 0) return [...current, { ...product, qty: amount }];
    return current.map((entry) => entry.id === product.id ? { ...entry, qty: entry.qty + amount } : entry).filter((entry) => entry.qty > 0);
  });
  const signIn = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: login.email.trim(), password: login.password });
    setBusy(false); if (error) setMessage(error.message); else setMessage('Signed in successfully.');
  };
  const uploadProductImage = async () => {
    if (!imageFile) return form.image || '';
    if (!imageFile.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (imageFile.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
    const extension = imageFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `products/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('product-images').upload(path, imageFile, { upsert: false, contentType: imageFile.type });
    if (error) throw error;
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  };
  const saveProduct = async (event) => {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    const category = form.category.trim();
    if (!form.name.trim() || !category) { setMessage('Product name and category are required.'); return; }
    setBusy(true); setMessage('');
    try {
      const image = await uploadProductImage();
      const payload = { name: form.name.trim(), category, price: Number(form.price) || 0, old_price: Number(form.old_price) || Number(form.price) || 0, stock: Number(form.stock) || 0, image, feature: form.feature.trim(), description: form.description.trim(), best_seller: Boolean(form.best_seller) };
      const result = editingId ? await supabase.from('products').update(payload).eq('id', editingId) : await supabase.from('products').insert(payload);
      if (result.error) throw result.error;

      let { error: categorySaveError } = await supabase.from('categories')
        .upsert({ name: category, is_special: categorySpecial }, { onConflict: 'name' });
      if (categorySaveError) {
        const fallback = await supabase.from('categories').upsert({ name: category }, { onConflict: 'name' });
        categorySaveError = fallback.error;
      }
      if (categorySaveError) throw categorySaveError;

      setForm(emptyProduct); setImageFile(null); setEditingId(null); setCategorySpecial(false);
      await loadCatalog(); setMessage('Product saved.');
    } catch (error) { setMessage(`Could not save product: ${error.message}`); }
    finally { setBusy(false); }
  };
  const editProduct = (product) => {
    setEditingId(product.id);
    setForm({ name: product.name, category: product.category, price: product.price, old_price: product.oldPrice, stock: product.stock, image: product.image || '', feature: product.feature || '', description: product.description || '', best_seller: product.best_seller });
    setCategorySpecial(Boolean(categories.find((category) => category.name === product.category)?.is_special));
    setImageFile(null); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const deleteProduct = async (id) => {
    if (!window.confirm('Remove this product from the catalog?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) setMessage(error.message); else { await loadCatalog(); setMessage('Product removed.'); }
  };
  const placeOrder = async () => {
    if (!user) { navigate('/account'); setMessage('Sign in before placing an order.'); return; }
    if (!cart.length) return;
    setBusy(true);
    const items = cart.map(({ id, name, price, qty }) => ({ product_id: id, name, price, quantity: qty }));
    const { error } = await supabase.from('orders').insert({ id: crypto.randomUUID(), user_id: user.id, customer_name: user.user_metadata?.full_name || user.email, customer_email: user.email, total: subtotal, status: 'Pending', items });
    setBusy(false); if (error) setMessage(`Could not place order: ${error.message}`); else { setCart([]); setMessage('Order recorded. Payment has not been processed.'); }
  };
  const logout = async () => { await supabase.auth.signOut(); setIsAdmin(false); navigate('/'); };

  if (!isSupabaseConfigured) return <main className="account-page-shell"><section className="account-card"><h2>Supabase setup needed</h2><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.</p></section></main>;

  return <div className="app-shell">
    <header className="topbar"><button className="brand-block brand-button" onClick={() => navigate('/')} aria-label="Everything by Ada home"><img className="brand-logo" src="/brand-mark.svg" alt="Everything by Ada — Look Good, Feel Good, Be You" /></button>
      <nav className="main-nav" aria-label="Main navigation"><button className="nav-link" onClick={() => navigate('/')}>Home / Shop</button><button className="nav-link" onClick={() => navigate('/account')}>Account</button>{isAdmin && <button className="nav-link" onClick={() => navigate('/admin')}>Admin</button>}</nav>
      <div className="header-actions"><button className="cart-btn" onClick={() => document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })}>Cart <strong>{cartCount}</strong></button></div>
    </header>
    {message && <div className="auth-error" role="status">{message}</div>}
    {view === 'admin' ? (!isAdmin ? <main className="admin-login-shell"><section className="admin-login-card"><span className="mini-label">Restricted area</span><h2>Admin dashboard login</h2><form className="admin-login-form" onSubmit={signIn}><label>Email<input type="email" required value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></label><label>Password<input type="password" required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></label><button className="primary-admin-btn" disabled={busy}>Sign in</button></form></section></main> : <main className="admin-dashboard-shell">
      <header className="admin-topbar"><div><span className="admin-badge">Supabase admin</span><h1>Marketplace dashboard</h1></div><div className="admin-topbar-actions"><button className="ghost-admin-btn" onClick={() => navigate('/')}>View storefront</button><button className="danger-admin-btn" onClick={logout}>Log out</button></div></header>
      <section className="admin-grid"><div className="admin-panel-card"><div className="panel-header-row"><h2>{editingId ? 'Edit product' : 'Add product'}</h2></div><form className="product-form" onSubmit={saveProduct}>
        <label>Product name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Category<input required list="category-options" value={form.category} onChange={(e) => { setForm({ ...form, category: e.target.value }); setCategorySpecial(Boolean(categories.find((item) => item.name === e.target.value)?.is_special)); }} placeholder="Type a category" /><datalist id="category-options">{categories.map((item) => <option key={item.name} value={item.name} />)}</datalist></label>
        <div className="two-col-inputs"><label>Price<input type="number" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label><label>Old price<input type="number" min="0" value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} /></label></div>
        <label>Stock<input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
        <label className="upload-field">Product photo<input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /><small>{imageFile?.name || (form.image ? 'Current photo will be kept unless you choose another.' : 'Upload an image from your device (max 5 MB).')}</small></label>
        {imageFile && <img className="upload-preview" src={URL.createObjectURL(imageFile)} alt="Selected product preview" />}
        <label>Feature / highlight<input value={form.feature} onChange={(e) => setForm({ ...form, feature: e.target.value })} /></label><label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="toggle-row"><input type="checkbox" checked={form.best_seller} onChange={(e) => setForm({ ...form, best_seller: e.target.checked })} /><span>Feature as a Best Seller</span></label>
        <label className="toggle-row"><input type="checkbox" checked={categorySpecial} onChange={(e) => setCategorySpecial(e.target.checked)} /><span>Show this category as a special category</span></label>
        <div className="product-form-actions"><button className="primary-admin-btn" disabled={busy}>{editingId ? 'Update product' : 'Save product'}</button>{editingId && <button type="button" className="secondary-admin-btn" onClick={() => { setEditingId(null); setForm(emptyProduct); setImageFile(null); }}>Cancel</button>}</div>
      </form></div><section className="admin-panel-card inventory-panel"><div className="panel-header-row"><h2>Inventory ({products.length})</h2></div><div className="order-list">{products.map((product) => <article className="order-row" key={product.id}><img className="admin-product-thumb" src={product.image || '/brand-mark.svg'} alt="" /><div><strong>{product.name}</strong><p>{product.category}{product.best_seller ? ' · Best Seller' : ''}</p></div><span>{formatPrice(product.price)}</span><div className="row-actions"><button className="row-edit-btn" onClick={() => editProduct(product)}>Edit</button><button className="row-delete-btn" onClick={() => deleteProduct(product.id)}>Remove</button></div></article>)}</div></section></section>
    </main>) : view === 'account' ? <main className="account-page-shell"><section className="account-card"><span className="mini-label">Your account</span><h2>{user ? 'Signed in' : 'Sign in to your account'}</h2>{user ? <><p>{user.email}</p><button className="secondary-btn" onClick={logout}>Sign out</button></> : <form className="admin-login-form" onSubmit={signIn}><label>Email<input type="email" required value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></label><label>Password<input type="password" required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></label><button className="primary-btn" disabled={busy}>Sign in</button><p>New customers can create an account through the store's Supabase authentication setup.</p></form>}</section></main> : <main>
      <section className="hero"><div className="hero-copy"><div className="badge">Premium wellness &amp; beauty</div><h1>Look good.<br /><span>Feel good.</span><br />Be you.</h1><p>Discover products designed to support your wellness and body goals.</p><div className="cta-row"><button className="primary-btn" onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}>Shop Now</button><button className="secondary-btn" onClick={() => { setSelectedCategory('All'); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore products</button></div><div className="stat-row"><div><strong>{products.length}+</strong><span>Curated products</span></div><div><strong>Quality</strong><span>Beauty &amp; wellness</span></div><div><strong>Every day</strong><span>Feel your best</span></div></div></div>
        {featured ? <section className="featured-seller" aria-label="Best seller spotlight"><button className="featured-click" onClick={() => setSelectedProduct(featured)} aria-label={`View ${featured.name}`}><img src={featured.image || '/brand-mark.svg'} alt={featured.name} /><span className="best-seller-pill">★ Best Seller</span><span className="featured-caption"><small>{featured.category}</small><strong>{featured.name}</strong><span>{formatPrice(featured.price)} · View details →</span></span></button>{bestSellers.length > 1 && <div className="carousel-controls"><button onClick={() => setFeaturedIndex((featuredIndex - 1 + bestSellers.length) % bestSellers.length)} aria-label="Previous best seller">‹</button><span>{(featuredIndex % bestSellers.length) + 1} / {bestSellers.length}</span><button onClick={() => setFeaturedIndex((featuredIndex + 1) % bestSellers.length)} aria-label="Next best seller">›</button></div>}</section> : <div className="hero-logo-card"><img src="/brand-mark.svg" alt="Everything by Ada" /></div>}
      </section>
      {specialCategories.length > 0 && <section className="special-category-section"><div className="section-heading"><div><span className="mini-label">Explore by interest</span><h3>Special categories</h3></div></div><div className="special-category-grid">{specialCategories.map((category) => <button key={category.name} className="special-category-card" onClick={() => { setSelectedCategory(category.name); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="category-icon" aria-hidden="true">✦</span><strong>{category.name}</strong><span>Shop collection →</span></button>)}</div></section>}
      <section className="marketplace" id="shop"><div className="section-heading"><div><span className="mini-label">Top picks</span><h3>Marketplace products</h3></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" /></div><div className="filter-row"><button className={selectedCategory === 'All' ? 'filter-chip active' : 'filter-chip'} onClick={() => setSelectedCategory('All')}>All</button>{categories.map((category) => <button key={category.name} className={selectedCategory === category.name ? 'filter-chip active' : 'filter-chip'} onClick={() => setSelectedCategory(category.name)}>{category.name}{category.is_special ? ' ✦' : ''}</button>)}</div>
        <div className="shop-layout"><div className="product-grid">{visibleProducts.map((product) => <article className="product-card clickable-product" key={product.id} role="button" tabIndex="0" onClick={() => setSelectedProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedProduct(product); } }}><div className="product-image-wrap"><img src={product.image || '/brand-mark.svg'} alt={product.name} />{product.best_seller && <span className="sale-tag">Best Seller</span>}</div><div className="product-info"><div className="meta-row"><span>{product.category}</span><span>{product.feature}</span></div><h4>{product.name}</h4>{product.description && <p>{product.description}</p>}<div className="price-row"><strong>{formatPrice(product.price)}</strong>{product.oldPrice > product.price && <span>{formatPrice(product.oldPrice)}</span>}</div><button className="add-btn" onClick={(event) => { event.stopPropagation(); changeCart(product, 1); }}>Add to cart</button></div></article>)}</div>
          <aside className="cart-panel" id="cart"><div className="section-heading compact"><h3>Cart ({cartCount})</h3></div>{cart.length ? cart.map((item) => <div className="cart-item" key={item.id}><strong>{item.name}</strong><div className="cart-controls"><button onClick={() => changeCart(item, -1)} aria-label={`Remove one ${item.name}`}>−</button><span>{item.qty}</span><button onClick={() => changeCart(item, 1)} aria-label={`Add one ${item.name}`}>+</button></div><strong>{formatPrice(item.price * item.qty)}</strong></div>) : <p className="empty-cart">Your cart is waiting for something lovely.</p>}<div className="checkout-box"><div className="checkout-row total"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div><button className="primary-btn full-width" disabled={busy || !cart.length} onClick={placeOrder}>Place order</button><small>Payment is not processed on this site.</small></div></aside></div>
      </section></main>}
    <footer className="site-footer"><div className="footer-brand-block"><img className="footer-logo" src="/brand-mark.svg" alt="Everything by Ada" /></div><div className="footer-links"><button className="footer-link" onClick={() => navigate('/')}>Shop</button><button className="footer-link" onClick={() => navigate('/account')}>Account</button><button className="footer-link" onClick={() => navigate('/admin')}>Admin</button></div></footer>
    {selectedProduct && <div className="product-modal-backdrop" role="presentation" onClick={() => setSelectedProduct(null)}><section className="product-detail-modal" role="dialog" aria-modal="true" aria-label={selectedProduct.name} onClick={(event) => event.stopPropagation()}><button className="product-modal-close" onClick={() => setSelectedProduct(null)} aria-label="Close product details">×</button><img src={selectedProduct.image || '/brand-mark.svg'} alt={selectedProduct.name} /><div className="product-detail-copy">{selectedProduct.best_seller && <span className="best-seller-pill">★ Best Seller</span>}<span className="mini-label">{selectedProduct.category}</span><h2>{selectedProduct.name}</h2><p>{selectedProduct.description || selectedProduct.feature}</p><div className="price-row"><strong>{formatPrice(selectedProduct.price)}</strong>{selectedProduct.oldPrice > selectedProduct.price && <span>{formatPrice(selectedProduct.oldPrice)}</span>}</div><button className="primary-btn" onClick={() => { changeCart(selectedProduct, 1); setSelectedProduct(null); }}>Add to cart</button></div></section></div>}
  </div>;
}
