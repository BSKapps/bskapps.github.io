import { state, emit, deepClone, defaultDesign, defaultTextLayer, defaultIconLayer, dotLayer, editTarget, editTargets, buttonCount } from './state.js?v=146';
import { triggerIconUpload } from './icons.js?v=146';
import { seriesVariants, numberSet, numberedCount, numberedRange } from './series.js?v=146';
import { noteDesignsEdited } from './effects.js?v=146';

const selectionSnapshots = new Map();
const materializedHere = new Set();

const PANEL_TABS = { bg: ['card-bg', 'card-shape'], icon: ['card-image'], text: ['card-text'], sets: ['card-sets', 'card-onstate'] };

function showPanelTab(key) {
  for (const [tab, cards] of Object.entries(PANEL_TABS)) {
    for (const cls of cards) {
      const card = document.querySelector('.' + cls);
      if (card) card.classList.toggle('tab-hidden', tab !== key);
    }
  }
  document.querySelectorAll('#panelTabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === key));
}

function placeBgInvert(mode) {
  const label = document.querySelector('label[for="bgInvert"]');
  const input = document.getElementById('bgInvert');
  if (!label || !input) return;
  const host = document.getElementById(mode === 'gradient' ? 'bgGradToRow' : 'bgSolidRow');
  if (!host || input.parentElement === host) return;
  host.appendChild(label);
  host.appendChild(input);
}

function clampSeriesNum(n) {
  return Math.max(0, Math.min(999, Math.round(n * 100) / 100));
}

function discardIfUnchanged(item) {
  if (!item) return;
  const snap = selectionSnapshots.get(item);
  if (item.design && snap && materializedHere.has(item) && JSON.stringify(item.design) === snap) {
    delete item.design;
  }
  selectionSnapshots.delete(item);
  materializedHere.delete(item);
}

export function releaseSelection() {
  for (const item of [...selectionSnapshots.keys()]) discardIfUnchanged(item);
  selectionSnapshots.clear();
  materializedHere.clear();
  state.ui.selectedItems = [];
}

function materialize(i) {
  const item = state.series.items[i];
  if (!item) return false;
  if (!item.design) {
    const v = seriesVariants()[i];
    if (!v) return false;
    item.design = v.design;
    materializedHere.add(item);
  }
  if (!selectionSnapshots.has(item)) selectionSnapshots.set(item, JSON.stringify(item.design));
  return true;
}

function focusActiveLayers() {
  const d = editTarget();
  state.ui.activeText = Math.min(state.ui.activeText, d.texts.length - 1);
  state.ui.activeIcon = Math.min(state.ui.activeIcon, d.icons.length - 1);
}

export function selectListItem(i, additive = false) {
  if (state.series.mode !== 'list') return;
  const sel = state.ui.selectedItems;
  if (additive) {
    const pos = sel.indexOf(i);
    if (pos !== -1) {
      discardIfUnchanged(state.series.items[i]);
      sel.splice(pos, 1);
    } else {
      if (!materialize(i)) return;
      sel.push(i);
    }
  } else {
    if (sel.length === 1 && sel[0] === i) return;
    releaseSelection();
    if (!materialize(i)) return;
    state.ui.selectedItems = [i];
    focusActiveLayers();
  }
  emit();
}

export function selectRangeTo(i) {
  if (state.series.mode !== 'list') return;
  const sel = state.ui.selectedItems;
  if (!sel.length) {
    selectListItem(i);
    return;
  }
  const anchor = sel[sel.length - 1];
  const lo = Math.min(anchor, i);
  const hi = Math.max(anchor, i);
  for (let k = lo; k <= hi; k++) {
    if (!sel.includes(k) && materialize(k)) sel.push(k);
  }
  const pos = sel.indexOf(i);
  if (pos !== -1) {
    sel.splice(pos, 1);
    sel.push(i);
  }
  emit();
}

export function deselectListItem() {
  if (!state.ui.selectedItems.length) return;
  releaseSelection();
  state.ui.activeText = 0;
  state.ui.activeIcon = 0;
  emit();
}

export function selectAllListItems() {
  if (state.series.mode !== 'list' || !state.series.items.length) return;
  releaseSelection();
  const sel = [];
  for (let i = 0; i < state.series.items.length; i++) {
    if (materialize(i)) sel.push(i);
  }
  state.ui.selectedItems = sel;
  if (sel.length) focusActiveLayers();
  emit();
}

export function addListItem() {
  if (state.series.mode !== 'list' || state.series.items.length >= 64) return;
  state.series.items.push({ label: '', color: '', design: defaultDesign() });
  selectListItem(state.series.items.length - 1);
}

export function removeListItem(i) {
  const items = state.series.items;
  const target = items[i];
  if (!target) return;
  const removeIdx = [i];
  if (target.id) {
    const onIdx = items.findIndex((it) => it && it.onStateOf === target.id);
    if (onIdx >= 0 && onIdx !== i) removeIdx.push(onIdx);
  }
  for (const idx of removeIdx) {
    selectionSnapshots.delete(items[idx]);
    materializedHere.delete(items[idx]);
  }
  const removeSet = new Set(removeIdx);
  state.ui.selectedItems = state.ui.selectedItems
    .filter((s) => !removeSet.has(s))
    .map((s) => s - removeIdx.filter((r) => r < s).length);
  removeIdx.sort((a, b) => b - a).forEach((idx) => items.splice(idx, 1));
  if (items.length === 0) {
    state.series.mode = 'off';
    state.ui.selectedItems = [];
  }
  emit();
}

export function seriesForSnapshot() {
  const s = deepClone(state.series);
  s.items.forEach((clone, i) => {
    const orig = state.series.items[i];
    const snap = orig && selectionSnapshots.get(orig);
    if (clone.design && snap && materializedHere.has(orig) && JSON.stringify(orig.design) === snap) delete clone.design;
  });
  return s;
}

function syncSelectedLabels() {
  if (state.series.mode !== 'list') return;
  for (const i of state.ui.selectedItems) {
    const item = state.series.items[i];
    if (!item || !item.design) continue;
    const t = item.design.texts.find((l) => l.value);
    item.label = t ? t.value.split('\n')[0] : '';
  }
}

function syncOnStateText(newVal) {
  if (state.series.mode !== 'list') return;
  const items = state.series.items;
  const li = state.ui.activeText;
  for (const idx of state.ui.selectedItems) {
    const src = items[idx];
    if (!src || !src.id || !src.design) continue;
    const onState = items.find((it) => it && it.onStateOf === src.id);
    if (!onState || !onState.design) continue;
    const srcLayer = src.design.texts[li];
    const onLayer = onState.design.texts[li];
    if (!srcLayer || !onLayer || onLayer.value !== srcLayer.value) continue;
    onLayer.value = newVal;
    const t = onState.design.texts.find((l) => l.value);
    onState.label = t ? t.value.split('\n')[0] : '';
  }
}

function applyEdit(fn) {
  const targets = editTargets();
  for (const d of targets) fn(d);
  noteDesignsEdited(targets);
}

function darken(hex, f) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function textOf(d) {
  return d.texts[Math.max(0, Math.min(state.ui.activeText, d.texts.length - 1))];
}

function iconOf(d) {
  return d.icons[Math.max(0, Math.min(state.ui.activeIcon, d.icons.length - 1))];
}

function textLayersOf(d) {
  return state.ui.allText ? d.texts : [textOf(d)];
}

function iconLayersOf(d) {
  return state.ui.allIcons ? d.icons : [iconOf(d)];
}

function refText() {
  return state.ui.allText ? editTarget().texts[0] : activeText();
}

function refIcon() {
  return state.ui.allIcons ? editTarget().icons[0] : activeIcon();
}

function applyRelative(all, layersOf, ref, prop, v, min, max) {
  if (!all) {
    applyEdit((d) => {
      for (const l of layersOf(d)) l[prop] = v;
    });
    return;
  }
  let delta = v - (ref[prop] || 0);
  for (const d of editTargets()) {
    for (const l of layersOf(d)) {
      const cur = l[prop] || 0;
      delta = delta > 0 ? Math.min(delta, max - cur) : Math.max(delta, min - cur);
    }
  }
  applyEdit((d) => {
    for (const l of layersOf(d)) {
      l[prop] = (l[prop] || 0) + delta;
    }
  });
}

const FONT_WEIGHTS = {
  'Inter': ['400', '600', '700', '800'],
  'Oswald': ['400', '600', '700'],
  'Bebas Neue': ['400'],
  'Montserrat': ['400', '600', '700', '800'],
  'Roboto Condensed': ['400', '700'],
  'JetBrains Mono': ['400', '700', '800'],
  'Archivo Black': ['400'],
  'Nunito': ['400', '600', '700', '800'],
  'Arial': ['400', '700'],
  'Helvetica Neue': ['400', '700'],
  'Georgia': ['400', '700']
};

const WEIGHT_LABELS = { '400': 'Regular', '600': 'Semibold', '700': 'Bold', '800': 'Heavy' };

function weightsFor(font) {
  return FONT_WEIGHTS[font] || ['400', '700'];
}

function nearestWeight(options, weight) {
  const w = Number(weight);
  return options.reduce((best, o) => (Math.abs(Number(o) - w) < Math.abs(Number(best) - w) ? o : best), options[0]);
}

function rebuildWeightOptions(font, current) {
  const select = document.getElementById('textWeight');
  const options = weightsFor(font);
  const value = options.includes(current) ? current : nearestWeight(options, current);
  select.innerHTML = options
    .map((o) => '<option value="' + o + '">' + WEIGHT_LABELS[o] + '</option>')
    .join('');
  select.value = value;
  select.disabled = options.length === 1;
  return value;
}

function activeIcon() {
  const icons = editTarget().icons;
  if (state.ui.activeIcon >= icons.length) state.ui.activeIcon = icons.length - 1;
  return icons[state.ui.activeIcon];
}

function activeText() {
  const texts = editTarget().texts;
  if (state.ui.activeText >= texts.length) state.ui.activeText = texts.length - 1;
  return texts[state.ui.activeText];
}

function bindRange(id, getSet, valId, step = 1) {
  const el = document.getElementById(id);
  const val = valId ? document.getElementById(valId) : null;
  el.addEventListener('input', () => {
    getSet(Number(el.value));
    if (val) val.value = el.value;
    emit();
  });
  if (el.dataset.default !== undefined) {
    el.addEventListener('dblclick', () => {
      const def = Number(el.dataset.default);
      el.value = def;
      if (val) val.value = def;
      getSet(def);
      emit();
    });
  }
  if (val) {
    val.min = el.min;
    val.max = el.max;
    if (step !== 1) val.step = step;
    val.addEventListener('change', () => {
      let n = Number(val.value);
      if (val.value === '' || Number.isNaN(n)) {
        val.value = el.value;
        return;
      }
      n = Math.max(Number(el.min), Math.min(Number(el.max), Math.round(n / step) * step));
      val.value = n;
      el.value = n;
      getSet(n);
      emit();
    });
  }
}

function bindColor(id, getSet) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    getSet(el.value);
    emit();
  });
}

