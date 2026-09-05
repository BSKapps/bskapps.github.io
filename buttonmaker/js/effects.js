import { state, emit, deepClone, dotLayer } from './state.js?v=147';
import { seriesVariants } from './series.js?v=147';
import { mixHex, isLightColor } from './color.js?v=147';
import { releaseSelection, selectListItem } from './ui.js?v=147';

export const EFFECT_DEFAULTS = {
  tint: { type: 'tint', color: '#1f9d3a', strength: 40, elements: { bg: true, icon: true, text: true } },
  highlight: { type: 'highlight', strength: 35, elements: { bg: true, icon: true, text: true } },
  invert: { type: 'invert', elements: { bg: true, icon: true, text: true } },
  dot: { type: 'dot', color: '#1f9d3a' },
  colour: { type: 'colour', color: '#1f9d3a' }
};

const COLOURED = ['tint', 'dot', 'colour'];

export const ON_COLOURS = [
  { val: 'white', name: 'White', color: '#ffffff' },
  { val: 'amber', name: 'Amber', color: '#c07a1a' },
  { val: 'green', name: 'Green', color: '#1f9d3a' },
  { val: 'red', name: 'Red', color: '#8c1f1f' }
];

export function applyEffectToDesign(design, effect) {
  const d = deepClone(design);
  if (effect.type === 'dot') {
    d.icons.push(dotLayer(effect.color));
    return d;
  }
  if (effect.type === 'colour') {
    d.bg.mode = 'solid';
    d.bg.color = effect.color;
    d.bg.invert = false;
    const fg = isLightColor(effect.color) ? '#000000' : '#ffffff';
    for (const t of d.texts) {
      t.color = fg;
      t.invert = false;
    }
    for (const ic of d.icons) {
      if (!ic.svg || ic.name === 'status-dot') continue;
      ic.color = fg;
      ic.invert = false;
    }
    return d;
  }
  const els = effect.elements || { bg: true, icon: true, text: true };
  if (effect.type === 'invert') {
    if (els.bg) d.bg.invert = true;
    if (els.icon) for (const ic of d.icons) ic.invert = true;
    if (els.text) for (const t of d.texts) t.invert = true;
    return d;
  }
  const k = (effect.strength === undefined ? 40 : effect.strength) / 100;
  let tf;
  if (effect.type === 'highlight') {
    const judge = d.bg.mode === 'gradient' ? d.bg.gradFrom : d.bg.mode === 'solid' ? d.bg.color : '#000000';
    const target = isLightColor(judge) ? '#000000' : '#ffffff';
    tf = (h) => mixHex(h, target, k);
  } else {
    tf = (h) => mixHex(h, effect.color, k);
  }
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

export function makeOnState(effect) {
  if (state.series.mode !== 'list') {
    const baseDesign = deepClone(seriesVariants()[0].design);
    releaseSelection();
    state.series.mode = 'list';
    state.series.items = [{ label: firstLabel(baseDesign) || 'button', color: '', design: baseDesign }];
  }
  const items = state.series.items;
  const resolved = seriesVariants();
  const selected = state.ui.selectedItems.length ? [...state.ui.selectedItems] : items.map((_, i) => i);
  const sourceSet = new Set();
  for (const i of selected) {
    const it = items[i];
    let srcIdx = i;
    if (it && it.onStateOf) {
      const found = items.findIndex((s) => s.id === it.onStateOf);
      if (found >= 0) srcIdx = found;
      else delete it.onStateOf;
    }
    sourceSet.add(srcIdx);
  }
  const sourceIdxs = [...sourceSet].sort((a, b) => a - b);
  releaseSelection();
  const targets = [];
  let dropped = 0;
  for (let k = sourceIdxs.length - 1; k >= 0; k--) {
    const si = sourceIdxs[k];
    const source = items[si];
    if (!source) continue;
    if (!source.id) source.id = newId();
    const srcDesign = (resolved[si] && resolved[si].design) || source.design || state.design;
    const onDesign = applyEffectToDesign(srcDesign, effect);
    const existing = items.find((it) => it.onStateOf === source.id);
    if (existing) {
      existing.design = onDesign;
      targets.push(existing);
    } else if (items.length < 64) {
      const onItem = {
        label: (source.label || firstLabel(srcDesign) || 'button') + ' on',
        color: '',
        design: onDesign,
        onStateOf: source.id
      };
      items.splice(si + 1, 0, onItem);
      targets.push(onItem);
    } else {
      dropped++;
    }
  }
  const selIdx = targets.map((it) => items.indexOf(it)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (selIdx.length) {
    selectListItem(selIdx[0]);
    for (let i = 1; i < selIdx.length; i++) selectListItem(selIdx[i], true);
  } else {
    emit();
  }
  if (dropped > 0) {
    alert('Your set is at the 64-button limit, so ' + dropped + ' on state' + (dropped > 1 ? 's' : '') + ' could not be added.');
  }
  return targets;
}

let lit = null;
let lastVal = null;
let onColour = '#1f9d3a';

function syncEffectSeg() {
  document.querySelectorAll('#effectType button').forEach((b) => {
    b.classList.toggle('active', !!lit && b.dataset.val === lit.val);
  });
  const colourless = !!lastVal && !COLOURED.includes(lastVal);
  const row = document.getElementById('effectColours');
  if (!row) return;
  row.classList.toggle('inert', colourless);
  row.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.colour === onColour);
    b.disabled = colourless;
  });
}

