import { state, onChange, emit } from './state.js?v=3';
import { renderDesign } from './renderer.js?v=3';
import { seriesVariants } from './series.js?v=3';
import { initUI, syncInputsFromState, renderTextLayerChips } from './ui.js?v=3';
import { initIconPicker } from './icons.js?v=3';
import { initPresets } from './presets.js?v=3';
import { initExport } from './export.js?v=3';
import { initColorPopover } from './colorpicker.js?v=3';

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