function bindSelect(id, getSet) {
  const el = document.getElementById(id);
  el.addEventListener('change', () => {
    getSet(el.value);
    emit();
  });
}

function bindSeg(id, getSet) {
  const seg = document.getElementById(id);
  seg.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      getSet(btn.dataset.val);
      emit();
    });
  });
}

export function initUI() {
  let bgColorTouched = false;
  bindSeg('bgMode', (v) => {
    applyEdit((d) => {
      if (v === 'gradient' && d.bg.mode === 'solid' && bgColorTouched) {
        d.bg.gradFrom = d.bg.color;
        d.bg.gradTo = darken(d.bg.color, 0.45);
      }
      d.bg.mode = v;
    });
    if (v === 'gradient') bgColorTouched = false;
    document.getElementById('bgSolidRow').classList.toggle('hidden', v !== 'solid');
    document.getElementById('bgGradientRows').classList.toggle('hidden', v !== 'gradient');
    document.getElementById('bgImageRows').classList.toggle('hidden', v !== 'image');
    document.getElementById('bgOpacityRow').classList.toggle('hidden', v === 'image');
    placeBgInvert(v);
  });
  bindColor('bgColor', (v) => {
    bgColorTouched = true;
    applyEdit((d) => (d.bg.color = v));
  });
  bindColor('bgColor2a', (v) => applyEdit((d) => (d.bg.gradFrom = v)));
  bindColor('bgColor2b', (v) => applyEdit((d) => (d.bg.gradTo = v)));
  bindRange('bgAngle', (v) => applyEdit((d) => (d.bg.angle = v)), 'bgAngleVal');
  bindRange('bgBlend', (v) => applyEdit((d) => (d.bg.blend = v)), 'bgBlendVal');
  bindSelect('bgImageFit', (v) => applyEdit((d) => (d.bg.imageFit = v)));
  bindRange('bgOpacity', (v) => applyEdit((d) => (d.bg.opacity = v)), 'bgOpacityVal');
  bindRange('bgImageDim', (v) => applyEdit((d) => (d.bg.imageDim = v)), 'bgImageDimVal');
  bindRange('bgImageRotate', (v) => applyEdit((d) => (d.bg.imageRotation = v)), 'bgImageRotateVal');

  document.getElementById('bgImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      applyEdit((d) => {
        d.bg.imageData = reader.result;
        d.bg.mode = 'image';
      });
      emit();
    };
    reader.readAsDataURL(file);
  });

  bindColor('iconColor', (v) => applyEdit((d) => {
    for (const ic of iconLayersOf(d)) {
      ic.color = v;
      ic.tint = true;
    }
  }));
  bindRange('iconSize', (v) => applyRelative(state.ui.allIcons, iconLayersOf, refIcon(), 'size', v, 10, 150), 'iconSizeVal', 0.5);
  bindRange('iconX', (v) => applyRelative(state.ui.allIcons, iconLayersOf, refIcon(), 'x', v, -40, 40), 'iconXVal');
  bindRange('iconY', (v) => applyRelative(state.ui.allIcons, iconLayersOf, refIcon(), 'y', v, -40, 40), 'iconYVal');
  bindRange('iconOpacity', (v) => applyEdit((d) => {
    for (const ic of iconLayersOf(d)) ic.opacity = v;
  }), 'iconOpacityVal');
  bindRange('iconRotate', (v) => applyRelative(state.ui.allIcons, iconLayersOf, refIcon(), 'rotation', v, -180, 180), 'iconRotateVal');
  document.getElementById('iconReverse').addEventListener('change', (e) => {
    applyEdit((d) => {
      for (const ic of iconLayersOf(d)) ic.reverse = e.target.checked;
    });
    emit();
  });

  document.getElementById('iconUploadSidebar').addEventListener('click', triggerIconUpload);

  document.getElementById('iconAddDot').addEventListener('click', () => {
    applyEdit((d) => {
      if (d.icons.length < 6) d.icons.push(dotLayer());
    });
    state.ui.allIcons = false;
    state.ui.activeIcon = editTarget().icons.length - 1;
    emit();
  });

  document.getElementById('iconCentre').addEventListener('click', () => {
    applyEdit((d) => {
      for (const ic of iconLayersOf(d)) {
        if (!ic.svg) continue;
        ic.contentCenter = true;
        ic.align = 'center:center';
        ic.x = 0;
        ic.y = 0;
      }
    });
    emit();
  });

  const guidesCb = document.getElementById('centreGuides');
  const guidesEl = document.getElementById('previewGuides');
  const applyGuides = () => guidesEl.classList.toggle('hidden', !guidesCb.checked);
  try { guidesCb.checked = localStorage.getItem('cbm-centre-guides') === '1'; } catch (e) {}
  applyGuides();
  guidesCb.addEventListener('change', () => {
    try { localStorage.setItem('cbm-centre-guides', guidesCb.checked ? '1' : '0'); } catch (e) {}
    applyGuides();
  });

  document.getElementById('bgInvert').addEventListener('change', (e) => {
    applyEdit((d) => (d.bg.invert = e.target.checked));
    emit();
  });
  document.getElementById('iconInvert').addEventListener('change', (e) => {
    applyEdit((d) => {
      for (const ic of iconLayersOf(d)) ic.invert = e.target.checked;
    });
    emit();
  });
  document.getElementById('textInvert').addEventListener('change', (e) => {
    applyEdit((d) => {
      for (const t of textLayersOf(d)) t.invert = e.target.checked;
    });
    emit();
  });
  for (const edge of ['top', 'bottom', 'left', 'right']) {
    document.getElementById('edge' + edge[0].toUpperCase() + edge.slice(1)).addEventListener('change', (e) => {
      applyEdit((d) => {
        if (!d.shape.edges) d.shape.edges = { top: true, bottom: true, left: true, right: true };
        d.shape.edges[edge] = e.target.checked;
      });
      emit();
    });
  }
  document.getElementById('shapeSquircle').addEventListener('change', (e) => {
    applyEdit((d) => (d.shape.squircle = e.target.checked));
    emit();
  });

  bindSeg('iconAlign', (v) => applyEdit((d) => {
    for (const ic of iconLayersOf(d)) ic.align = v;
  }));

  document.getElementById('textValue').addEventListener('input', (e) => {
    if (state.ui.allText) return;
    if (state.series.mode === 'list' && !state.ui.selectedItems.length) return;
    syncOnStateText(e.target.value);
    applyEdit((d) => (textOf(d).value = e.target.value));
    syncSelectedLabels();
    emit();
  });
  bindSelect('textFont', (v) => {
    const w = rebuildWeightOptions(v, refText().weight);
    applyEdit((d) => {
      for (const t of textLayersOf(d)) {
        t.font = v;
        t.weight = w;
      }
    });
  });
  bindSelect('textWeight', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.weight = v;
  }));
  bindRange('textSize', (v) => applyRelative(state.ui.allText, textLayersOf, refText(), 'size', v, 6, 96), 'textSizeVal', 0.5);
  bindColor('textColor', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.color = v;
  }));
  bindRange('textOutline', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.outline = v;
  }), 'textOutlineVal', 0.5);
  bindColor('textOutlineColor', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.outlineColor = v;
  }));
  bindRange('textOpacity', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.opacity = v;
  }), 'textOpacityVal');
  bindSeg('textAlign', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.align = v;
  }));
  bindRange('textX', (v) => applyRelative(state.ui.allText, textLayersOf, refText(), 'x', v, -40, 40), 'textXVal');
  bindRange('textY', (v) => applyRelative(state.ui.allText, textLayersOf, refText(), 'y', v, -40, 40), 'textYVal');
  bindRange('textRotate', (v) => applyRelative(state.ui.allText, textLayersOf, refText(), 'rotation', v, -180, 180), 'textRotateVal');
  bindRange('textBend', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.bend = v;
  }), 'textBendVal');

  bindRange('shapeRadius', (v) => applyEdit((d) => (d.shape.radius = v)), 'shapeRadiusVal');
  bindRange('shapeBorder', (v) => applyEdit((d) => (d.shape.border = v)), 'shapeBorderVal', 0.5);
  bindColor('shapeBorderColor', (v) => applyEdit((d) => (d.shape.borderColor = v)));
  bindRange('shapeRotate', (v) => applyEdit((d) => (d.shape.rotation = v)), 'shapeRotateVal');
  bindRange('shapeZoom', (v) => applyEdit((d) => (d.shape.zoom = v)), 'shapeZoomVal');

  document.querySelectorAll('#panelTabs button').forEach((btn) => {
    btn.addEventListener('click', () => showPanelTab(btn.dataset.tab));
  });
  document.querySelectorAll('.panel .section > summary').forEach((sum) => {
    sum.setAttribute('tabindex', '-1');
  });
  showPanelTab('bg');

  document.getElementById('editAllBtn').addEventListener('click', deselectListItem);

  document.getElementById('seriesNumberBtn').addEventListener('click', () => {
    document.getElementById('seriesFrom').dispatchEvent(new Event('change'));
    document.getElementById('seriesTo').dispatchEvent(new Event('change'));
    const items = state.series.items;
    const atRisk = items.length > 1 || items.some((it) => it.design || (it.label && it.label.trim()));
    const noun = items.length === 1 ? ' button' : ' buttons';
    if (atRisk && !confirm('Replace the ' + items.length + noun + ' in your set with a numbered set?')) return;
    releaseSelection();
    convertNumberedToList();
    emit();
    const total = numberedCount(state.series.from, state.series.to);
    if (total > 64) {
      const nums = numberedRange(state.series.from, state.series.to);
      alert('That range makes ' + total + ' buttons and a set holds 64, so it stops at ' + nums[nums.length - 1] + '.');
    }
  });

  const bindSeriesNum = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('change', () => {
      let n = parseFloat(el.value);
      if (Number.isNaN(n)) n = state.series[key];
      n = clampSeriesNum(n);
      state.series[key] = n;
      el.value = n;
      emit();
    });
  };
  bindSeriesNum('seriesFrom', 'from');
  bindSeriesNum('seriesTo', 'to');
  bindSelect('exportSize', (v) => (state.export.size = Number(v)));

  renderTextLayerChips();
  renderIconLayerChips();
  syncInputsFromState();
}

