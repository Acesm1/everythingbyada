import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const getBearerToken = (req) => {
  const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const token = getBearerToken(req);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const siteUrl = process.env.PUBLIC_SITE_URL;
  if (!token) return json(res, 401, { error: 'Sign in to continue to checkout.' });
  if (!supabaseUrl || !supabaseAnonKey || !paystackSecret || !siteUrl) {
    return json(res, 500, { error: 'Payment is not configured. Please contact the store.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user?.id || !user.email) return json(res, 401, { error: 'Your session expired. Sign in again.' });

    const submittedItems = req.body?.items;
    if (!Array.isArray(submittedItems) || submittedItems.length < 1 || submittedItems.length > 50) {
      return json(res, 400, { error: 'Your cart is empty or invalid.' });
    }
    const quantities = new Map();
    for (const item of submittedItems) {
      const id = String(item?.product_id ?? '');
      const quantity = Number(item?.quantity);
      if (!/^\d+$/.test(id) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
        return json(res, 400, { error: 'One or more cart items are invalid.' });
      }
      quantities.set(id, (quantities.get(id) || 0) + quantity);
    }
    const ids = [...quantities.keys()];
    const { data: products, error: productError } = await supabase
      .from('products').select('id,name,price,stock').in('id', ids);
    if (productError) return json(res, 400, { error: 'Could not validate your cart against the catalog.' });
    if (!products || products.length !== ids.length) return json(res, 400, { error: 'A cart item is no longer available.' });

    const items = products.map((product) => ({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: quantities.get(String(product.id)),
    }));
    if (items.some((item) => !Number.isFinite(item.price) || item.price < 0)) {
      return json(res, 400, { error: 'A product has an invalid price.' });
    }
    const amountKobo = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100);
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) return json(res, 400, { error: 'The cart total must be greater than zero.' });

    const callbackUrl = new URL('/payment/callback', siteUrl).toString();
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        currency: 'NGN',
        callback_url: callbackUrl,
        metadata: { user_id: user.id, items },
      }),
    });
    const result = await paystackResponse.json();
    if (!paystackResponse.ok || !result.status || !result.data?.authorization_url || !result.data?.reference) {
      console.error('Paystack initialization failed:', result.message || paystackResponse.status);
      return json(res, 502, { error: 'Could not start payment. Please try again.' });
    }
    return json(res, 200, { authorization_url: result.data.authorization_url });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return json(res, 500, { error: 'Could not start payment. Please try again.' });
  }
}
