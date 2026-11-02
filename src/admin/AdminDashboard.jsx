import { useMemo, useState } from 'react';
import './admin.css';

const defaultImage =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80';

const productCategories = ['Weight Loss', 'Weight Gain', 'Body Care', 'Detox', 'Slimming'];

const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;

const emptyProduct = {
  id: null,
  name: '',
  category: 'Weight Loss',
  price: '',
  oldPrice: '',
  stock: '',
  image: defaultImage,
  feature: '',
};

export function AdminDashboard({
  products,
  setProducts,
  orders,
  totalRevenue,
  cartCount,
  onBackToStore,
  onLogout,
}) {
  const [draft, setDraft] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.category || '').toLowerCase().includes(query),
    );
  }, [products, search]);

  const totalProducts = products.length;

  const handleDraftChange = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetDraft = () => {
    setDraft(emptyProduct);
    setEditingId(null);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      handleDraftChange('image', String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!draft.name.trim()) return;

    const normalizedProduct = {
      id: editingId ?? Date.now(),
      name: draft.name.trim(),
      category: draft.category,
      price: Number(draft.price) || 0,
      oldPrice: Number(draft.oldPrice) || Number(draft.price) || 0,
      stock: Number(draft.stock) || 0,
      image: draft.image || defaultImage,
      feature: draft.feature.trim() || 'New arrival',
      rating: editingId
        ? products.find((product) => product.id === editingId)?.rating || 4.8
        : 4.8,
      reviews: editingId
        ? products.find((product) => product.id === editingId)?.reviews || 0
        : 0,
    };

    if (editingId) {
      setProducts((current) =>
        current.map((product) =>
          product.id === editingId ? { ...product, ...normalizedProduct } : product,
        ),
      );
    } else {
      setProducts((current) => [normalizedProduct, ...current]);
    }

    resetDraft();
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setDraft({
      id: product.id,
      name: product.name,
      category: product.category,
      price: String(product.price),
      oldPrice: String(product.oldPrice),
      stock: String(product.stock ?? 0),
      image: product.image || defaultImage,
      feature: product.feature || '',
    });
  };

  const handleDelete = (id) => {
    const target = products.find((product) => product.id === id);
    const message = target
      ? `Remove ${target.name} from inventory?`
      : 'Remove this product?';

    if (typeof window !== 'undefined' && !window.confirm(message)) {
      return;
    }

    setProducts((current) => current.filter((product) => product.id !== id));

    if (editingId === id) {
      resetDraft();
    }
  };

  return (
    <main className="admin-dashboard-shell">
      <header className="admin-topbar">
        <div>
          <span className="admin-badge">Admin control</span>
          <h1>EverythingByAda marketplace</h1>
        </div>

        <div className="admin-topbar-actions">
          <button type="button" className="ghost-admin-btn" onClick={onBackToStore}>
            View storefront
          </button>
          <button type="button" className="danger-admin-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <section className="admin-stats-grid">
        <article className="admin-stat-card pink">
          <span>Total revenue</span>
          <strong>{formatPrice(totalRevenue)}</strong>
        </article>
        <article className="admin-stat-card green">
          <span>Orders</span>
          <strong>{orders.length}</strong>
        </article>
        <article className="admin-stat-card purple">
          <span>Products</span>
          <strong>{totalProducts}</strong>
        </article>
        <article className="admin-stat-card orange">
          <span>Cart items</span>
          <strong>{cartCount}</strong>
        </article>
      </section>

      <section className="admin-grid">
        <div className="admin-panel-card">
          <div className="panel-header-row">
            <h2>{editingId ? 'Edit product' : 'Add product'}</h2>
          </div>

          <form className="product-form" onSubmit={handleSubmit}>
            <label>
              Product name
              <input
                type="text"
                value={draft.name}
                onChange={(event) => handleDraftChange('name', event.target.value)}
                placeholder="Enter product name"
              />
            </label>

            <label>
              Category
              <select
                value={draft.category}
                onChange={(event) => handleDraftChange('category', event.target.value)}
              >
                {productCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="two-col-inputs">
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  value={draft.price}
                  onChange={(event) => handleDraftChange('price', event.target.value)}
                  placeholder="0"
                />
              </label>

              <label>
                Stock
                <input
                  type="number"
                  min="0"
                  value={draft.stock}
                  onChange={(event) => handleDraftChange('stock', event.target.value)}
                  placeholder="0"
                />
              </label>
            </div>

            <div className="two-col-inputs">
              <label>
                Old price
                <input
                  type="number"
                  min="0"
                  value={draft.oldPrice}
                  onChange={(event) => handleDraftChange('oldPrice', event.target.value)}
                  placeholder="0"
                />
              </label>

              <label>
                Product image
                <input type="file" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>

            <label>
              Image URL
              <input
                type="url"
                value={draft.image}
                onChange={(event) => handleDraftChange('image', event.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </label>

            <label>
              Feature / highlight
              <input
                type="text"
                value={draft.feature}
                onChange={(event) => handleDraftChange('feature', event.target.value)}
                placeholder="Belly sculpt, natural boost, daily cleanse..."
              />
            </label>

            <div className="product-form-actions">
              <button type="submit" className="primary-admin-btn">
                {editingId ? 'Update product' : 'Save product'}
              </button>

              {editingId && (
                <button type="button" className="secondary-admin-btn" onClick={resetDraft}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-panel-card">
          <div className="panel-header-row">
            <h2>Recent orders</h2>
          </div>

          <div className="order-list">
            {orders.map((order) => (
              <div key={order.id} className="order-row">
                <div>
                  <strong>{order.id}</strong>
                  <p>{order.customer}</p>
                </div>
                <span>{formatPrice(order.total)}</span>
                <em>{order.status}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-panel-card inventory-panel">
        <div className="panel-header-row inventory-header">
          <h2>Inventory</h2>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search inventory"
            className="inventory-search"
          />
        </div>

        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="inventory-product-cell">
                      <img src={product.image || defaultImage} alt={product.name} />
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>{product.stock ?? 0}</td>
                  <td>{product.rating || 4.8}/5</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="row-edit-btn" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="row-delete-btn"
                        onClick={() => handleDelete(product.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

