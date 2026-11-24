import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';

const formatDate = (value) => new Date(value).toLocaleDateString();
const reviewKey = (orderId, productId) => `${orderId}:${productId}`;

function ProductReviewCard({ review, productName }) {
  return (
    <article className="customer-review-card">
      <div className="customer-review-rating" aria-label={`${review.rating} out of 5 stars`}>
        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
      </div>
      <p>{review.review_text}</p>
      <div className="customer-review-byline"><strong>{productName}</strong><span>{formatDate(review.created_at)}</span></div>
    </article>
  );
}

export default function CustomerReviewsPage({ user, products }) {
  const [reviews, setReviews] = useState([]);
  const [acceptedOrders, setAcceptedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!supabase) {
        setError('Customer reviews are unavailable right now.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const { data: reviewRows, error: reviewError } = await supabase.from('product_reviews')
        .select('id,user_id,order_id,product_id,rating,review_text,status,created_at')
        .order('created_at', { ascending: false });
      if (!alive) return;
      if (reviewError) {
        setError(`Could not load customer reviews: ${reviewError.message}`);
        setReviews([]);
        setAcceptedOrders([]);
        setLoading(false);
        return;
      }
      setReviews(reviewRows || []);
      if (user) {
        const { data: orderRows, error: orderError } = await supabase.from('orders')
          .select('id,status,items,created_at')
          .eq('user_id', user.id)
          .eq('status', 'Accepted')
          .order('created_at', { ascending: false });
        if (!alive) return;
        if (orderError) {
          setError(`Could not load accepted orders for review: ${orderError.message}`);
          setAcceptedOrders([]);
        } else {
          setAcceptedOrders(orderRows || []);
        }
      } else {
        setAcceptedOrders([]);
      }
      setLoading(false);
    };
    load().catch((loadError) => {
      if (!alive) return;
      setError(`Could not load reviews: ${loadError.message || 'Please try again.'}`);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [user?.id]);

  const productById = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
  const publishedReviews = reviews.filter((review) => review.status === 'approved');
  const previousReviews = useMemo(() => new Map(
    reviews.filter((review) => review.user_id === user?.id)
      .map((review) => [reviewKey(review.order_id, review.product_id), review]),
  ), [reviews, user?.id]);
  const reviewableItems = acceptedOrders.flatMap((order) => (
    Array.isArray(order.items) ? order.items : []
  ).filter((item) => item?.product_id != null).map((item) => ({
    order,
    item,
    product: productById.get(String(item.product_id)),
    previous: previousReviews.get(reviewKey(order.id, item.product_id)),
  })).filter((entry) => entry.product));

  const updateDraft = (key, field, value) => {
    setDrafts((current) => ({ ...current, [key]: { rating: 5, review_text: '', ...current[key], [field]: value } }));
  };

  const submitReview = async (event, entry) => {
    event.preventDefault();
    if (!user || !supabase) {
      setMessage('Sign in before submitting a review.');
      return;
    }
    const key = reviewKey(entry.order.id, entry.item.product_id);
    const draft = drafts[key] || { rating: 5, review_text: '' };
    const reviewText = draft.review_text.trim();
    if (reviewText.length < 5) {
      setMessage('Please write at least 5 characters for your review.');
      return;
    }
    setSavingKey(key);
    setMessage('');
    try {
      const review = {
        user_id: user.id,
        order_id: entry.order.id,
        product_id: entry.item.product_id,
        rating: Number(draft.rating),
        review_text: reviewText,
        status: 'pending',
      };
      const result = entry.previous?.status === 'rejected'
        ? await supabase.from('product_reviews').update(review).eq('id', entry.previous.id).select().single()
        : await supabase.from('product_reviews').insert(review).select().single();
      if (result.error) throw result.error;
      setReviews((current) => [
        result.data,
        ...current.filter((row) => row.id !== result.data.id && reviewKey(row.order_id, row.product_id) !== key),
      ]);
      setMessage('Review submitted. It will appear publicly after admin approval.');
      setDrafts((current) => ({ ...current, [key]: { rating: 5, review_text: '' } }));
    } catch (submitError) {
      console.error('Could not submit customer review:', submitError);
      setMessage(`Could not submit your review: ${submitError.message}`);
    } finally {
      setSavingKey('');
    }
  };

  return (
    <main className="customer-reviews-page">
      <header className="customer-reviews-heading">
        <span className="mini-label">Shared with care</span>
        <h1>Customer reviews</h1>
        <p>Product ratings and customer feedback from approved reviews.</p>
      </header>

      {error && <p className="customer-review-message is-error" role="alert">{error}</p>}
      {message && <p className="customer-review-message" role="status">{message}</p>}

      <section className="customer-review-summaries" aria-label="Product ratings">
        {products.map((product) => {
          const productReviews = publishedReviews.filter((review) => String(review.product_id) === String(product.id));
          const average = productReviews.length
            ? productReviews.reduce((sum, review) => sum + Number(review.rating), 0) / productReviews.length
            : Number(product.rating || 0);
          const count = productReviews.length || Number(product.reviews || 0);
          return (
            <article className="customer-review-summary" key={product.id}>
              <span>{product.category}</span>
              <h2>{product.name}</h2>
              <strong>★ {average ? average.toFixed(1) : 'New'} <small>{count ? `· ${count} reviews` : '· No reviews yet'}</small></strong>
            </article>
          );
        })}
      </section>

      <section className="customer-approved-reviews" aria-labelledby="approved-reviews-title">
        <h2 id="approved-reviews-title">Customer feedback</h2>
        {loading && <p>Loading reviews…</p>}
        {!loading && !error && publishedReviews.length === 0 && <p>No published customer reviews yet.</p>}
        <div className="customer-approved-review-grid">
          {publishedReviews.map((review) => (
            <ProductReviewCard
              key={review.id}
              review={review}
              productName={productById.get(String(review.product_id))?.name || 'Store product'}
            />
          ))}
        </div>
      </section>

      {user && (
        <section className="customer-review-submissions" aria-labelledby="write-review-title">
          <h2 id="write-review-title">Your accepted orders</h2>
          <p>Share feedback on products from orders accepted by the store. Reviews are published after approval.</p>
          {loading && <p>Checking your accepted orders…</p>}
          {!loading && !error && reviewableItems.length === 0 && <p>No accepted orders are ready for a review yet.</p>}
          {reviewableItems.map((entry) => {
            const key = reviewKey(entry.order.id, entry.item.product_id);
            const draft = drafts[key] || { rating: 5, review_text: '' };
            const prior = entry.previous;
            return (
              <article className="customer-review-submit-card" key={key}>
                <div><strong>{entry.product.name}</strong><span>Order {entry.order.id}</span></div>
                {prior && prior.status !== 'rejected' ? (
                  <p className="customer-review-state">{prior.status === 'approved' ? 'Your review is published.' : 'Your review is awaiting admin approval.'}</p>
                ) : (
                  <form onSubmit={(event) => submitReview(event, entry)}>
                    <label>Rating
                      <select value={draft.rating} onChange={(event) => updateDraft(key, 'rating', event.target.value)}>
                        {[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} stars</option>)}
                      </select>
                    </label>
                    <label>Your review
                      <textarea rows="3" maxLength="1200" minLength="5" required value={draft.review_text} onChange={(event) => updateDraft(key, 'review_text', event.target.value)} />
                    </label>
                    <button className="primary-btn" type="submit" disabled={savingKey === key}>{savingKey === key ? 'Submitting…' : prior ? 'Resubmit review' : 'Submit review'}</button>
                  </form>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export function AdminProductReviews({ products }) {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyReview, setBusyReview] = useState('');
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    const checkAdmin = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (!user) {
        if (alive) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (alive) setIsAdmin(Boolean(data));
    };
    checkAdmin().catch((checkError) => {
      if (alive) setError(`Could not verify admin access for reviews: ${checkError.message}`);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(() => checkAdmin());
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !isAdmin) {
      setPendingReviews([]);
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    supabase.from('product_reviews')
      .select('id,order_id,product_id,rating,review_text,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!alive) return;
        if (queryError) {
          setError(`Could not load reviews for approval: ${queryError.message}`);
        } else {
          setPendingReviews(data || []);
          setError('');
        }
        setLoading(false);
      })
      .catch((queryError) => {
        if (!alive) return;
        setError(`Could not load reviews for approval: ${queryError.message}`);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [isAdmin]);

  const moderateReview = async (id, status) => {
    if (!supabase || !isAdmin) return;
    setBusyReview(id);
    setError('');
    const { error: updateError } = await supabase.from('product_reviews').update({ status }).eq('id', id);
    if (updateError) setError(`Could not ${status} review: ${updateError.message}`);
    else setPendingReviews((current) => current.filter((review) => review.id !== id));
    setBusyReview('');
  };

  if (!isAdmin) return null;
  return (
    <section className="admin-panel-card admin-review-queue">
      <div className="panel-header-row"><h2>Customer reviews awaiting approval</h2></div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p>Loading reviews…</p> : pendingReviews.length === 0 ? <p>No reviews are waiting for approval.</p> : pendingReviews.map((review) => (
        <article className="admin-review-row" key={review.id}>
          <div><strong>{products.find((product) => String(product.id) === String(review.product_id))?.name || 'Product'}</strong><span>Order {review.order_id}</span></div>
          <p className="customer-review-rating" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
          <p>{review.review_text}</p>
          <div className="row-actions">
            <button type="button" className="primary-admin-btn" disabled={busyReview === review.id} onClick={() => moderateReview(review.id, 'approved')}>Approve</button>
            <button type="button" className="row-delete-btn" disabled={busyReview === review.id} onClick={() => moderateReview(review.id, 'rejected')}>Reject</button>
          </div>
        </article>
      ))}
    </section>
  );
}
