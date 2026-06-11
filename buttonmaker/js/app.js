import { state, onChange, emit } from './state.js?v=2';
import { renderDesign } from './renderer.js?v=2';
import { seriesVariants } from './series.js?v=2';
import { initUI, syncInputsFromState, renderTextLayerChips } from './ui.js?v=2';
import { initIconPicker } from './icons.js?v=2';
import { initPresets } from './presets.js?v=2';
import { initExport } from './export.js?v=2';
import { initColorPopover } from './colorpicker.js?v=2';

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
