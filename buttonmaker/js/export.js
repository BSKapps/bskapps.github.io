import { state } from './state.js?v=27';
import { renderToDataUrl } from './renderer.js?v=27';
import { seriesVariants, safeFileName } from './series.js?v=27';
import { downloadBlob } from './presets.js?v=27';
import { buildCompanionPage } from './companion.js?v=27';

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
    const url = await renderToDataUrl(variants[0].design, size, { bakeText: true });
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
    const url = await renderToDataUrl(v.design, size, { bakeText: true });
    let name = safeFileName(v.companionText || v.label, i);
    if (used.has(name)) name = name + '-' + (i + 1);
    used.add(name);
    zip.file(name + '.png', url.split(',')[1], { base64: true });
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'buttons.zip');
}

async function exportCompanion() {
  const proceed = window.confirm(
    'This file imports as a FULL PAGE in Companion.\n\n' +
    'When importing, pick an EMPTY page - the import replaces whatever page you choose. It cannot touch your other pages, connections or actions.\n\n' +
    'Want to keep buttons on a working page? Import to an empty page first, then copy them across in Companion.\n\nDownload the page file?'
  );
  if (!proceed) return;
  const variants = seriesVariants();
  const buttons = [];
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const png = await renderToDataUrl(v.design, 72, { bakeText: true });
    const firstLayer = v.design.texts.find((t) => t.value) || v.design.texts[0];
    buttons.push({
      png64: png.split(',')[1],
      text: '',
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