export function convertNumberedToList() {
  state.series.items = numberSet(state.design, state.series.from, state.series.to);
  state.series.mode = 'list';
}

export function renderTextLayerChips() {
  const wrap = document.getElementById('textLayerChips');
  wrap.innerHTML = '';
  const texts = editTarget().texts;
  if (texts.length < 2) state.ui.allText = false;

  if (texts.length > 1) {
    const allChip = document.createElement('button');
    allChip.textContent = 'All';
    allChip.title = 'Size and move every text layer together';
    allChip.classList.toggle('active', state.ui.allText);
    allChip.addEventListener('click', () => {
      state.ui.allText = true;
      emit();
    });
    wrap.appendChild(allChip);
  }

  texts.forEach((t, i) => {
    const chip = document.createElement('button');
    chip.textContent = t.value ? truncate(t.value, 10) : 'Layer ' + (i + 1);
    chip.classList.toggle('active', !state.ui.allText && i === state.ui.activeText);
    chip.addEventListener('click', () => {
      state.ui.allText = false;
      state.ui.activeText = i;
      emit();
    });
    chip.appendChild(chipDeleteX(() => {
      applyEdit((d) => {
        if (d.texts.length > 1) d.texts.splice(i, 1);
        else d.texts[0] = defaultTextLayer();
      });
      if (i <= state.ui.activeText) state.ui.activeText = Math.max(0, state.ui.activeText - 1);
      state.ui.activeText = Math.min(state.ui.activeText, editTarget().texts.length - 1);
      state.ui.allText = false;
      syncSelectedLabels();
      emit();
    }));
    wrap.appendChild(chip);
  });

  if (texts.length < 12) {
    const add = document.createElement('button');
    add.className = 'chip-action';
    add.textContent = '+ Layer';
    add.addEventListener('click', () => {
      const li = Math.min(state.ui.activeText, editTarget().texts.length - 1);
      applyEdit((d) => {
        if (d.texts.length < 12) {
          const src = d.texts[Math.min(li, d.texts.length - 1)];
          d.texts.push(Object.assign(deepClone(src), { value: '' }));
        }
      });
      state.ui.allText = false;
      state.ui.activeText = editTarget().texts.length - 1;
      emit();
    });
    wrap.appendChild(add);
  }

}

