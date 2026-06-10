/* ─── ADMIN INIT ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initAdmin);

async function initAdmin() {
  if (!_configured) {
    showSetupBanner();
    // run in localStorage-only mode
    await initAdminUI();
    return;
  }
  // Check existing session
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    await initAdminUI();
  } else {
    showAuthScreen();
  }
  // Listen for auth changes
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN')  { hideAuthScreen(); await initAdminUI(); }
    if (event === 'SIGNED_OUT') { showAuthScreen(); }
  });
}

async function initAdminUI() {
  setupSidebarNav();
  setupSizeButtons();
  await renderAdminProducts();
  await updateStats();
  await populateCategoryDatalist();
  if (_configured) {
    document.getElementById('logoutBtn')?.style.removeProperty('display');
  }
}

/* ─── AUTH ───────────────────────────────────────────────────── */
function showAuthScreen() {
  document.getElementById('authOverlay').classList.add('visible');
  document.getElementById('adminContent').style.display = 'none';
}
function hideAuthScreen() {
  document.getElementById('authOverlay').classList.remove('visible');
  document.getElementById('adminContent').style.display = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const btn   = document.getElementById('loginBtn');
  const error = document.getElementById('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  btn.textContent = 'Signing in…';
  btn.disabled    = true;
  error.textContent = '';
  const { error: err } = await db.auth.signInWithPassword({ email, password: pass });
  if (err) {
    error.textContent = err.message;
    btn.textContent = 'Sign In';
    btn.disabled    = false;
  }
}

async function handleLogout() {
  await db.auth.signOut();
}

function showSetupBanner() {
  const banner = document.getElementById('setupBanner');
  if (banner) banner.style.display = 'flex';
}

/* ─── SIDEBAR NAV ────────────────────────────────────────────── */
function setupSidebarNav() {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const s = link.dataset.section;
      showSection(s);
      if (s === 'add') resetForm();
    });
  });
}

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('section-' + name)?.classList.add('active');
  document.querySelector(`.sidebar-link[data-section="${name}"]`)?.classList.add('active');
  if (name === 'products') renderAdminProducts();
}

/* ─── STATS ──────────────────────────────────────────────────── */
async function updateStats() {
  const products = await getProducts();
  const cats = new Set(products.map(p => p.category));
  document.getElementById('statTotal').textContent     = products.length;
  document.getElementById('statCategories').textContent = cats.size;
  document.getElementById('statFeatured').textContent  = products.filter(p => p.featured).length;
}

/* ─── CATEGORY DATALIST ──────────────────────────────────────── */
async function populateCategoryDatalist() {
  const products = await getProducts();
  const cats = [...new Set(products.map(p => p.category))];
  const dl = document.getElementById('categoryList');
  const cf = document.getElementById('categoryFilter');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
  if (cf) {
    const cur = cf.value;
    cf.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${escapeHtml(c)}"${c===cur?' selected':''}>${escapeHtml(c)}</option>`).join('');
  }
}

