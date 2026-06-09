/* ─── ADMIN APP ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initAdmin);

function initAdmin() {
  setupSidebarNav();
  setupSizeButtons();
  renderAdminProducts();
  updateStats();
  populateCategoryDatalist();
}

/* ─── SIDEBAR NAV ────────────────────────────────────────────── */
function setupSidebarNav() {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const section = link.dataset.section;
      showSection(section);
      if (section === 'add') resetForm();
    });
  });
}

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  const link = document.querySelector(`.sidebar-link[data-section="${name}"]`);
  if (link) link.classList.add('active');
  if (name === 'products') renderAdminProducts();
}

/* ─── STATS ──────────────────────────────────────────────────── */
function updateStats() {
  const products = getProducts();
  const cats = new Set(products.map(p => p.category));
  const featured = products.filter(p => p.featured).length;
  document.getElementById('statTotal').textContent = products.length;
  document.getElementById('statCategories').textContent = cats.size;
  document.getElementById('statFeatured').textContent = featured;
}

/* ─── CATEGORY DATALIST ──────────────────────────────────────── */
function populateCategoryDatalist() {
  const dl = document.getElementById('categoryList');
  const cf = document.getElementById('categoryFilter');
  if (!dl) return;
  const cats = Object.keys(getCategories());
  dl.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
  if (cf) {
    const current = cf.value;
    cf.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${escapeHtml(c)}"${c===current?' selected':''}>${escapeHtml(c)}</option>`).join('');
  }
}

