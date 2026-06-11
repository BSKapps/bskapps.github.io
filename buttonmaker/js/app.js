import { state, onChange, emit } from './state.js';
import { renderDesign } from './renderer.js';
import { seriesVariants } from './series.js';
import { initUI, syncInputsFromState, renderTextLayerChips } from './ui.js';
import { initIconPicker } from './icons.js';
import { initPresets } from './presets.js';
import { initExport } from './export.js';
import { initColorPopover } from './colorpicker.js';

const preview = document.getElementById('preview');
const seriesWrap = document.getElementById('seriesPreview');

let renderQueued = false;

async function renderAll() {
  if (renderQueued) return;
  renderQueued = true;
  await Promise.resolve();
  renderQueued = false;

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
