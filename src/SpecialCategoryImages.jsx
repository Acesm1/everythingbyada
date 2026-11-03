import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './lib/supabase';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function imageExtension(file) {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension || file.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
}

export default function SpecialCategoryImages() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminHost, setAdminHost] = useState(null);
  const [categories, setCategories] = useState([]);
  const [busyCategory, setBusyCategory] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;

    const checkAdmin = async (user) => {
      if (!user) {
        if (alive) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (alive) setIsAdmin(!error && Boolean(data));
    };

    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdmin(session?.user || null);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !supabase) {
      setAdminHost(null);
      return undefined;
    }

    const findAdminHost = () => {
      const topbar = document.querySelector('.admin-topbar');
      const host = topbar?.closest('main') || null;
      setAdminHost((current) => current === host ? current : host);
    };
    findAdminHost();
    const observer = new MutationObserver(findAdminHost);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isAdmin]);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name,is_special,image_url')
        .order('name');
      if (!alive) return;
      if (error) {
        setMessage(`Category images need the database update: ${error.message}`);
        return;
      }
      setCategories(data || []);
    };

    loadCategories();
    const timer = window.setInterval(loadCategories, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const decorateCards = () => {
      const imageByCategory = new Map(
        categories.filter((category) => category.is_special && category.image_url)
          .map((category) => [category.name.trim().toLowerCase(), category.image_url]),
      );
      document.querySelectorAll('.special-category-card').forEach((card) => {
        const name = card.querySelector('strong')?.textContent?.trim().toLowerCase();
        const icon = card.querySelector('.category-icon');
        if (!name || !icon) return;
        const imageUrl = imageByCategory.get(name);
        if (!imageUrl) {
          if (icon.querySelector('img')) icon.textContent = '✦';
          return;
        }
        let image = icon.querySelector('img');
        if (!image) {
          icon.replaceChildren();
          image = document.createElement('img');
          image.alt = '';
          image.setAttribute('aria-hidden', 'true');
          icon.append(image);
        }
        if (image.src !== imageUrl) image.src = imageUrl;
        image.style.width = '100%';
        image.style.height = '100%';
        image.style.objectFit = 'cover';
        image.style.borderRadius = 'inherit';
        icon.style.width = '68px';
        icon.style.height = '68px';
        icon.style.overflow = 'hidden';
        icon.style.padding = '0';
      });
    };

    decorateCards();
    const observer = new MutationObserver(decorateCards);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [categories]);

  const uploadImage = async (category, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('Images must be 5 MB or smaller.');
      return;
    }

    setBusyCategory(category.name);
    setMessage('');
    try {
      const path = `categories/${crypto.randomUUID()}.${imageExtension(file)}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const imageUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      const { error: updateError } = await supabase
        .from('categories')
        .update({ image_url: imageUrl })
        .eq('name', category.name);
      if (updateError) throw updateError;

      setCategories((current) => current.map((item) =>
        item.name === category.name ? { ...item, image_url: imageUrl } : item));
      setMessage(`Image saved for ${category.name}.`);
    } catch (error) {
      setMessage(`Could not save category image: ${error.message}`);
    } finally {
      setBusyCategory('');
    }
  };

  if (!isAdmin || !adminHost) return null;

  const specialCategories = categories.filter((category) => category.is_special);
  return createPortal(
    <section aria-labelledby="special-category-images-title" style={{ margin: '24px 0', padding: '22px', border: '2px solid rgba(255,43,140,.18)', borderRadius: '24px', background: '#fff' }}>
      <h2 id="special-category-images-title" style={{ marginTop: 0 }}>Special category images</h2>
      <p>Upload an image for each category marked as special. It will appear on that category’s storefront card.</p>
      {specialCategories.length ? specialCategories.map((category) => (
        <div key={category.name} style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '12px 0', borderTop: '1px solid #f4dce8' }}>
          {category.image_url && <img src={category.image_url} alt={`${category.name} category`} style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover' }} />}
          <strong>{category.name}</strong>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span>{category.image_url ? 'Change image' : 'Add image'}</span>
            <input
              type="file"
              accept="image/*"
              disabled={Boolean(busyCategory)}
              onChange={(event) => {
                uploadImage(category, event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          {busyCategory === category.name && <span>Uploading…</span>}
        </div>
      )) : <p>No categories are marked as special yet. Use the existing “Show this category as a special category” setting when saving a product, then upload its image here.</p>}
      {message && <p role="status" style={{ color: message.startsWith('Could not') || message.includes('need the database update') ? '#b42318' : '#087443' }}>{message}</p>}
    </section>,
    adminHost,
  );
}
