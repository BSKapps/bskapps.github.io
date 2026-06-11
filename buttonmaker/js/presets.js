import { state, emit, deepClone, defaultDesign } from './state.js';
import { renderDesign } from './renderer.js';
import { renderSeriesItems } from './ui.js';

const STORE_KEY = 'cbm-presets-v1';

const mdi = (d) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="' + d + '"/></svg>';

const ICONS = {
  play: mdi('M8,5.14V19.14L19,12.14L8,5.14Z'),
  pause: mdi('M14,19H18V5H14M6,19H10V5H6V19Z'),
  stop: mdi('M18,18H6V6H18V18Z'),
  next: mdi('M16,18H18V6H16M6,18L14.5,12L6,6V18Z'),
  prev: mdi('M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z'),
  record: mdi('M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z')
};

const numberedSet = (from, to) => ({ mode: 'numbers', from, to, items: [], colorTarget: 'bg' });

function transport(name, iconKey, color) {
  const d = defaultDesign();
  d.bg.color = '#1d1d22';
  d.icon.svg = ICONS[iconKey];
  d.icon.name = 'builtin:' + iconKey;
  d.icon.color = color;
  d.icon.size = 58;
  d.icon.y = 0;
  return { name, builtin: true, design: d };
}

function builtinPresets() {
  const mk = (over) => {
    const d = defaultDesign();
    over(d);
    return d;
  };
  return [
    {
      name: 'CAM 1-4',
      builtin: true,
      series: numberedSet(1, 4),
      design: mk((d) => {
        d.bg.mode = 'gradient';
        d.bg.gradFrom = '#16324f';
        d.bg.gradTo = '#0a0e14';
        Object.assign(d.texts[0], { value: 'CAM', font: 'Roboto Condensed', weight: '700', size: 10, align: 'center:top' });
        d.texts.push({ value: '{n}', font: 'Bebas Neue', weight: '400', size: 28, color: '#ffffff', align: 'center:center' });
      })
    },
    {
      name: 'INPUT 1-4',
      builtin: true,
      series: numberedSet(1, 4),
      design: mk((d) => {
        d.bg.mode = 'gradient';
        d.bg.gradFrom = '#0f3d3e';
        d.bg.gradTo = '#091416';
        Object.assign(d.texts[0], { value: 'INPUT', font: 'Roboto Condensed', weight: '700', size: 10, align: 'center:top' });
        d.texts.push({ value: '{n}', font: 'Bebas Neue', weight: '400', size: 28, color: '#ffffff', align: 'center:center' });
      })
    },
    {
      name: 'SCREEN 1-4',
      builtin: true,
      series: numberedSet(1, 4),
      design: mk((d) => {
        d.bg.mode = 'gradient';
        d.bg.gradFrom = '#3a1d5e';
        d.bg.gradTo = '#12081f';
        Object.assign(d.texts[0], { value: 'SCREEN {n}', font: 'Roboto Condensed', weight: '700', size: 11 });
      })
    },
    transport('Play', 'play', '#4caf50'),
    transport('Pause', 'pause', '#ffb300'),
    transport('Stop', 'stop', '#e53935'),
    transport('Previous', 'prev', '#ffffff'),
    transport('Next', 'next', '#ffffff'),
    {
      name: 'Record',
      builtin: true,
      design: mk((d) => {
        d.bg.color = '#1d1d22';
        d.icon.svg = ICONS.record;
        d.icon.name = 'builtin:record';
        d.icon.color = '#e53935';
        d.icon.size = 46;
        d.icon.y = -8;
        Object.assign(d.texts[0], { value: 'REC', font: 'Oswald', weight: '700', size: 10 });
      })
    },
    {
      name: 'Go Green',
      builtin: true,
      design: mk((d) => {
        d.bg.color = '#0f6e2b';
        Object.assign(d.texts[0], { value: 'GO', font: 'Bebas Neue', weight: '400', size: 24, align: 'center:center' });
      })
    },
    {
      name: 'Traffic Lights',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'GO', color: '#1f9d3a' },
          { label: 'WARN', color: '#c9a227' },
          { label: 'HOLD', color: '#c96a17' },
          { label: 'STOP', color: '#b51f1f' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 13, align: 'center:center' });
      })
    },
    {
      name: 'Dark Label',
      builtin: true,
      design: mk((d) => {
        d.bg.color = '#111418';
        Object.assign(d.texts[0], { value: 'LABEL', size: 12 });
        d.shape.border = 2;
        d.shape.borderColor = '#2e3947';
        d.shape.radius = 12;
      })
    }
  ];
}

function loadUserPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveUserPresets(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    alert('Could not save preset. Storage may be full, large custom images use a lot of space.');
    return false;
  }
}

export function initPresets() {
  const nameInput = document.getElementById('presetName');
  document.getElementById('presetSave').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Untitled';
    const list = loadUserPresets();
    const preset = { name, design: deepClone(state.design) };
    if (state.series.mode !== 'off') preset.series = deepClone(state.series);
    list.unshift(preset);
    if (saveUserPresets(list)) {
      nameInput.value = '';
      renderPresetList();
    }
  });

  document.getElementById('presetExport').addEventListener('click', () => {
    const blob = new Blob(
      [JSON.stringify({ app: 'companion-button-maker', version: 1, presets: loadUserPresets() }, null, 2)],
      { type: 'application/json' }
    );
    downloadBlob(blob, 'button-presets.json');
  });

  const importFile = document.getElementById('presetImportFile');
  document.getElementById('presetImportBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data.presets) ? data.presets : [];
      const valid = incoming.filter((p) => p && p.design && p.design.bg && (p.design.texts || p.design.text));
      if (!valid.length) {
        alert('No presets found in that file.');
        return;
      }
      const list = valid.concat(loadUserPresets());
      if (saveUserPresets(list)) renderPresetList();
    } catch (e) {
      alert('Could not read that file.');
    }
    importFile.value = '';
  });

  renderPresetList();
}

export function renderPresetList() {
  const wrap = document.getElementById('presetList');
  wrap.innerHTML = '';
  const user = loadUserPresets();
  const all = user.map((p, i) => ({ ...p, userIndex: i })).concat(builtinPresets());

  for (const preset of all) {
    const row = document.createElement('div');
    row.className = 'preset-row';

    const thumb = document.createElement('canvas');
    thumb.width = 72;
    thumb.height = 72;
    renderDesign(thumb, thumbDesign(preset));

    const label = document.createElement('span');
    label.className = 'preset-label';
    label.textContent = preset.name + (preset.series ? ' [set]' : '');
    label.title = preset.builtin ? 'Built-in preset' : preset.name;

    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      state.design = normalizeDesign(deepClone(preset.design));
      state.ui.activeText = 0;
      if (preset.series) {
        Object.assign(state.series, deepClone(preset.series));
      } else {
        state.series.mode = 'off';
      }
      renderSeriesItems();
      emit();
    });

    row.appendChild(thumb);
    row.appendChild(label);
    row.appendChild(loadBtn);

    if (!preset.builtin) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        const list = loadUserPresets();
        list.splice(preset.userIndex, 1);
        saveUserPresets(list);
        renderPresetList();
      });
      row.appendChild(delBtn);
    }

    wrap.appendChild(row);
  }
}

function thumbDesign(preset) {
  const d = normalizeDesign(deepClone(preset.design));
  const s = preset.series;
  const n = s && s.mode === 'numbers' ? String(Math.min(s.from, s.to)) : '1';
  const first = s && s.mode === 'list' && s.items[0] ? s.items[0] : null;
  const label = first ? first.label : '';
  for (const t of d.texts) {
    t.value = t.value.replaceAll('{n}', n).replaceAll('{label}', label);
  }
  if (first && first.color) {
    if (s.colorTarget === 'bg' && d.bg.mode !== 'image') {
      d.bg.mode = 'solid';
      d.bg.color = first.color;
    } else if (s.colorTarget === 'icon') {
      d.icon.color = first.color;
    } else if (s.colorTarget === 'text') {
      for (const t of d.texts) t.color = first.color;
    }
  }
  return d;
}

function normalizeDesign(design) {
  const base = defaultDesign();
  const merged = deepClone(base);
  for (const key of Object.keys(base)) {
    if (key === 'texts') continue;
    if (design[key]) Object.assign(merged[key], design[key]);
  }
  if (Array.isArray(design.texts) && design.texts.length) {
    merged.texts = design.texts.map((t) => Object.assign(deepClone(base.texts[0]), t));
  } else if (design.text) {
    merged.texts = [Object.assign(deepClone(base.texts[0]), design.text)];
  }
  return merged;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
