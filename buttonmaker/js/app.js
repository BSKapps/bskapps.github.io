import { state, onChange, emit, deepClone, APP_VERSION, defaultDesign, defaultSeries, editTargets, primarySelection } from './state.js?v=135';
import { renderDesign } from './renderer.js?v=135';
import { seriesVariants, numberSet } from './series.js?v=135';
import { initUI, syncInputsFromState, renderTextLayerChips, renderIconLayerChips, selectListItem, selectRangeTo, deselectListItem, selectAllListItems, addListItem, removeListItem, seriesForSnapshot, releaseSelection } from './ui.js?v=135';
import { initIconPicker } from './icons.js?v=135';
import { initPresets, normalizeDesign } from './presets.js?v=135';
import { initExport } from './export.js?v=135';
import { initEffects, updateEffectControls } from './effects.js?v=135';
import { initColorPopover } from './colorpicker.js?v=135';

const preview = document.getElementById('preview');
const seriesWrap = document.getElementById('seriesPreview');

document.querySelector('.layout').addEventListener('click', (e) => {
  const t = e.target;
  if (t === seriesWrap || t.classList.contains('stage') || t.classList.contains('preview-wrap') || t.classList.contains('layout')) {
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
      } catch (e) {
        console.warn('Render failed', e);
      }
    } while (renderPending);
  } finally {
    rendering = false;
  }
}

async function renderOnce() {
  const variants = seriesVariants();
  const mainSel = primarySelection();
  const mainVariant = (state.series.mode === 'list' && mainSel !== null && variants[mainSel] ? variants[mainSel] : variants[0])
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
  seriesWrap.classList.toggle('compact', isList && variants.length > 24);
  seriesWrap.classList.toggle('tiny', isList && variants.length > 40);
  const linkedIds = new Set();
  if (isList) for (const it of state.series.items) if (it && it.id) linkedIds.add(it.id);
  if (isList) {
    variants.forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'series-item';
      const sel = state.ui.selectedItems;
      const isSel = sel.includes(idx);
      item.classList.toggle('selected', isSel && sel.length === 1);
      item.classList.toggle('sel-multi', isSel && sel.length > 1);
      item.classList.toggle('sel-all', sel.length === 0);
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
      const caption = document.createElement('div');
      caption.className = 'series-caption';
      const num = document.createElement('span');
      num.className = 'series-num';
      num.textContent = String(idx + 1);
      caption.appendChild(num);

      const srcItem = state.series.items[idx];
      if (srcItem && srcItem.onStateOf && linkedIds.has(srcItem.onStateOf)) {
        const badge = document.createElement('span');
        badge.className = 'series-on-badge';
        badge.textContent = 'on';
        badge.title = 'On state, linked to its button. REAPER export pairs it as _on.';
        caption.appendChild(badge);
      }
      item.appendChild(caption);

      const del = document.createElement('button');
      del.className = 'series-del';
      del.textContent = 'x';
      del.title = 'Remove this button from the set';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        removeListItem(idx);
      });
      item.appendChild(del);

      attachTouchReorder(item, idx);

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

    if (state.series.items.length < 64) {
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
        const clone = deepClone(src);
        delete clone.onStateOf;
        delete clone.id;
        state.series.items.push(clone);
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
    const item = document.createElement('div');
    item.className = 'series-item selected';
    item.draggable = true;
    item.title = 'Drag onto + to copy this button.';
    const c = document.createElement('canvas');
    c.width = 144;
    c.height = 144;
    renderDesign(c, state.design, { bakeText: true });
    item.appendChild(c);
    const caption = document.createElement('div');
    caption.className = 'series-caption';
    const num = document.createElement('span');
    num.className = 'series-num';
    num.textContent = '1';
    caption.appendChild(num);
    item.appendChild(caption);
    item.addEventListener('dragstart', (e) => {
      singleDragging = true;
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', 'single');
    });
    item.addEventListener('dragend', () => {
      singleDragging = false;
    });
    seriesWrap.appendChild(item);

    const wrap = document.createElement('div');
    wrap.className = 'series-add-tile';
    const add = document.createElement('button');
    add.className = 'series-add';
    add.textContent = '+';
    add.title = 'Add a new blank button. Drop button 1 here to copy it instead.';
    add.addEventListener('click', () => {
      releaseSelection();
      state.series.items = [{ label: '', color: '' }, { label: '', color: '', design: defaultDesign() }];
      state.series.mode = 'list';
      selectListItem(1);
    });
    add.addEventListener('dragenter', (e) => {
      if (!singleDragging) return;
      e.preventDefault();
      add.classList.add('drop-target');
    });
    add.addEventListener('dragover', (e) => {
      if (!singleDragging) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      add.classList.add('drop-target');
    });
    add.addEventListener('dragleave', () => add.classList.remove('drop-target'));
    add.addEventListener('drop', (e) => {
      e.preventDefault();
      add.classList.remove('drop-target');
      if (!singleDragging) return;
      singleDragging = false;
      releaseSelection();
      state.series.items = [{ label: '', color: '' }, { label: '', color: '' }];
      state.series.mode = 'list';
      selectListItem(1);
    });
    const cap = document.createElement('span');
    cap.textContent = 'Add';
    wrap.appendChild(add);
    wrap.appendChild(cap);
    seriesWrap.appendChild(wrap);
  }
}

