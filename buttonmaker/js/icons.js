import { state, emit, editTargets } from './state.js?v=82';

const API = 'https://api.iconify.design';

const STARTER = [
  'mdi:play', 'mdi:pause', 'mdi:stop', 'mdi:record', 'mdi:skip-next', 'mdi:skip-previous',
  'mdi:fast-forward', 'mdi:rewind', 'mdi:play-circle', 'mdi:record-circle',
  'mdi:video', 'mdi:camera', 'mdi:webcam', 'mdi:cctv', 'mdi:movie-open', 'mdi:filmstrip',
  'mdi:microphone', 'mdi:microphone-off', 'mdi:headphones', 'mdi:volume-high', 'mdi:volume-off',
  'mdi:music', 'mdi:speaker', 'mdi:tune-vertical', 'mdi:sine-wave',
  'mdi:monitor', 'mdi:projector', 'mdi:television', 'mdi:cast', 'mdi:projector-screen',
  'mdi:lightbulb-on', 'mdi:lightbulb-off', 'mdi:flash', 'mdi:white-balance-sunny',
  'mdi:image', 'mdi:folder', 'mdi:cog', 'mdi:power', 'mdi:restart', 'mdi:refresh',
  'mdi:arrow-up-bold', 'mdi:arrow-down-bold', 'mdi:arrow-left-bold', 'mdi:arrow-right-bold',
  'mdi:home', 'mdi:check-bold', 'mdi:close-thick', 'mdi:alert', 'mdi:information',
  'mdi:timer-outline', 'mdi:clock-outline', 'mdi:calendar', 'mdi:flag', 'mdi:star', 'mdi:bell', 'mdi:lock'
];

const FADERS = ['ph:faders', 'ph:faders-bold', 'ph:faders-horizontal', 'mdi:tune-vertical', 'mdi:tune'];
const TRANSPORT = ['mdi:play', 'mdi:pause', 'mdi:stop', 'mdi:record', 'mdi:skip-next', 'mdi:skip-previous', 'mdi:fast-forward', 'mdi:rewind', 'mdi:play-pause', 'material-symbols:eject'];
const DAWS = ['fad:logo-reaper', 'fad:logo-protools', 'cbi:abletonlive', 'fad:logo-abletonlink'];

const AV_PICKS = {
  'transport': TRANSPORT,
  'reaper': ['fad:logo-reaper'],
  'protools': ['simple-icons:protools', 'fad:logo-protools'],
  'pro tools': ['simple-icons:protools', 'fad:logo-protools'],
  'ableton': ['cbi:abletonlive', 'fad:logo-abletonlink', 'skill-icons:ableton-dark'],
  'obs': ['streamline-logos:obs-studio-logo', 'streamline-logos:obs-studio-logo-block', 'streamline-logos:obs-studio-logo-solid'],
  'daw': DAWS,
  'fader': FADERS,
  'faders': FADERS,
  'mixer': FADERS,
  'mixing desk': FADERS,
  'stream deck': ['arcticons:elgato-stream-deck-mobile'],
  'streamdeck': ['arcticons:elgato-stream-deck-mobile']
};

let searchTimer = null;
let lastQuery = '';
let pickTarget = null;

function defaultTarget(id, svg) {
  for (const d of editTargets()) {
    const ic = d.icons[Math.max(0, Math.min(state.ui.activeIcon, d.icons.length - 1))];
    ic.name = id;
    ic.svg = svg;
    ic.tint = false;
  }
  emit();
}

export function triggerIconUpload() {
  pickTarget = defaultTarget;
  document.getElementById('iconUploadFile').click();
}

export function openIconModal(target) {
  pickTarget = target || defaultTarget;
  const modal = document.getElementById('iconModal');
  const results = document.getElementById('iconResults');
  const status = document.getElementById('iconStatus');
  const search = document.getElementById('iconSearch');
  search.value = '';
  modal.classList.remove('hidden');
  search.focus();
  showStarter(results, status);
}

export function initIconPicker() {
  const modal = document.getElementById('iconModal');
  const openBtn = document.getElementById('openIconPicker');
  const closeBtn = document.getElementById('iconModalClose');
  const clearBtn = document.getElementById('clearIcon');
  const search = document.getElementById('iconSearch');
  const results = document.getElementById('iconResults');
  const status = document.getElementById('iconStatus');
  const uploadFile = document.getElementById('iconUploadFile');

  openBtn.addEventListener('click', () => openIconModal());

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.classList.add('hidden');
  });

  clearBtn.addEventListener('click', () => {
    for (const d of editTargets()) {
      const ic = d.icons[Math.max(0, Math.min(state.ui.activeIcon, d.icons.length - 1))];
      ic.name = null;
      ic.svg = null;
    }
    emit();
  });

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
    const q = search.value.trim();
    if (!q) {
      showStarter(results, status);
      return;
    }
    searchTimer = setTimeout(() => {
      if (q.length >= 2) runSearch(q, results, status);
    }, 300);
  });
}

function renderIcons(ids, results) {
  results.innerHTML = '';
  for (const id of ids) {
    const btn = document.createElement('button');
    btn.title = id;
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = API + '/' + id.replace(':', '/') + '.svg?color=%23E4E4E7';
    btn.appendChild(img);
    btn.addEventListener('click', () => pickIcon(id));
    results.appendChild(btn);
  }
}

function showStarter(results, status) {
  lastQuery = '';
  renderIcons(STARTER, results);
  status.textContent = 'A few to get you started - type above to search anything.';
}

async function runSearch(query, results, status) {
  lastQuery = query;
  status.textContent = 'Searching...';
  const picks = AV_PICKS[query.toLowerCase()] || [];
  try {
    const res = await fetch(API + '/search?query=' + encodeURIComponent(query) + '&limit=96');
    const data = await res.json();
    if (lastQuery !== query) return;
    const found = (data.icons || []).filter((id) => !picks.includes(id));
    const merged = picks.concat(found);
    if (!merged.length) {
      results.innerHTML = '';
      status.textContent = 'No icons found for "' + query + '"';
      return;
    }
    renderIcons(merged, results);
    status.textContent = picks.length ? 'AV picks first - ' + merged.length + ' results' : merged.length + ' results';
  } catch (e) {
    if (picks.length) {
      renderIcons(picks, results);
      status.textContent = picks.length + ' results';
      return;
    }
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
