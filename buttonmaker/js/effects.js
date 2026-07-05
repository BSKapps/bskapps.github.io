import { state, emit, deepClone, dotLayer } from './state.js?v=119';
import { seriesVariants } from './series.js?v=119';
import { mixHex, isLightColor } from './color.js?v=119';
import { releaseSelection, selectListItem } from './ui.js?v=119';

export const EFFECT_DEFAULTS = {
  tint: { type: 'tint', color: '#1f9d3a', strength: 40, elements: { bg: true, icon: true, text: true } },
  highlight: { type: 'highlight', strength: 35, elements: { bg: true, icon: true, text: true } },
  invert: { type: 'invert', elements: { bg: true, icon: true, text: true } },
  dot: { type: 'dot', color: '#1f9d3a' }
};

export function applyEffectToDesign(design, effect) {
  const d = deepClone(design);
  if (effect.type === 'dot') {
    d.icons.push(dotLayer(effect.color));
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

function syncEffectSeg() {
  const seg = document.getElementById('effectType');
  if (!seg) return;
  seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', !!lit && b.dataset.val === lit.val));
}

export function noteDesignsEdited(designs) {
  if (!lit) return;
  if (lit.targets.some((it) => designs.includes(it.design))) {
    lit = null;
    syncEffectSeg();
  }
}

export function updateEffectControls() {
  if (lit && (state.series.mode !== 'list' || !lit.targets.every((it) => state.series.items.includes(it)))) {
    lit = null;
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

export function initEffects() {
  const seg = document.getElementById('effectType');
  seg.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targets = makeOnState(EFFECT_DEFAULTS[btn.dataset.val]) || [];
      lit = targets.length ? { val: btn.dataset.val, targets } : null;
      syncEffectSeg();
    });
  });
  updateEffectControls();
}