export function renderIconLayerChips() {
  const wrap = document.getElementById('iconLayerChips');
  wrap.innerHTML = '';
  const icons = editTarget().icons;
  if (icons.length < 2) state.ui.allIcons = false;

  if (icons.length > 1) {
    const allChip = document.createElement('button');
    allChip.textContent = 'All';
    allChip.title = 'Size and move every image layer together';
    allChip.classList.toggle('active', state.ui.allIcons);
    allChip.addEventListener('click', () => {
      state.ui.allIcons = true;
      emit();
    });
    wrap.appendChild(allChip);
  }

  icons.forEach((ic, i) => {
    const chip = document.createElement('button');
    chip.textContent = ic.name ? truncate(ic.name.split(':').pop(), 10) : 'Layer ' + (i + 1);
    chip.classList.toggle('active', !state.ui.allIcons && i === state.ui.activeIcon);
    chip.addEventListener('click', () => {
      state.ui.allIcons = false;
      state.ui.activeIcon = i;
      emit();
    });
    chip.appendChild(chipDeleteX(() => {
      applyEdit((d) => {
        if (d.icons.length > 1) d.icons.splice(i, 1);
        else d.icons[0] = defaultIconLayer();
      });
      if (i <= state.ui.activeIcon) state.ui.activeIcon = Math.max(0, state.ui.activeIcon - 1);
      state.ui.activeIcon = Math.min(state.ui.activeIcon, editTarget().icons.length - 1);
      state.ui.allIcons = false;
      emit();
    }));
    wrap.appendChild(chip);
  });

  if (icons.length < 6) {
    const add = document.createElement('button');
    add.className = 'chip-action';
    add.textContent = '+ Layer';
    add.addEventListener('click', () => {
      applyEdit((d) => {
        if (d.icons.length < 6) d.icons.push(defaultIconLayer());
      });
      state.ui.allIcons = false;
      state.ui.activeIcon = editTarget().icons.length - 1;
      emit();
    });
    wrap.appendChild(add);
  }

}

