import { useEffect, useMemo, useState } from 'react';
import { AdminDashboard } from './admin/AdminDashboard';

const DEFAULT_CATEGORIES = ['Weight Loss', 'Weight Gain', 'Body Care', 'Detox', 'Slimming'];
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'everythingbyada123';

const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;

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
    description:
      'A premium body wrap blend designed to support contouring, smooth firmness, and daily confidence in your body goals.',
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
    description:
      'A nutrient-rich formula to help support healthy weight gain, energy, and fuller body curves without harsh additives.',
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
    description:
      'Gentle herbal detox support to help improve digestion, reduce bloating, and refresh your daily wellness routine.',
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
    description:
      'Deeply nourishing body oil that brings softness, skin glow, and hydration for a radiant, healthy-looking finish.',
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
    description:
      'A supportive slimming belt designed for comfort, waist shaping, and daily confidence while staying active.',
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
    description:
      'A complete recovery and self-care kit created for post-workout care, skin softness, and a more confident everyday glow.',
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

const defaultProfile = {
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  city: '',
};

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function routeFromPath(pathname) {
  const cleanPath = pathname || '/';
  if (cleanPath.startsWith('/admin')) return 'admin';
  if (cleanPath.startsWith('/account')) return 'account';
  if (cleanPath.startsWith('/product/')) return 'product';
  return 'store';
}