/* ─── RENDER PRODUCT TABLE ───────────────────────────────────── */
function renderAdminProducts() {
  const tbody = document.getElementById('productTableBody');
  const empty = document.getElementById('tableEmpty');
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const catFilter = document.getElementById('categoryFilter')?.value || '';

  let products = getProducts();
  if (search) products = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.category.toLowerCase().includes(search) ||
    (p.description||'').toLowerCase().includes(search)
  );
  if (catFilter) products = products.filter(p => p.category === catFilter);

  if (!products.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = products.map(p => {
    const thumb = p.image
      ? `<img class="table-thumb" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.outerHTML='<div class=table-thumb-placeholder>✦</div>'" />`
      : `<div class="table-thumb-placeholder">✦</div>`;
    const featuredEl = p.featured
      ? `<span class="featured-badge">★ Featured</span>`
      : `<span style="color:var(--light-text);font-size:.8rem">—</span>`;
    return `
      <tr>
        <td>${thumb}</td>
        <td><span class="table-name">${escapeHtml(p.name)}</span></td>
        <td><span class="table-category">${escapeHtml(p.category)}</span></td>
        <td><span class="table-price">₹${Number(p.price).toLocaleString('en-IN')}</span></td>
        <td>${featuredEl}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn action-btn-edit" onclick="editProduct('${p.id}')">Edit</button>
            <button class="action-btn action-btn-delete" onclick="confirmDelete('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  populateCategoryDatalist();
}

/* ─── SIZE BUTTONS ───────────────────────────────────────────── */
function setupSizeButtons() {
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });
}

function getSelectedSizes() {
  return [...document.querySelectorAll('.size-btn.selected')].map(b => b.dataset.size);
}

function setSelectedSizes(sizes) {
  document.querySelectorAll('.size-btn').forEach(b => {
    b.classList.toggle('selected', (sizes||[]).includes(b.dataset.size));
  });
}

/* ─── COLOR CHIPS ────────────────────────────────────────────── */
let _colors = [];

function addColor() {
  const input = document.getElementById('colorInput');
  const val = input.value.trim();
  if (!val) return;
  val.split(',').forEach(c => {
    const trimmed = c.trim();
    if (trimmed && !_colors.includes(trimmed)) _colors.push(trimmed);
  });
  input.value = '';
  renderColorChips();
}

function renderColorChips() {
  const wrap = document.getElementById('colorChips');
  wrap.innerHTML = _colors.map((c,i) => `
    <span class="color-chip">
      ${escapeHtml(c)}
      <span class="color-chip-remove" onclick="removeColor(${i})">×</span>
    </span>
  `).join('');
}

function removeColor(i) {
  _colors.splice(i, 1);
  renderColorChips();
}

/* ─── IMAGE HANDLING ─────────────────────────────────────────── */
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be under 5MB'); return;
  }
  const reader = new FileReader();
  reader.onload = ev => setImagePreview(ev.target.result);
  reader.readAsDataURL(file);
}

function handleUrlInput(url) {
  if (!url) return;
  const img = new Image();
  img.onload = () => setImagePreview(url);
  img.onerror = () => {};
  img.src = url;
}

function setImagePreview(src) {
  document.getElementById('fImageFinal').value = src;
  document.getElementById('imagePreview').src = src;
  document.getElementById('imagePreviewWrap').style.display = 'block';
  document.getElementById('imagePlaceholder').style.display = 'none';
}

function clearImage() {
  document.getElementById('fImageFinal').value = '';
  document.getElementById('fImageUrl').value = '';
  document.getElementById('fImageFile').value = '';
  document.getElementById('imagePreviewWrap').style.display = 'none';
  document.getElementById('imagePlaceholder').style.display = 'flex';
}

/* ─── FORM RESET ─────────────────────────────────────────────── */
function resetForm() {
  document.getElementById('productForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('formHeading').textContent = 'Add Product';
  document.getElementById('formSubheading').textContent = 'Fill in the details below';
  document.getElementById('submitBtn').textContent = 'Add Product';
  clearImage();
  setSelectedSizes([]);
  _colors = [];
  renderColorChips();
  document.getElementById('fImageUrl').value = '';
}

/* ─── EDIT PRODUCT ───────────────────────────────────────────── */
function editProduct(id) {
  const product = getProducts().find(p => p.id === id);
  if (!product) return;

  showSection('add');

  document.getElementById('editId').value = product.id;
  document.getElementById('fName').value = product.name || '';
  document.getElementById('fCategory').value = product.category || '';
  document.getElementById('fPrice').value = product.price || '';
  document.getElementById('fOriginalPrice').value = product.originalPrice || '';
  document.getElementById('fDescription').value = product.description || '';
  document.getElementById('fTags').value = (product.tags||[]).join(', ');
  document.getElementById('fBadge').value = product.badge || '';
  document.getElementById('fFeatured').checked = !!product.featured;

  if (product.image) setImagePreview(product.image);
  else clearImage();

  setSelectedSizes(product.sizes || []);
  _colors = [...(product.colors || [])];
  renderColorChips();

  document.getElementById('formHeading').textContent = 'Edit Product';
  document.getElementById('formSubheading').textContent = product.name;
  document.getElementById('submitBtn').textContent = 'Save Changes';
}

/* ─── SUBMIT ─────────────────────────────────────────────────── */
function handleProductSubmit(e) {
  e.preventDefault();

  const image = document.getElementById('fImageFinal').value.trim();
  if (!image) { showToast('Please add a product image'); return; }

  const tags = document.getElementById('fTags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  const data = {
    name:          document.getElementById('fName').value.trim(),
    category:      document.getElementById('fCategory').value.trim(),
    price:         parseFloat(document.getElementById('fPrice').value),
    originalPrice: parseFloat(document.getElementById('fOriginalPrice').value) || null,
    description:   document.getElementById('fDescription').value.trim(),
    badge:         document.getElementById('fBadge').value.trim(),
    featured:      document.getElementById('fFeatured').checked,
    image,
    sizes:         getSelectedSizes(),
    colors:        [..._colors],
    tags
  };

  const editId = document.getElementById('editId').value;
  if (editId) {
    updateProduct(editId, data);
    showToast('Product updated successfully!');
  } else {
    addProduct(data);
    showToast('Product added successfully!');
  }

  updateStats();
  showSection('products');
}

/* ─── DELETE ─────────────────────────────────────────────────── */
let _deleteTarget = null;

function confirmDelete(id) {
  _deleteTarget = id;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = () => {
    if (_deleteTarget) {
      deleteProduct(_deleteTarget);
      _deleteTarget = null;
      closeDeleteModal();
      renderAdminProducts();
      updateStats();
      showToast('Product deleted');
    }
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
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--dark)';
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '';
  });
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  });
  document.getElementById('imagePlaceholder')?.addEventListener('click', () => {
    document.getElementById('fImageFile').click();
  });
}
