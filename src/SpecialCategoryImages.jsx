import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './lib/supabase';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SPECIAL_CHECKBOX_LABEL = 'Show this category as a special category';

function fileExtension(file) {
  return file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
    || file.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '').toLowerCase()
    || 'jpg';
}

export default function SpecialCategoryImages() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadHost, setUploadHost] = useState(null);
  const [specialChecked, setSpecialChecked] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;

    const checkAdmin = async (user) => {
      if (!user) {
        if (alive) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.from('admin_users')
        .select('user_id').eq('user_id', user.id).maybeSingle();
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
      setUploadHost(null);
      setSpecialChecked(false);
      return undefined;
    }

    const syncAdminForm = () => {
      const labels = [...document.querySelectorAll('label.toggle-row')];
      const specialLabel = labels.find((label) =>
        label.textContent?.includes(SPECIAL_CHECKBOX_LABEL));
      const checkbox = specialLabel?.querySelector('input[type="checkbox"]');
      const categoryInput = document.querySelector('input[list="category-options"]');
      if (!specialLabel || !checkbox || !categoryInput) {
        setUploadHost((host) => host?.isConnected ? host : null);
        setSpecialChecked(false);
        return;
      }

      let host = specialLabel.nextElementSibling;
      if (!(host instanceof HTMLElement) || !host.hasAttribute('data-special-category-image-upload')) {
        host = document.createElement('div');
        host.dataset.specialCategoryImageUpload = 'true';
        specialLabel.insertAdjacentElement('afterend', host);
      }

      setUploadHost((current) => current === host ? current : host);
      setSpecialChecked((current) => current === checkbox.checked ? current : checkbox.checked);
      setCategoryName((current) => current === categoryInput.value ? current : categoryInput.value);
    };

    syncAdminForm();
    const observer = new MutationObserver(syncAdminForm);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    const handleFormInput = (event) => {
      const target = event.target;
      if (target.matches?.('input[list="category-options"]')) {
        setCategoryName(target.value);
      }
      if (target.matches?.('label.toggle-row input[type="checkbox"]')) {
        const label = target.closest('label.toggle-row');
        if (label?.textContent?.includes(SPECIAL_CHECKBOX_LABEL)) {
          setSpecialChecked(target.checked);
        }
      }
    };
    document.addEventListener('input', handleFormInput, true);
    document.addEventListener('change', handleFormInput, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('input', handleFormInput, true);
      document.removeEventListener('change', handleFormInput, true);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    const loadCategories = async () => {
      const { data, error } = await supabase.from('categories')
        .select('name,is_special,image_url').order('name');
      if (!alive) return;
      if (error) {
        if (error.code === '42703' || error.code === 'PGRST204') {
          setMessage('Run supabase/special_category_images.sql in Supabase SQL Editor to enable category images.');
        }
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
    const imageByCategory = new Map(categories
      .filter((category) => category.is_special && category.image_url)
      .map((category) => [category.name.trim().toLowerCase(), category.image_url]));
    const updateCards = () => {
      document.querySelectorAll('.special-category-card').forEach((card) => {
        const category = card.querySelector('strong')?.textContent?.trim().toLowerCase();
        const icon = card.querySelector('.category-icon');
        if (!category || !icon) return;
        const url = imageByCategory.get(category);
        if (!url) {
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
        if (image.src !== url) image.src = url;
        Object.assign(image.style, { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' });
        Object.assign(icon.style, { width: '68px', height: '68px', overflow: 'hidden', padding: '0' });
      });
    };
    updateCards();
    const observer = new MutationObserver(updateCards);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [categories]);

  const uploadCategoryImage = async (file) => {
    const name = categoryName.trim();
    if (!file || !name) {
      setMessage(name ? 'Choose an image file.' : 'Enter a category name before uploading its image.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMessage('Choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('Images must be 5 MB or smaller.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const path = `categories/${crypto.randomUUID()}.${fileExtension(file)}`;
      const { error: uploadError } = await supabase.storage.from('product-images')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      const { error: categoryError } = await supabase.from('categories').upsert(
        { name, is_special: true, image_url: url }, { onConflict: 'name' },
      );
      if (categoryError) throw categoryError;

      setImageUrl(url);
      setCategories((current) => {
        const existing = current.find((category) => category.name === name);
        return existing
          ? current.map((category) => category.name === name
            ? { ...category, is_special: true, image_url: url }
            : category)
          : [...current, { name, is_special: true, image_url: url }];
      });
      setMessage(`Image saved for ${name}.`);
    } catch (error) {
      setMessage(`Could not save category image: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const existing = categories.find((category) => category.name === categoryName);
    setImageUrl(existing?.image_url || '');
  }, [categories, categoryName]);

  if (!isAdmin || !uploadHost || !specialChecked) return null;

  return createPortal(
    <div style={{ display: 'grid', gap: '8px', margin: '12px 0 18px', padding: '14px', border: '1px solid rgba(255,43,140,.18)', borderRadius: '14px', background: '#fff' }}>
      <label style={{ display: 'grid', gap: '8px', fontWeight: 700 }}>
        <span>Special category image</span>
        <input type="file" accept="image/*" disabled={busy} onChange={(event) => {
          uploadCategoryImage(event.target.files?.[0]);
          event.target.value = '';
        }} />
        <small style={{ fontWeight: 500 }}>{busy ? 'Uploading…' : imageUrl ? 'Choose an image to replace the current one.' : 'Choose an image for this special category (max 5 MB).'}</small>
      </label>
      {imageUrl && <img src={imageUrl} alt={`${categoryName} category preview`} style={{ width: '110px', height: '110px', borderRadius: '16px', objectFit: 'cover' }} />}
      {message && <p role="status" style={{ margin: 0, color: message.startsWith('Could not') || message.startsWith('Run ') ? '#b42318' : '#087443' }}>{message}</p>}
    </div>,
    uploadHost,
  );
}