/* ─── PRODUCT TABLE ──────────────────────────────────────────── */
async function renderAdminProducts() {
  const tbody  = document.getElementById('productTableBody');
  const empty  = document.getElementById('tableEmpty');
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const catF   = document.getElementById('categoryFilter')?.value || '';

  let products = await getProducts();
  if (search) products = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.category.toLowerCase().includes(search) ||
    (p.description||'').toLowerCase().includes(search)
  );
  if (catF) products = products.filter(p => p.category === catF);

  if (!products.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = products.map(p => {
    const thumb = p.image_url
      ? `<img class="table-thumb" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.outerHTML='<div class=table-thumb-placeholder>✦</div>'" />`
      : `<div class="table-thumb-placeholder">✦</div>`;
    const featEl = p.featured
      ? `<span class="featured-badge">★ Featured</span>`
      : `<span style="color:var(--light-text);font-size:.8rem">—</span>`;
    return `<tr>
      <td>${thumb}</td>
      <td><span class="table-name">${escapeHtml(p.name)}</span></td>
      <td><span class="table-category">${escapeHtml(p.category)}</span></td>
      <td><span class="table-price">₹${Number(p.price).toLocaleString('en-IN')}</span></td>
      <td>${featEl}</td>
      <td><div class="action-btns">
        <button class="action-btn action-btn-edit" onclick="editProduct('${p.id}')">Edit</button>
        <button class="action-btn action-btn-delete" onclick="confirmDelete('${p.id}', ${JSON.stringify(escapeHtml(p.image_url||''))})">Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

/* ─── SIZE BUTTONS ───────────────────────────────────────────── */
function setupSizeButtons() {
  document.querySelectorAll('.size-btn').forEach(btn =>
    btn.addEventListener('click', () => btn.classList.toggle('selected'))
  );
}
function getSelectedSizes() {
  return [...document.querySelectorAll('.size-btn.selected')].map(b => b.dataset.size);
}
function setSelectedSizes(sizes) {
  document.querySelectorAll('.size-btn').forEach(b =>
    b.classList.toggle('selected', (sizes||[]).includes(b.dataset.size))
  );
}

/* ─── COLOR CHIPS ────────────────────────────────────────────── */
let _colors = [];
function addColor() {
  const input = document.getElementById('colorInput');
  input.value.split(',').map(c => c.trim()).filter(Boolean).forEach(c => {
    if (!_colors.includes(c)) _colors.push(c);
  });
  input.value = '';
  renderColorChips();
}
function renderColorChips() {
  document.getElementById('colorChips').innerHTML = _colors.map((c,i) =>
    `<span class="color-chip">${escapeHtml(c)}<span class="color-chip-remove" onclick="removeColor(${i})">×</span></span>`
  ).join('');
}
function removeColor(i) { _colors.splice(i,1); renderColorChips(); }

/* ─── IMAGE HANDLING ─────────────────────────────────────────── */
let _uploadedFile = null;

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB'); return; }
  _uploadedFile = file;
  const previewUrl = URL.createObjectURL(file);
  setImagePreview(previewUrl, false); // preview only — upload on submit
}

function handleUrlInput(url) {
  if (!url) return;
  const img = new Image();
  img.onload = () => { _uploadedFile = null; setImagePreview(url, true); };
  img.src = url;
}

function setImagePreview(src, setFinal) {
  document.getElementById('imagePreview').src = src;
  document.getElementById('imagePreviewWrap').style.display = 'block';
  document.getElementById('imagePlaceholder').style.display = 'none';
  if (setFinal) document.getElementById('fImageFinal').value = src;
  else document.getElementById('fImageFinal').value = '__pending__';
}

function clearImage() {
  _uploadedFile = null;
  document.getElementById('fImageFinal').value = '';
  document.getElementById('fImageUrl').value   = '';
  document.getElementById('fImageFile').value  = '';
  document.getElementById('imagePreviewWrap').style.display = 'none';
  document.getElementById('imagePlaceholder').style.display  = 'flex';
}

/* ─── FORM RESET ─────────────────────────────────────────────── */
function resetForm() {
  document.getElementById('productForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('formHeading').textContent    = 'Add Product';
  document.getElementById('formSubheading').textContent = 'Fill in the details below';
  document.getElementById('submitBtn').textContent      = 'Add Product';
  clearImage();
  setSelectedSizes([]);
  _colors = [];
  renderColorChips();
}

/* ─── EDIT ───────────────────────────────────────────────────── */
async function editProduct(id) {
  const products = await getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;
  showSection('add');
  document.getElementById('editId').value          = p.id;
  document.getElementById('fName').value           = p.name || '';
  document.getElementById('fCategory').value       = p.category || '';
  document.getElementById('fPrice').value          = p.price || '';
  document.getElementById('fOriginalPrice').value  = p.original_price || '';
  document.getElementById('fDescription').value    = p.description || '';
  document.getElementById('fTags').value           = (p.tags||[]).join(', ');
  document.getElementById('fBadge').value          = p.badge || '';
  document.getElementById('fFeatured').checked     = !!p.featured;
  if (p.image_url) setImagePreview(p.image_url, true); else clearImage();
  setSelectedSizes(p.sizes || []);
  _colors = [...(p.colors || [])];
  renderColorChips();
  document.getElementById('formHeading').textContent    = 'Edit Product';
  document.getElementById('formSubheading').textContent = p.name;
  document.getElementById('submitBtn').textContent      = 'Save Changes';
}

/* ─── SUBMIT ─────────────────────────────────────────────────── */
async function handleProductSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const imageFinal = document.getElementById('fImageFinal').value.trim();
  if (!imageFinal) { showToast('Please add a product image'); return; }

  btn.textContent = 'Saving…';
  btn.disabled    = true;

  try {
    let imageUrl = imageFinal;

    // Upload file to Supabase Storage if a file was selected
    if (_uploadedFile && imageFinal === '__pending__') {
      imageUrl = await uploadImage(_uploadedFile);
      _uploadedFile = null;
    }

    const data = {
      name:           document.getElementById('fName').value.trim(),
      category:       document.getElementById('fCategory').value.trim(),
      price:          parseFloat(document.getElementById('fPrice').value),
      original_price: parseFloat(document.getElementById('fOriginalPrice').value) || null,
      description:    document.getElementById('fDescription').value.trim(),
      badge:          document.getElementById('fBadge').value.trim(),
      featured:       document.getElementById('fFeatured').checked,
      image_url:      imageUrl,
      sizes:          getSelectedSizes(),
      colors:         [..._colors],
      tags:           document.getElementById('fTags').value.split(',').map(t=>t.trim()).filter(Boolean),
    };

    const editId = document.getElementById('editId').value;
    if (editId) {
      await updateProduct(editId, data);
      showToast('Product updated!');
    } else {
      await addProduct(data);
      showToast('Product added!');
    }

    await updateStats();
    showSection('products');
  } catch(err) {
    console.error(err);
    showToast('Error: ' + (err.message || 'Something went wrong'));
  } finally {
    btn.textContent = document.getElementById('editId').value ? 'Save Changes' : 'Add Product';
    btn.disabled    = false;
  }
}

/* ─── DELETE ─────────────────────────────────────────────────── */
let _deleteTarget = null;
let _deleteImageUrl = null;

function confirmDelete(id, imageUrl) {
  _deleteTarget   = id;
  _deleteImageUrl = imageUrl || null;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    try {
      if (_deleteImageUrl) await deleteImage(_deleteImageUrl);
      await deleteProduct(_deleteTarget);
      closeDeleteModal();
      await renderAdminProducts();
      await updateStats();
      showToast('Product deleted');
    } catch(err) {
      showToast('Error: ' + err.message);
    }
    _deleteTarget = _deleteImageUrl = null;
  };
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
}
document.getElementById('deleteModal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDeleteModal();
});

/* ─── DRAG-OVER UPLOAD ───────────────────────────────────────── */
const uploadArea = document.getElementById('imageUploadArea');
if (uploadArea) {
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--dark)'; });
  uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
  uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      _uploadedFile = file;
      setImagePreview(URL.createObjectURL(file), false);
    }
  });
  document.getElementById('imagePlaceholder')?.addEventListener('click', () =>
    document.getElementById('fImageFile').click()
  );
}
