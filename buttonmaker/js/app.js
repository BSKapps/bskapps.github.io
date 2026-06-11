import { state, onChange, emit } from './state.js?v=5';
import { renderDesign } from './renderer.js?v=5';
import { seriesVariants } from './series.js?v=5';
import { initUI, syncInputsFromState, renderTextLayerChips } from './ui.js?v=5';
import { initIconPicker } from './icons.js?v=5';
import { initPresets } from './presets.js?v=5';
import { initExport } from './export.js?v=5';
import { initColorPopover } from './colorpicker.js?v=5';

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
  do {
    renderPending = false;
    await renderOnce();
  } while (renderPending);
  rendering = false;
}

async function renderOnce() {
  const variants = seriesVariants();
  await renderDesign(preview, variants[0].design, {
    topbarGuide: state.guides.topbar,
    bakeText: true
  });

  const summary = document.getElementById('exportSummary');
  if (variants.length === 1) {
    summary.textContent = 'Your downloads will contain this one button.';
  } else {
    summary.textContent = 'Your downloads will contain all ' + variants.length + ' buttons, laid out as one row on the Companion page.';
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