export function noteDesignsEdited(designs) {
  if (!lit) return;
  if (lit.targets.some((it) => designs.includes(it.design))) {
    lit = null;
    syncEffectSeg();
  }
}

export function updateEffectControls() {
  if (state.series.mode !== 'list') {
    lit = null;
    lastVal = null;
  } else if (lit && !lit.targets.every((it) => state.series.items.includes(it))) {
    lit = null;
    lastVal = null;
  }
  syncEffectSeg();
  const hint = document.getElementById('effectScopeHint');
  if (!hint) return;
  if (state.series.mode !== 'list') {
    hint.textContent = 'Adds an on state for your button and starts a set.';
  } else if (state.ui.selectedItems.length === 1) {
    hint.textContent = 'Adds or updates the on state of the selected button.';
  } else if (state.ui.selectedItems.length > 1) {
    hint.textContent = 'Adds or updates on states for the ' + state.ui.selectedItems.length + ' selected buttons.';
  } else {
    hint.textContent = 'Adds or updates on states for all ' + state.series.items.length + ' buttons. Click a button first to target just one.';
  }
}

function effectFor(val) {
  const base = EFFECT_DEFAULTS[val];
  return COLOURED.includes(val) ? Object.assign({}, base, { color: onColour }) : base;
}

function runEffect(val) {
  const targets = makeOnState(effectFor(val)) || [];
  lit = targets.length ? { val, targets } : null;
  if (targets.length) lastVal = val;
  syncEffectSeg();
}

export function initEffects() {
  const seg = document.getElementById('effectType');
  seg.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => runEffect(btn.dataset.val));
  });
  const colours = document.getElementById('effectColours');
  if (colours) {
    for (const c of ON_COLOURS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.colour = c.color;
      btn.title = c.name + ' - the colour for Tint, Dot and Colour';
      const sw = document.createElement('span');
      sw.className = 'on-colour-sw';
      sw.style.background = c.color;
      btn.appendChild(sw);
      const cap = document.createElement('span');
      cap.textContent = c.name;
      btn.appendChild(cap);
      btn.addEventListener('click', () => {
        onColour = c.color;
        runEffect(lastVal && COLOURED.includes(lastVal) ? lastVal : 'colour');
      });
      colours.appendChild(btn);
    }
  }
  updateEffectControls();
}
