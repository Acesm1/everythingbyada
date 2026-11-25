import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { CART_UPDATED_EVENT, loadUserCart, normalizeCartItems, readCartCache, saveUserCart, writeCartCache } from './lib/cart-storage';
import CustomerReviewsPage, { AdminProductReviews } from './customer-reviews';
import './storefront.css';
import './special-category-mobile.css';
import './maintenance.css';

const emptyProfile = { full_name: '', phone: '', address: '', city: '' };
const emptyStoreSettings = { store_name: '', support_phone: '', support_email: '', delivery_information: '', payment_details: '' };
const accountTabs = ['ACCOUNT DETAILS', 'MY ORDERS', 'PENDING REVIEWS'];
const accountTabFromUrl = () => {
  const tab = new URLSearchParams(window.location.search).get('tab')?.toUpperCase();
  return accountTabs.includes(tab) ? tab : accountTabs[0];
};
const emptyProduct = { name: '', category: '', price: '', old_price: '', stock: '', feature: '', description: '', best_seller: false, video_urls: [] };
const formatPrice = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const routeFromPath = () => window.location.pathname.startsWith('/admin') ? 'admin' : window.location.pathname.startsWith('/account') ? 'account' : window.location.pathname.startsWith('/reviews') ? 'reviews' : 'store';
const fromRow = (row) => ({ ...row, price: Number(row.price || 0), oldPrice: Number(row.old_price ?? row.price ?? 0), stock: Number(row.stock || 0), best_seller: Boolean(row.best_seller) });

function ProductVideo({ src }) {
  const videoRef = useRef(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        video.play().then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true));
      } else {
        video.pause();
      }
    }, { threshold: 0.6 });
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [src]);

  return (
    <div className="product-detail-media-item">
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop
        controls
        preload="metadata"
        aria-label="Product video"
        onPlay={() => setAutoplayBlocked(false)}
      />
      {autoplayBlocked && <p className="video-autoplay-note">Tap play to view this video.</p>}
    </div>
  );
}

function ProductImage({ src, alt, className, loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = !src || failed ? '/brand-mark.svg' : src;
  useEffect(() => setFailed(false), [src]);

  return (
    <img
      className={className}
      src={imageSrc}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}

function ProductDescription({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= 160) return <p>{text}</p>;

  return (
    <>
      <p className={`product-card-description ${expanded ? 'is-expanded' : ''}`}>{text}</p>
      <button
        type="button"
        className="product-description-toggle"
        aria-expanded={expanded}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((current) => !current);
        }}
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </>
  );
}

