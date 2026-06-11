import { state, onChange, emit, deepClone, APP_VERSION } from './state.js?v=15';
import { renderDesign } from './renderer.js?v=15';
import { seriesVariants } from './series.js?v=15';
import { initUI, syncInputsFromState, renderTextLayerChips, renderSeriesItems, convertNumberedToList } from './ui.js?v=15';
import { initIconPicker } from './icons.js?v=15';
import { initPresets } from './presets.js?v=15';
import { initExport } from './export.js?v=15';
import { initColorPopover } from './colorpicker.js?v=15';

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
  await renderDesign(preview, variants[0].design, {
    topbarGuide: state.guides.topbar,
    bakeText: true
  });

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
      renderDesign(c, v.design, { bakeText: true, topbarGuide: state.guides.topbar });
      const span = document.createElement('span');
      span.textContent = v.label;
      item.appendChild(c);
      item.appendChild(span);

      item.addEventListener('dragstart', (e) => {
        gridDragIndex = idx;
        e.dataTransfer.effectAllowed = 'move';
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

preview.addEventListener('dragover', (e) => {
  if (gridDragIndex === null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  preview.classList.add('drop-target');
});
preview.addEventListener('dragleave', () => preview.classList.remove('drop-target'));
preview.addEventListener('drop', (e) => {
  if (gridDragIndex === null) return;
  e.preventDefault();
  const v = seriesVariants()[gridDragIndex];
  gridDragIndex = null;
  preview.classList.remove('drop-ready', 'drop-target');
  if (!v) return;
  Object.assign(state.design, deepClone(v.design));
  state.ui.activeText = 0;
  state.series.mode = 'off';
  emit();
});

if (window.BM_V && window.BM_V !== APP_VERSION) {
  if (!sessionStorage.getItem('bm-skew-reload')) {
    sessionStorage.setItem('bm-skew-reload', '1');
    location.replace(location.pathname + '?fresh=' + APP_VERSION);
  }
} else {
  sessionStorage.removeItem('bm-skew-reload');
}

initUI();
initIconPicker();
initPresets();
initExport();
initColorPopover();

onChange(() => {
  renderTextLayerChips();
  syncInputsFromState();
  renderAll();
});

document.fonts.ready.then(() => emit());
emit();
