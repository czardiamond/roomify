const STYLE_DATA = {
  scandinavian: { label: 'Scandinavian', image: '/assets/style-scandinavian.jpg', vibe: 'Scandinavian mood', title: 'Soft light, natural textures.', description: 'A calm palette, tactile layers and pale wood set the tone. Use this as inspiration while you choose pieces that fit your space.', note: 'Think pale oak, a soft neutral base and one or two considered green accents.' },
  japandi: { label: 'Japandi', image: '/assets/style-japandi.jpg', vibe: 'Japandi mood', title: 'Quiet shapes. Warm materials.', description: 'Low silhouettes and natural finishes bring a little more calm to the everyday. Start with fewer, more intentional pieces.', note: 'Keep the palette grounded: warm taupe, oak, linen and a single sculptural detail.' },
  modern: { label: 'Modern', image: '/assets/style-modern.jpg', vibe: 'Modern mood', title: 'Clean lines, softer edges.', description: 'A confident shape or two can make a room feel considered without making it feel formal. Let the materials do the talking.', note: 'Pair a clean-lined anchor with one rounded form and a warm material.' },
  boho: { label: 'Boho', image: '/assets/style-boho.jpg', vibe: 'Boho mood', title: 'Layer in a little soul.', description: 'Natural fibres, warm color and easy greenery create a room that looks collected, not overly styled.', note: 'Build comfort with layered textiles, woven texture and leafy greens.' },
  industrial: { label: 'Industrial', image: '/assets/style-industrial.jpg', vibe: 'Industrial mood', title: 'A little edge, a lot of warmth.', description: 'Dark accents and practical shapes feel balanced when they sit alongside warm wood, soft upholstery and good light.', note: 'Balance charcoal details with wood and one tactile neutral layer.' }
};
const PRODUCTS = [
  { id: 'gullvalla', name: 'GULLVALLA 2-seat sofa', detail: 'Silkeryd grey-green · seating', price: 249, category: 'sofa', productCode: '206.185.10', url: 'https://www.ikea.com/gb/en/p/gullvalla-2-seat-sofa-silkeryd-grey-green-20618510/', icon: 'sofa' },
  { id: 'landskrona', name: 'LANDSKRONA 3-seat sofa', detail: 'Gunnared light green/wood · seating', price: 599, category: 'sofa', productCode: '992.703.28', url: 'https://www.ikea.com/gb/en/p/landskrona-3-seat-sofa-gunnared-light-green-wood-s99270328/', icon: 'sofa' },
  { id: 'lack', name: 'LACK coffee table', detail: 'Black-brown · 118 × 78 cm', price: 40, category: 'table', productCode: '001.042.91', url: 'https://www.ikea.com/gb/en/p/lack-coffee-table-black-brown-118x78-cm-00104291/', icon: 'table' },
  { id: 'oekensand', name: 'ÖKENSAND floor lamp', detail: 'Beech/white · soft ambient light', price: 40, category: 'lamp', productCode: '005.415.31', url: 'https://www.ikea.com/gb/en/p/oekensand-floor-lamp-beech-white-00541531/', icon: 'lamp' }
];
const STYLE_KEYS = Object.keys(STYLE_DATA);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const STORAGE_KEYS = { saved: 'roomify-demo-saved-v1', count: 'roomify-demo-plan-count-v1' };
let selectedStyle = 'scandinavian';
let currentUpload = null;
let currentPicks = [];
let latestDesignId = null;
let toastTimer;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const budgetSlider = $('#budgetSlider');
const budgetOutput = $('#budgetOutput');
const designImage = $('#designImage');
const beforeLayer = $('#beforeLayer');
const beforeImage = $('#beforeImage');
const beforeEmpty = $('#beforeEmpty');
const compareControl = $('#compareControl');
const compareSlider = $('#compareSlider');
const roomFile = $('#roomFile');
const uploadZone = $('#uploadZone');
const uploadThumb = $('#uploadThumb');
const uploadTitle = $('#uploadTitle');
const uploadSubtitle = $('#uploadSubtitle');
const clearUpload = $('#clearUpload');