function truncate(s, len) {
  return s.length > len ? s.slice(0, len) + '...' : s;
}

function chipDeleteX(onDelete) {
  const x = document.createElement('span');
  x.className = 'chip-x';
  x.textContent = 'x';
  x.title = 'Delete this layer';
  x.setAttribute('role', 'button');
  x.setAttribute('aria-label', 'Delete this layer');
  x.tabIndex = 0;
  x.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete();
  });
  x.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onDelete();
    }
  });
  return x;
}

export function syncInputsFromState() {
  if (state.series.mode !== 'list') {
    if (state.ui.selectedItems.length || selectionSnapshots.size) {
      releaseSelection();
    }
  } else {
    state.ui.selectedItems = state.ui.selectedItems.filter((i) => state.series.items[i]);
  }
  updateEditBanner();
  const d = editTarget();
  setVal('bgColor', d.bg.color);
  setVal('bgColor2a', d.bg.gradFrom);
  setVal('bgColor2b', d.bg.gradTo);
  setRange('bgAngle', d.bg.angle, 'bgAngleVal');
  setRange('bgBlend', d.bg.blend === undefined ? 100 : d.bg.blend, 'bgBlendVal');
  setRange('bgOpacity', d.bg.opacity === undefined ? 100 : d.bg.opacity, 'bgOpacityVal');
  setVal('bgImageFit', d.bg.imageFit);
  setRange('bgImageDim', d.bg.imageDim, 'bgImageDimVal');
  setRange('bgImageRotate', d.bg.imageRotation || 0, 'bgImageRotateVal');
  const ic = refIcon();
  setVal('iconColor', ic.color);
  setRange('iconSize', ic.size, 'iconSizeVal');
  setRange('iconX', ic.x, 'iconXVal');
  setRange('iconY', ic.y, 'iconYVal');
  setRange('iconOpacity', ic.opacity === undefined ? 100 : ic.opacity, 'iconOpacityVal');
  setRange('iconRotate', ic.rotation || 0, 'iconRotateVal');
  document.getElementById('iconReverse').checked = !!ic.reverse;
  document.getElementById('iconInvert').checked = !!ic.invert;
  const t = refText();
  const textField = document.getElementById('textValue');
  const listEditAll = state.series.mode === 'list' && !state.ui.selectedItems.length;
  textField.disabled = state.ui.allText || listEditAll;
  setVal('textValue', textField.disabled ? '' : t.value);
  textField.placeholder = state.ui.allText
    ? 'Pick a single layer to edit its text'
    : listEditAll
      ? 'Each button shows its name. Click one in the set to change its text.'
      : 'PC';
  setVal('textFont', t.font);
  rebuildWeightOptions(t.font, t.weight);
  setRange('textSize', t.size, 'textSizeVal');
  setVal('textColor', t.color);
  document.getElementById('textInvert').checked = !!t.invert;
  setRange('textOutline', t.outline || 0, 'textOutlineVal');
  setVal('textOutlineColor', t.outlineColor || '#000000');
  setRange('textOpacity', t.opacity === undefined ? 100 : t.opacity, 'textOpacityVal');
  setRange('textX', t.x || 0, 'textXVal');
  setRange('textY', t.y || 0, 'textYVal');
  setRange('textRotate', t.rotation || 0, 'textRotateVal');
  setRange('textBend', t.bend || 0, 'textBendVal');
  setRange('shapeRadius', d.shape.radius, 'shapeRadiusVal');
  setRange('shapeBorder', d.shape.border, 'shapeBorderVal');
  setVal('shapeBorderColor', d.shape.borderColor);
  const edges = d.shape.edges || { top: true, bottom: true, left: true, right: true };
  for (const edge of ['top', 'bottom', 'left', 'right']) {
    document.getElementById('edge' + edge[0].toUpperCase() + edge.slice(1)).checked = edges[edge] !== false;
  }
  document.getElementById('shapeSquircle').checked = !!d.shape.squircle;
  setRange('shapeRotate', d.shape.rotation || 0, 'shapeRotateVal');
  setRange('shapeZoom', d.shape.zoom === undefined ? 100 : d.shape.zoom, 'shapeZoomVal');

  setSeg('bgMode', d.bg.mode);
  document.getElementById('bgSolidRow').classList.toggle('hidden', d.bg.mode !== 'solid');
  document.getElementById('bgGradientRows').classList.toggle('hidden', d.bg.mode !== 'gradient');
  document.getElementById('bgImageRows').classList.toggle('hidden', d.bg.mode !== 'image');
  document.getElementById('bgOpacityRow').classList.toggle('hidden', d.bg.mode === 'image');
  placeBgInvert(d.bg.mode);
  document.getElementById('bgInvert').checked = !!d.bg.invert;
  setSeg('textAlign', t.align);

  setVal('seriesFrom', state.series.from);
  setVal('seriesTo', state.series.to);

  const iconLayers = editTarget().icons;
  const clearBtn = document.getElementById('clearIcon');
  clearBtn.textContent = state.ui.allIcons ? 'Clear All' : 'Clear';
  clearBtn.disabled = state.ui.allIcons ? !iconLayers.some((l) => l.svg) : !ic.svg;
  document.getElementById('iconCentre').disabled = state.ui.allIcons || !ic.svg;
  const iconSrc = state.ui.allIcons ? null
    : ic.name === 'status-dot' ? 'iconAddDot'
    : ic.name && ic.name.indexOf('upload:') === 0 ? 'iconUploadSidebar'
    : ic.svg ? 'openIconPicker' : null;
  for (const id of ['openIconPicker', 'iconUploadSidebar', 'iconAddDot']) {
    const el = document.getElementById(id);
    el.disabled = state.ui.allIcons;
    el.classList.toggle('active', id === iconSrc);
  }
  document.getElementById('exportZip').disabled = buttonCount() <= 1;

  setSeg('iconAlign', ic.align || 'center:center');
}

