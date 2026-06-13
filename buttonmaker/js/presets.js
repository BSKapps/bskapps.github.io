import { state, emit, deepClone, defaultDesign, defaultSeries } from './state.js?v=64';
import { renderDesign } from './renderer.js?v=64';
import { releaseSelection } from './ui.js?v=64';

const STORE_KEY = 'cbm-presets-v1';

const mdi = (d) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="' + d + '"/></svg>';

const ICONS = {
  play: mdi('M8,5.14V19.14L19,12.14L8,5.14Z'),
  pause: mdi('M14,19H18V5H14M6,19H10V5H6V19Z'),
  stop: mdi('M18,18H6V6H18V18Z'),
  next: mdi('M16,18H18V6H16M6,18L14.5,12L6,6V18Z'),
  prev: mdi('M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z'),
  rewind: mdi('m11.5 12l8.5 6V6m-9 12V6l-8.5 6z'),
  ffwd: mdi('M13 6v12l8.5-6M4 18l8.5-6L4 6z'),
  shuffle: mdi('m17 3l5.25 4.5L17 12l5.25 4.5L17 21v-3h-2.74l-2.82-2.82l2.12-2.12L15.5 15H17V9h-1.5l-9 9H2v-3h3.26l9-9H17zM2 6h4.5l2.82 2.82l-2.12 2.12L5.26 9H2z'),
  repeat: mdi('M17 17H7v-3l-4 4l4 4v-3h12v-6h-2M7 7h10v3l4-4l-4-4v3H5v6h2z'),
  record: mdi('M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z'),
  lowerthird: mdi('M3,13.5H13V15.5H3V13.5M3,17H21V19.5H3V17Z')
};

const numberedSet = (from, to) => ({ mode: 'numbers', from, to, items: [], colorTarget: 'bg' });

