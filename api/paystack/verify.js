import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const getBearerToken = (req) => {
  const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

const readDelivery = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const delivery = {
    full_name: String(input.full_name || '').trim(),
    phone: String(input.phone || '').trim(),
    address: String(input.address || '').trim(),
    city: String(input.city || '').trim(),
    state: String(input.state || '').trim(),
    postal_code: String(input.postal_code || '').trim(),
    notes: String(input.notes || '').trim(),
  };
  if (!delivery.full_name || delivery.full_name.length > 120 || !delivery.phone || delivery.phone.length > 30
    || !delivery.address || delivery.address.length > 250 || !delivery.city || delivery.city.length > 100
    || !delivery.state || delivery.state.length > 100 || delivery.postal_code.length > 20 || delivery.notes.length > 500) return null;
  return delivery;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const token = getBearerToken(req);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!token) return json(res, 401, { error: 'Sign in to verify your payment.' });
  if (!supabaseUrl || !supabaseAnonKey || !paystackSecret) {
    return json(res, 500, { error: 'Payment verification is not configured. Please contact the store.' });
  }

  const reference = String(req.body?.reference || '').trim();
  if (!/^[\w-]{1,100}$/.test(reference)) return json(res, 400, { error: 'Invalid payment reference.' });

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user?.id || !user.email) return json(res, 401, { error: 'Your session expired. Sign in again.' });

    const { data: existingOrder, error: lookupError } = await supabase
      .from('orders').select('id,payment_reference,total,status')
      .eq('payment_reference', reference).maybeSingle();
    if (lookupError) return json(res, 500, { error: 'Could not check the payment record.' });
    if (existingOrder) return json(res, 200, { order_id: existingOrder.id, status: existingOrder.status, already_recorded: true });

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });
    const verification = await verifyResponse.json();
    const transaction = verification.data;
    if (!verifyResponse.ok || !verification.status || transaction?.status !== 'success') {
      return json(res, 400, { error: 'Payment was not confirmed. No order has been recorded.' });
    }

    const metadata = transaction.metadata || {};
    if (metadata.user_id !== user.id || String(transaction.customer?.email || '').toLowerCase() !== user.email.toLowerCase()) {
      return json(res, 403, { error: 'This payment does not match the signed-in customer.' });
    }
    if (transaction.currency !== 'NGN' || !Array.isArray(metadata.items) || metadata.items.length < 1 || metadata.items.length > 50) {
      return json(res, 400, { error: 'The verified payment details are invalid.' });
    }
    const delivery = readDelivery(metadata.delivery);
    if (!delivery) return json(res, 400, { error: 'The verified delivery details are invalid. Contact the store before trying again.' });

    const items = metadata.items.map((item) => ({
      product_id: item.product_id,
      name: String(item.name || '').slice(0, 200),
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));
    if (items.some((item) => !item.product_id || !item.name || !Number.isFinite(item.price) || item.price < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
      return json(res, 400, { error: 'The verified payment items are invalid.' });
    }
    const totalNaira = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const expectedKobo = Math.round(totalNaira * 100);
    if (!Number.isSafeInteger(expectedKobo) || Number(transaction.amount) !== expectedKobo) {
      return json(res, 400, { error: 'The verified payment amount does not match this order.' });
    }

    const orderId = crypto.randomUUID();
    const { data: inserted, error: insertError } = await supabase.from('orders').insert({
      id: orderId,
      user_id: user.id,
      customer_name: delivery.full_name,
      customer_email: user.email,
      total: totalNaira,
      status: 'Paid',
      items,
      payment_reference: reference,
      delivery_full_name: delivery.full_name,
      delivery_phone: delivery.phone,
      delivery_address: delivery.address,
      delivery_city: delivery.city,
      delivery_state: delivery.state,
      delivery_postal_code: delivery.postal_code,
      delivery_notes: delivery.notes,
    }).select('id,status').single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: duplicate } = await supabase.from('orders').select('id,status')
          .eq('payment_reference', reference).maybeSingle();
        if (duplicate) return json(res, 200, { order_id: duplicate.id, status: duplicate.status, already_recorded: true });
      }
      console.error('Verified payment could not be saved:', insertError.message);
      return json(res, 500, { error: 'Payment was verified, but the order could not be saved. Contact the store with your payment reference.' });
    }

    return json(res, 200, { order_id: inserted.id, status: inserted.status });
  } catch (error) {
    console.error('Payment verification error:', error);
    return json(res, 500, { error: 'Could not verify payment. Please contact the store if you were charged.' });
  }
}
