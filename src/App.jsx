import { useMemo, useState } from 'react';

const categories = ['All', 'Weight Loss', 'Weight Gain', 'Body Care', 'Detox', 'Slimming'];

const productList = [
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const filteredProducts = useMemo(() => {
    return productList.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const addToCart = () => setCartCount((count) => count + 1);

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
          <a href="#home">Home</a>
          <a href="#shop">Shop</a>
          <a href="#goals">Goals</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="header-actions">
          <button className="ghost-btn">Sign In</button>
          <button className="cart-btn" aria-label="Shopping cart">
            <span>Cart</span>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

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
              <button className="primary-btn" onClick={addToCart}>Shop Now</button>
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

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <span className="sale-tag">-{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%</span>
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
                  <button className="add-btn" onClick={addToCart}>Add to cart</button>
                </div>
              </article>
            ))}
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
          <a href="#home">Home</a>
          <a href="#shop">Shop</a>
          <a href="#goals">Goals</a>
          <a href="#contact">Support</a>
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