function builtinPresets() {
  const mk = (over) => {
    const d = defaultDesign();
    over(d);
    return d;
  };
  return [
    {
      name: 'Blank',
      builtin: true,
      design: mk(() => {})
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
    },
    {
      name: 'Light Label',
      builtin: true,
      design: mk((d) => {
        d.bg.color = '#d9d9de';
        Object.assign(d.texts[0], { value: 'LABEL', size: 12, color: '#16181c' });
        d.shape.radius = 12;
      })
    },
    {
      name: 'Transport',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'Play', color: '#4caf50', iconSvg: ICONS.play, iconName: 'builtin:play' },
          { label: 'Pause', color: '#ffb300', iconSvg: ICONS.pause, iconName: 'builtin:pause' },
          { label: 'Stop', color: '#e53935', iconSvg: ICONS.stop, iconName: 'builtin:stop' },
          { label: 'Prev', color: '#ffffff', iconSvg: ICONS.prev, iconName: 'builtin:prev' },
          { label: 'Next', color: '#ffffff', iconSvg: ICONS.next, iconName: 'builtin:next' },
          { label: 'Rew', color: '#ffffff', iconSvg: ICONS.rewind, iconName: 'builtin:rewind' },
          { label: 'FFwd', color: '#ffffff', iconSvg: ICONS.ffwd, iconName: 'builtin:ffwd' },
          { label: 'Shuffle', color: '#ffffff', iconSvg: ICONS.shuffle, iconName: 'builtin:shuffle' },
          { label: 'Repeat', color: '#ffffff', iconSvg: ICONS.repeat, iconName: 'builtin:repeat' },
          { label: 'Rec', color: '#e53935', iconSvg: ICONS.record, iconName: 'builtin:record' }
        ],
        colorTarget: 'icon'
      },
      design: mk((d) => {
        d.bg.color = '#1d1d22';
        d.icons[0].size = 72;
        d.icons[0].y = -4;
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom' });
      })
    },
    {
      name: 'QLab',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          {
            label: 'GO',
            color: '#1f9d3a',
            design: mk((d) => {
              d.bg.color = '#1f9d3a';
              Object.assign(d.texts[0], { value: 'GO', font: 'Oswald', weight: '700', size: 36, align: 'center:center' });
            })
          },
          { label: 'PAUSE', color: '#c9a227' },
          { label: 'RESUME', color: '#3a6ea5' },
          { label: 'PANIC', color: '#b51f1f' },
          { label: 'PREV', color: '#55555c' },
          { label: 'NEXT', color: '#55555c' },
          { label: 'PREVIEW', color: '#6b4fa0' },
          { label: 'LOOP', color: '#1f7a8c' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 18, align: 'center:center' });
      })
    },
    {
      name: 'Video Switch',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'AUTO', color: '#c9a227' },
          { label: 'CUT', color: '#e53935' },
          { label: 'PVW', color: '#1f9d3a' },
          { label: 'PGM', color: '#b51f1f' },
          { label: 'AUX', color: '#3a6ea5' },
          { label: 'IN 1', color: '#16324f' },
          { label: 'IN 2', color: '#16324f' },
          { label: 'IN 3', color: '#16324f' },
          { label: 'IN 4', color: '#16324f' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 25, align: 'center:center' });
      })
    },
    {
      name: 'Timers',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: '60', color: '#1f9d3a' },
          { label: '45', color: '#6d9c2a' },
          { label: '30', color: '#9aa427' },
          { label: '15', color: '#c9a227' },
          { label: '5', color: '#b51f1f' },
          { label: '+1', color: '#1f9d3a' },
          { label: '-1', color: '#b51f1f' },
          {
            label: 'Message',
            color: '#3a6ea5',
            design: mk((d) => {
              d.bg.color = '#3a6ea5';
              Object.assign(d.texts[0], { value: 'MESSAGE', font: 'Oswald', weight: '700', size: 15, align: 'center:center' });
            })
          }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Bebas Neue', weight: '400', size: 48, align: 'center:center', y: -3 });
        d.texts.push({ value: 'MIN', font: 'Oswald', weight: '700', size: 11, color: '#ffffff', align: 'center:bottom', x: 0, y: 2 });
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
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 25, align: 'center:center' });
      })
    },
    {
      name: 'INPUT 1-8',
      builtin: true,
      series: numberedSet(1, 8),
      design: mk((d) => {
        d.bg.mode = 'gradient';
        d.bg.gradFrom = '#16324f';
        d.bg.gradTo = '#0a0e14';
        Object.assign(d.texts[0], { value: 'INPUT', font: 'Roboto Condensed', weight: '700', size: 11, align: 'center:top' });
        d.texts.push({ value: '{n}', font: 'Bebas Neue', weight: '400', size: 34, color: '#ffffff', align: 'center:center' });
      })
    },
    {
      name: 'Lower Third 1-4',
      builtin: true,
      series: numberedSet(1, 4),
      design: mk((d) => {
        d.bg.mode = 'gradient';
        d.bg.gradFrom = '#2c3440';
        d.bg.gradTo = '#0d1014';
        d.icons[0].svg = ICONS.lowerthird;
        d.icons[0].name = 'builtin:lowerthird';
        d.icons[0].color = '#ffd54f';
        d.icons[0].size = 56;
        d.icons[0].y = 10;
        Object.assign(d.texts[0], { value: 'L3 {n}', font: 'Roboto Condensed', weight: '700', size: 10, align: 'center:top' });
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
    const existing = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing !== -1) {
      if (!confirm('Update your preset "' + list[existing].name + '" with the current design?')) return;
      list[existing] = preset;
    } else {
      list.unshift(preset);
    }
    if (saveUserPresets(list)) {
      nameInput.value = '';
      renderPresetList();
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('presetSave').click();
    }
  });

  document.getElementById('presetExport').addEventListener('click', () => {
    const presets = loadUserPresets();
    if (!presets.length) {
      alert('You have no saved presets yet. Click "Save to my presets" first, then back them up.');
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ app: 'companion-button-maker', version: 1, presets }, null, 2)],
      { type: 'application/json' }
    );
    downloadBlob(blob, 'bsk-button-presets.json');
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
    const tile = document.createElement('div');
    tile.className = 'strip-item';
    tile.title = preset.name + (preset.series ? ' - loads a whole set' : '');

    const thumb = document.createElement('canvas');
    thumb.width = 72;
    thumb.height = 72;
    renderDesign(thumb, thumbDesign(preset));

    const label = document.createElement('span');
    label.className = 'strip-name';
    label.textContent = preset.name;
    if (!preset.builtin) {
      label.title = 'Double-click to rename';
      label.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const next = (prompt('Rename preset', preset.name) || '').trim();
        if (!next) return;
        const list = loadUserPresets();
        list[preset.userIndex].name = next;
        saveUserPresets(list);
        renderPresetList();
      });
    }

    tile.appendChild(thumb);
    tile.appendChild(label);

    if (preset.series) {
      const setTag = document.createElement('span');
      setTag.className = 'strip-set';
      setTag.textContent = 'SET';
      tile.appendChild(setTag);
    }

    tile.addEventListener('click', () => {
      Object.assign(state.design, normalizeDesign(deepClone(preset.design)));
      state.ui.activeText = 0;
      state.ui.activeIcon = 0;
      releaseSelection();
      if (preset.series) {
        const series = deepClone(preset.series);
        if (Array.isArray(series.items)) {
          for (const it of series.items) {
            if (it && it.design) it.design = normalizeDesign(it.design);
          }
        }
        Object.assign(state.series, series);
      } else {
        Object.assign(state.series, defaultSeries());
      }
      document.getElementById('presetName').value = preset.builtin ? '' : preset.name;
      emit();
    });

    if (!preset.builtin) {
      const delBtn = document.createElement('span');
      delBtn.className = 'strip-del';
      delBtn.textContent = 'x';
      delBtn.title = 'Delete preset';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const list = loadUserPresets();
        list.splice(preset.userIndex, 1);
        saveUserPresets(list);
        renderPresetList();
      });
      tile.appendChild(delBtn);
    }

    wrap.appendChild(tile);
  }
}

