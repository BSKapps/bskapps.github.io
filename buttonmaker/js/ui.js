import { state, emit, deepClone, defaultTextLayer, defaultIconLayer, editTarget, editTargets, primarySelection } from './state.js?v=42';
import { triggerIconUpload } from './icons.js?v=42';
import { seriesVariants, hasToken } from './series.js?v=42';

const selectionSnapshots = new Map();

function discardIfUnchanged(item) {
  if (!item) return;
  const snap = selectionSnapshots.get(item);
  if (item.design && snap && JSON.stringify(item.design) === snap) {
    delete item.design;
  }
  selectionSnapshots.delete(item);
}

function releaseSelection() {
  for (const item of [...selectionSnapshots.keys()]) discardIfUnchanged(item);
  selectionSnapshots.clear();
  state.ui.selectedItems = [];
}

function materialize(i) {
  const item = state.series.items[i];
  if (!item) return false;
  if (!item.design) {
    const v = seriesVariants()[i];
    if (!v) return false;
    item.design = v.design;
  }
  if (!selectionSnapshots.has(item)) selectionSnapshots.set(item, JSON.stringify(item.design));
  return true;
}

function focusActiveLayers() {
  const d = editTarget();
  state.ui.activeText = Math.max(0, d.texts.findIndex((t) => t.value));
  state.ui.activeIcon = Math.max(0, d.icons.findIndex((ic) => ic.svg));
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
  }
  focusActiveLayers();
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
  focusActiveLayers();
  emit();
}

export function deselectListItem() {
  if (!state.ui.selectedItems.length) return;
  releaseSelection();
  state.ui.activeText = 0;
  state.ui.activeIcon = 0;
  emit();
}

export function addListItem() {
  if (state.series.mode !== 'list' || state.series.items.length >= 64) return;
  state.series.items.push({ label: '', color: '' });
  selectListItem(state.series.items.length - 1);
}

