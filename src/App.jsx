import { useEffect, useMemo, useState } from 'react';
import { AdminDashboard } from './admin/AdminDashboard';

const categories = ['All', 'Weight Loss', 'Weight Gain', 'Body Care', 'Detox', 'Slimming'];
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'everythingbyada123';

const productCatalog = [
  {
    id: 1,
    name: 'Ultra Sculpt Body Wrap',
    category: 'Weight Loss',
    price: 49,
    oldPrice: 79,
    rating: 4.8,
    reviews: 324,
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    feature: 'Belly sculpt',
    stock: 18,
  },
  {
    id: 2,
    name: 'Curvy Boost Capsules',
    category: 'Weight Gain',
    price: 35,
    oldPrice: 58,
    rating: 4.7,
    reviews: 280,
    image:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    feature: 'Natural curve support',
    stock: 24,
  },
  {
    id: 3,
    name: 'LipoGlow Detox Tea',
    category: 'Detox',
    price: 29,
    oldPrice: 46,
    rating: 4.9,
    reviews: 410,
    image:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    feature: 'Daily cleanse',
    stock: 32,
  },
  {
    id: 4,
    name: 'Silk Shine Skin Oil',
    category: 'Body Care',
    price: 42,
    oldPrice: 60,
    rating: 4.8,
    reviews: 210,
    image:
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80',
    feature: 'Skin renewal',
    stock: 26,
  },
  {
    id: 5,
    name: 'Waist Slim Belt Pro',
    category: 'Slimming',
    price: 54,
    oldPrice: 83,
    rating: 4.6,
    reviews: 165,
    image:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
    feature: 'Posture support',
    stock: 12,
  },
  {
    id: 6,
    name: 'SmoothFit Recovery Kit',
    category: 'Body Care',
    price: 67,
    oldPrice: 99,
    rating: 4.9,
    reviews: 492,
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    feature: 'Confidence boost',
    stock: 15,
  },
];

const initialOrders = [
  { id: '#1042', customer: 'Amara O.', total: 128, status: 'Paid' },
  { id: '#1043', customer: 'Lola K.', total: 86, status: 'Packed' },
  { id: '#1044', customer: 'Tina D.', total: 144, status: 'Shipped' },
  { id: '#1045', customer: 'Mimi A.', total: 68, status: 'Paid' },
];

const benefits = [
  'Premium wellness products',
  'Fast nationwide delivery',
  'Expert guidance from real specialists',
  'Secure checkout and trusted payment',
];