function thumbDesign(preset) {
  const s = preset.series;
  if (s && s.mode === 'list' && s.items[0] && s.items[0].design) {
    return normalizeDesign(deepClone(s.items[0].design));
  }
  const d = normalizeDesign(deepClone(preset.design));
  const n = s && s.mode === 'numbers' ? String(Math.min(s.from, s.to)) : '1';
  const first = s && s.mode === 'list' && s.items[0] ? s.items[0] : null;
  const label = first ? first.label : '';
  for (const t of d.texts) {
    t.value = t.value.replaceAll('{n}', n).replaceAll('{label}', label);
  }
  if (first && first.iconSvg) {
    d.icons[0].svg = first.iconSvg;
    d.icons[0].name = first.iconName || null;
  }
  if (first && first.color) {
    if (s.colorTarget === 'bg' && d.bg.mode !== 'image') {
      d.bg.mode = 'solid';
      d.bg.color = first.color;
    } else if (s.colorTarget === 'icon') {
      for (const ic of d.icons) ic.color = first.color;
    } else if (s.colorTarget === 'text') {
      for (const t of d.texts) t.color = first.color;
    }
  }
  return d;
}

export function normalizeDesign(design) {
  const base = defaultDesign();
  const merged = deepClone(base);
  for (const key of Object.keys(base)) {
    if (key === 'texts' || key === 'icons') continue;
    if (design[key]) Object.assign(merged[key], design[key]);
  }
  if (Array.isArray(design.texts) && design.texts.length) {
    merged.texts = design.texts.map((t) => Object.assign(deepClone(base.texts[0]), t));
  } else if (design.text) {
    merged.texts = [Object.assign(deepClone(base.texts[0]), design.text)];
  }
  if (Array.isArray(design.icons) && design.icons.length) {
    merged.icons = design.icons.map((i) => Object.assign(deepClone(base.icons[0]), i));
  } else if (design.icon) {
    merged.icons = [Object.assign(deepClone(base.icons[0]), design.icon)];
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
