import { state, emit } from './state.js?v=3';

const API = 'https://api.iconify.design';

let searchTimer = null;
let lastQuery = '';
let pickTarget = null;

function defaultTarget(id, svg) {
  state.design.icon.name = id;
  state.design.icon.svg = svg;
  state.design.icon.tint = false;
  emit();
}

export function openIconModal(target) {
  pickTarget = target || defaultTarget;
  const modal = document.getElementById('iconModal');
  const results = document.getElementById('iconResults');
  const status = document.getElementById('iconStatus');
  modal.classList.remove('hidden');
  document.getElementById('iconSearch').focus();
  if (!results.children.length) runSearch('play', results, status);
}

export function initIconPicker() {
  const modal = document.getElementById('iconModal');
  const openBtn = document.getElementById('openIconPicker');
  const closeBtn = document.getElementById('iconModalClose');
  const clearBtn = document.getElementById('clearIcon');
  const search = document.getElementById('iconSearch');
  const results = document.getElementById('iconResults');
  const status = document.getElementById('iconStatus');
  const uploadBtn = document.getElementById('iconUploadBtn');
  const uploadFile = document.getElementById('iconUploadFile');

  openBtn.addEventListener('click', () => openIconModal());

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  clearBtn.addEventListener('click', () => {
    state.design.icon.name = null;
    state.design.icon.svg = null;
    emit();
  });

  uploadBtn.addEventListener('click', () => uploadFile.click());
  uploadFile.addEventListener('change', () => {
    const file = uploadFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pickTarget('upload:' + file.name, reader.result);
      modal.classList.add('hidden');
    };
    reader.readAsDataURL(file);
    uploadFile.value = '';
  });

  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = search.value.trim();
      if (q.length >= 2) runSearch(q, results, status);
    }, 300);
  });
}

async function runSearch(query, results, status) {
  lastQuery = query;
  status.textContent = 'Searching...';
  try {
    const res = await fetch(API + '/search?query=' + encodeURIComponent(query) + '&limit=96');
    const data = await res.json();
    if (lastQuery !== query) return;
    results.innerHTML = '';
    if (!data.icons || !data.icons.length) {
      status.textContent = 'No icons found for "' + query + '"';
      return;
    }
    status.textContent = data.icons.length + ' results';
    for (const id of data.icons) {
      const btn = document.createElement('button');
      btn.title = id;
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = API + '/' + id.replace(':', '/') + '.svg';
      btn.appendChild(img);
      btn.addEventListener('click', () => pickIcon(id));
      results.appendChild(btn);
    }
  } catch (e) {
    status.textContent = 'Search failed, check your connection';
  }
}

async function pickIcon(id) {
  const status = document.getElementById('iconStatus');
  status.textContent = 'Loading ' + id + '...';
  try {
    const res = await fetch(API + '/' + id.replace(':', '/') + '.svg');
    const svg = await res.text();
    pickTarget(id, svg);
    document.getElementById('iconModal').classList.add('hidden');
  } catch (e) {
    status.textContent = 'Could not load icon';
  }
}
