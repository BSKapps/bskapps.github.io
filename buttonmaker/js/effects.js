import { state, emit, deepClone, defaultIconLayer } from './state.js?v=90';
import { seriesVariants } from './series.js?v=90';
import { releaseSelection, selectListItem } from './ui.js?v=90';

function clampByte(n) {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r, g, b) {
  return '#' + ((1 << 24) + (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b)).toString(16).slice(1);
}

export function invertHex(hex) {
  const c = parseHex(hex);
  return c ? toHex(255 - c[0], 255 - c[1], 255 - c[2]) : hex;
}

export function mixHex(hex, target, t) {
  const a = parseHex(hex);
  const b = parseHex(target);
  if (!a || !b) return hex;
  return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

function dotLayer(color) {
  return Object.assign(defaultIconLayer(), {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/></svg>',
    name: 'on-dot',
    color,
    size: 22,
    align: 'right:top',
    x: 0,
    y: 0
  });
}

export function applyEffectToDesign(design, effect) {
  const d = deepClone(design);
  if (effect.type === 'dot') {
    d.icons.push(dotLayer(effect.color));
    return d;
  }
  const els = effect.elements || { bg: true, icon: true, text: true };
  const k = effect.type === 'invert' ? 1 : (effect.strength === undefined ? 40 : effect.strength) / 100;
  const tf =
    effect.type === 'invert'
      ? invertHex
      : effect.type === 'glow'
        ? (h) => mixHex(h, '#ffffff', k)
        : (h) => mixHex(h, effect.color, k);
  if (els.bg) {
    if (d.bg.mode === 'gradient') {
      d.bg.gradFrom = tf(d.bg.gradFrom);
      d.bg.gradTo = tf(d.bg.gradTo);
    } else if (d.bg.mode === 'solid') {
      d.bg.color = tf(d.bg.color);
    }
  }
  if (els.icon) for (const ic of d.icons) if (ic.svg) ic.color = tf(ic.color);
  if (els.text) for (const t of d.texts) t.color = tf(t.color);
  return d;
}

export function newId() {
  return window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'on-' + Math.random().toString(36).slice(2, 10);
}

function firstLabel(design) {
  const t = (design.texts || []).find((l) => l.value);
  return t ? t.value.split('\n')[0] : '';
}

export function makeOnState() {
  const e = state.effect;
  if (state.series.mode !== 'list') {
    const baseDesign = deepClone(seriesVariants()[0].design);
    releaseSelection();
    state.series.mode = 'list';
    state.series.items = [{ label: firstLabel(baseDesign) || 'button', color: '', design: baseDesign }];
  }
  const items = state.series.items;
  const available = 64 - items.length;
  if (available <= 0) {
    alert('Your set already has 64 buttons, the most allowed. Delete some to make room for on states.');
    return;
  }
  let sourceIdxs = state.ui.selectedItems.length
    ? [...state.ui.selectedItems].sort((a, b) => a - b)
    : items.map((_, i) => i);
  let dropped = 0;
  if (sourceIdxs.length > available) {
    dropped = sourceIdxs.length - available;
    sourceIdxs = sourceIdxs.slice(0, available);
  }
  const resolved = seriesVariants();
  releaseSelection();
  const created = [];
  for (let k = sourceIdxs.length - 1; k >= 0; k--) {
    const si = sourceIdxs[k];
    const source = items[si];
    if (!source) continue;
    if (e.link && !source.id) source.id = newId();
    const srcDesign = (resolved[si] && resolved[si].design) || source.design || state.design;
    const onItem = {
      label: (source.label || firstLabel(srcDesign) || 'button') + ' on',
      color: '',
      design: applyEffectToDesign(srcDesign, e)
    };
    if (e.link) onItem.onStateOf = source.id;
    items.splice(si + 1, 0, onItem);
    created.unshift(onItem);
  }
  const selIdx = created.map((it) => items.indexOf(it)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (selIdx.length) {
    selectListItem(selIdx[0]);
    for (let i = 1; i < selIdx.length; i++) selectListItem(selIdx[i], true);
  } else {
    emit();
  }
  if (dropped > 0) {
    alert('Added ' + created.length + ' on states. Your set hit the 64-button limit, so ' + dropped + ' were skipped.');
  }
}

export function updateEffectControls() {
  const e = state.effect;
  document.getElementById('effectColorRow').classList.toggle('hidden', e.type !== 'tint' && e.type !== 'dot');
  document.getElementById('effectStrengthRow').classList.toggle('hidden', e.type !== 'tint' && e.type !== 'glow');
  document.getElementById('effectElements').classList.toggle('hidden', e.type === 'dot');
  const hint = document.getElementById('effectScopeHint');
  if (state.series.mode !== 'list') {
    hint.textContent = 'Makes the on state of your single button and starts a set.';
  } else if (state.ui.selectedItems.length === 1) {
    hint.textContent = 'Makes the on state of the selected button.';
  } else if (state.ui.selectedItems.length > 1) {
    hint.textContent = 'Makes on states for the ' + state.ui.selectedItems.length + ' selected buttons.';
  } else {
    hint.textContent = 'Makes on states for all ' + state.series.items.length + ' buttons. Click a button first to target just one.';
  }
}

export function initEffects() {
  const seg = document.getElementById('effectType');
  seg.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.effect.type = btn.dataset.val;
      updateEffectControls();
    });
  });

  document.getElementById('effectColor').addEventListener('input', (ev) => {
    state.effect.color = ev.target.value;
  });

  const strength = document.getElementById('effectStrength');
  const strengthVal = document.getElementById('effectStrengthVal');
  strengthVal.min = strength.min;
  strengthVal.max = strength.max;
  strength.addEventListener('input', () => {
    state.effect.strength = Number(strength.value);
    strengthVal.value = strength.value;
  });
  strength.addEventListener('dblclick', () => {
    strength.value = strength.dataset.default;
    strengthVal.value = strength.dataset.default;
    state.effect.strength = Number(strength.dataset.default);
  });
  strengthVal.addEventListener('change', () => {
    let n = Number(strengthVal.value);
    if (strengthVal.value === '' || Number.isNaN(n)) {
      strengthVal.value = strength.value;
      return;
    }
    n = Math.max(Number(strength.min), Math.min(Number(strength.max), Math.round(n)));
    strengthVal.value = n;
    strength.value = n;
    state.effect.strength = n;
  });

  const checks = { effectBg: 'bg', effectIcon: 'icon', effectText: 'text' };
  for (const [id, key] of Object.entries(checks)) {
    document.getElementById(id).addEventListener('change', (ev) => {
      state.effect.elements[key] = ev.target.checked;
    });
  }
  document.getElementById('effectLink').addEventListener('change', (ev) => {
    state.effect.link = ev.target.checked;
  });

  document.getElementById('effectMake').addEventListener('click', makeOnState);

  updateEffectControls();
}