let gridDragIndex = null;
let singleDragging = false;

function attachTouchReorder(item, idx) {
  let timer = null;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  const clearTargets = () => {
    seriesWrap.querySelectorAll('.series-item.touch-target').forEach((n) => n.classList.remove('touch-target'));
  };
  const targetUnder = (touch) => {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const hit = el && el.closest('.series-item');
    return hit && hit !== item && seriesWrap.contains(hit) ? hit : null;
  };
  item.addEventListener('touchstart', (e) => {
    if (state.series.mode !== 'list') return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    dragging = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      dragging = true;
      item.classList.add('touch-dragging');
    }, 300);
  }, { passive: true });
  item.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!dragging) {
      if (Math.abs(t.clientX - startX) > 8 || Math.abs(t.clientY - startY) > 8) clearTimeout(timer);
      return;
    }
    e.preventDefault();
    clearTargets();
    const hit = targetUnder(t);
    if (hit) hit.classList.add('touch-target');
  }, { passive: false });
  const finish = (e) => {
    clearTimeout(timer);
    if (!dragging) return;
    dragging = false;
    item.classList.remove('touch-dragging');
    clearTargets();
    if (e.type === 'touchend') {
      const hit = targetUnder(e.changedTouches[0]);
      if (hit) {
        const tiles = [...seriesWrap.querySelectorAll('.series-item')];
        const to = tiles.indexOf(hit);
        if (to >= 0 && to !== idx) reorderSet(idx, to);
      }
    }
    e.preventDefault();
  };
  item.addEventListener('touchend', finish, { passive: false });
  item.addEventListener('touchcancel', finish, { passive: false });
}

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

let sessionSaveWarned = false;

function saveSession(s) {
  try {
    localStorage.setItem(SESSION_KEY, s);
    sessionSaveWarned = false;
  } catch (err) {
    if (!sessionSaveWarned) {
      sessionSaveWarned = true;
      alert('Your work could not be saved for next time, browser storage is full. Large background images use a lot of space. Your design still works, but it may not survive a reload.');
    }
  }
}

function pushHistory() {
  const s = snapshot();
  if (undoStack[undoStack.length - 1] !== s) {
    undoStack.push(s);
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }
  saveSession(s);
  updateUndoButtons();
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
  saveSession(s);
  updateUndoButtons();
}

function doUndo() {
  if (undoStack.length < 2) return;
  redoStack.push(undoStack.pop());
  applyHistory(undoStack[undoStack.length - 1]);
}

function doRedo() {
  if (!redoStack.length) return;
  const s = redoStack.pop();
  undoStack.push(s);
  applyHistory(s);
}

function updateUndoButtons() {
  document.getElementById('undoBtn').disabled = undoStack.length < 2;
  document.getElementById('redoBtn').disabled = !redoStack.length;
}

document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'range' && t.type !== 'checkbox') return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    if (undoStack.length < 2) return;
    e.preventDefault();
    doUndo();
  } else if ((key === 'z' && e.shiftKey) || (key === 'y' && e.ctrlKey && !e.metaKey)) {
    if (!redoStack.length) return;
    e.preventDefault();
    doRedo();
  } else if (key === 'a') {
    if (state.series.mode !== 'list' || !state.series.items.length) return;
    e.preventDefault();
    selectAllListItems();
  }
});

function applySaved(saved) {
  if (saved && saved.design && Array.isArray(saved.design.texts)) {
    Object.assign(state.design, normalizeDesign(saved.design));
    const series = saved.series || {};
    if (series.mode === 'numbers') {
      series.items = numberSet(state.design, series.from, series.to);
      series.mode = 'list';
    }
    if (Array.isArray(series.items)) {
      if (series.items.length > 64) series.items = series.items.slice(0, 64);
      for (const it of series.items) {
        if (it && it.design) it.design = normalizeDesign(it.design);
      }
    }
    Object.assign(state.series, series);
    if (state.series.mode === 'list' && (!Array.isArray(state.series.items) || !state.series.items.length)) {
      state.series.mode = 'off';
    }
  }
}

