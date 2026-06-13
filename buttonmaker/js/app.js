import { state, onChange, emit, deepClone, APP_VERSION, defaultDesign, defaultSeries, editTargets, primarySelection } from './state.js?v=85';
import { renderDesign } from './renderer.js?v=85';
import { seriesVariants, numberSet } from './series.js?v=85';
import { initUI, syncInputsFromState, renderTextLayerChips, renderIconLayerChips, selectListItem, selectRangeTo, deselectListItem, selectAllListItems, addListItem, removeListItem, seriesForSnapshot, releaseSelection } from './ui.js?v=85';
import { initIconPicker } from './icons.js?v=85';
import { initPresets, normalizeDesign } from './presets.js?v=85';
import { initExport } from './export.js?v=85';
import { initColorPopover } from './colorpicker.js?v=85';

const preview = document.getElementById('preview');
const seriesWrap = document.getElementById('seriesPreview');

document.querySelector('.stage').addEventListener('click', (e) => {
  const t = e.target;
  if (t === seriesWrap || t.classList.contains('stage') || t.classList.contains('preview-wrap')) {
    deselectListItem();
  }
});

let rendering = false;
let renderPending = false;
let rafId = null;

function scheduleRender() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    renderAll();
  });
}

async function renderAll() {
  if (rendering) {
    renderPending = true;
    return;
  }
  rendering = true;
  try {
    do {
      renderPending = false;
      try {
        await renderOnce();
      } catch (e) {}
    } while (renderPending);
  } finally {
    rendering = false;
  }
}

async function renderOnce() {
  const variants = seriesVariants();
  const sel = primarySelection();
  const mainVariant = (state.series.mode === 'list' && sel !== null && variants[sel] ? variants[sel] : variants[0])
    || { design: state.design };
  await renderDesign(preview, mainVariant.design, { bakeText: true });

  const summary = document.getElementById('exportSummary');
  if (summary) {
    summary.textContent = variants.length === 1
      ? 'One button. Download the PNG and load it into a button in Companion.'
      : 'Download PNG saves the one you are previewing; the ZIP saves all ' + variants.length + ' as separate PNGs.';
  }

  seriesWrap.innerHTML = '';
  const isList = state.series.mode === 'list';
  if (isList) {
    variants.forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'series-item';
      item.classList.toggle('selected', isList && state.ui.selectedItems.includes(idx));
      item.draggable = true;
      item.title = 'Click to style it alone, Cmd-click to grab several, drag onto another to reorder, or onto the big preview to make it your single button.';
      item.addEventListener('click', (e) => {
        if (state.series.mode !== 'list') return;
        if (e.shiftKey) selectRangeTo(idx);
        else selectListItem(idx, e.metaKey || e.ctrlKey);
      });
      const c = document.createElement('canvas');
      c.width = 144;
      c.height = 144;
      renderDesign(c, v.design, { bakeText: true });
      item.appendChild(c);
      const span = document.createElement('span');
      span.textContent = String(idx + 1);
      item.appendChild(span);

      if (isList) {
        const del = document.createElement('button');
        del.className = 'series-del';
        del.textContent = 'x';
        del.title = 'Remove this button from the set';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          removeListItem(idx);
        });
        item.appendChild(del);
      }

      item.addEventListener('dragstart', (e) => {
        gridDragIndex = idx;
        e.dataTransfer.setData('text/plain', String(idx));
        e.dataTransfer.effectAllowed = 'copyMove';
        preview.classList.add('drop-ready');
      });
      item.addEventListener('dragend', () => {
        gridDragIndex = null;
        preview.classList.remove('drop-ready', 'drop-target');
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (gridDragIndex === null || gridDragIndex === idx) return;
        reorderSet(gridDragIndex, idx);
      });

      seriesWrap.appendChild(item);
    });

    if (isList && state.series.items.length < 64) {
      const wrap = document.createElement('div');
      wrap.className = 'series-add-tile';
      const add = document.createElement('button');
      add.className = 'series-add';
      add.textContent = '+';
      add.title = 'Add another button to the set. Drop a button here to duplicate it.';
      add.addEventListener('click', addListItem);
      add.addEventListener('dragenter', (e) => {
        if (gridDragIndex === null) return;
        e.preventDefault();
        add.classList.add('drop-target');
      });
      add.addEventListener('dragover', (e) => {
        if (gridDragIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        add.classList.add('drop-target');
      });
      add.addEventListener('dragleave', () => add.classList.remove('drop-target'));
      add.addEventListener('drop', (e) => {
        e.preventDefault();
        add.classList.remove('drop-target');
        if (gridDragIndex === null) return;
        const src = state.series.items[gridDragIndex];
        gridDragIndex = null;
        if (!src || state.series.items.length >= 64) return;
        state.series.items.push(deepClone(src));
        emit();
      });
      const cap = document.createElement('span');
      cap.textContent = 'Add';
      wrap.appendChild(add);
      wrap.appendChild(cap);
      seriesWrap.appendChild(wrap);
    }
  }

  if (state.series.mode === 'off') {
    const wrap = document.createElement('div');
    wrap.className = 'series-add-tile';
    const add = document.createElement('button');
    add.className = 'series-add';
    add.textContent = '+';
    add.title = 'Click to duplicate this button into an editable set.';
    add.addEventListener('click', () => {
      releaseSelection();
      state.series.items = [{ label: '', color: '' }, { label: '', color: '' }];
      state.series.mode = 'list';
      selectListItem(1);
    });
    const cap = document.createElement('span');
    cap.textContent = 'Duplicate';
    wrap.appendChild(add);
    wrap.appendChild(cap);
    seriesWrap.appendChild(wrap);
  }
}

