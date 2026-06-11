import { state, emit, deepClone, defaultTextLayer, defaultIconLayer, editTarget } from './state.js?v=33';
import { triggerIconUpload } from './icons.js?v=33';
import { seriesVariants, hasToken } from './series.js?v=33';

let selectionSnapshot = null;

function releaseSelection() {
  const i = state.ui.activeListItem;
  if (i === null) return;
  const item = state.series.items[i];
  if (item && item.design && selectionSnapshot !== null && JSON.stringify(item.design) === selectionSnapshot) {
    delete item.design;
  }
  selectionSnapshot = null;
  state.ui.activeListItem = null;
}

export function selectListItem(i) {
  if (state.series.mode !== 'list') return;
  if (state.ui.activeListItem === i) return;
  releaseSelection();
  const item = state.series.items[i];
  if (!item) return;
  if (!item.design) {
    const v = seriesVariants()[i];
    if (!v) return;
    item.design = v.design;
  }
  selectionSnapshot = JSON.stringify(item.design);
  state.ui.activeListItem = i;
  state.ui.activeText = Math.max(0, item.design.texts.findIndex((t) => t.value));
  state.ui.activeIcon = Math.max(0, item.design.icons.findIndex((ic) => ic.svg));
  emit();
}

export function deselectListItem() {
  if (state.ui.activeListItem === null) return;
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
  if (state.ui.activeListItem === i) {
    state.ui.activeListItem = null;
    selectionSnapshot = null;
  } else if (state.ui.activeListItem !== null && state.ui.activeListItem > i) {
    state.ui.activeListItem--;
  }
  state.series.items.splice(i, 1);
  emit();
}

