import { state, emit, deepClone, defaultTextLayer, defaultIconLayer } from './state.js?v=27';
import { openIconModal, triggerIconUpload } from './icons.js?v=27';
import { seriesVariants, hasToken } from './series.js?v=27';

let dragIndex = null;

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
  return Math.max(0, Math.min(40, Math.round(50 - activeIcon().size / 2 - 6)));
}

function activeIcon() {
  const icons = state.design.icons;
  if (state.ui.activeIcon >= icons.length) state.ui.activeIcon = icons.length - 1;
  return icons[state.ui.activeIcon];
}

function activeText() {
  const texts = state.design.texts;
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
  const d = state.design;

  bindSeg('bgMode', (v) => {
    d.bg.mode = v;
    document.getElementById('bgSolidRow').classList.toggle('hidden', v !== 'solid');
    document.getElementById('bgGradientRows').classList.toggle('hidden', v !== 'gradient');
    document.getElementById('bgImageRows').classList.toggle('hidden', v !== 'image');
  });
  bindColor('bgColor', (v) => (d.bg.color = v));
  bindColor('bgColor2a', (v) => (d.bg.gradFrom = v));
  bindColor('bgColor2b', (v) => (d.bg.gradTo = v));
  bindRange('bgAngle', (v) => (d.bg.angle = v), 'bgAngleVal');
  bindRange('bgBlend', (v) => (d.bg.blend = v), 'bgBlendVal');
  bindSelect('bgImageFit', (v) => (d.bg.imageFit = v));
  bindRange('bgImageDim', (v) => (d.bg.imageDim = v), 'bgImageDimVal');

  document.getElementById('bgImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      d.bg.imageData = reader.result;
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

  bindRange('shapeRadius', (v) => (d.shape.radius = v), 'shapeRadiusVal');
  bindRange('shapeBorder', (v) => (d.shape.border = v), 'shapeBorderVal');
  bindColor('shapeBorderColor', (v) => (d.shape.borderColor = v));

  bindSeg('seriesMode', (v) => {
    state.series.mode = v;
    document.getElementById('seriesNumbersRows').classList.toggle('hidden', v !== 'numbers');
    document.getElementById('seriesListRows').classList.toggle('hidden', v !== 'list');
  });

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
  bindSelect('seriesColorTarget', (v) => (state.series.colorTarget = v));

  document.getElementById('seriesAddItem').addEventListener('click', () => {
    state.series.items.push({ label: '', color: '' });
    renderSeriesItems();
    emit();
  });

  bindSelect('exportSize', (v) => (state.export.size = Number(v)));

  renderSeriesItems();
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
  renderSeriesItems();
}

export function renderTextLayerChips() {
  const wrap = document.getElementById('textLayerChips');
  wrap.innerHTML = '';
  const texts = state.design.texts;
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
    del.textContent = 'Remove';
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
  const icons = state.design.icons;
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
    del.textContent = 'Remove';
    del.addEventListener('click', () => {
      icons.splice(state.ui.activeIcon, 1);
      state.ui.activeIcon = Math.max(0, state.ui.activeIcon - 1);
      emit();
    });
    wrap.appendChild(del);
  }
}

function resolvedSwatchColor() {
  const ct = state.series.colorTarget;
  if (ct === 'icon') return (state.design.icons[0] && state.design.icons[0].color) || '#ffffff';
  if (ct === 'text') return (state.design.texts[0] && state.design.texts[0].color) || '#ffffff';
  return state.design.bg.color;
}

function truncate(s, len) {
  return s.length > len ? s.slice(0, len) + '...' : s;
}

export function renderSeriesItems() {
  const wrap = document.getElementById('seriesItems');
  wrap.innerHTML = '';
  state.series.items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'series-item-row';

    const grip = document.createElement('span');
    grip.className = 'drag-grip';
    grip.textContent = '::';
    grip.title = 'Drag to reorder';
    grip.addEventListener('mousedown', () => (row.draggable = true));
    row.addEventListener('dragend', () => {
      row.draggable = false;
      dragIndex = null;
    });
    row.addEventListener('dragstart', (e) => {
      dragIndex = i;
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === i) return;
      const [moved] = state.series.items.splice(dragIndex, 1);
      state.series.items.splice(i, 0, moved);
      dragIndex = null;
      renderSeriesItems();
      emit();
    });
    row.appendChild(grip);

    const label = document.createElement('input');
    label.type = 'text';
    label.placeholder = 'Label';
    label.value = item.label;
    label.addEventListener('input', () => {
      item.label = label.value;
      emit();
    });

    const color = document.createElement('input');
    color.type = 'color';
    color.value = item.color || resolvedSwatchColor();
    color.addEventListener('input', () => {
      item.color = color.value;
      emit();
    });

    const iconBtn = document.createElement('button');
    iconBtn.className = 'item-icon-btn';
    iconBtn.title = item.iconSvg ? 'Change image for this button' : 'Add an image to this button';
    if (item.iconSvg) {
      const img = document.createElement('img');
      img.draggable = false;
      img.src = item.iconSvg.startsWith('<')
        ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(item.iconSvg.replaceAll('currentColor', '#ffffff'))
        : item.iconSvg;
      iconBtn.appendChild(img);
    } else {
      iconBtn.textContent = '+img';
    }
    iconBtn.addEventListener('click', () => {
      openIconModal((id, svg) => {
        item.iconSvg = svg;
        item.iconName = id;
        renderSeriesItems();
        emit();
      });
    });

    row.appendChild(label);
    row.appendChild(iconBtn);
    row.appendChild(color);

    if (item.iconSvg) {
      const clearIcon = document.createElement('button');
      clearIcon.textContent = '-';
      clearIcon.title = 'Remove image from this button';
      clearIcon.addEventListener('click', () => {
        delete item.iconSvg;
        delete item.iconName;
        renderSeriesItems();
        emit();
      });
      row.appendChild(clearIcon);
    }

    const del = document.createElement('button');
    del.textContent = 'x';
    del.title = 'Remove this button';
    del.addEventListener('click', () => {
      state.series.items.splice(i, 1);
      renderSeriesItems();
      emit();
    });

    row.appendChild(del);
    wrap.appendChild(row);
  });
}

export function syncInputsFromState() {
  const d = state.design;
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
  setVal('seriesColorTarget', state.series.colorTarget);

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