const dashboardCards = [
  {
    title: 'Bigger and firmer boobs',
    text: 'Enhance your bust size, improve firmness, and boost confidence.',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Butt/hips enlargement',
    text: 'Grow and lift your butt naturally for a curvier shape.',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Flat tummy',
    text: 'Burn belly fat, reduce bloating, and achieve a flatter waistline.',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Weight loss',
    text: 'Lose weight the healthy way and feel lighter, stronger, and more confident.',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Weight gain',
    text: 'Gain healthy weight, build curves, and improve your overall body size.',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Infection cure',
    text: 'Help cleanse your system, fight infections, and promote overall wellness.',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
];

function App() {
  const [currentView, setCurrentView] = useState('store');
  const [products, setProducts] = useState(productCatalog);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    password: '',
    mode: 'login',
  });
  const [customerStatus, setCustomerStatus] = useState('');
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    payment: 'Card',
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('everythingbyada_admin') === 'true';
  });
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('everythingbyada_customer') === 'true';
  });
  const [customerName, setCustomerName] = useState(() => {
    if (typeof window === 'undefined') return 'Guest';
    return localStorage.getItem('everythingbyada_customer_name') || 'Guest';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('everythingbyada_admin', String(isAdminLoggedIn));
    }
  }, [isAdminLoggedIn]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('everythingbyada_customer', String(isCustomerLoggedIn));
      localStorage.setItem('everythingbyada_customer_name', customerName);
    }
  }, [isCustomerLoggedIn, customerName]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query || product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal === 0 ? 0 : subtotal >= 120 ? 0 : 12;
  const total = subtotal + shipping;
  const totalRevenue = initialOrders.reduce((sum, order) => sum + order.total, 0);

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        const nextQty = existing.qty + 1;
        const stockLimit = product.stock ?? 100;
        if (nextQty > stockLimit) {
          return current;
        }
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: nextQty } : item,
        );
      }

      const stockLimit = product.stock ?? 100;
      return [...current, { ...product, qty: 1, stock: stockLimit }];
    });
  };

  const updateCartQty = (id, direction) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item;
          const nextQty = Math.max(0, item.qty + direction);
          return { ...item, qty: nextQty };
        })
        .filter((item) => item.qty > 0),
    );
  };

  const handleLogin = (event) => {
    event.preventDefault();
    if (
      adminForm.username.trim() === ADMIN_USERNAME &&
      adminForm.password === ADMIN_PASSWORD
    ) {
      setIsAdminLoggedIn(true);
      setCurrentView('admin');
      setAuthError('');
      setAdminForm({ username: '', password: '' });
      return;
    }

    setAuthError('Invalid admin username or password.');
  };

  const handleAdminButton = () => {
    setCurrentView('admin');
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentView('store');
    setAuthError('');
  };

  const handleCustomerSubmit = (event) => {
    event.preventDefault();

    if (!customerForm.email.trim() || !customerForm.password.trim()) {
      setCustomerStatus('Please enter a valid email and password.');
      return;
    }

    if (customerForm.mode === 'register' && !customerForm.name.trim()) {
      setCustomerStatus('Please enter your full name to create an account.');
      return;
    }

    const nextName =
      (customerForm.name || customerForm.email.split('@')[0] || 'Customer').trim();

    setCustomerName(nextName);
    setIsCustomerLoggedIn(true);
    setCustomerStatus(
      customerForm.mode === 'register'
        ? `Your account is ready, ${nextName}.`
        : `Welcome back, ${nextName}!`,
    );
    setCustomerForm({ name: '', email: '', password: '', mode: customerForm.mode });
    setShowAuthModal(false);
  };

  const handleCustomerLogout = () => {
    setIsCustomerLoggedIn(false);
    setCustomerName('Guest');
    setCustomerStatus('You have signed out.');
    setShowAuthModal(false);
  };

  const handleCheckoutSubmit = (event) => {
    event.preventDefault();

    if (!cart.length) {
      setCustomerStatus('Your cart is empty.');
      return;
    }

    if (
      !checkoutForm.name.trim() ||
      !checkoutForm.email.trim() ||
      !checkoutForm.address.trim() ||
      !checkoutForm.city.trim()
    ) {
      setCustomerStatus('Please complete all checkout details to place your order.');
      return;
    }

    setCart([]);
    setShowCheckout(false);
    setCurrentView('store');
    setCustomerStatus(`Order placed for ${checkoutForm.name}. We will contact you soon.`);
    setCheckoutForm({ name: '', email: '', address: '', city: '', payment: 'Card' });
  };

  const renderAdminLogin = () => (
    <main className="admin-login-shell">
      <div className="admin-login-card">
        <span className="mini-label">Restricted area</span>
        <h2>Admin dashboard login</h2>
        <p>Only the admin account can access product management and orders.</p>

        <form className="admin-login-form" onSubmit={handleLogin}>
          <label>
            Username
            <input
              type="text"
              value={adminForm.username}
              onChange={(event) =>
                setAdminForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              placeholder="admin"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={adminForm.password}
              onChange={(event) =>
                setAdminForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Enter password"
            />
          </label>

          {authError && <div className="auth-error">{authError}</div>}

          <button className="primary-btn full-width" type="submit">
            Login to dashboard
          </button>
        </form>
      </div>
    </main>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="logo-ring">
            <span>EB</span>
          </div>
          <div className="brand-copy">
            <strong>Everything</strong>
            <span>bodiedbyAda</span>
            <em>Body Glow</em>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button className="nav-link" onClick={() => setCurrentView('store')}>Home</button>
          <button className="nav-link" onClick={() => setCurrentView('store')}>Shop</button>
          <button className="nav-link" onClick={() => setCurrentView('store')}>Goals</button>
          <button className="nav-link" onClick={handleAdminButton}>Admin</button>
          <button className="nav-link" onClick={() => setCurrentView('store')}>Contact</button>
        </nav>

        <div className="header-actions">
          {isCustomerLoggedIn ? (
            <button className="ghost-btn" onClick={handleCustomerLogout}>
              Hi, {customerName.split(' ')[0] || 'Customer'}
            </button>
          ) : (
            <button className="ghost-btn" onClick={() => setShowAuthModal(true)}>
              Sign In
            </button>
          )}
          <button className="cart-btn" aria-label="Shopping cart" onClick={() => setShowCheckout(true)}>
            <span>Cart</span>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      {customerStatus && (
        <div className="status-banner" role="status">
          {customerStatus}
        </div>
      )}

      {showAuthModal && (
        <div className="auth-modal" role="dialog" aria-modal="true">
          <div className="auth-card">
            <div className="auth-header">
              <h3>{customerForm.mode === 'login' ? 'Customer sign in' : 'Create account'}</h3>
              <button type="button" className="close-btn" onClick={() => setShowAuthModal(false)}>
                ×
              </button>
            </div>

            <form className="auth-form" onSubmit={handleCustomerSubmit}>
              {customerForm.mode === 'register' && (
                <label>
                  Full name
                  <input
                    type="text"
                    value={customerForm.name}
                    onChange={(event) =>
                      setCustomerForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Jane Doe"
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(event) =>
                    setCustomerForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={customerForm.password}
                  onChange={(event) =>
                    setCustomerForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Enter password"
                />
              </label>

              <button type="submit" className="primary-btn full-width">
                {customerForm.mode === 'login' ? 'Login' : 'Register'}
              </button>
            </form>

            <button
              type="button"
              className="text-link"
              onClick={() =>
                setCustomerForm((current) => ({
                  ...current,
                  mode: current.mode === 'login' ? 'register' : 'login',
                }))
              }
            >
              {customerForm.mode === 'login'
                ? 'Need an account? Create one'
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="checkout-modal" role="dialog" aria-modal="true">
          <div className="checkout-card">
            <div className="auth-header">
              <h3>Secure checkout</h3>
              <button type="button" className="close-btn" onClick={() => setShowCheckout(false)}>
                ×
              </button>
            </div>

            <div className="checkout-layout">
              <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
                <label>
                  Full name
                  <input
                    type="text"
                    value={checkoutForm.name}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Jane Doe"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={checkoutForm.email}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  Delivery address
                  <input
                    type="text"
                    value={checkoutForm.address}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, address: event.target.value }))
                    }
                    placeholder="123 Main Street"
                  />
                </label>
                <label>
                  City
                  <input
                    type="text"
                    value={checkoutForm.city}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, city: event.target.value }))
                    }
                    placeholder="Lagos"
                  />
                </label>
                <label>
                  Payment method
                  <select
                    value={checkoutForm.payment}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, payment: event.target.value }))
                    }
                  >
                    <option value="Card">Card</option>
                    <option value="Bank transfer">Bank transfer</option>
                    <option value="Cash on delivery">Cash on delivery</option>
                  </select>
                </label>

                <button type="submit" className="primary-btn full-width">
                  Place order
                </button>
              </form>

              <aside className="checkout-summary">
                <h4>Order summary</h4>
                {cart.length === 0 ? (
                  <p className="empty-cart">Your cart is empty.</p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.id} className="checkout-item-row">
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.qty} × ${item.price}
                          </span>
                        </div>
                        <strong>${item.price * item.qty}</strong>
                      </div>
                    ))}
                    <div className="checkout-divider" />
                    <div className="checkout-totals">
                      <span>Subtotal</span>
                      <strong>${subtotal}</strong>
                    </div>
                    <div className="checkout-totals">
                      <span>Shipping</span>
                      <strong>{shipping === 0 ? 'Free' : `$${shipping}`}</strong>
                    </div>
                    <div className="checkout-totals total">
                      <span>Total</span>
                      <strong>${total}</strong>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      {currentView === 'admin' && !isAdminLoggedIn ? (
        renderAdminLogin()
      ) : currentView === 'admin' ? (
        <AdminDashboard
          products={products}
          setProducts={setProducts}
          orders={initialOrders}
          totalRevenue={totalRevenue}
          cartCount={cartCount}
          onBackToStore={() => setCurrentView('store')}
          onLogout={handleLogout}
        />
      ) : (
        <main>
          <section className="hero" id="home">
            <div className="hero-copy">
              <div className="badge">Premium wellness & beauty</div>
              <h1>
                What are <span>your</span> body goals?
              </h1>
              <p>
                Discover premium products designed to support weight goals, body confidence,
                and a healthier lifestyle for every customer.
              </p>

              <div className="cta-row">
                <button className="primary-btn" onClick={() => setCurrentView('store')}>Shop Now</button>
                <button className="secondary-btn" onClick={() => setShowCheckout(true)}>Checkout</button>
              </div>

              <div className="stat-row">
                <div>
                  <strong>12K+</strong>
                  <span>Happy shoppers</span>
                </div>
                <div>
                  <strong>4.9/5</strong>
                  <span>Customer rating</span>
                </div>
                <div>
                  <strong>48h</strong>
                  <span>Fast delivery</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-card main">
                <div className="card-badge">Best Seller</div>
                <img
                  src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80"
                  alt="Woman posing with body glow product"
                />
              </div>
              <div className="visual-card side top">
                <span>Curves</span>
                <strong>Natural boost</strong>
              </div>
              <div className="visual-card side bottom">
                <span>Weight care</span>
                <strong>Daily essentials</strong>
              </div>
            </div>
          </section>

          <section className="goal-banner" id="goals">
            <h2>
              WHAT ARE <span>YOUR</span> BODY GOALS?
            </h2>
            <p>We have the right products to help you achieve them!</p>
          </section>

          <section className="goal-grid">
            {dashboardCards.map((card) => (
              <article className="goal-card" key={card.title}>
                <div className="goal-header">{card.title}</div>
                <img src={card.image} alt={card.title} />
                <p>{card.text}</p>
              </article>
            ))}
          </section>

          <section className="marketplace" id="shop">
            <div className="section-heading">
              <div>
                <span className="mini-label">Top picks</span>
                <h3>Marketplace best sellers</h3>
              </div>
              <div className="shop-controls">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                />
              </div>
            </div>

            <div className="filter-row" aria-label="Product categories">
              {categories.map((category) => (
                <button
                  key={category}
                  className={selectedCategory === category ? 'filter-chip active' : 'filter-chip'}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="shop-layout">
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="product-image-wrap">
                      <span className="sale-tag">
                        -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                      </span>
                      <img src={product.image} alt={product.name} />
                    </div>
                    <div className="product-info">
                      <div className="meta-row">
                        <span>{product.category}</span>
                        <span>{product.stock ?? 0} left</span>
                      </div>
                      <h4>{product.name}</h4>
                      <div className="rating-row">
                        <strong>★★★★★</strong>
                        <span>
                          {product.rating} ({product.reviews})
                        </span>
                      </div>
                      <div className="price-row">
                        <strong>${product.price}</strong>
                        <span>${product.oldPrice}</span>
                      </div>
                      <div className="stock-row">
                        <span>In stock</span>
                        <strong>{product.stock ?? 0}</strong>
                      </div>
                      <button className="add-btn" onClick={() => addToCart(product)}>
                        Add to cart
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="cart-panel">
                <div className="section-heading compact">
                  <h3>Cart</h3>
                </div>

                {cart.length === 0 ? (
                  <p className="empty-cart">Your cart is empty.</p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div>
                          <strong>{item.name}</strong>
                          <p>{item.category}</p>
                        </div>
                        <div className="cart-controls">
                          <button onClick={() => updateCartQty(item.id, -1)}>-</button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateCartQty(item.id, 1)}>+</button>
                        </div>
                        <strong>${item.price * item.qty}</strong>
                      </div>
                    ))}

                    <div className="checkout-box">
                      <div className="checkout-row">
                        <span>Subtotal</span>
                        <strong>${subtotal}</strong>
                      </div>
                      <div className="checkout-row">
                        <span>Shipping</span>
                        <strong>{shipping === 0 ? 'Free' : `$${shipping}`}</strong>
                      </div>
                      <div className="checkout-row total">
                        <span>Total</span>
                        <strong>${total}</strong>
                      </div>
                      <button className="primary-btn full-width" onClick={() => setShowCheckout(true)}>
                        Checkout
                      </button>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </section>

          <section className="feature-band" id="about">
            <div className="feature-copy">
              <span className="mini-label">Why choose us</span>
              <h3>Body glow solutions trusted by women who want results</h3>
            </div>
            <div className="benefits-list">
              {benefits.map((benefit) => (
                <div className="benefit-item" key={benefit}>
                  <span>✓</span>
                  <p>{benefit}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="testimonial-wrap">
            <div className="testimonial-card">
              <span className="mini-label">Customer love</span>
              <p>
                “The products made me feel more confident and helped me stay consistent with my
                health goals. The ordering process was easy and fast.”
              </p>
              <div className="person">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80"
                  alt="Happy customer"
                />
                <div>
                  <strong>Amara O.</strong>
                  <span>Verified buyer</span>
                </div>
              </div>
            </div>

            <div className="newsletter-card">
              <span className="mini-label">Stay updated</span>
              <h3>Get exclusive deals and wellness tips</h3>
              <form>
                <input type="email" placeholder="Your email address" />
                <button type="button" className="primary-btn">Join now</button>
              </form>
            </div>
          </section>
        </main>
      )}

      <footer className="site-footer" id="contact">
        <div className="footer-brand-block">
          <div className="logo-ring small">
            <span>EB</span>
          </div>
          <div>
            <strong>Everything</strong>
            <span>bodiedbyAda</span>
          </div>
        </div>

        <div className="footer-links">
          <button className="footer-link" onClick={() => setCurrentView('store')}>Home</button>
          <button className="footer-link" onClick={() => setCurrentView('store')}>Shop</button>
          <button className="footer-link" onClick={handleAdminButton}>Admin</button>
          <button className="footer-link" onClick={() => setCurrentView('store')}>Support</button>
        </div>

        <div className="contact-box">
          <p>CONTACT US</p>
          <strong>09068192327</strong>
          <span>@everythingbodiedbyada01</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
