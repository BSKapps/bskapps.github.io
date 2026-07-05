import { state, primarySelection, defaultTextLayer } from './state.js?v=119';
import { renderToDataUrl, renderDesign } from './renderer.js?v=119';
import { seriesVariants, variantFileName } from './series.js?v=119';
import { downloadBlob } from './presets.js?v=119';
import { buildCompanionPage } from './companion.js?v=119';

const SS = 4;
const STATE_LIFT = [0, 0.05, 0.12];
const REAPER_SIZES = [
  { dir: '', cell: 30 },
  { dir: '150/', cell: 45 },
  { dir: '200/', cell: 60 }
];

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)[1];
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function overlay(ctx, size, color, alpha) {
  if (!alpha) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}

export async function buildStrip(design, cellSize) {
  const off = document.createElement('canvas');
  off.width = cellSize * SS;
  off.height = cellSize * SS;
  await renderDesign(off, design, { bakeText: true });

  const strip = document.createElement('canvas');
  strip.width = cellSize * 3;
  strip.height = cellSize;
  const sctx = strip.getContext('2d');

  for (let c = 0; c < 3; c++) {
    const cell = document.createElement('canvas');
    cell.width = cellSize;
    cell.height = cellSize;
    const cctx = cell.getContext('2d');
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = 'high';
    cctx.drawImage(off, 0, 0, cellSize, cellSize);
    overlay(cctx, cellSize, '#ffffff', STATE_LIFT[c]);
    sctx.drawImage(cell, c * cellSize, 0);
  }
  return strip;
}

function uniqueName(used, base) {
  let name = base;
  let k = 2;
  while (used.has(name)) name = base + '-' + k++;
  used.add(name);
  return name;
}

export async function buildPngZip(zip, variants, size) {
  const used = new Set();
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const name = uniqueName(used, variantFileName(v, i));
    const url = await renderToDataUrl(v.design, size, { bakeText: true });
    zip.file(name + '.png', url.split(',')[1], { base64: true });
  }
  return zip;
}

export function reaperLinks(items) {
  const idToIndex = {};
  (items || []).forEach((it, i) => {
    if (it && it.id) idToIndex[it.id] = i;
  });
  const skip = new Set();
  const onStateFor = {};
  (items || []).forEach((it, i) => {
    if (it && it.onStateOf && idToIndex[it.onStateOf] !== undefined) {
      const src = idToIndex[it.onStateOf];
      if (onStateFor[src] === undefined) {
        onStateFor[src] = i;
        skip.add(i);
      }
    }
  });
  return { skip, onStateFor };
}

function uniqueStripName(used, base, reserveOn) {
  let name = base;
  let k = 2;
  while (used.has(name) || (reserveOn && used.has(name + '_on'))) name = base + '-' + k++;
  used.add(name);
  if (reserveOn) used.add(name + '_on');
  return name;
}

export async function buildReaperZip(zip, variants, links) {
  const skip = links && links.skip ? links.skip : new Set();
  const onStateFor = (links && links.onStateFor) || {};
  const used = new Set();
  for (let i = 0; i < variants.length; i++) {
    if (skip.has(i)) continue;
    const v = variants[i];
    const onIdx = onStateFor[i];
    const name = uniqueStripName(used, variantFileName(v, i), onIdx !== undefined);
    for (const s of REAPER_SIZES) {
      const base = await buildStrip(v.design, s.cell);
      zip.file('toolbar_icons/' + s.dir + name + '.png', base.toDataURL('image/png').split(',')[1], { base64: true });
      if (onIdx !== undefined && variants[onIdx]) {
        const on = await buildStrip(variants[onIdx].design, s.cell);
        zip.file('toolbar_icons/' + s.dir + name + '_on.png', on.toDataURL('image/png').split(',')[1], { base64: true });
      }
    }
  }
  return zip;
}

export function initExport() {
  document.getElementById('exportPng').addEventListener('click', exportPng);
  document.getElementById('exportZip').addEventListener('click', exportZip);
  document.getElementById('exportCompanion').addEventListener('click', exportCompanion);
  document.getElementById('exportReaper').addEventListener('click', exportReaper);
}

async function exportPng() {
  const size = state.export.size;
  const variants = seriesVariants();
  const sel = primarySelection();
  const idx = state.series.mode === 'list' && sel !== null && variants[sel] ? sel : 0;
  const v = variants[idx] || variants[0];
  const url = await renderToDataUrl(v.design, size, { bakeText: true });
  downloadBlob(dataUrlToBlob(url), variantFileName(v, idx) + '.png');
}

async function exportZip() {
  const zip = new JSZip();
  await buildPngZip(zip, seriesVariants(), state.export.size);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'buttons.zip');
}

async function exportReaper() {
  const zip = new JSZip();
  const links = state.series.mode === 'list' ? reaperLinks(state.series.items) : null;
  await buildReaperZip(zip, seriesVariants(), links);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'reaper-toolbar-icons.zip');
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
    const firstLayer = v.design.texts.find((t) => t.value) || v.design.texts[0] || defaultTextLayer();
    buttons.push({
      png64: png.split(',')[1],
      text: '',
      color: firstLayer.color,
      bgcolor: v.design.bg.mode === 'solid' ? v.design.bg.color : '#000000'
    });
  }
  const config = buildCompanionPage(buttons);
  const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
  downloadBlob(blob, 'button-maker-page.companionconfig');
}
