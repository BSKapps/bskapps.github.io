import { state } from './state.js?v=6';
import { renderToDataUrl } from './renderer.js?v=6';
import { seriesVariants, safeFileName } from './series.js?v=6';
import { downloadBlob } from './presets.js?v=6';
import { buildCompanionPage } from './companion.js?v=6';

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)[1];
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function initExport() {
  document.getElementById('exportPng').addEventListener('click', exportPng);
  document.getElementById('exportZip').addEventListener('click', exportZip);
  document.getElementById('exportCompanion').addEventListener('click', exportCompanion);
}

async function exportPng() {
  const size = state.export.size;
  const variants = seriesVariants();
  if (variants.length === 1) {
    const url = await renderToDataUrl(variants[0].design, size, { bakeText: state.export.bakeText });
    downloadBlob(dataUrlToBlob(url), safeFileName(variants[0].companionText, 0) + '.png');
  } else {
    await exportZip();
  }
}

async function exportZip() {
  const size = state.export.size;
  const variants = seriesVariants();
  const zip = new JSZip();
  const used = new Set();
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const url = await renderToDataUrl(v.design, size, { bakeText: state.export.bakeText });
    let name = safeFileName(v.companionText || v.label, i);
    if (used.has(name)) name = name + '-' + (i + 1);
    used.add(name);
    zip.file(name + '.png', url.split(',')[1], { base64: true });
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'buttons.zip');
}

async function exportCompanion() {
  const variants = seriesVariants();
  const bake = state.export.bakeText;
  const buttons = [];
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const png = await renderToDataUrl(v.design, 72, { bakeText: bake });
    const firstLayer = v.design.texts.find((t) => t.value) || v.design.texts[0];
    buttons.push({
      png64: png.split(',')[1],
      text: bake ? '' : (v.companionText || ''),
      color: firstLayer.color,
      bgcolor: v.design.bg.mode === 'solid' ? v.design.bg.color : '#000000',
      size: firstLayer.size,
      alignment: firstLayer.align
    });
  }
  const config = buildCompanionPage(buttons);
  const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
  downloadBlob(blob, 'button-maker-page.companionconfig');
}