export default function DatabaseApp() {
  const [view, setView] = useState(routeFromPath);
  const [accountTab, setAccountTab] = useState(accountTabFromUrl);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [profile, setProfile] = useState(emptyProfile);
  const [profileOwnerId, setProfileOwnerId] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartStatus, setCartStatus] = useState('loading');
  const [cartOwnerId, setCartOwnerId] = useState('');
  const [cartLoadAttempt, setCartLoadAttempt] = useState(0);
  const cartSyncRevision = useRef(0);
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [form, setForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);
  const [videoFiles, setVideoFiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [categorySpecial, setCategorySpecial] = useState(false);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [storeSettings, setStoreSettings] = useState(emptyStoreSettings);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(false);
  const [storeSettingsSaving, setStoreSettingsSaving] = useState(false);
  const [storeSettingsMessage, setStoreSettingsMessage] = useState('');
  const [adminPassword, setAdminPassword] = useState({ password: '', confirm: '' });
  const [adminProfileName, setAdminProfileName] = useState('');
  const [adminSecurityMessage, setAdminSecurityMessage] = useState('');
  const [adminSecuritySaving, setAdminSecuritySaving] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setAdminProfileName(user?.user_metadata?.full_name || '');
  }, [user?.id, user?.user_metadata?.full_name]);
  const [busy, setBusy] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState(isSupabaseConfigured ? 'loading' : 'unavailable');

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.qty, 0);
  const bestSellers = products.filter((product) => product.best_seller);
  const featured = bestSellers.length ? bestSellers[featuredIndex % bestSellers.length] : null;
  const specialCategories = categories.filter((category) => category.is_special);
  const visibleProducts = useMemo(() => products.filter((item) =>
    (selectedCategory === 'All' || item.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase()) &&
    `${item.name} ${item.feature || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [products, selectedCategory, search]);
  const selectSpecialCategory = (categoryName) => {
    setSelectedCategory(categoryName);
    setSearch('');
    window.requestAnimationFrame(() => {
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const loadCatalog = async () => {
    if (!supabase) return;

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

  const retryCatalog = async () => {
    setCatalogStatus('loading');
    try {
      await loadCatalog();
      setCatalogStatus('ready');
    } catch (error) {
      console.error('Could not reload catalog:', error);
      setCatalogStatus('unavailable');
    }
  };

  useEffect(() => {
    const sync = () => {
      setView(routeFromPath());
      setAccountTab(accountTabFromUrl());
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    const closeMobileControls = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', closeMobileControls);
    return () => window.removeEventListener('keydown', closeMobileControls);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        console.error('Could not check sign-in status:', error);
        setMessage(`Could not check sign-in status: ${error.message}`);
      }
      setUser(data.session?.user || null);
      setAuthLoading(false);
    }).catch((error) => {
      if (!alive) return;
      console.error('Could not check sign-in status:', error);
      setMessage(`Could not check sign-in status: ${error.message}`);
      setAuthLoading(false);
    });
    loadCatalog()
      .then(() => { if (alive) setCatalogStatus('ready'); })
      .catch((error) => {
        if (alive) {
          console.error('Could not load catalog:', error);
          setCatalogStatus('unavailable');
        }
      });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    let alive = true;

    if (!user || !supabase) {
      setCart(readCartCache());
      setCartOwnerId('');
      setCartStatus('ready');
      return () => { alive = false; };
    }

    setCart([]);
    setCartStatus('loading');
    const revision = cartSyncRevision.current;
    loadUserCart(supabase, user.id)
      .then((items) => {
        if (!alive) return;
        if (cartSyncRevision.current !== revision) return;
        setCart(items);
        setCartOwnerId(user.id);
        setCartStatus('ready');
        setMessage((current) => current.startsWith('Could not load your saved cart:') ? '' : current);
      })
      .catch((error) => {
        if (!alive) return;
        console.error('Could not load the customer cart:', error);
        setCartStatus('error');
        setMessage(`Could not load your saved cart: ${error.message}`);
      });

    return () => { alive = false; };
  }, [authLoading, user?.id, cartLoadAttempt]);

  const cartReadyForUser = cartStatus === 'ready' && (user ? cartOwnerId === user.id : cartOwnerId === '');

  useEffect(() => {
    if (!cartReadyForUser) return undefined;
    writeCartCache(user?.id || '', cart);
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    if (!user || !supabase) return undefined;

    let alive = true;
    const timer = window.setTimeout(async () => {
      try {
        await saveUserCart(supabase, user.id, cart);
        if (!alive) return;
      } catch (error) {
        if (!alive) return;
        console.error('Could not save the customer cart:', error);
        setMessage(`Could not save your cart: ${error.message}`);
      }
    }, 300);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [cart, cartReadyForUser, user?.id]);

  useEffect(() => {
    const syncExternalCart = (event) => {
      const update = event.detail;
      const expectedOwner = user?.id || 'guest';
      if (authLoading || update?.source !== 'external' || update.ownerId !== expectedOwner) return;
      cartSyncRevision.current += 1;
      setCart(normalizeCartItems(update.items));
      setCartOwnerId(expectedOwner === 'guest' ? '' : expectedOwner);
      setCartStatus('ready');
    };
    window.addEventListener(CART_UPDATED_EVENT, syncExternalCart);
    return () => window.removeEventListener(CART_UPDATED_EVENT, syncExternalCart);
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!user || !supabase) {
      setProfile(emptyProfile);
      setProfileOwnerId('');
      setProfileLoading(false);
      setProfileMessage('');
      return undefined;
    }

    let alive = true;
    setProfile(emptyProfile);
    setProfileOwnerId('');
    setProfileLoading(true);
    setProfileMessage('');
    supabase.from('customer_profiles')
      .select('full_name,phone,address,city')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error('Could not load customer profile:', error);
          setProfileMessage(`Could not load account settings: ${error.message}`);
          setProfileOwnerId(user.id);
        } else {
          setProfile({
            full_name: data?.full_name || '',
            phone: data?.phone || '',
            address: data?.address || '',
            city: data?.city || '',
          });
          setProfileOwnerId(user.id);
        }
        setProfileLoading(false);
      })
      .catch((error) => {
        if (!alive) return;
        console.error('Could not load customer profile:', error);
        setProfileMessage(`Could not load account settings: ${error.message}`);
        setProfileOwnerId(user.id);
        setProfileLoading(false);
      });

    return () => { alive = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user) {
      setIsAdmin(false);
      setAdminLoading(false);
      return undefined;
    }

    let alive = true;
    setAdminLoading(true);
    supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error('Could not verify administrator access:', error);
          setIsAdmin(false);
          setMessage(`Could not verify administrator access: ${error.message}`);
        } else {
          setIsAdmin(Boolean(data));
        }
        setAdminLoading(false);
      })
      .catch((error) => {
        if (!alive) return;
        console.error('Could not verify administrator access:', error);
        setIsAdmin(false);
        setMessage(`Could not verify administrator access: ${error.message}`);
        setAdminLoading(false);
      });

    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!supabase || !user || !isAdmin) {
      setOrders([]);
      return undefined;
    }

    let alive = true;
    setOrdersLoading(true);
    supabase.from('orders')
      .select('id,user_id,customer_name,customer_email,total,status,items,created_at,payment_reference,delivery_full_name,delivery_phone,delivery_address,delivery_city,delivery_state,delivery_postal_code,delivery_notes')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setMessage(`Could not load orders: ${error.message}`);
          setOrders([]);
        } else {
          setOrders(data || []);
        }
        setOrdersLoading(false);
      })
      .catch((error) => {
        if (alive) {
          setMessage(`Could not load orders: ${error.message}`);
          setOrders([]);
          setOrdersLoading(false);
        }
      });

    return () => { alive = false; };
  }, [user, isAdmin]);

  useEffect(() => {
    if (!supabase || !user || !isAdmin || adminTab !== 'settings') return undefined;
    let alive = true;
    setStoreSettingsLoading(true);
    setStoreSettingsMessage('');
    supabase.from('store_settings').select('key,value')
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setStoreSettingsMessage(`Could not load store settings: ${error.message}. Run the latest database setup SQL first.`);
        } else {
          setStoreSettings({
            ...emptyStoreSettings,
            ...(data || []).reduce((settings, row) => ({ ...settings, [row.key]: row.value }), {}),
          });
        }
        setStoreSettingsLoading(false);
      })
      .catch((error) => {
        if (!alive) return;
        setStoreSettingsMessage(`Could not load store settings: ${error.message}`);
        setStoreSettingsLoading(false);
      });
    return () => { alive = false; };
  }, [adminTab, user?.id, isAdmin]);

  useEffect(() => {
    if (bestSellers.length < 2) return undefined;
    const timer = window.setInterval(() => setFeaturedIndex((index) => (index + 1) % bestSellers.length), 5000);
    return () => window.clearInterval(timer);
  }, [bestSellers.length]);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setView(routeFromPath());
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setMessage('');
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('store-route-change'));
  };

  const selectAccountTab = (tab) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    setAccountTab(tab);
    window.dispatchEvent(new Event('store-account-tab-change'));
  };

  const submitCustomerSearch = (event) => {
    event.preventDefault();
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    if (window.location.pathname !== '/') navigate('/');
    window.setTimeout(() => {
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const changeCart = (product, amount) => setCart((current) => {
    const item = current.find((entry) => entry.id === product.id);
    if (!item && amount > 0) return [...current, { ...product, qty: amount }];
    return current.map((entry) => entry.id === product.id ? { ...entry, qty: entry.qty + amount } : entry).filter((entry) => entry.qty > 0);
  });

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!supabase || !user || profileOwnerId !== user.id) return;

    setProfileSaving(true);
    setProfileMessage('');
    try {
      const { error } = await supabase.from('customer_profiles').upsert({
        id: user.id,
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        city: profile.city.trim(),
      }, { onConflict: 'id' });
      if (error) throw error;
      setProfileMessage('Account settings saved.');
    } catch (error) {
      console.error('Could not save customer profile:', error);
      setProfileMessage(`Could not save account settings: ${error.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const saveStoreSettings = async (event) => {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    const settingRows = [
      { key: 'store_name', value: storeSettings.store_name.trim() },
      { key: 'support_phone', value: storeSettings.support_phone.trim() },
      { key: 'support_email', value: storeSettings.support_email.trim() },
      { key: 'delivery_information', value: storeSettings.delivery_information.trim() },
      { key: 'payment_details', value: storeSettings.payment_details.trim() },
    ].map((row) => ({ ...row, updated_at: new Date().toISOString() }));
    setStoreSettingsSaving(true);
    setStoreSettingsMessage('');
    try {
      const { error } = await supabase.from('store_settings').upsert(settingRows, { onConflict: 'key' });
      if (error) throw error;
      setStoreSettingsMessage('Store settings saved.');
    } catch (error) {
      console.error('Could not save store settings:', error);
      setStoreSettingsMessage(`Could not save store settings: ${error.message}`);
    } finally {
      setStoreSettingsSaving(false);
    }
  };

  const updateAdminProfile = async (event) => {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    setAdminSecuritySaving(true);
    setAdminSecurityMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: adminProfileName.trim() } });
      if (error) throw error;
      setAdminSecurityMessage('Admin profile updated.');
    } catch (error) {
      console.error('Could not update administrator profile:', error);
      setAdminSecurityMessage(`Could not update admin profile: ${error.message}`);
    } finally {
      setAdminSecuritySaving(false);
    }
  };

  const updateAdminPassword = async (event) => {
    event.preventDefault();
    setAdminSecurityMessage('');
    if (adminPassword.password.length < 8) {
      setAdminSecurityMessage('Use a password with at least 8 characters.');
      return;
    }
    if (adminPassword.password !== adminPassword.confirm) {
      setAdminSecurityMessage('The passwords do not match.');
      return;
    }
    if (!supabase || !isAdmin) return;
    setAdminSecuritySaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: adminPassword.password });
      if (error) throw error;
      setAdminPassword({ password: '', confirm: '' });
      setAdminSecurityMessage('Admin password updated.');
    } catch (error) {
      console.error('Could not update administrator password:', error);
      setAdminSecurityMessage(`Could not update password: ${error.message}`);
    } finally {
      setAdminSecuritySaving(false);
    }
  };

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setMessage('Sign-in is temporarily unavailable. Please try again later.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: login.email.trim(),
        password: login.password,
      });
      if (error) throw error;
      const signedInUser = data.user || data.session?.user;
      if (!signedInUser) throw new Error('Sign-in completed without returning an account session.');
      setUser(signedInUser);

      if (view === 'admin') {
        setAdminLoading(true);
        const { data: adminRecord, error: adminError } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', signedInUser.id)
          .maybeSingle();
        if (adminError) throw new Error(`Could not verify administrator access: ${adminError.message}`);

        const hasAdminAccess = Boolean(adminRecord);
        setIsAdmin(hasAdminAccess);
        setAdminLoading(false);
        if (hasAdminAccess) {
          navigate('/admin');
          setMessage('Signed in. Your admin dashboard is ready.');
        } else {
          setMessage('You are signed in, but this account does not have administrator access. Ask an existing administrator to grant access.');
        }
      } else {
        setMessage('Signed in successfully.');
      }
    } catch (error) {
      setAdminLoading(false);
      setMessage(`Could not sign in: ${error.message || 'Please try again.'}`);
    } finally {
      setBusy(false);
    }
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

  const uploadProductVideos = async () => {
    const uploadedUrls = [];
    for (const file of videoFiles) {
      if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
        throw new Error('Product videos must be MP4, WebM, or MOV files.');
      }
      if (file.size > 50 * 1024 * 1024) throw new Error('Each product video must be 50 MB or smaller.');
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
      const path = `products/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('product-videos').upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      uploadedUrls.push(supabase.storage.from('product-videos').getPublicUrl(path).data.publicUrl);
    }
    return uploadedUrls;
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    const category = form.category.trim();
    if (!form.name.trim() || !category) { setMessage('Product name and category are required.'); return; }
    setBusy(true); setMessage('');
    try {
      const image = await uploadProductImage();
      const uploadedVideos = await uploadProductVideos();
      const payload = { name: form.name.trim(), category, price: Number(form.price) || 0, old_price: Number(form.old_price) || Number(form.price) || 0, stock: Number(form.stock) || 0, image, feature: form.feature.trim(), description: form.description.trim(), best_seller: Boolean(form.best_seller), video_urls: [...(form.video_urls || []), ...uploadedVideos] };
      const result = editingId ? await supabase.from('products').update(payload).eq('id', editingId) : await supabase.from('products').insert(payload);
      if (result.error) throw result.error;

      let { error: categorySaveError } = await supabase.from('categories')
        .upsert({ name: category, is_special: categorySpecial }, { onConflict: 'name' });
      if (categorySaveError) {
        const fallback = await supabase.from('categories').upsert({ name: category }, { onConflict: 'name' });
        categorySaveError = fallback.error;
      }
      if (categorySaveError) throw categorySaveError;

      setForm(emptyProduct); setImageFile(null); setVideoFiles([]); setEditingId(null); setCategorySpecial(false);
      await loadCatalog(); setMessage('Product saved.');
    } catch (error) { setMessage(`Could not save product: ${error.message}`); }
    finally { setBusy(false); }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setForm({ ...emptyProduct, name: product.name, category: product.category, price: product.price, old_price: product.oldPrice, stock: product.stock, image: product.image || '', feature: product.feature || '', description: product.description || '', best_seller: product.best_seller, video_urls: Array.isArray(product.video_urls) ? product.video_urls : [] });
    setCategorySpecial(Boolean(categories.find((category) => category.name === product.category)?.is_special));
    setImageFile(null); setVideoFiles([]); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Remove this product from the catalog?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) setMessage(error.message); else { await loadCatalog(); setMessage('Product removed.'); }
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
    setBusy(false);
    if (error) {
      setMessage(`Could not update order: ${error.message}`);
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: nextStatus } : order));
    setMessage(`Order marked as ${nextStatus}.`);
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

  if (catalogStatus !== 'ready') return <main className="store-status-page" aria-live="polite" aria-busy={catalogStatus === 'loading'}>
    <section className="store-status-card">
      <img className="store-status-logo" src="/brand-mark.svg" alt="Everything by Ada" />
      <span className="store-status-label">{catalogStatus === 'loading' ? 'Getting things ready' : 'Store update'}</span>
      <h1>{catalogStatus === 'loading' ? 'Loading our store…' : 'We’ll be back soon.'}</h1>
      <p>{catalogStatus === 'loading'
        ? 'Please wait while we get the shop ready.'
        : 'Our shop is temporarily under maintenance. Please check back soon.'}</p>
      {catalogStatus === 'unavailable' && isSupabaseConfigured && (
        <button type="button" className="primary-btn" onClick={retryCatalog}>Try again</button>
      )}
    </section>
  </main>;

  return <div className={`app-shell ${view === 'admin' ? 'admin-view' : 'customer-view'}`}>
    <header className="topbar">
      {view !== 'admin' && <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls={mobileMenuOpen ? 'customer-mobile-nav' : undefined}
        onClick={() => { setMobileMenuOpen((open) => !open); setMobileSearchOpen(false); }}
      ><span /><span /><span /></button>}
      <button className="brand-block brand-button" onClick={() => navigate('/')} aria-label="Everything by Ada home"><img className="brand-logo" src="/brand-mark.svg" alt="Everything by Ada — Look Good, Feel Good, Be You" /></button>
      {view !== 'admin' && <form className="customer-search desktop-customer-search" role="search" onSubmit={submitCustomerSearch}>
        <input type="search" aria-label="Search products" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="submit" aria-label="Submit product search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg></button>
      </form>}
      <nav className="main-nav" aria-label="Main navigation"><button className="nav-link" onClick={() => navigate('/')}>Home / Shop</button><button className="nav-link" onClick={() => navigate('/account')}>Account</button>{isAdmin && <button className="nav-link" onClick={() => navigate('/admin')}>Admin</button>}</nav>
      {view !== 'admin' && <button
        type="button"
        className="mobile-search-toggle"
        aria-label={mobileSearchOpen ? 'Close product search' : 'Search products'}
        aria-expanded={mobileSearchOpen}
        aria-controls={mobileSearchOpen ? 'customer-mobile-search' : undefined}
        onClick={() => { setMobileSearchOpen((open) => !open); setMobileMenuOpen(false); }}
      ><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg></button>}
      <div className="header-actions"><button className="cart-btn" disabled={!cartReadyForUser} onClick={() => document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })}>
        <svg className="cart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
        <span className="cart-label">Cart</span><strong>{cartReadyForUser ? cartCount : '…'}</strong>
      </button></div>
      {view !== 'admin' && mobileSearchOpen && <form id="customer-mobile-search" className="customer-search mobile-customer-search" role="search" onSubmit={submitCustomerSearch}>
        <input autoFocus type="search" aria-label="Search products" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="submit" aria-label="Submit product search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg></button>
      </form>}
      {view !== 'admin' && mobileMenuOpen && <nav id="customer-mobile-nav" className="customer-mobile-nav" aria-label="Customer navigation">
        <button type="button" onClick={() => navigate('/')}>Home / Shop</button>
        <button type="button" onClick={() => navigate('/account')}>My account</button>
        <button type="button" onClick={() => navigate('/cart')}>Shopping cart <span>{cartReadyForUser ? cartCount : '…'}</span></button>
        <button type="button" onClick={() => navigate('/reviews')}>Customer reviews</button>
      </nav>}
    </header>
    {message && <div className="auth-error" role="status">{message}</div>}
    {cartStatus === 'error' && user && (
    <div className="cart-sync-retry">
      <button type="button" className="secondary-btn" onClick={() => {
        setMessage('');
        setCartStatus('loading');
        setCartLoadAttempt((attempt) => attempt + 1);
      }}>Retry loading saved cart</button>
    </div>
    )}
    {view === 'admin' ? (
      authLoading || adminLoading ? (
        <main className="admin-login-shell" aria-live="polite" aria-busy="true">
          <section className="admin-login-card"><p>Checking your account and administrator access…</p></section>
        </main>
      ) : !isAdmin ? (
        <main className="admin-login-shell">
          <section className="admin-login-card">
            <span className="mini-label">Restricted area</span>
            <h2>Admin dashboard login</h2>
            <form className="admin-login-form" onSubmit={signIn}>
              <label>Email<input type="email" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
              <label>Password<input type="password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
              <button className="primary-admin-btn" disabled={busy}>Sign in</button>
            </form>
          </section>
        </main>
      ) : (
        <main className="admin-dashboard-shell">
          <header className="admin-topbar">
            <div><span className="admin-badge">Supabase admin</span><h1>Marketplace dashboard</h1></div>
            <div className="admin-topbar-actions">
              <button className="ghost-admin-btn" onClick={() => navigate('/')}>View storefront</button>
              <button className="danger-admin-btn" onClick={logout}>Log out</button>
            </div>
          </header>
          <nav className="admin-dashboard-nav" aria-label="Admin dashboard sections">
            <button type="button" className={adminTab === 'dashboard' ? 'is-active' : ''} onClick={() => setAdminTab('dashboard')}>Dashboard</button>
            <button type="button" className={adminTab === 'settings' ? 'is-active' : ''} onClick={() => setAdminTab('settings')}>Admin settings</button>
          </nav>
          {adminTab === 'dashboard' ? <>
          <section className="admin-grid">
            <div className="admin-panel-card">
              <div className="panel-header-row"><h2>{editingId ? 'Edit product' : 'Add product'}</h2></div>
              <form className="product-form" onSubmit={saveProduct}>
                <label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                <label>Category<input required list="category-options" value={form.category} onChange={(event) => {
                  setForm({ ...form, category: event.target.value });
                  setCategorySpecial(Boolean(categories.find((item) => item.name === event.target.value)?.is_special));
                }} /></label>
                <datalist id="category-options">{categories.map((category) => <option key={category.name} value={category.name} />)}</datalist>
                <div className="two-col-inputs">
                  <label>Price<input type="number" min="0" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
                  <label>Old price<input type="number" min="0" value={form.old_price} onChange={(event) => setForm({ ...form, old_price: event.target.value })} /></label>
                </div>
                <label>Stock<input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
                <label className="upload-field">Product photo
                  <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
                  <small>{imageFile?.name || (form.image ? 'Current photo will be kept unless you choose another.' : 'Upload an image from your device (max 5 MB).')}</small>
                </label>
                {imageFile && <img className="upload-preview" src={URL.createObjectURL(imageFile)} alt="Selected product preview" />}
                <label className="upload-field">Product videos (up to 3)
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    multiple
                    disabled={(form.video_urls || []).length >= 3}
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      const available = 3 - (form.video_urls || []).length;
                      const validFiles = files.filter((file) => ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) && file.size <= 50 * 1024 * 1024);
                      setVideoFiles(validFiles.slice(0, available));
                      if (files.length > available || validFiles.length !== files.length) {
                        setMessage('Choose up to 3 MP4, WebM, or MOV videos total; each must be 50 MB or smaller.');
                      } else {
                        setMessage('');
                      }
                    }}
                  />
                  <small>{(form.video_urls || []).length + videoFiles.length} of 3 videos selected. MP4, WebM, or MOV, up to 50 MB each.</small>
                </label>
                {(form.video_urls || []).map((videoUrl, index) => (
                  <div className="admin-product-video-row" key={videoUrl}>
                    <video src={videoUrl} muted playsInline controls preload="metadata" aria-label={`Current product video ${index + 1}`} />
                    <button type="button" className="row-delete-btn" onClick={() => setForm((current) => ({ ...current, video_urls: current.video_urls.filter((_, currentIndex) => currentIndex !== index) }))}>Remove video</button>
                  </div>
                ))}
                {videoFiles.map((file) => <p className="admin-selected-video" key={`${file.name}-${file.lastModified}`}>{file.name}</p>)}
                <label>Feature / highlight<input value={form.feature} onChange={(event) => setForm({ ...form, feature: event.target.value })} /></label>
                <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                <label className="toggle-row"><input type="checkbox" checked={form.best_seller} onChange={(event) => setForm({ ...form, best_seller: event.target.checked })} /><span>Feature as a Best Seller</span></label>
                <label className="toggle-row"><input type="checkbox" checked={categorySpecial} onChange={(event) => setCategorySpecial(event.target.checked)} /><span>Show this category as a special category</span></label>
                <div className="product-form-actions">
                  <button className="primary-admin-btn" disabled={busy}>{editingId ? 'Update product' : 'Save product'}</button>
                  {editingId && <button type="button" className="secondary-admin-btn" onClick={() => {
                    setEditingId(null);
                    setForm(emptyProduct);
                    setImageFile(null);
                    setVideoFiles([]);
                    setCategorySpecial(false);
                  }}>Cancel</button>}
                </div>
              </form>
            </div>
            <section className="admin-panel-card inventory-panel">
              <div className="panel-header-row"><h2>Inventory ({products.length})</h2></div>
              <div className="order-list">{products.map((product) => (
                <article className="order-row" key={product.id}>
                  <ProductImage className="admin-product-thumb" src={product.image} alt="" />
                  <div><strong>{product.name}</strong><p>{product.category}</p></div>
                  <span>{formatPrice(product.price)}</span>
                  <div className="row-actions">
                    <button className="row-edit-btn" onClick={() => editProduct(product)}>Edit</button>
                    <button className="row-delete-btn" onClick={() => deleteProduct(product.id)}>Remove</button>
                  </div>
                </article>
              ))}</div>
            </section>
          </section>
          <section className="admin-panel-card" style={{ marginTop: 20 }}>
            <div className="panel-header-row"><h2>Orders</h2></div>
            {ordersLoading ? <p>Loading orders…</p> : orders.length === 0 ? <p>No orders yet.</p> : (
              <div className="order-list">{orders.map((order) => (
                <article className="order-row" key={order.id} style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <strong>Order {order.id}</strong><span>{order.status}</span>
                  </div>
                  <p>{new Date(order.created_at).toLocaleString()} · {formatPrice(order.total)}</p>
                  <p>{order.customer_name || order.customer_email || 'Customer'} · {order.customer_email || 'No email'}</p>
                  {order.delivery_address && <p>{[order.delivery_address, order.delivery_city, order.delivery_state, order.delivery_postal_code].filter(Boolean).join(', ')}</p>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    <button className="primary-admin-btn" onClick={() => updateOrderStatus(order.id, 'Accepted')} disabled={busy || order.status === 'Accepted'}>Accept</button>
                    <button className="secondary-admin-btn" onClick={() => updateOrderStatus(order.id, 'Declined')} disabled={busy || order.status === 'Declined'}>Decline</button>
                  </div>
                </article>
              ))}</div>
            )}
          </section>
          <AdminProductReviews products={products} />
          </> : (
            <section className="admin-settings-view">
              <section className="admin-panel-card">
                <div className="panel-header-row"><h2>Store settings</h2></div>
                {storeSettingsLoading ? <p aria-live="polite">Loading store settings…</p> : (
                  <form className="product-form" onSubmit={saveStoreSettings}>
                    <label>Store name<input value={storeSettings.store_name} onChange={(event) => setStoreSettings({ ...storeSettings, store_name: event.target.value })} /></label>
                    <div className="two-col-inputs">
                      <label>Support phone<input type="tel" value={storeSettings.support_phone} onChange={(event) => setStoreSettings({ ...storeSettings, support_phone: event.target.value })} /></label>
                      <label>Support email<input type="email" value={storeSettings.support_email} onChange={(event) => setStoreSettings({ ...storeSettings, support_email: event.target.value })} /></label>
                    </div>
                    <label>Delivery information<textarea value={storeSettings.delivery_information} onChange={(event) => setStoreSettings({ ...storeSettings, delivery_information: event.target.value })} maxLength={1000} /></label>
                    <label>Payment details<textarea value={storeSettings.payment_details} onChange={(event) => setStoreSettings({ ...storeSettings, payment_details: event.target.value })} maxLength={1000} /></label>
                    <button type="submit" className="primary-admin-btn" disabled={storeSettingsLoading || storeSettingsSaving}>{storeSettingsSaving ? 'Saving…' : 'Save store settings'}</button>
                    {storeSettingsMessage && <p role="status">{storeSettingsMessage}</p>}
                  </form>
                )}
              </section>
              <section className="admin-panel-card">
                <div className="panel-header-row"><h2>Admin account &amp; security</h2></div>
                <p>Signed in as <strong>{user?.email}</strong></p>
                <form className="product-form" onSubmit={updateAdminProfile}>
                  <label>Admin display name<input autoComplete="name" value={adminProfileName} onChange={(event) => setAdminProfileName(event.target.value)} /></label>
                  <button type="submit" className="primary-admin-btn" disabled={adminSecuritySaving}>{adminSecuritySaving ? 'Updating…' : 'Save admin profile'}</button>
                </form>
                <form className="product-form" onSubmit={updateAdminPassword}>
                  <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={adminPassword.password} onChange={(event) => setAdminPassword({ ...adminPassword, password: event.target.value })} /></label>
                  <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={adminPassword.confirm} onChange={(event) => setAdminPassword({ ...adminPassword, confirm: event.target.value })} /></label>
                  <button type="submit" className="primary-admin-btn" disabled={adminSecuritySaving}>{adminSecuritySaving ? 'Updating…' : 'Update admin password'}</button>
                  {adminSecurityMessage && <p role="status">{adminSecurityMessage}</p>}
                </form>
              </section>
            </section>
          )}
        </main>
      )
    ) : view === 'reviews' ? (
      <CustomerReviewsPage user={user} products={products} />
    ) : view === 'account' ? (
      <main className="account-page-shell">
        {user ? (
          <div className="account-layout">
            <nav className="account-sidebar" aria-label="Account sections">
              <button type="button" className={accountTab === 'ACCOUNT DETAILS' ? 'is-active' : ''} aria-current={accountTab === 'ACCOUNT DETAILS' ? 'page' : undefined} onClick={() => selectAccountTab(accountTabs[0])}>
                <span aria-hidden="true">◎</span>Account details
              </button>
              <button type="button" className={accountTab === 'MY ORDERS' ? 'is-active' : ''} aria-current={accountTab === 'MY ORDERS' ? 'page' : undefined} onClick={() => selectAccountTab(accountTabs[1])}>
                <span aria-hidden="true">▢</span>My orders
              </button>
              <button type="button" className={accountTab === 'PENDING REVIEWS' ? 'is-active' : ''} aria-current={accountTab === 'PENDING REVIEWS' ? 'page' : undefined} onClick={() => selectAccountTab(accountTabs[2])}>
                <span aria-hidden="true">☆</span>Pending reviews
              </button>
              <button type="button" className="account-logout" onClick={logout}><span aria-hidden="true">↪</span>Log out</button>
            </nav>
            <section className="account-card account-content">
              <header className="account-content-heading">
                <span className="mini-label">Your account</span>
                <h2>{accountTab === 'ACCOUNT DETAILS' ? 'Account details' : accountTab === 'MY ORDERS' ? 'My orders' : 'Pending reviews'}</h2>
                <p>{accountTab === 'ACCOUNT DETAILS' ? user.email : accountTab === 'MY ORDERS' ? 'Take a look at your recent orders and details.' : 'Orders accepted by the store will appear here for your review.'}</p>
              </header>
              {accountTab === 'ACCOUNT DETAILS' && <section className="account-settings" aria-labelledby="account-settings-title">
                <h3 id="account-settings-title">Contact &amp; delivery details</h3>
                <p>Saved delivery details are filled in for you at checkout.</p>
                {profileLoading || profileOwnerId !== user.id ? <p aria-live="polite">Loading your details…</p> : (
                  <form className="admin-login-form" onSubmit={saveProfile}>
                    <label>Full name<input autoComplete="name" value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} /></label>
                    <label>Phone number<input type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
                    <label>Delivery address<input autoComplete="street-address" value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
                    <label>City<input autoComplete="address-level2" value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></label>
                    <button className="primary-btn" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save account details'}</button>
                  </form>
                )}
                {profileMessage && <p className="account-settings-message" data-error={profileMessage.startsWith('Could not') || undefined} role="status">{profileMessage}</p>}
              </section>}
              <div className="account-orders-slot" hidden={accountTab === 'ACCOUNT DETAILS'} />
            </section>
          </div>
        ) : (
          <section className="account-card account-login-card">
            <span className="mini-label">Your account</span>
            <h2>Sign in to your account</h2>
            <form className="admin-login-form" onSubmit={signIn}>
              <label>Email<input type="email" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
              <label>Password<input type="password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
              <button className="primary-btn" disabled={busy}>Sign in</button>
            </form>
          </section>
        )}
      </main>
    ) : (
      <main className="storefront-shell">
        <section className="hero">
          <div className="hero-copy">
            <div className="badge">Premium wellness & beauty</div>
            <h1>Look good.<br /><span>Feel good.</span><br />Be you.</h1>
            <p>Discover products designed to support your wellness and body goals.</p>
            <div className="cta-row">
              <button className="primary-btn" onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}>Shop now</button>
              <button className="secondary-btn" onClick={() => setSelectedCategory('All')}>Explore products</button>
            </div>
            <div className="stat-row">
              <div><strong>{products.length}</strong><span>Curated products</span></div>
              <div><strong>Quality</strong><span>Beauty & wellness</span></div>
              <div><strong>Daily</strong><span>Feel your best</span></div>
            </div>
          </div>
          {featured ? (
            <section className="featured-seller" aria-label="Best seller spotlight">
              <button className="featured-click" onClick={() => setSelectedProduct(featured)} aria-label={`View ${featured.name}`}>
                <ProductImage src={featured.image} alt={featured.name} loading="eager" />
                <span className="best-seller-pill">Best Seller</span>
                <span className="featured-caption"><small>{featured.category}</small><strong>{featured.name}</strong><span>{formatPrice(featured.price)}</span></span>
              </button>
            </section>
          ) : <div className="hero-logo-card"><img src="/brand-mark.svg" alt="Everything by Ada" /></div>}
        </section>
        {specialCategories.length > 0 && (
          <section className="special-category-section">
            <div className="section-heading"><div><span className="mini-label">Explore by interest</span><h3>Special categories</h3></div></div>
            <div className="special-category-grid">{specialCategories.map((category) => (
              <button key={category.name} className="special-category-card" onClick={() => selectSpecialCategory(category.name)}>
                <span className="category-icon" aria-hidden="true">✦</span>
                <strong>{category.name}</strong>
                <span>Shop collection</span>
              </button>
            ))}</div>
          </section>
        )}
        <section className="marketplace" id="shop">
          <div className="section-heading">
            <div><span className="mini-label">Top picks</span><h3>Marketplace products</h3></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
          </div>
          <div className="filter-row">
            <button className={selectedCategory === 'All' ? 'filter-chip active' : 'filter-chip'} onClick={() => setSelectedCategory('All')}>All</button>
            {categories.map((category) => (
              <button key={category.name} className={selectedCategory === category.name ? 'filter-chip active' : 'filter-chip'} onClick={() => setSelectedCategory(category.name)}>{category.name}</button>
            ))}
          </div>
          <div className="shop-layout">
            <div className="product-grid">
              {visibleProducts.length ? visibleProducts.map((product) => (
                <article className="product-card clickable-product" key={product.id} onClick={(event) => {
                  if (event.target.closest('button')) return;
                  setSelectedProduct(product);
                }}>
                  <div className="product-image-wrap">
                    <ProductImage src={product.image} alt={product.name} />
                    {product.best_seller && <span className="sale-tag">Best Seller</span>}
                  </div>
                  <div className="product-info">
                    <div className="meta-row"><span>{product.category}</span><span>{product.feature || ''}</span></div>
                    <h4><button type="button" className="product-title-button" onClick={(event) => {
                      event.stopPropagation();
                      setSelectedProduct(product);
                    }}>{product.name}</button></h4>
                    {product.description && <ProductDescription text={product.description} />}
                    <div className="price-row"><strong>{formatPrice(product.price)}</strong>{product.oldPrice > product.price && <span>{formatPrice(product.oldPrice)}</span>}</div>
                    <button className="add-btn" onClick={(event) => {
                      event.stopPropagation();
                      changeCart(product, 1);
                    }} disabled={!cartReadyForUser}>Add to cart</button>
                  </div>
                </article>
              )) : <p className="empty-cart">No products match this category or search.</p>}
            </div>
            <aside className="cart-panel" id="cart">
              <div className="section-heading compact"><h3>Cart ({cartCount})</h3></div>
              {cart.length ? cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <strong>{item.name}</strong>
                  <div className="cart-controls"><button onClick={() => changeCart(item, -1)}>−</button><span>{item.qty}</span><button onClick={() => changeCart(item, 1)}>+</button></div>
                  <strong>{formatPrice(item.price * item.qty)}</strong>
                </div>
              )) : <p className="empty-cart">Your cart is waiting for something lovely.</p>}
              <div className="checkout-box">
                <div className="checkout-row total"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div>
                <button className="primary-btn full-width" onClick={placeOrder} disabled={busy || !cart.length}>Place order</button>
                <small>Payment is not processed on this site.</small>
              </div>
            </aside>
          </div>
        </section>
      </main>
    )}
    {selectedProduct && (
      <div className="product-modal-backdrop" role="presentation" onClick={() => setSelectedProduct(null)}>
        <section className="product-detail-modal" role="dialog" aria-modal="true" aria-label={selectedProduct.name} onClick={(event) => event.stopPropagation()}>
          <button className="product-modal-close" onClick={() => setSelectedProduct(null)} aria-label="Close product details">✕</button>
          <div className="product-detail-media" aria-label="Product photos and videos">
            <div className="product-detail-media-item">
              <ProductImage src={selectedProduct.image} alt={selectedProduct.name} />
            </div>
            {(Array.isArray(selectedProduct.video_urls) ? selectedProduct.video_urls : []).slice(0, 3).map((videoUrl) => (
              <ProductVideo key={videoUrl} src={videoUrl} />
            ))}
          </div>
          <div className="product-detail-copy">
            <span className="mini-label">{selectedProduct.category}</span>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description || selectedProduct.feature || 'No description available.'}</p>
            <div className="price-row"><strong>{formatPrice(selectedProduct.price)}</strong>{selectedProduct.oldPrice > selectedProduct.price && <span>{formatPrice(selectedProduct.oldPrice)}</span>}</div>
            <button className="primary-btn" onClick={() => {
              changeCart(selectedProduct, 1);
              setSelectedProduct(null);
            }} disabled={!cartReadyForUser}>Add to cart</button>
          </div>
        </section>
      </div>
    )}
    <footer className="site-footer"><div className="footer-brand-block"><img className="footer-logo" src="/brand-mark.svg" alt="Everything by Ada" /></div><div className="footer-links"><button className="footer-link" onClick={() => navigate('/')}>Shop</button><button className="footer-link" onClick={() => navigate('/account')}>Account</button><button className="footer-link desktop-reviews-link" onClick={() => navigate('/reviews')}>Customer reviews</button>{isAdmin && <button className="footer-link" onClick={() => navigate('/admin')}>Admin</button>}</div></footer>
  </div>;
}