export function removeListItem(i) {
  const item = state.series.items[i];
  if (item) selectionSnapshots.delete(item);
  state.ui.selectedItems = state.ui.selectedItems
    .filter((s) => s !== i)
    .map((s) => (s > i ? s - 1 : s));
  state.series.items.splice(i, 1);
  emit();
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

function applyEdit(fn) {
  for (const d of editTargets()) fn(d);
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
  const delta = v - (ref[prop] || 0);
  applyEdit((d) => {
    for (const l of layersOf(d)) {
      l[prop] = Math.max(min, Math.min(max, (l[prop] || 0) + delta));
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

function iconAnchorOffset() {
  return Math.max(0, Math.min(40, Math.round(50 - refIcon().size / 2)));
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

function bindRange(id, getSet, valId) {
  const el = document.getElementById(id);
  const val = valId ? document.getElementById(valId) : null;
  el.addEventListener('input', () => {
    getSet(Number(el.value));
    if (val) val.value = el.value;
    emit();
  });
  if (val) {
    val.min = el.min;
    val.max = el.max;
    val.addEventListener('change', () => {
      let n = Number(val.value);
      if (val.value === '' || Number.isNaN(n)) {
        val.value = el.value;
        return;
      }
      n = Math.max(Number(el.min), Math.min(Number(el.max), Math.round(n)));
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
  bindSeg('bgMode', (v) => {
    applyEdit((d) => (d.bg.mode = v));
    document.getElementById('bgSolidRow').classList.toggle('hidden', v !== 'solid');
    document.getElementById('bgGradientRows').classList.toggle('hidden', v !== 'gradient');
    document.getElementById('bgImageRows').classList.toggle('hidden', v !== 'image');
  });
  bindColor('bgColor', (v) => applyEdit((d) => (d.bg.color = v)));
  bindColor('bgColor2a', (v) => applyEdit((d) => (d.bg.gradFrom = v)));
  bindColor('bgColor2b', (v) => applyEdit((d) => (d.bg.gradTo = v)));
  bindRange('bgAngle', (v) => applyEdit((d) => (d.bg.angle = v)), 'bgAngleVal');
  bindRange('bgBlend', (v) => applyEdit((d) => (d.bg.blend = v)), 'bgBlendVal');
  bindSelect('bgImageFit', (v) => applyEdit((d) => (d.bg.imageFit = v)));
  bindRange('bgImageDim', (v) => applyEdit((d) => (d.bg.imageDim = v)), 'bgImageDimVal');

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
  bindRange('iconSize', (v) => applyRelative(state.ui.allIcons, iconLayersOf, refIcon(), 'size', v, 10, 100), 'iconSizeVal');
  bindRange('iconX', (v) => applyRelative(state.ui.allIcons, iconLayersOf, refIcon(), 'x', v, -40, 40), 'iconXVal');
  bindRange('iconY', (v) => applyRelative(state.ui.allIcons, iconLayersOf, refIcon(), 'y', v, -40, 40), 'iconYVal');
  bindRange('iconOpacity', (v) => applyEdit((d) => {
    for (const ic of iconLayersOf(d)) ic.opacity = v;
  }), 'iconOpacityVal');

  document.getElementById('iconUploadSidebar').addEventListener('click', triggerIconUpload);

  bindSeg('iconAlign', (v) => applyEdit((d) => {
    for (const ic of iconLayersOf(d)) {
      const [hh, vv] = v.split(':');
      const off = Math.max(0, Math.min(40, Math.round(50 - ic.size / 2)));
      ic.x = hh === 'left' ? -off : hh === 'right' ? off : 0;
      ic.y = vv === 'top' ? -off : vv === 'bottom' ? off : 0;
    }
  }));

  document.getElementById('textValue').addEventListener('input', (e) => {
    if (state.ui.allText) return;
    if (state.series.mode === 'list' && !state.ui.selectedItems.length) return;
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
  bindRange('textSize', (v) => applyRelative(state.ui.allText, textLayersOf, refText(), 'size', v, 6, 96), 'textSizeVal');
  bindColor('textColor', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.color = v;
  }));
  bindSeg('textAlign', (v) => applyEdit((d) => {
    for (const t of textLayersOf(d)) t.align = v;
  }));
  bindRange('textX', (v) => applyRelative(state.ui.allText, textLayersOf, refText(), 'x', v, -40, 40), 'textXVal');
  bindRange('textY', (v) => applyRelative(state.ui.allText, textLayersOf, refText(), 'y', v, -40, 40), 'textYVal');

  bindRange('shapeRadius', (v) => applyEdit((d) => (d.shape.radius = v)), 'shapeRadiusVal');
  bindRange('shapeBorder', (v) => applyEdit((d) => (d.shape.border = v)), 'shapeBorderVal');
  bindColor('shapeBorderColor', (v) => applyEdit((d) => (d.shape.borderColor = v)));

  bindSeg('seriesMode', (v) => {
    if (v !== 'list') releaseSelection();
    state.series.mode = v;
    document.getElementById('seriesNumbersRows').classList.toggle('hidden', v !== 'numbers');
    document.getElementById('seriesListRows').classList.toggle('hidden', v !== 'list');
  });

  document.getElementById('editAllBtn').addEventListener('click', deselectListItem);

  document.getElementById('seriesConvertList').addEventListener('click', () => {
    convertNumberedToList();
    emit();
  });

  document.getElementById('seriesFrom').addEventListener('input', (e) => {
    state.series.from = Number(e.target.value) || 0;
    emit();
  });
  document.getElementById('seriesTo').addEventListener('input', (e) => {
    state.series.to = Number(e.target.value) || 0;
    emit();
  });
  bindSelect('exportSize', (v) => (state.export.size = Number(v)));

  renderTextLayerChips();
  renderIconLayerChips();
  syncInputsFromState();
}

export function convertNumberedToList() {
  const from = Math.min(state.series.from, state.series.to);
  const to = Math.max(state.series.from, state.series.to);
  const count = Math.min(to - from + 1, 64);
  if (hasToken(state.design)) {
    state.series.items = Array.from({ length: count }, (_, i) => ({ label: String(from + i), color: '' }));
    for (const t of state.design.texts) {
      t.value = t.value.replaceAll('{n}', '{label}');
    }
  } else {
    const t = state.design.texts.find((l) => l.value);
    const stem = t ? t.value.replace(/\s*\d+$/, '') : '';
    state.series.items = Array.from({ length: count }, (_, i) => ({
      label: stem ? stem + ' ' + (from + i) : String(from + i),
      color: ''
    }));
  }
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
    wrap.appendChild(chip);
  });

  if (texts.length < 12) {
    const add = document.createElement('button');
    add.className = 'chip-action';
    add.textContent = '+ Layer';
    add.addEventListener('click', () => {
      texts.push(defaultTextLayer());
      state.ui.allText = false;
      state.ui.activeText = texts.length - 1;
      emit();
    });
    wrap.appendChild(add);
  }

  if (texts.length > 1 && !state.ui.allText) {
    const del = document.createElement('button');
    del.className = 'chip-action';
    del.textContent = 'Delete layer';
    del.addEventListener('click', () => {
      texts.splice(state.ui.activeText, 1);
      state.ui.activeText = Math.max(0, state.ui.activeText - 1);
      emit();
    });
    wrap.appendChild(del);
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
    wrap.appendChild(chip);
  });

  if (icons.length < 6) {
    const add = document.createElement('button');
    add.className = 'chip-action';
    add.textContent = '+ Layer';
    add.addEventListener('click', () => {
      icons.push(defaultIconLayer());
      state.ui.allIcons = false;
      state.ui.activeIcon = icons.length - 1;
      emit();
    });
    wrap.appendChild(add);
  }

  if (icons.length > 1 && !state.ui.allIcons) {
    const del = document.createElement('button');
    del.className = 'chip-action';
    del.textContent = 'Delete layer';
    del.addEventListener('click', () => {
      icons.splice(state.ui.activeIcon, 1);
      state.ui.activeIcon = Math.max(0, state.ui.activeIcon - 1);
      emit();
    });
    wrap.appendChild(del);
  }
}

function truncate(s, len) {
  return s.length > len ? s.slice(0, len) + '...' : s;
}

export function syncInputsFromState() {
  if (state.series.mode !== 'list') {
    if (state.ui.selectedItems.length) {
      state.ui.selectedItems = [];
      selectionSnapshots.clear();
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
  setVal('bgImageFit', d.bg.imageFit);
  setRange('bgImageDim', d.bg.imageDim, 'bgImageDimVal');
  const ic = refIcon();
  setVal('iconColor', ic.color);
  setRange('iconSize', ic.size, 'iconSizeVal');
  setRange('iconX', ic.x, 'iconXVal');
  setRange('iconY', ic.y, 'iconYVal');
  setRange('iconOpacity', ic.opacity === undefined ? 100 : ic.opacity, 'iconOpacityVal');
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
  setRange('textX', t.x || 0, 'textXVal');
  setRange('textY', t.y || 0, 'textYVal');
  setRange('shapeRadius', d.shape.radius, 'shapeRadiusVal');
  setRange('shapeBorder', d.shape.border, 'shapeBorderVal');
  setVal('shapeBorderColor', d.shape.borderColor);

  setSeg('bgMode', d.bg.mode);
  document.getElementById('bgSolidRow').classList.toggle('hidden', d.bg.mode !== 'solid');
  document.getElementById('bgGradientRows').classList.toggle('hidden', d.bg.mode !== 'gradient');
  document.getElementById('bgImageRows').classList.toggle('hidden', d.bg.mode !== 'image');
  setSeg('textAlign', t.align);

  setSeg('seriesMode', state.series.mode);
  document.getElementById('seriesNumbersRows').classList.toggle('hidden', state.series.mode !== 'numbers');
  document.getElementById('seriesListRows').classList.toggle('hidden', state.series.mode !== 'list');
  setVal('seriesFrom', state.series.from);
  setVal('seriesTo', state.series.to);

  document.getElementById('clearIcon').disabled = state.ui.allIcons || !ic.svg;
  document.getElementById('openIconPicker').disabled = state.ui.allIcons;
  document.getElementById('iconUploadSidebar').disabled = state.ui.allIcons;
  document.getElementById('exportZip').disabled = state.series.mode === 'off';

  const off = iconAnchorOffset();
  document.getElementById('iconAlign').querySelectorAll('button').forEach((b) => {
    const [hh, vv] = b.dataset.val.split(':');
    const bx = hh === 'left' ? -off : hh === 'right' ? off : 0;
    const by = vv === 'top' ? -off : vv === 'bottom' ? off : 0;
    const match = ic.x === bx && ic.y === by && (off !== 0 || b.dataset.val === 'center:center');
    b.classList.toggle('active', match);
  });
}

function updateEditBanner() {
  const banner = document.getElementById('editBanner');
  const bLabel = document.getElementById('editBannerLabel');
  const bAll = document.getElementById('editAllBtn');
  const sel = state.ui.selectedItems;
  if (state.series.mode === 'list' && sel.length) {
    banner.classList.remove('hidden');
    banner.classList.add('one');
    if (sel.length === 1) {
      const item = state.series.items[sel[0]];
      bLabel.textContent = 'Editing "' + ((item && item.label) || 'button ' + (sel[0] + 1)) + '" only';
    } else {
      bLabel.textContent = 'Editing ' + sel.length + ' buttons together';
    }
    bAll.classList.remove('hidden');
  } else if (state.series.mode === 'list' && state.series.items.length) {
    banner.classList.remove('hidden');
    banner.classList.remove('one');
    bLabel.textContent = 'Editing every button in the set. Click one to style it alone, Cmd-click to grab a few.';
    bAll.classList.add('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function setVal(id, v) {
  const el = document.getElementById(id);
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
