import { state, onChange, emit, APP_VERSION } from './state.js?v=8';
import { renderDesign } from './renderer.js?v=8';
import { seriesVariants } from './series.js?v=8';
import { initUI, syncInputsFromState, renderTextLayerChips } from './ui.js?v=8';
import { initIconPicker } from './icons.js?v=8';
import { initPresets } from './presets.js?v=8';
import { initExport } from './export.js?v=8';
import { initColorPopover } from './colorpicker.js?v=8';

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
    for (const v of variants) {
      const item = document.createElement('div');
      item.className = 'series-item';
      const c = document.createElement('canvas');
      c.width = 144;
      c.height = 144;
      renderDesign(c, v.design, { bakeText: true });
      const span = document.createElement('span');
      span.textContent = v.label;
      item.appendChild(c);
      item.appendChild(span);
      seriesWrap.appendChild(item);
    }
  }
}

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