function syncSelectedLabel() {
  const i = state.ui.activeListItem;
  if (i === null || state.series.mode !== 'list') return;
  const item = state.series.items[i];
  if (!item || !item.design) return;
  const t = item.design.texts.find((l) => l.value);
  item.label = t ? t.value.split('\n')[0] : '';
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
  return Math.max(0, Math.min(40, Math.round(50 - activeIcon().size / 2)));
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
  el.addEventListener('input', () => {
    getSet(Number(el.value));
    if (valId) document.getElementById(valId).textContent = el.value;
    emit();
  });
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
    editTarget().bg.mode = v;
    document.getElementById('bgSolidRow').classList.toggle('hidden', v !== 'solid');
    document.getElementById('bgGradientRows').classList.toggle('hidden', v !== 'gradient');
    document.getElementById('bgImageRows').classList.toggle('hidden', v !== 'image');
  });
  bindColor('bgColor', (v) => (editTarget().bg.color = v));
  bindColor('bgColor2a', (v) => (editTarget().bg.gradFrom = v));
  bindColor('bgColor2b', (v) => (editTarget().bg.gradTo = v));
  bindRange('bgAngle', (v) => (editTarget().bg.angle = v), 'bgAngleVal');
  bindRange('bgBlend', (v) => (editTarget().bg.blend = v), 'bgBlendVal');
  bindSelect('bgImageFit', (v) => (editTarget().bg.imageFit = v));
  bindRange('bgImageDim', (v) => (editTarget().bg.imageDim = v), 'bgImageDimVal');

  document.getElementById('bgImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editTarget().bg.imageData = reader.result;
      emit();
    };
    reader.readAsDataURL(file);
  });

  bindColor('iconColor', (v) => {
    const ic = activeIcon();
    ic.color = v;
    ic.tint = true;
  });
  bindRange('iconSize', (v) => (activeIcon().size = v), 'iconSizeVal');
  bindRange('iconX', (v) => (activeIcon().x = v), 'iconXVal');
  bindRange('iconY', (v) => (activeIcon().y = v), 'iconYVal');
  bindRange('iconOpacity', (v) => (activeIcon().opacity = v), 'iconOpacityVal');

  document.getElementById('iconUploadSidebar').addEventListener('click', triggerIconUpload);

  bindSeg('iconAlign', (v) => {
    const ic = activeIcon();
    const [hh, vv] = v.split(':');
    const off = iconAnchorOffset();
    ic.x = hh === 'left' ? -off : hh === 'right' ? off : 0;
    ic.y = vv === 'top' ? -off : vv === 'bottom' ? off : 0;
  });

  document.getElementById('textValue').addEventListener('input', (e) => {
    activeText().value = e.target.value;
    syncSelectedLabel();
    emit();
  });
  bindSelect('textFont', (v) => {
    const t = activeText();
    t.font = v;
    t.weight = rebuildWeightOptions(v, t.weight);
  });
  bindSelect('textWeight', (v) => (activeText().weight = v));
  bindRange('textSize', (v) => (activeText().size = v), 'textSizeVal');
  bindColor('textColor', (v) => (activeText().color = v));
  bindSeg('textAlign', (v) => (activeText().align = v));
  bindRange('textX', (v) => (activeText().x = v), 'textXVal');
  bindRange('textY', (v) => (activeText().y = v), 'textYVal');

  bindRange('shapeRadius', (v) => (editTarget().shape.radius = v), 'shapeRadiusVal');
  bindRange('shapeBorder', (v) => (editTarget().shape.border = v), 'shapeBorderVal');
  bindColor('shapeBorderColor', (v) => (editTarget().shape.borderColor = v));

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
  texts.forEach((t, i) => {
    const chip = document.createElement('button');
    chip.textContent = t.value ? truncate(t.value, 10) : 'Layer ' + (i + 1);
    chip.classList.toggle('active', i === state.ui.activeText);
    chip.addEventListener('click', () => {
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
      state.ui.activeText = texts.length - 1;
      emit();
    });
    wrap.appendChild(add);
  }

  if (texts.length > 1) {
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
  icons.forEach((ic, i) => {
    const chip = document.createElement('button');
    chip.textContent = ic.name ? truncate(ic.name.split(':').pop(), 10) : 'Layer ' + (i + 1);
    chip.classList.toggle('active', i === state.ui.activeIcon);
    chip.addEventListener('click', () => {
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
      state.ui.activeIcon = icons.length - 1;
      emit();
    });
    wrap.appendChild(add);
  }

  if (icons.length > 1) {
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
  if (state.ui.activeListItem !== null && (state.series.mode !== 'list' || !state.series.items[state.ui.activeListItem])) {
    state.ui.activeListItem = null;
    selectionSnapshot = null;
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
  const ic = activeIcon();
  setVal('iconColor', ic.color);
  setRange('iconSize', ic.size, 'iconSizeVal');
  setRange('iconX', ic.x, 'iconXVal');
  setRange('iconY', ic.y, 'iconYVal');
  setRange('iconOpacity', ic.opacity === undefined ? 100 : ic.opacity, 'iconOpacityVal');
  const t = activeText();
  setVal('textValue', t.value);
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

  document.getElementById('clearIcon').disabled = !ic.svg;
  document.getElementById('exportZip').disabled = state.series.mode === 'off';

  const off = iconAnchorOffset();
  document.getElementById('iconAlign').querySelectorAll('button').forEach((b) => {
    const [hh, vv] = b.dataset.val.split(':');
    const bx = hh === 'left' ? -off : hh === 'right' ? off : 0;
    const by = vv === 'top' ? -off : vv === 'bottom' ? off : 0;
    b.classList.toggle('active', ic.x === bx && ic.y === by);
  });
}

function updateEditBanner() {
  const banner = document.getElementById('editBanner');
  const bLabel = document.getElementById('editBannerLabel');
  const bAll = document.getElementById('editAllBtn');
  const sel = state.ui.activeListItem;
  if (state.series.mode === 'list' && sel !== null && state.series.items[sel]) {
    banner.classList.remove('hidden');
    banner.classList.add('one');
    bLabel.textContent = 'Editing "' + (state.series.items[sel].label || 'button ' + (sel + 1)) + '" only';
    bAll.classList.remove('hidden');
  } else if (state.series.mode === 'list' && state.series.items.length) {
    banner.classList.remove('hidden');
    banner.classList.remove('one');
    bLabel.textContent = 'Editing every button in the set. Click one under the preview to style it alone.';
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
  document.getElementById(valId).textContent = v;
}

function setSeg(id, v) {
  document.getElementById(id).querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.val === v);
  });
}
