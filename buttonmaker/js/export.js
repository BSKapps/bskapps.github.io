import { state, primarySelection, defaultTextLayer } from './state.js?v=89';
import { renderToDataUrl, renderDesign } from './renderer.js?v=89';
import { seriesVariants, safeFileName } from './series.js?v=89';
import { downloadBlob } from './presets.js?v=89';
import { buildCompanionPage } from './companion.js?v=89';

const SS = 4;
const STATE_LIFT = [0, 0.12, 0.22];
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

function activeOnState() {
  return state.export.onState && state.export.onState.enabled ? state.export.onState : null;
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

function drawDot(ctx, size, color) {
  const r = size * 0.15;
  const cx = size - r - size * 0.08;
  const cy = r + size * 0.08;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.stroke();
  ctx.restore();
}

export function invertCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(img, 0, 0);
}

function applyOnState(ctx, size, onState) {
  if (!onState) return;
  if (onState.effect === 'tint') overlay(ctx, size, onState.color, 0.4);
  else if (onState.effect === 'glow') overlay(ctx, size, '#ffffff', 0.24);
}

export async function buildStrip(design, cellSize, onState) {
  const off = document.createElement('canvas');
  off.width = cellSize * SS;
  off.height = cellSize * SS;
  await renderDesign(off, design, { bakeText: true });
  if (onState && onState.effect === 'invert') invertCanvas(off);

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
    applyOnState(cctx, cellSize, onState);
    overlay(cctx, cellSize, '#ffffff', STATE_LIFT[c]);
    if (onState && onState.effect === 'dot') drawDot(cctx, cellSize, onState.color);
    sctx.drawImage(cell, c * cellSize, 0);
  }
  return strip;
}

async function renderWithOnState(design, size, onState) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  await renderDesign(canvas, design, { bakeText: true });
  if (onState && onState.effect === 'invert') invertCanvas(canvas);
  const ctx = canvas.getContext('2d');
  applyOnState(ctx, size, onState);
  if (onState && onState.effect === 'dot') drawDot(ctx, size, onState.color);
  return canvas.toDataURL('image/png');
}

function uniqueName(used, base) {
  let name = base;
  let k = 2;
  while (used.has(name)) name = base + '-' + k++;
  used.add(name);
  return name;
}

export async function buildPngZip(zip, variants, size, onState) {
  const used = new Set();
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const name = uniqueName(used, safeFileName(v.companionText || v.label, i));
    const url = await renderToDataUrl(v.design, size, { bakeText: true });
    zip.file(name + '.png', url.split(',')[1], { base64: true });
    if (onState) {
      const onUrl = await renderWithOnState(v.design, size, onState);
      zip.file(name + '_on.png', onUrl.split(',')[1], { base64: true });
    }
  }
  return zip;
}

export async function buildReaperZip(zip, variants, onState) {
  const used = new Set();
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const name = uniqueName(used, safeFileName(v.companionText || v.label, i));
    for (const s of REAPER_SIZES) {
      const off = await buildStrip(v.design, s.cell, null);
      zip.file('toolbar_icons/' + s.dir + name + '.png', off.toDataURL('image/png').split(',')[1], { base64: true });
      if (onState) {
        const on = await buildStrip(v.design, s.cell, onState);
        zip.file('toolbar_icons/' + s.dir + name + '_on.png', on.toDataURL('image/png').split(',')[1], { base64: true });
      }
    }
  }
  return zip;
}

function segControl(id, getSet) {
  const seg = document.getElementById(id);
  seg.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      getSet(btn.dataset.val);
    });
  });
}

export function updateExportControls() {
  const reaper = state.export.mode === 'reaper';
  const on = state.export.onState;
  document.getElementById('sdExports').classList.toggle('hidden', reaper);
  document.getElementById('reaperExports').classList.toggle('hidden', !reaper);
  document.getElementById('onStateRows').classList.toggle('hidden', !on.enabled);
  document.getElementById('onStateColorRow').classList.toggle('hidden', on.effect === 'glow' || on.effect === 'invert');
  document.getElementById('exportPng').disabled = on.enabled;
  document.getElementById('exportZip').disabled = !on.enabled && state.series.mode === 'off';
}

export function initExport() {
  document.getElementById('exportPng').addEventListener('click', exportPng);
  document.getElementById('exportZip').addEventListener('click', exportZip);
  document.getElementById('exportCompanion').addEventListener('click', exportCompanion);
  document.getElementById('exportReaper').addEventListener('click', exportReaper);

  segControl('exportMode', (v) => {
    state.export.mode = v;
    updateExportControls();
  });
  segControl('onStateEffect', (v) => {
    state.export.onState.effect = v;
    updateExportControls();
  });
  document.getElementById('onStateToggle').addEventListener('change', (e) => {
    state.export.onState.enabled = e.target.checked;
    updateExportControls();
  });
  document.getElementById('onStateColor').addEventListener('input', (e) => {
    state.export.onState.color = e.target.value;
  });

  updateExportControls();
}

async function exportPng() {
  const size = state.export.size;
  const variants = seriesVariants();
  const sel = primarySelection();
  const idx = state.series.mode === 'list' && sel !== null && variants[sel] ? sel : 0;
  const v = variants[idx] || variants[0];
  const url = await renderToDataUrl(v.design, size, { bakeText: true });
  downloadBlob(dataUrlToBlob(url), safeFileName(v.companionText, idx) + '.png');
}

async function exportZip() {
  const zip = new JSZip();
  await buildPngZip(zip, seriesVariants(), state.export.size, activeOnState());
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'buttons.zip');
}

async function exportReaper() {
  const zip = new JSZip();
  await buildReaperZip(zip, seriesVariants(), activeOnState());
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
      bgcolor: v.design.bg.mode === 'solid' ? v.design.bg.color : '#000000',
      size: firstLayer.size,
      alignment: firstLayer.align
    });
  }
  const config = buildCompanionPage(buttons);
  const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
  downloadBlob(blob, 'button-maker-page.companionconfig');
}