function formatGBP(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function readSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.saved) || '[]'); }
  catch { return []; }
}
function readCount() {
  const count = Number.parseInt(localStorage.getItem(STORAGE_KEYS.count) || '0', 10);
  return Number.isFinite(count) ? count : 0;
}
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function openInfoDialog(kind) {
  const dialog = $('#infoDialog');
  const title = $('#dialogTitle');
  const message = $('#dialogMessage');
  const eyebrow = $('#dialogEyebrow');
  if (kind === 'signin') {
    eyebrow.textContent = 'ACCOUNT ACCESS';
    title.textContent = 'Your ideas are saved right here.';
    message.textContent = 'Google sign-in and cloud accounts are not connected in this demo. Save a design on this device and it will appear in My designs in this browser.';
  } else {
    eyebrow.textContent = 'ROOMIFY PLUS · COMING LATER';
    title.textContent = 'A bigger room to imagine.';
    message.textContent = 'The $9/month price is an example from the video. Stripe checkout, paid subscriptions and actual AI rendering are not connected, so no payment will be taken.';
  }
  if (typeof dialog.showModal === 'function') dialog.showModal();
}
function setStyle(styleKey) {
  if (!STYLE_DATA[styleKey]) return;
  selectedStyle = styleKey;
  $$('.style-choice').forEach(button => {
    const active = button.dataset.style === styleKey;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const style = STYLE_DATA[styleKey];
  designImage.src = style.image;
  designImage.alt = `${style.label} style reference image`;
  $('#imageVibe').textContent = style.vibe;
  $('#resultTitle').textContent = style.title;
  $('#designDescription').textContent = style.description;
  $('#resultKicker').textContent = `${style.label.toUpperCase()} / STARTING POINT`;
  renderProducts();
}
function getPicks(styleKey, budget) {
  const availableSofas = PRODUCTS.filter(product => product.category === 'sofa' && product.price <= budget).sort((a, b) => b.price - a.price);
  let picked = availableSofas.length ? [availableSofas[0]] : [];
  let remaining = budget - picked.reduce((sum, item) => sum + item.price, 0);
  const addOnIds = styleKey === 'industrial' ? ['lack', 'oekensand'] : ['lack', 'oekensand'];
  for (const id of addOnIds) {
    const product = PRODUCTS.find(item => item.id === id);
    if (product && product.price <= remaining) {
      picked.push(product);
      remaining -= product.price;
    }
  }
  return picked;
}
function productIcon(kind) {
  const paths = {
    sofa: '<path d="M5 11V8.7A2.7 2.7 0 0 1 7.7 6h8.6A2.7 2.7 0 0 1 19 8.7V11"/><path d="M4 11h16a2 2 0 0 1 2 2v5h-2v2H4v-2H2v-5a2 2 0 0 1 2-2Z"/><path d="M6 18v2m12-2v2M6 13v2m12-2v2"/>',
    table: '<path d="M3 9h18v3H3zM5 12v8m14-8v8"/><path d="M7 9V6h10v3"/>',
    lamp: '<path d="M7 9h10l-2-5H9L7 9Z"/><path d="M12 9v8m0 0-5 3m5-3 5 3m-5-3V7"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths.table}</svg>`;
}
function renderProducts() {
  const budget = Number(budgetSlider.value);
  const picks = getPicks(selectedStyle, budget);
  currentPicks = picks;
  const list = $('#productList');
  if (!picks.length) {
    list.innerHTML = '<div class="product-row"><div class="product-meta"><strong>Raise your budget to add a sofa</strong><small>Curated sample choices start at £249.</small></div></div>';
  } else {
    list.innerHTML = picks.map(product => `
      <div class="product-row">
        <span class="product-icon">${productIcon(product.icon)}</span>
        <span class="product-meta"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.detail)}</small></span>
        <span class="product-price"><strong>${formatGBP(product.price)}</strong><a href="${product.url}" target="_blank" rel="noopener noreferrer">View at IKEA ↗</a></span>
      </div>`).join('');
  }
  const total = picks.reduce((sum, item) => sum + item.price, 0);
  const remaining = Math.max(0, budget - total);
  $('#itemCount').textContent = `${picks.length} ${picks.length === 1 ? 'item' : 'items'}`;
  $('#totalPrice').textContent = formatGBP(total);
  $('#budgetRemaining').textContent = `${formatGBP(remaining)} left`;
  $('#budgetMeterCaption').textContent = total <= budget ? 'Within your budget' : 'Over your budget';
  $('#budgetMeterFill').style.width = `${Math.min(100, Math.round(total / budget * 100))}%`;
  $('#budgetMeterFill').style.background = total <= budget ? '#728d68' : '#c98270';
}
function setUploadPreview(dataUrl, filename) {
  currentUpload = dataUrl;
  uploadThumb.src = dataUrl;
  uploadThumb.hidden = false;
  uploadTitle.textContent = filename || 'Room photo selected';
  uploadSubtitle.textContent = 'Stored only in this browser session';
  clearUpload.hidden = false;
  beforeImage.src = dataUrl;
  beforeImage.style.width = `${$('#designImageWrap').clientWidth}px`;
  beforeLayer.hidden = false;
  beforeEmpty.hidden = true;
  $('#beforeLabel').hidden = false;
  compareControl.hidden = false;
  beforeLayer.style.width = `${compareSlider.value}%`;
}
function clearUploadedPhoto() {
  currentUpload = null;
  roomFile.value = '';
  uploadThumb.removeAttribute('src');
  uploadThumb.hidden = true;
  uploadTitle.textContent = 'Drop a room photo here';
  uploadSubtitle.textContent = 'or browse files · JPG, PNG · max 10 MB';
  clearUpload.hidden = true;
  beforeLayer.hidden = true;
  beforeEmpty.hidden = false;
  $('#beforeLabel').hidden = true;
  compareControl.hidden = true;
}
function handleFiles(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Choose a JPG, PNG or other image file.');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showToast('That photo is over 10 MB. Choose a smaller file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => setUploadPreview(String(reader.result), file.name);
  reader.onerror = () => showToast('Could not read that image. Try another file.');
  reader.readAsDataURL(file);
}
function compressDataUrl(dataUrl) {
  if (!dataUrl) return Promise.resolve(null);
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      try { resolve(canvas.toDataURL('image/jpeg', .78)); } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}
function createPlan() {
  const button = $('#createPlan');
  button.disabled = true;
  button.innerHTML = '<span class="button-sparkle">✳</span> Putting your plan together…';
  setTimeout(() => {
    setStyle(selectedStyle);
    $('#resultKicker').textContent = `${STYLE_DATA[selectedStyle].label.toUpperCase()} / DEMO PLAN`;
    const count = readCount() + 1;
    localStorage.setItem(STORAGE_KEYS.count, String(count));
    latestDesignId = null;
    $('#saveDesign').classList.remove('saved');
    $('#saveDesign').innerHTML = '<span>♡</span> Save';
    $('#refinementNotice').hidden = true;
    $('#refinementInput').value = '';
    button.disabled = false;
    button.innerHTML = '<span class="button-sparkle">✳</span> Create my design direction <span class="button-arrow">↗</span>';
    showToast('Your style direction is ready.');
    if (!currentUpload) $('#studio').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 650);
}
function updateComparison() {
  beforeLayer.style.width = `${compareSlider.value}%`;
}
function refreshSavedCount() {
  const count = readSaved().length;
  $('#savedCount').textContent = String(count);
}
function renderSaved() {
  const designs = readSaved();
  const grid = $('#savedGrid');
  refreshSavedCount();
  if (!designs.length) {
    grid.innerHTML = '<div class="empty-saved"><div><strong>No saved ideas yet.</strong>Your next favorite room plan will live here — on this device.</div></div>';
    return;
  }
  grid.innerHTML = designs.map(design => `
    <article class="saved-card" data-id="${escapeHtml(design.id)}">
      <div class="saved-card-image"><img src="${escapeHtml(design.styleImage || STYLE_DATA[design.style]?.image || STYLE_DATA.scandinavian.image)}" alt="${escapeHtml(STYLE_DATA[design.style]?.label || 'Room')} style plan"><span class="compare-label" style="top:auto;bottom:11px;left:11px">${escapeHtml(STYLE_DATA[design.style]?.label || 'Style')} · ${formatGBP(Number(design.budget) || 0)}</span></div>
      <div class="saved-card-body"><h3>${escapeHtml(design.title || 'Room design direction')}</h3><p>Saved ${escapeHtml(design.date || 'just now')} · ${escapeHtml(String((design.products || []).length))} products</p><div class="saved-card-actions"><button type="button" data-open-saved="${escapeHtml(design.id)}">Open plan</button><button class="delete-saved" type="button" data-delete-saved="${escapeHtml(design.id)}">Remove</button></div></div>
    </article>`).join('');
  $$('[data-open-saved]', grid).forEach(button => button.addEventListener('click', () => openSaved(button.dataset.openSaved)));
  $$('[data-delete-saved]', grid).forEach(button => button.addEventListener('click', () => deleteSaved(button.dataset.deleteSaved)));
}
async function saveDesign() {
  if (latestDesignId) {
    showToast('This design is already saved.');
    return;
  }
  const before = currentUpload ? await compressDataUrl(currentUpload) : null;
  const designs = readSaved();
  const design = {
    id: String(Date.now()),
    style: selectedStyle,
    styleImage: STYLE_DATA[selectedStyle].image,
    title: STYLE_DATA[selectedStyle].title,
    budget: Number(budgetSlider.value),
    products: currentPicks.map(item => ({ id: item.id, name: item.name, price: item.price, url: item.url })),
    before,
    date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date())
  };
  designs.unshift(design);
  try {
    localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(designs.slice(0, 12)));
  } catch {
    showToast('The browser could not save this photo. Remove it and try again.');
    return;
  }
  latestDesignId = design.id;
  $('#saveDesign').classList.add('saved');
  $('#saveDesign').innerHTML = '<span>♥</span> Saved';
  renderSaved();
  showToast('Saved on this device.');
}
function openSaved(id) {
  const design = readSaved().find(item => item.id === id);
  if (!design) return;
  budgetSlider.value = String(Math.min(2000, Math.max(300, Number(design.budget) || 900)));
  budgetOutput.textContent = formatGBP(Number(budgetSlider.value));
  setStyle(design.style || 'scandinavian');
  if (design.before) setUploadPreview(design.before, 'Saved room photo');
  else clearUploadedPhoto();
  latestDesignId = design.id;
  $('#saveDesign').classList.add('saved');
  $('#saveDesign').innerHTML = '<span>♥</span> Saved';
  $('#studio').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Opened your saved plan.');
}
function deleteSaved(id) {
  const remaining = readSaved().filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(remaining));
  if (latestDesignId === id) {
    latestDesignId = null;
    $('#saveDesign').classList.remove('saved');
    $('#saveDesign').innerHTML = '<span>♡</span> Save';
  }
  renderSaved();
  showToast('Removed from My designs.');
}

$$('.style-choice').forEach(button => button.addEventListener('click', () => setStyle(button.dataset.style)));
budgetSlider.addEventListener('input', () => {
  budgetOutput.textContent = formatGBP(Number(budgetSlider.value));
  renderProducts();
});
$('#createPlan').addEventListener('click', createPlan);
$('#saveDesign').addEventListener('click', saveDesign);
roomFile.addEventListener('change', event => handleFiles(event.target.files?.[0]));
window.addEventListener('resize', () => { if (currentUpload) beforeImage.style.width = `${$('#designImageWrap').clientWidth}px`; });
clearUpload.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); clearUploadedPhoto(); });
compareSlider.addEventListener('input', updateComparison);
['dragenter', 'dragover'].forEach(name => uploadZone.addEventListener(name, event => { event.preventDefault(); uploadZone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(name => uploadZone.addEventListener(name, event => { event.preventDefault(); uploadZone.classList.remove('dragging'); }));
uploadZone.addEventListener('drop', event => handleFiles(event.dataTransfer?.files?.[0]));
$('#applyRefinement').addEventListener('click', () => {
  const input = $('#refinementInput');
  const note = input.value.trim();
  if (!note) { input.focus(); return; }
  const notice = $('#refinementNotice');
  notice.textContent = `Note added: “${note}” — this demo keeps the image unchanged because visual AI regeneration is not connected.`;
  notice.hidden = false;
  input.value = '';
  showToast('Your refinement note was added.');
});
$('#refinementInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('#applyRefinement').click(); });
$$('[data-modal]').forEach(button => button.addEventListener('click', () => openInfoDialog(button.dataset.modal)));
$('#closeDialog').addEventListener('click', () => $('#infoDialog').close());
$('#dialogOk').addEventListener('click', () => $('#infoDialog').close());
$('#infoDialog').addEventListener('click', event => { if (event.target === $('#infoDialog')) $('#infoDialog').close(); });
$('#mobileMenu').addEventListener('click', () => $('.main-nav').classList.toggle('open'));
$$('.main-nav a').forEach(link => link.addEventListener('click', () => $('.main-nav').classList.remove('open')));

budgetOutput.textContent = formatGBP(Number(budgetSlider.value));
setStyle(selectedStyle);
renderSaved();
