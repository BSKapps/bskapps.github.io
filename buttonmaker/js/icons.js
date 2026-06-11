import { state, emit } from './state.js';

const API = 'https://api.iconify.design';

let searchTimer = null;
let lastQuery = '';

export function initIconPicker() {
  const modal = document.getElementById('iconModal');
  const openBtn = document.getElementById('openIconPicker');
  const closeBtn = document.getElementById('iconModalClose');
  const clearBtn = document.getElementById('clearIcon');
  const search = document.getElementById('iconSearch');
  const results = document.getElementById('iconResults');
  const status = document.getElementById('iconStatus');

  openBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    search.focus();
    if (!results.children.length) runSearch('play', results, status);
  });

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  clearBtn.addEventListener('click', () => {
    state.design.icon.name = null;
    state.design.icon.svg = null;
    emit();
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
    state.design.icon.name = id;
    state.design.icon.svg = svg;
    document.getElementById('iconModal').classList.add('hidden');
    emit();
  } catch (e) {
    status.textContent = 'Could not load icon';
  }
}
