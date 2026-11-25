export const LEGACY_CART_KEY = 'everythingbyada_cart';
export const CART_OWNER_KEY = 'everythingbyada_cart_owner';
export const CART_UPDATED_EVENT = 'everythingbyada-cart-updated';

export const normalizeCartItems = (items) => Array.isArray(items)
  ? items.filter((item) => item && item.id != null && Number(item.qty) > 0)
    .map((item) => ({ ...item, qty: Number(item.qty), price: Number(item.price || 0) }))
  : [];

const storageKey = (userId) => `everythingbyada_cart:${userId || 'guest'}`;

export function readCartCache(userId = '') {
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (stored !== null) return normalizeCartItems(JSON.parse(stored));

    if (!userId && (!localStorage.getItem(CART_OWNER_KEY) || localStorage.getItem(CART_OWNER_KEY) === 'guest')) {
      return normalizeCartItems(JSON.parse(localStorage.getItem(LEGACY_CART_KEY) || '[]'));
    }
  } catch (error) {
    console.error('Could not read the local cart cache:', error);
  }
  return [];
}

export function writeCartCache(userId = '', items) {
  localStorage.setItem(storageKey(userId), JSON.stringify(items));
  localStorage.setItem(CART_OWNER_KEY, userId || 'guest');
  localStorage.removeItem(LEGACY_CART_KEY);
}

export async function loadUserCart(supabase, userId) {
  const { data, error } = await supabase.from('carts').select('items').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return normalizeCartItems(data?.items);
}

export async function saveUserCart(supabase, userId, items) {
  const { error } = await supabase.from('carts').upsert({
    user_id: userId,
    items: normalizeCartItems(items),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export function publishCartUpdate(userId, items) {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, {
    detail: { ownerId: userId || 'guest', items: normalizeCartItems(items), source: 'external' },
  }));
}
