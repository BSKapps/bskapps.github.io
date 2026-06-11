import { state, emit, defaultTextLayer } from './state.js?v=6';
import { openIconModal } from './icons.js?v=6';

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
    d.icon.color = v;
    d.icon.tint = true;
  });
  bindRange('iconSize', (v) => (d.icon.size = v), 'iconSizeVal');
  bindRange('iconX', (v) => (d.icon.x = v), 'iconXVal');
  bindRange('iconY', (v) => (d.icon.y = v), 'iconYVal');
  bindRange('iconOpacity', (v) => (d.icon.opacity = v), 'iconOpacityVal');

  document.getElementById('iconCentre').addEventListener('click', () => {
    d.icon.x = 0;
    d.icon.y = 0;
    emit();
  });

  document.getElementById('textValue').addEventListener('input', (e) => {
    activeText().value = e.target.value;
    emit();
  });
  bindSelect('textFont', (v) => (activeText().font = v));
  bindSelect('textWeight', (v) => (activeText().weight = v));
  bindRange('textSize', (v) => (activeText().size = v), 'textSizeVal');
  bindColor('textColor', (v) => (activeText().color = v));
  bindSeg('textAlign', (v) => (activeText().align = v));

  bindRange('shapeRadius', (v) => (d.shape.radius = v), 'shapeRadiusVal');
  bindRange('shapeBorder', (v) => (d.shape.border = v), 'shapeBorderVal');
  bindColor('shapeBorderColor', (v) => (d.shape.borderColor = v));

  bindSeg('seriesMode', (v) => {
    state.series.mode = v;
    document.getElementById('seriesNumbersRows').classList.toggle('hidden', v !== 'numbers');
    document.getElementById('seriesListRows').classList.toggle('hidden', v !== 'list');
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
    state.series.items.push({ label: '', color: '#3d8bfd' });
    renderSeriesItems();
    emit();
  });

  document.getElementById('seriesTrafficLights').addEventListener('click', () => {
    state.series.items = [
      { label: 'GO', color: '#1f9d3a' },
      { label: 'WARN', color: '#c9a227' },
      { label: 'HOLD', color: '#c96a17' },
      { label: 'STOP', color: '#b51f1f' }
    ];
    if (!state.design.texts[0].value) {
      state.design.texts[0].value = '{label}';
    }
    renderSeriesItems();
    emit();
  });

  document.getElementById('guideTopbar').addEventListener('change', (e) => {
    state.guides.topbar = e.target.checked;
    emit();
  });

  bindSelect('exportSize', (v) => (state.export.size = Number(v)));
  document.getElementById('exportBakeText').addEventListener('change', (e) => {
    state.export.bakeText = e.target.checked;
    emit();
  });

  renderSeriesItems();
  renderTextLayerChips();
  syncInputsFromState();
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

function truncate(s, len) {
  return s.length > len ? s.slice(0, len) + '...' : s;
}

export function renderSeriesItems() {
  const wrap = document.getElementById('seriesItems');
  wrap.innerHTML = '';
  state.series.items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'series-item-row';

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
    color.value = item.color || '#3d8bfd';
    color.addEventListener('input', () => {
      item.color = color.value;
      emit();
    });

    const iconBtn = document.createElement('button');
    iconBtn.className = 'item-icon-btn';
    iconBtn.title = item.iconSvg ? 'Change image for this button' : 'Add an image to this button';
    if (item.iconSvg) {
      const img = document.createElement('img');
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
  setVal('bgImageFit', d.bg.imageFit);
  setRange('bgImageDim', d.bg.imageDim, 'bgImageDimVal');
  setVal('iconColor', d.icon.color);
  setRange('iconSize', d.icon.size, 'iconSizeVal');
  setRange('iconX', d.icon.x, 'iconXVal');
  setRange('iconY', d.icon.y, 'iconYVal');
  setRange('iconOpacity', d.icon.opacity, 'iconOpacityVal');
  const t = activeText();
  setVal('textValue', t.value);
  setVal('textFont', t.font);
  setVal('textWeight', t.weight);
  setRange('textSize', t.size, 'textSizeVal');
  setVal('textColor', t.color);
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

  document.getElementById('clearIcon').disabled = !d.icon.svg;
  document.getElementById('exportZip').disabled = state.series.mode === 'off';
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