function updateEditBanner() {
  const banner = document.getElementById('editStatus');
  const bLabel = document.getElementById('editStatusLabel');
  const bAll = document.getElementById('editAllBtn');
  const sel = state.ui.selectedItems;
  if (state.series.mode === 'list' && sel.length) {
    banner.classList.remove('idle');
    banner.classList.add('one');
    if (sel.length === 1) {
      const item = state.series.items[sel[0]];
      bLabel.textContent = 'Editing "' + ((item && item.label) || 'button ' + (sel[0] + 1)) + '" only';
    } else {
      bLabel.textContent = 'Editing ' + sel.length + ' buttons together';
    }
    bAll.classList.remove('hidden');
  } else if (state.series.mode === 'list' && state.series.items.length) {
    banner.classList.remove('idle');
    banner.classList.remove('one');
    bLabel.textContent = 'Editing every button in the set.';
    bAll.classList.add('hidden');
  } else {
    banner.classList.add('idle');
    banner.classList.remove('one');
    bLabel.textContent = '';
    bAll.classList.add('hidden');
  }
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (document.activeElement === el) return;
  if (el.value !== String(v)) el.value = v;
}

function setRange(id, v, valId) {
  document.getElementById(id).value = v;
  const val = document.getElementById(valId);
  if (document.activeElement !== val) val.value = v;
}

function setSeg(id, v) {
  document.getElementById(id).querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.val === v);
  });
}