let gridDragIndex = null;

function reorderSet(from, to) {
  const items = state.series.items;
  const selObjects = state.ui.selectedItems.map((i) => items[i]);
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  state.ui.selectedItems = selObjects.map((it) => items.indexOf(it)).filter((i) => i !== -1);
  gridDragIndex = null;
  emit();
}

function isFileDrag(e) {
  return e.dataTransfer && [...e.dataTransfer.types].includes('Files');
}

preview.addEventListener('dragenter', (e) => {
  if (gridDragIndex === null && !isFileDrag(e)) return;
  e.preventDefault();
  preview.classList.add('drop-target');
});
preview.addEventListener('dragover', (e) => {
  if (gridDragIndex === null && !isFileDrag(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  preview.classList.add('drop-target');
});
preview.addEventListener('dragleave', () => preview.classList.remove('drop-target'));
preview.addEventListener('drop', (e) => {
  if (gridDragIndex === null && !isFileDrag(e)) {
    const fromData = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!Number.isNaN(fromData)) gridDragIndex = fromData;
  }
  if (gridDragIndex !== null) {
    e.preventDefault();
    const v = seriesVariants()[gridDragIndex];
    gridDragIndex = null;
    preview.classList.remove('drop-ready', 'drop-target');
    if (!v) return;
    Object.assign(state.design, deepClone(v.design));
    state.ui.activeText = 0;
    state.ui.activeIcon = 0;
    releaseSelection();
    Object.assign(state.series, defaultSeries());
    emit();
    return;
  }
  if (isFileDrag(e)) {
    e.preventDefault();
    preview.classList.remove('drop-target');
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      for (const d of editTargets()) {
        d.bg.imageData = reader.result;
        d.bg.mode = 'image';
      }
      emit();
    };
    reader.readAsDataURL(file);
  }
});

document.addEventListener('paste', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
  if (!item) return;
  const file = item.getAsFile();
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    for (const d of editTargets()) {
      const icons = d.icons;
      const ic = icons[Math.max(0, Math.min(state.ui.activeIcon, icons.length - 1))];
      ic.svg = reader.result;
      ic.name = 'pasted image';
      ic.tint = false;
    }
    emit();
  };
  reader.readAsDataURL(file);
});

const SESSION_KEY = 'bm-session-v1';
const undoStack = [];
const redoStack = [];
let historyTimer = null;
let applyingUndo = false;

function snapshot() {
  return JSON.stringify({ design: state.design, series: seriesForSnapshot() });
}

function pushHistory() {
  const s = snapshot();
  if (undoStack[undoStack.length - 1] !== s) {
    undoStack.push(s);
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }
  try {
    localStorage.setItem(SESSION_KEY, s);
  } catch (err) {}
}

function applyHistory(s) {
  const prev = JSON.parse(s);
  applyingUndo = true;
  Object.assign(state.design, prev.design);
  Object.assign(state.series, prev.series);
  state.ui.activeText = 0;
  state.ui.activeIcon = 0;
  releaseSelection();
  emit();
  applyingUndo = false;
}

document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'range' && t.type !== 'checkbox') return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    if (undoStack.length < 2) return;
    e.preventDefault();
    redoStack.push(undoStack.pop());
    applyHistory(undoStack[undoStack.length - 1]);
  } else if ((key === 'z' && e.shiftKey) || (key === 'y' && e.ctrlKey && !e.metaKey)) {
    if (!redoStack.length) return;
    e.preventDefault();
    const s = redoStack.pop();
    undoStack.push(s);
    applyHistory(s);
  } else if (key === 'a') {
    if (state.series.mode !== 'list' || !state.series.items.length) return;
    e.preventDefault();
    selectAllListItems();
  }
});

function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (saved && saved.design && Array.isArray(saved.design.texts)) {
      for (const t of saved.design.texts) {
        if (t.value) t.value = t.value.replace(/\\n/g, '\n');
      }
      Object.assign(state.design, normalizeDesign(saved.design));
      const series = saved.series || {};
      if (series.mode === 'numbers') {
        series.items = numberSet(state.design, series.from, series.to);
        series.mode = 'list';
      }
      if (Array.isArray(series.items)) {
        for (const it of series.items) {
          if (it && it.design) it.design = normalizeDesign(it.design);
        }
      }
      Object.assign(state.series, series);
    }
  } catch (err) {}
}

if (window.BM_V && window.BM_V !== APP_VERSION) {
  if (!sessionStorage.getItem('bm-skew-reload')) {
    sessionStorage.setItem('bm-skew-reload', '1');
    location.replace(location.pathname + '?fresh=' + APP_VERSION);
  }
} else {
  sessionStorage.removeItem('bm-skew-reload');
}

document.getElementById('resetDesign').addEventListener('click', () => {
  Object.assign(state.design, defaultDesign());
  Object.assign(state.series, defaultSeries());
  state.ui.activeText = 0;
  state.ui.activeIcon = 0;
  releaseSelection();
  emit();
});

restoreSession();

initUI();
initIconPicker();
initPresets();
initExport();
initColorPopover();

onChange(() => {
  renderTextLayerChips();
  renderIconLayerChips();
  syncInputsFromState();
  scheduleRender();
  if (!applyingUndo) {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistory, 400);
  }
});

document.fonts.ready.then(() => emit());
emit();
pushHistory();
