const PALETTE = [
  '#ffffff', '#e4e4e7', '#a9a9af', '#55555c', '#16181c', '#000000',
  '#b51f1f', '#e53935', '#c96a17', '#ffb300', '#c9a227', '#ffd54f',
  '#1f9d3a', '#3E8E5F', '#4caf50', '#0f6e2b', '#16324f', '#3a6ea5',
  '#6FA3D9', '#00bcd4', '#3a1d5e', '#7c4dff', '#e91e63', '#7a1111'
];

let pop = null;
let targetInput = null;
let h = 210;
let s = 50;
let l = 60;

function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  const ll = (max + min) / 2;
  const d = max - min;
  let ss = 0;
  if (d !== 0) {
    ss = d / (1 - Math.abs(2 * ll - 1));
    if (max === r) hh = 60 * (((g - b) / d) % 6);
    else if (max === g) hh = 60 * ((b - r) / d + 2);
    else hh = 60 * ((r - g) / d + 4);
  }
  if (hh < 0) hh += 360;
  return [Math.round(hh), Math.round(ss * 100), Math.round(ll * 100)];
}

function hslToHex(hh, ss, ll) {
  ss /= 100;
  ll /= 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0, g = 0, b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

function buildPopover() {
  pop = document.createElement('div');
  pop.className = 'color-pop hidden';
  pop.innerHTML =
    '<div class="cp-swatches"></div>' +
    '<div class="cp-row"><span>Hue</span><input type="range" id="cpH" min="0" max="360"></div>' +
    '<div class="cp-row"><span>Vivid</span><input type="range" id="cpS" min="0" max="100"></div>' +
    '<div class="cp-row"><span>Light</span><input type="range" id="cpL" min="0" max="100"></div>' +
    '<div class="cp-foot"><span class="cp-preview"></span><input type="text" id="cpHex" maxlength="7" autocomplete="off"><button class="btn" id="cpDone">Done</button></div>';
  document.body.appendChild(pop);

  const sw = pop.querySelector('.cp-swatches');
  for (const hex of PALETTE) {
    const b = document.createElement('button');
    b.style.background = hex;
    b.title = hex;
    b.addEventListener('click', () => {
      [h, s, l] = hexToHsl(hex);
      applyExact(hex);
    });
    sw.appendChild(b);
  }

  const bind = (id, fn) => pop.querySelector('#' + id).addEventListener('input', (e) => {
    fn(Number(e.target.value));
    apply();
  });
  bind('cpH', (v) => (h = v));
  bind('cpS', (v) => (s = v));
  bind('cpL', (v) => (l = v));

  pop.querySelector('#cpHex').addEventListener('change', (e) => {
    const v = e.target.value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
      const hex = (v.startsWith('#') ? v : '#' + v).toLowerCase();
      [h, s, l] = hexToHsl(hex);
      applyExact(hex);
    }
  });

  pop.querySelector('#cpDone').addEventListener('click', close);

  document.addEventListener('mousedown', (e) => {
    if (!pop.classList.contains('hidden') && !pop.contains(e.target) && e.target !== targetInput) {
      if (e.target instanceof HTMLInputElement && e.target.type === 'color') return;
      close();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function syncControls() {
  pop.querySelector('#cpH').value = h;
  pop.querySelector('#cpS').value = s;
  pop.querySelector('#cpL').value = l;
  const hex = hslToHex(h, s, l);
  pop.querySelector('#cpHex').value = hex;
  pop.querySelector('.cp-preview').style.background = hex;
  pop.querySelector('#cpH').style.background =
    'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';
  pop.querySelector('#cpS').style.background =
    'linear-gradient(to right,' + hslToHex(h, 0, l) + ',' + hslToHex(h, 100, l) + ')';
  pop.querySelector('#cpL').style.background =
    'linear-gradient(to right,#000,' + hslToHex(h, s, 50) + ',#fff)';
}

function apply() {
  applyExact(hslToHex(h, s, l));
}

function applyExact(hex) {
  syncControls();
  pop.querySelector('#cpHex').value = hex;
  pop.querySelector('.cp-preview').style.background = hex;
  if (targetInput) {
    targetInput.value = hex;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function open(input) {
  targetInput = input;
  [h, s, l] = hexToHsl(input.value || '#ffffff');
  syncControls();
  pop.classList.remove('hidden');
  const r = input.getBoundingClientRect();
  const pw = 280;
  const ph = pop.offsetHeight || 240;
  let x = Math.min(r.left, window.innerWidth - pw - 12);
  let y = r.bottom + 8;
  if (y + ph > window.innerHeight - 12) y = Math.max(12, r.top - ph - 8);
  pop.style.left = Math.max(12, x) + 'px';
  pop.style.top = y + 'px';
}

function close() {
  pop.classList.add('hidden');
  targetInput = null;
}

export function initColorPopover() {
  buildPopover();
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.type === 'color') {
      e.preventDefault();
      open(t);
    }
  }, true);
}
