import { state, onChange, emit, deepClone, APP_VERSION } from './state.js?v=22';
import { renderDesign } from './renderer.js?v=22';
import { seriesVariants } from './series.js?v=22';
import { initUI, syncInputsFromState, renderTextLayerChips, renderSeriesItems, convertNumberedToList } from './ui.js?v=22';
import { initIconPicker } from './icons.js?v=22';
import { initPresets } from './presets.js?v=22';
import { initExport } from './export.js?v=22';
import { initColorPopover } from './colorpicker.js?v=22';

const preview = document.getElementById('preview');
const seriesWrap = document.getElementById('seriesPreview');

let rendering = false;
let renderPending = false;

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
  await renderDesign(preview, variants[0].design, { bakeText: true });

  const summary = document.getElementById('exportSummary');
  if (summary) {
    summary.textContent = variants.length === 1
      ? 'Your downloads will contain this one button.'
      : 'Your downloads will contain all ' + variants.length + ' buttons, laid out as one row on the Companion page.';
  }

  seriesWrap.innerHTML = '';
  if (variants.length > 1) {
    variants.forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'series-item';
      item.draggable = true;
      item.title = 'Drag onto another button to reorder, or onto the big preview to edit this one alone';
      const c = document.createElement('canvas');
      c.width = 144;
      c.height = 144;
      renderDesign(c, v.design, { bakeText: true });
      const span = document.createElement('span');
      span.textContent = v.label;
      item.appendChild(c);
      item.appendChild(span);

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
  }
}

let gridDragIndex = null;

function reorderSet(from, to) {
  if (state.series.mode === 'numbers') {
    convertNumberedToList();
  }
  const items = state.series.items;
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  gridDragIndex = null;
  renderSeriesItems();
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
    state.series.mode = 'off';
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
      state.design.bg.imageData = reader.result;
      state.design.bg.mode = 'image';
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
    state.design.icon.svg = reader.result;
    state.design.icon.name = 'pasted image';
    state.design.icon.tint = false;
    emit();
  };
  reader.readAsDataURL(file);
});

const SESSION_KEY = 'bm-session-v1';
const undoStack = [];
let historyTimer = null;
let applyingUndo = false;

function snapshot() {
  return JSON.stringify({ design: state.design, series: state.series });
}

function pushHistory() {
  const s = snapshot();
  if (undoStack[undoStack.length - 1] !== s) {
    undoStack.push(s);
    if (undoStack.length > 50) undoStack.shift();
  }
  try {
    localStorage.setItem(SESSION_KEY, s);
  } catch (err) {}
}

document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.key !== 'z' || e.shiftKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'range' && t.type !== 'checkbox') return;
  if (undoStack.length < 2) return;
  e.preventDefault();
  undoStack.pop();
  const prev = JSON.parse(undoStack[undoStack.length - 1]);
  applyingUndo = true;
  Object.assign(state.design, prev.design);
  Object.assign(state.series, prev.series);
  renderSeriesItems();
  emit();
  applyingUndo = false;
});

function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (saved && saved.design && Array.isArray(saved.design.texts)) {
      Object.assign(state.design, saved.design);
      Object.assign(state.series, saved.series || {});
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

restoreSession();

initUI();
initIconPicker();
initPresets();
initExport();
initColorPopover();

onChange(() => {
  renderTextLayerChips();
  syncInputsFromState();
  renderAll();
  if (!applyingUndo) {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistory, 400);
  }
});

document.fonts.ready.then(() => emit());
emit();
pushHistory();