function restoreSession() {
  try {
    applySaved(JSON.parse(localStorage.getItem(SESSION_KEY)));
  } catch (err) {}
}

const bmVersion = document.querySelector('meta[name="bm-version"]')?.content;
if (bmVersion && bmVersion !== APP_VERSION) {
  if (!sessionStorage.getItem('bm-skew-reload')) {
    sessionStorage.setItem('bm-skew-reload', '1');
    location.replace(location.pathname + '?fresh=' + APP_VERSION);
  }
} else {
  sessionStorage.removeItem('bm-skew-reload');
}

function startFresh() {
  Object.assign(state.design, defaultDesign());
  Object.assign(state.series, defaultSeries());
  state.ui.activeText = 0;
  state.ui.activeIcon = 0;
  releaseSelection();
  emit();
}
document.getElementById('resetDesign').addEventListener('click', startFresh);
document.getElementById('resetDesignStep').addEventListener('click', startFresh);
document.getElementById('undoBtn').addEventListener('click', doUndo);
document.getElementById('redoBtn').addEventListener('click', doRedo);

restoreSession();

initUI();
initIconPicker();
initPresets();
initExport();
initEffects();
initColorPopover();

onChange(() => {
  renderTextLayerChips();
  renderIconLayerChips();
  syncInputsFromState();
  updateEffectControls();
  scheduleRender();
  if (!applyingUndo) {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistory, 400);
  }
});

document.fonts.ready.then(() => emit());
emit();
pushHistory();

for (const btn of document.querySelectorAll('.help-toggle')) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest('.section');
    card.classList.toggle('hints-hidden');
    if (!card.open) card.open = true;
  });
}

const miniPreview = document.getElementById('miniPreview');
const mainPreviewWrap = document.querySelector('.preview-wrap');
if (miniPreview && mainPreviewWrap && 'IntersectionObserver' in window) {
  const mctx = miniPreview.getContext('2d');
  const srcCanvas = document.getElementById('preview');
  let miniRaf = null;
  function miniCopy() {
    if (window.innerWidth > 820) {
      miniPreview.classList.remove('visible');
      miniRaf = null;
      return;
    }
    mctx.clearRect(0, 0, miniPreview.width, miniPreview.height);
    mctx.drawImage(srcCanvas, 0, 0, miniPreview.width, miniPreview.height);
    miniRaf = miniPreview.classList.contains('visible') ? requestAnimationFrame(miniCopy) : null;
  }
  new IntersectionObserver((entries) => {
    const away = !entries[0].isIntersecting && window.innerWidth <= 820;
    miniPreview.classList.toggle('visible', away);
    if (away && miniRaf === null) miniRaf = requestAnimationFrame(miniCopy);
  }).observe(mainPreviewWrap);
  miniPreview.addEventListener('click', () => {
    mainPreviewWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

const shareBtn = document.getElementById('shareLink');
if ('CompressionStream' in window && navigator.clipboard) {
  shareBtn.addEventListener('click', shareDesignLink);
} else {
  shareBtn.style.display = 'none';
}

async function shareDesignLink() {
  const cs = new CompressionStream('deflate-raw');
  const buf = await new Response(new Blob([snapshot()]).stream().pipeThrough(cs)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  const code = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = location.origin + location.pathname + '#d=' + code;
  if (url.length > 30000) {
    alert('This design is too large to share as a link, probably from an uploaded image. Use Back Up to share it as a file instead.');
    return;
  }
  navigator.clipboard.writeText(url).then(
    () => {
      shareBtn.textContent = 'Link Copied';
      setTimeout(() => { shareBtn.textContent = 'Share Link'; }, 1200);
    },
    () => alert('Could not copy the link, the browser blocked clipboard access.')
  );
}

async function loadSharedDesign() {
  const m = location.hash.match(/^#d=([A-Za-z0-9_-]+)$/);
  if (!m || !('DecompressionStream' in window)) return;
  let saved = null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ds = new DecompressionStream('deflate-raw');
    const json = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    saved = JSON.parse(json);
  } catch (err) {
    saved = null;
  }
  if (!(saved && saved.design && Array.isArray(saved.design.texts))) {
    history.replaceState(null, '', location.pathname);
    return;
  }
  const untouched = state.series.mode === 'off' && JSON.stringify(state.design) === JSON.stringify(defaultDesign());
  if (!untouched && !window.confirm('Open the shared design from this link? It replaces your current design and set.')) {
    history.replaceState(null, '', location.pathname);
    return;
  }
  try {
    applySaved(saved);
    state.ui.activeText = 0;
    state.ui.activeIcon = 0;
    releaseSelection();
    emit();
  } catch (err) {
    startFresh();
  } finally {
    history.replaceState(null, '', location.pathname);
  }
}
loadSharedDesign();