function App() {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window === 'undefined') return 'store';
    return routeFromPath(window.location.pathname);
  });
  const [selectedProductId, setSelectedProductId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const match = window.location.pathname.match(/^\/product\/(\d+)$/);
    return match ? Number(match[1]) : null;
  });
  const [products, setProducts] = useState(() =>
    readStorage('everythingbyada_products', productCatalog),
  );
  const [categories, setCategories] = useState(() =>
    readStorage('everythingbyada_categories', DEFAULT_CATEGORIES),
  );
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('everythingbyada_admin') === 'true';
  });
  const [accountMode, setAccountMode] = useState('login');
  const [customerProfile, setCustomerProfile] = useState(() =>
    readStorage('everythingbyada_customer', null),
  );
  const [customerForm, setCustomerForm] = useState(() =>
    readStorage('everythingbyada_customer', defaultProfile),
  );
  const [accountMessage, setAccountMessage] = useState('');

  const categoryFilters = useMemo(() => ['All', ...categories], [categories]);

  useEffect(() => {
    writeStorage('everythingbyada_products', products);
  }, [products]);

  useEffect(() => {
    writeStorage('everythingbyada_categories', categories);
  }, [categories]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('everythingbyada_admin', String(isAdminLoggedIn));
    }
  }, [isAdminLoggedIn]);

  useEffect(() => {
    if (customerProfile) {
      writeStorage('everythingbyada_customer', customerProfile);
    }
  }, [customerProfile]);

  useEffect(() => {
    const syncViewFromLocation = () => {
      const nextView = routeFromPath(window.location.pathname);
      setCurrentView(nextView);
      if (nextView === 'product') {
        const match = window.location.pathname.match(/^\/product\/(\d+)$/);
        setSelectedProductId(match ? Number(match[1]) : null);
      } else if (nextView !== 'product') {
        setSelectedProductId(null);
      }
    };

    window.addEventListener('popstate', syncViewFromLocation);
    syncViewFromLocation();

    return () => window.removeEventListener('popstate', syncViewFromLocation);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalRevenue = initialOrders.reduce((sum, order) => sum + order.total, 0);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products
      .filter(
        (product) => product.category === selectedProduct.category && product.id !== selectedProduct.id,
      )
      .slice(0, 3);
  }, [products, selectedProduct]);

  const navigateTo = (path) => {
    const safePath = path || '/';
    window.history.pushState({}, '', safePath);
    const nextView = routeFromPath(safePath);
    setCurrentView(nextView);
    if (nextView === 'product') {
      const match = safePath.match(/^\/product\/(\d+)$/);
      setSelectedProductId(match ? Number(match[1]) : null);
    } else {
      setSelectedProductId(null);
    }
  };

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id, direction) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(0, item.qty + direction) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const requireCustomerAuth = () => {
    if (!customerProfile) {
      setAccountMode('login');
      setAccountMessage('Please sign in or create an account to complete checkout.');
      navigateTo('/account');
      return false;
    }

    if (!cart.length) {
      setAccountMessage('Your cart is empty. Please add a product before checkout.');
      return false;
    }

    return true;
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
      navigateTo('/admin');
      return;
    }

    setAuthError('Invalid admin username or password.');
  };

  const handleAdminButton = () => {
    navigateTo('/admin');
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    navigateTo('/');
    setAuthError('');
  };

  const handleAccountSubmit = (event) => {
    event.preventDefault();
    const trimmedName = customerForm.name.trim();
    const trimmedEmail = customerForm.email.trim();
    const trimmedPassword = customerForm.password.trim();

    if (accountMode === 'register') {
      if (!trimmedName || !trimmedEmail || !trimmedPassword) {
        setAccountMessage('Please complete your name, email, and password.');
        return;
      }

      const newProfile = {
        ...customerForm,
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        phone: customerForm.phone.trim(),
        address: customerForm.address.trim(),
        city: customerForm.city.trim(),
      };

      setCustomerProfile(newProfile);
      setCustomerForm(newProfile);
      setAccountMessage('Account created successfully.');
      setAccountMode('profile');
      return;
    }

    if (!trimmedEmail || !trimmedPassword) {
      setAccountMessage('Please enter your email and password.');
      return;
    }

    const savedProfile = readStorage('everythingbyada_customer', null);
    if (!savedProfile) {
      setAccountMessage('No account found. Please create an account first.');
      return;
    }

    if (
      savedProfile.email.toLowerCase() === trimmedEmail.toLowerCase() &&
      savedProfile.password === trimmedPassword
    ) {
      setCustomerProfile(savedProfile);
      setCustomerForm(savedProfile);
      setAccountMessage('Welcome back!');
      setAccountMode('profile');
      return;
    }

    setAccountMessage('Incorrect email or password.');
  };

  const handleAccountLogout = () => {
    localStorage.removeItem('everythingbyada_customer');
    setCustomerProfile(null);
    setCustomerForm(defaultProfile);
    setAccountMode('login');
    setAccountMessage('You have been logged out.');
  };

  const handleCheckout = () => {
    if (!requireCustomerAuth()) {
      return;
    }

    setAccountMessage('Checkout started.');
    window.alert('Checkout is ready. Please continue with your saved account details.');
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

  const renderAccountPage = () => {
    const isLoggedIn = Boolean(customerProfile);

    return (
      <main className="account-page-shell">
        <section className="account-card">
          <div className="account-header-row">
            <div>
              <span className="mini-label">My account</span>
              <h2>{isLoggedIn ? 'Your profile' : 'Welcome back'}</h2>
            </div>
            {isLoggedIn && (
              <button className="secondary-btn" type="button" onClick={handleAccountLogout}>
                Log out
              </button>
            )}
          </div>

          {!isLoggedIn ? (
            <div className="account-form-switch">
              <button
                type="button"
                className={accountMode === 'login' ? 'switch-btn active' : 'switch-btn'}
                onClick={() => setAccountMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={accountMode === 'register' ? 'switch-btn active' : 'switch-btn'}
                onClick={() => setAccountMode('register')}
              >
                Create account
              </button>
            </div>
          ) : null}

          {isLoggedIn && customerProfile ? (
            <div className="profile-summary">
              <div className="profile-badge">Customer profile</div>
              <h3>{customerProfile.name}</h3>
              <p>{customerProfile.email}</p>
              <ul>
                <li>
                  <strong>Phone:</strong> {customerProfile.phone || 'Not set'}
                </li>
                <li>
                  <strong>Address:</strong> {customerProfile.address || 'Not set'}
                </li>
                <li>
                  <strong>City:</strong> {customerProfile.city || 'Not set'}
                </li>
              </ul>
            </div>
          ) : (
            <form className="account-form" onSubmit={handleAccountSubmit}>
              {accountMode === 'register' && (
                <label>
                  Full name
                  <input
                    type="text"
                    value={customerForm.name}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ada Okafor"
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(event) =>
                    setCustomerForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
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
                    setCustomerForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder={accountMode === 'register' ? 'Create a password' : 'Enter your password'}
                />
              </label>

              {accountMode === 'register' && (
                <>
                  <label>
                    Phone
                    <input
                      type="tel"
                      value={customerForm.phone}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="080-0000-0000"
                    />
                  </label>

                  <label>
                    Address
                    <input
                      type="text"
                      value={customerForm.address}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder="12 Market Road"
                    />
                  </label>

                  <label>
                    City
                    <input
                      type="text"
                      value={customerForm.city}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      placeholder="Lagos"
                    />
                  </label>
                </>
              )}

              {accountMessage && <div className="auth-error">{accountMessage}</div>}

              <button type="submit" className="primary-btn full-width">
                {accountMode === 'register' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          )}
        </section>
      </main>
    );
  };

  const renderProductDetail = () => {
    if (!selectedProduct) {
      return (
        <main className="product-detail-shell">
          <div className="product-not-found">
            <h2>Product not found</h2>
            <button className="primary-btn" type="button" onClick={() => navigateTo('/')}>
              Back to shop
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="product-detail-shell">
        <button className="back-link" type="button" onClick={() => navigateTo('/')}>
          ← Back to store
        </button>

        <section className="product-detail-card">
          <div className="product-detail-image-wrap">
            <img src={selectedProduct.image} alt={selectedProduct.name} />
          </div>

          <div className="product-detail-copy">
            <span className="mini-label">{selectedProduct.category}</span>
            <h2>{selectedProduct.name}</h2>
            <div className="rating-row detail-rating">
              <strong>★★★★★</strong>
              <span>
                {selectedProduct.rating} ({selectedProduct.reviews} reviews)
              </span>
            </div>

            <div className="price-row detail-price">
              <strong>{formatPrice(selectedProduct.price)}</strong>
              <span>{formatPrice(selectedProduct.oldPrice)}</span>
            </div>

            <p className="product-description">{selectedProduct.description}</p>

            <div className="detail-cta-row">
              <button className="primary-btn" type="button" onClick={() => addToCart(selectedProduct)}>
                Add to cart
              </button>
              <button className="secondary-btn" type="button" onClick={() => navigateTo('/')}>
                Continue shopping
              </button>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-products">
            <div className="section-heading compact">
              <h3>Related products</h3>
            </div>
            <div className="related-grid">
              {relatedProducts.map((product) => (
                <article
                  key={product.id}
                  className="product-card slim"
                  onClick={() => navigateTo(`/product/${product.id}`)}
                >
                  <div className="product-image-wrap">
                    <img src={product.image} alt={product.name} />
                  </div>
                  <div className="product-info">
                    <div className="meta-row">
                      <span>{product.category}</span>
                      <span>{product.feature}</span>
                    </div>
                    <h4>{product.name}</h4>
                    <div className="price-row">
                      <strong>{formatPrice(product.price)}</strong>
                      <span>{formatPrice(product.oldPrice)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  };

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
          <button type="button" className="nav-link" onClick={() => navigateTo('/')}>
            Home
          </button>
          <button type="button" className="nav-link" onClick={() => navigateTo('/')}>
            Shop
          </button>
          <button type="button" className="nav-link" onClick={() => navigateTo('/')}>
            Goals
          </button>
          <button type="button" className="nav-link" onClick={handleAdminButton}>
            Admin
          </button>
          <button type="button" className="nav-link" onClick={() => navigateTo('/account')}>
            Account
          </button>
        </nav>

        <div className="header-actions">
          <button type="button" className="ghost-btn" onClick={() => navigateTo('/account')}>
            {customerProfile ? 'Profile' : 'Sign In'}
          </button>
          <button type="button" className="cart-btn" aria-label="Shopping cart">
            <span>Cart</span>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      {currentView === 'admin' && !isAdminLoggedIn ? (
        renderAdminLogin()
      ) : currentView === 'admin' ? (
        <AdminDashboard
          products={products}
          setProducts={setProducts}
          categories={categories}
          setCategories={setCategories}
          orders={initialOrders}
          totalRevenue={totalRevenue}
          cartCount={cartCount}
          onBackToStore={() => navigateTo('/')}
          onLogout={handleLogout}
        />
      ) : currentView === 'account' ? (
        renderAccountPage()
      ) : currentView === 'product' ? (
        renderProductDetail()
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
                <button type="button" className="primary-btn" onClick={() => navigateTo('/')}>
                  Shop Now
                </button>
                <button type="button" className="secondary-btn">
                  Explore Deals
                </button>
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
                  <span>48 hours nationwide</span>
                </div>
                <div>
                  <strong>24h</strong>
                  <span>24 hours within Lagos</span>
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
              {categoryFilters.map((category) => (
                <button
                  key={category}
                  type="button"
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
                  <article
                    className="product-card"
                    key={product.id}
                    onClick={() => navigateTo(`/product/${product.id}`)}
                  >
                    <div className="product-image-wrap">
                      <span className="sale-tag">
                        -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                      </span>
                      <img src={product.image} alt={product.name} />
                    </div>
                    <div className="product-info">
                      <div className="meta-row">
                        <span>{product.category}</span>
                        <span>{product.feature}</span>
                      </div>
                      <h4>{product.name}</h4>
                      <div className="rating-row">
                        <strong>★★★★★</strong>
                        <span>
                          {product.rating} ({product.reviews})
                        </span>
                      </div>
                      <div className="price-row">
                        <strong>{formatPrice(product.price)}</strong>
                        <span>{formatPrice(product.oldPrice)}</span>
                      </div>
                      <button
                        type="button"
                        className="add-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(product);
                        }}
                      >
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
                          <button type="button" onClick={() => updateCartQty(item.id, -1)}>-</button>
                          <span>{item.qty}</span>
                          <button type="button" onClick={() => updateCartQty(item.id, 1)}>+</button>
                        </div>
                        <strong>{formatPrice(item.price * item.qty)}</strong>
                      </div>
                    ))}

                    <div className="checkout-box">
                      <div className="checkout-row">
                        <span>Subtotal</span>
                        <strong>{formatPrice(subtotal)}</strong>
                      </div>
                      <div className="checkout-row">
                        <span>Shipping</span>
                        <strong>Free</strong>
                      </div>
                      <div className="checkout-row total">
                        <span>Total</span>
                        <strong>{formatPrice(subtotal)}</strong>
                      </div>
                      <button type="button" className="primary-btn full-width" onClick={handleCheckout}>
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
                <button type="button" className="primary-btn">
                  Join now
                </button>
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
          <button type="button" className="footer-link" onClick={() => navigateTo('/')}>
            Home
          </button>
          <button type="button" className="footer-link" onClick={() => navigateTo('/')}>
            Shop
          </button>
          <button type="button" className="footer-link" onClick={handleAdminButton}>
            Admin
          </button>
          <button type="button" className="footer-link" onClick={() => navigateTo('/account')}>
            Account
          </button>
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
