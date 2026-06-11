import { state, onChange, emit, deepClone, APP_VERSION, defaultDesign, editTarget, primarySelection } from './state.js?v=38';
import { renderDesign } from './renderer.js?v=38';
import { seriesVariants } from './series.js?v=38';
import { initUI, syncInputsFromState, renderTextLayerChips, renderIconLayerChips, convertNumberedToList, selectListItem, deselectListItem, addListItem, removeListItem } from './ui.js?v=38';
import { initIconPicker } from './icons.js?v=38';
import { initPresets } from './presets.js?v=38';
import { initExport } from './export.js?v=38';
import { initColorPopover } from './colorpicker.js?v=38';

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
      ? 'Your downloads will contain this one button.'
      : 'Your downloads will contain all ' + variants.length + ' buttons, laid out as one row on the Companion page.';
  }

  seriesWrap.innerHTML = '';
  const isList = state.series.mode === 'list';
  if (variants.length > 1 || isList) {
    variants.forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'series-item';
      item.classList.toggle('selected', isList && state.ui.selectedItems.includes(idx));
      item.draggable = true;
      item.title = 'Click to edit this button on its own, Cmd-click to select several. Drag onto another button to reorder.';
      item.addEventListener('click', (e) => {
        if (state.series.mode === 'numbers') {
          convertNumberedToList();
          selectListItem(idx);
          return;
        }
        if (state.series.mode !== 'list') return;
        selectListItem(idx, e.metaKey || e.ctrlKey);
      });
      const c = document.createElement('canvas');
      c.width = 144;
      c.height = 144;
      renderDesign(c, v.design, { bakeText: true });
      const span = document.createElement('span');
      span.textContent = v.label;
      item.appendChild(c);
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
      seriesWrap.appendChild(add);
    }
  }
}

let gridDragIndex = null;

function reorderSet(from, to) {
  if (state.series.mode === 'numbers') {
    convertNumberedToList();
  }
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
      const d = editTarget();
      d.bg.imageData = reader.result;
      d.bg.mode = 'image';
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
    const icons = editTarget().icons;
    if (state.ui.activeIcon >= icons.length) state.ui.activeIcon = icons.length - 1;
    const ic = icons[state.ui.activeIcon];
    ic.svg = reader.result;
    ic.name = 'pasted image';
    ic.tint = false;
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
  state.ui.selectedItems = [];
  emit();
  applyingUndo = false;
});

function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (saved && saved.design && Array.isArray(saved.design.texts)) {
      if (!Array.isArray(saved.design.icons) || !saved.design.icons.length) {
        saved.design.icons = saved.design.icon ? [saved.design.icon] : state.design.icons;
      }
      delete saved.design.icon;
      if (saved.design.bg && saved.design.bg.blend === undefined) saved.design.bg.blend = 100;
      if (Array.isArray(saved.design.texts)) {
        for (const t of saved.design.texts) {
          if (t.value) t.value = t.value.replace(/\\n/g, '\n');
        }
      }
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

document.getElementById('resetDesign').addEventListener('click', () => {
  Object.assign(state.design, defaultDesign());
  state.series.mode = 'off';
  state.series.items = [
    { label: 'ON AIR', color: '#b51f1f' },
    { label: 'PREVIEW', color: '#1f9d3a' },
    { label: 'OFF', color: '#55555c' }
  ];
  state.series.colorTarget = 'bg';
  state.ui.activeText = 0;
  state.ui.activeIcon = 0;
  state.ui.selectedItems = [];
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
  renderAll();
  if (!applyingUndo) {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistory, 400);
  }
});

document.fonts.ready.then(() => emit());
emit();
pushHistory();
