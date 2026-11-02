import { useMemo, useState } from 'react';

const categories = ['All', 'Weight Loss', 'Weight Gain', 'Body Care', 'Detox', 'Slimming'];

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

const emptyProduct = {
  name: '',
  category: 'Weight Loss',
  price: '',
  oldPrice: '',
  image:
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  feature: '',
};

function App() {
  const [currentView, setCurrentView] = useState('store');
  const [products, setProducts] = useState(productCatalog);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [newProduct, setNewProduct] = useState(emptyProduct);

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
          item.id === id
            ? { ...item, qty: Math.max(0, item.qty + direction) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const deleteProduct = (id) => {
    setProducts((current) => current.filter((product) => product.id !== id));
  };

  const handleNewProductChange = (event) => {
    const { name, value } = event.target;
    setNewProduct((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const addProduct = (event) => {
    event.preventDefault();
    if (!newProduct.name.trim()) return;

    const product = {
      id: Date.now(),
      name: newProduct.name,
      category: newProduct.category,
      price: Number(newProduct.price) || 0,
      oldPrice: Number(newProduct.oldPrice) || Number(newProduct.price) || 0,
      rating: 4.8,
      reviews: 0,
      image: newProduct.image,
      feature: newProduct.feature || 'New arrival',
    };

    setProducts((current) => [product, ...current]);
    setNewProduct(emptyProduct);
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
          <button className="nav-link" onClick={() => setCurrentView('store')}>
            Home
          </button>
          <button className="nav-link" onClick={() => setCurrentView('store')}>
            Shop
          </button>
          <button className="nav-link" onClick={() => setCurrentView('store')}>
            Goals
          </button>
          <button className="nav-link" onClick={() => setCurrentView('admin')}>
            Admin
          </button>
          <button className="nav-link" onClick={() => setCurrentView('store')}>
            Contact
          </button>
        </nav>

        <div className="header-actions">
          <button className="ghost-btn">Sign In</button>
          <button className="cart-btn" aria-label="Shopping cart">
            <span>Cart</span>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      {currentView === 'admin' ? (
        <main className="admin-panel">
          <section className="admin-header">
            <div>
              <span className="mini-label">Admin center</span>
              <h2>Marketplace dashboard</h2>
            </div>
            <button className="primary-btn" onClick={() => setCurrentView('store')}>
              View storefront
            </button>
          </section>

          <section className="stats-grid">
            <article className="stat-card">
              <span>Total revenue</span>
              <strong>${totalRevenue}</strong>
            </article>
            <article className="stat-card">
              <span>Orders</span>
              <strong>{initialOrders.length}</strong>
            </article>
            <article className="stat-card">
              <span>Products</span>
              <strong>{products.length}</strong>
            </article>
            <article className="stat-card">
              <span>Cart items</span>
              <strong>{cartCount}</strong>
            </article>
          </section>

          <section className="admin-grid">
            <div className="admin-card">
              <div className="section-heading compact">
                <h3>Recent orders</h3>
              </div>
              <div className="orders-list">
                {initialOrders.map((order) => (
                  <div key={order.id} className="order-row">
                    <div>
                      <strong>{order.id}</strong>
                      <p>{order.customer}</p>
                    </div>
                    <span>${order.total}</span>
                    <em>{order.status}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <div className="section-heading compact">
                <h3>Add product</h3>
              </div>

              <form className="product-form" onSubmit={addProduct}>
                <input
                  type="text"
                  name="name"
                  value={newProduct.name}
                  onChange={handleNewProductChange}
                  placeholder="Product name"
                />
                <select
                  name="category"
                  value={newProduct.category}
                  onChange={handleNewProductChange}
                >
                  {categories.filter((category) => category !== 'All').map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="inline-inputs">
                  <input
                    type="number"
                    name="price"
                    value={newProduct.price}
                    onChange={handleNewProductChange}
                    placeholder="Price"
                  />
                  <input
                    type="number"
                    name="oldPrice"
                    value={newProduct.oldPrice}
                    onChange={handleNewProductChange}
                    placeholder="Old price"
                  />
                </div>
                <input
                  type="url"
                  name="image"
                  value={newProduct.image}
                  onChange={handleNewProductChange}
                  placeholder="Image URL"
                />
                <input
                  type="text"
                  name="feature"
                  value={newProduct.feature}
                  onChange={handleNewProductChange}
                  placeholder="Product feature"
                />
                <button className="primary-btn" type="submit">
                  Save product
                </button>
              </form>
            </div>
          </section>

          <section className="admin-card inventory-card">
            <div className="section-heading compact">
              <h3>Inventory</h3>
            </div>

            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Rating</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="inventory-product">
                          <img src={product.image} alt={product.name} />
                          <span>{product.name}</span>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>${product.price}</td>
                      <td>{product.rating}/5</td>
                      <td>
                        <button className="danger-btn" onClick={() => deleteProduct(product.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
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
                <button className="secondary-btn">Explore Deals</button>
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
                        <strong>${product.price}</strong>
                        <span>${product.oldPrice}</span>
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
                        <strong>Free</strong>
                      </div>
                      <div className="checkout-row total">
                        <span>Total</span>
                        <strong>${subtotal}</strong>
                      </div>
                      <button className="primary-btn full-width">Checkout</button>
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
          <button className="footer-link" onClick={() => setCurrentView('admin')}>Admin</button>
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
