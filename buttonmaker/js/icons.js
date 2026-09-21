import { state, emit, editTargets } from './state.js?v=149';

const HOSTS = ['https://api.iconify.design', 'https://api.simplesvg.com', 'https://api.unisvg.com'];
const THUMB_COLOR = '#E4E4E7';
let preferredHost = 0;

async function fetchApi(path) {
  let lastErr = null;
  for (let n = 0; n < HOSTS.length; n++) {
    const host = (preferredHost + n) % HOSTS.length;
    try {
      const res = await fetch(HOSTS[host] + path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      preferredHost = host;
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function fetchIconSvg(id) {
  const [prefix, name] = id.split(':');
  const res = await fetchApi('/' + prefix + '.json?icons=' + encodeURIComponent(name));
  const data = await res.json();
  const ic = data && data.icons && data.icons[name];
  if (!ic) throw new Error('missing ' + id);
  const w = ic.width || data.width || 16;
  const h = ic.height || data.height || 16;
  const left = ic.left || data.left || 0;
  const top = ic.top || data.top || 0;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="' + left + ' ' + top + ' ' + w + ' ' + h + '">' + ic.body + '</svg>';
}

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
      if (state.ui.allIcons) {
        for (const ic of d.icons) {
          ic.name = null;
          ic.svg = null;
        }
      } else {
        const ic = d.icons[Math.max(0, Math.min(state.ui.activeIcon, d.icons.length - 1))];
        ic.name = null;
        ic.svg = null;
      }
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
    img.addEventListener('error', () => {
      if (img.dataset.retried) return;
      img.dataset.retried = '1';
      fetchIconSvg(id)
        .then((svg) => {
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replaceAll('currentColor', THUMB_COLOR));
        })
        .catch(() => {});
    });
    img.src = HOSTS[0] + '/' + id.replace(':', '/') + '.svg?color=' + encodeURIComponent(THUMB_COLOR);
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
    const res = await fetchApi('/search?query=' + encodeURIComponent(query) + '&limit=96');
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
    const svg = await fetchIconSvg(id);
    pickTarget(id, svg);
    document.getElementById('iconModal').classList.add('hidden');
  } catch (e) {
    status.textContent = 'Could not load icon';
  }
}
