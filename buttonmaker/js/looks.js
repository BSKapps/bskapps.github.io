import { state, emit, onChange, deepClone } from './state.js?v=133';
import { renderDesign } from './renderer.js?v=133';

const LOOKS = [
  { name: 'Graphite', bg: { mode: 'solid', color: '#1d1d22' }, text: { color: '#ffffff', font: 'Inter', weight: '700' }, icon: '#ffffff', border: { width: 0, color: '#000000' } },
  { name: 'Navy', bg: { mode: 'gradient', gradFrom: '#16324f', gradTo: '#0a0e14' }, text: { color: '#ffffff', font: 'Inter', weight: '700' }, icon: '#8fbce8', border: { width: 0, color: '#000000' } },
  { name: 'Steel', bg: { mode: 'solid', color: '#2c3a52' }, text: { color: '#e8eef7', font: 'Roboto Condensed', weight: '700' }, icon: '#9fb8d8', border: { width: 1.5, color: '#46587a' } },
  { name: 'Amber', bg: { mode: 'gradient', gradFrom: '#c07a1a', gradTo: '#5e3a06' }, text: { color: '#140f06', font: 'Oswald', weight: '700' }, icon: '#140f06', border: { width: 0, color: '#000000' } },
  { name: 'Red', bg: { mode: 'solid', color: '#8c1f1f' }, text: { color: '#ffffff', font: 'Archivo Black', weight: '400' }, icon: '#ffffff', border: { width: 0, color: '#000000' } },
  { name: 'Forest', bg: { mode: 'solid', color: '#1e4d2c' }, text: { color: '#ffffff', font: 'Oswald', weight: '700' }, icon: '#cfe8d6', border: { width: 0, color: '#000000' } },
  { name: 'Light', bg: { mode: 'solid', color: '#e8e8ea' }, text: { color: '#17171a', font: 'Inter', weight: '700' }, icon: '#17171a', border: { width: 1.5, color: '#c9c9ce' } },
  { name: 'Violet', bg: { mode: 'gradient', gradFrom: '#3b0d63', gradTo: '#12041f' }, text: { color: '#ffffff', font: 'Montserrat', weight: '800', outline: 2, outlineColor: '#000000' }, icon: '#d9b8ff', border: { width: 0, color: '#000000' } }
];

export function applyLook(design, look) {
  const d = deepClone(design);
  d.bg.mode = look.bg.mode;
  d.bg.invert = false;
  if (look.bg.mode === 'gradient') {
    d.bg.gradFrom = look.bg.gradFrom;
    d.bg.gradTo = look.bg.gradTo;
    d.bg.angle = look.bg.angle === undefined ? 135 : look.bg.angle;
  } else {
    d.bg.color = look.bg.color;
  }
  for (const t of d.texts) {
    t.color = look.text.color;
    t.font = look.text.font;
    t.weight = look.text.weight;
    t.outline = look.text.outline || 0;
    t.outlineColor = look.text.outlineColor || '#000000';
    t.invert = false;
  }
  for (const ic of d.icons) {
    if (ic.name === 'status-dot') continue;
    ic.color = look.icon;
    ic.invert = false;
  }
  d.shape.border = look.border.width;
  d.shape.borderColor = look.border.color;
  return d;
}

export function initLooks() {
  const wrap = document.getElementById('lookChips');
  const canvases = [];
  for (const look of LOOKS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'look-chip';
    chip.title = 'Restyle this button and the whole set as ' + look.name;
    const c = document.createElement('canvas');
    c.width = 112;
    c.height = 112;
    chip.appendChild(c);
    const cap = document.createElement('span');
    cap.textContent = look.name;
    chip.appendChild(cap);
    chip.addEventListener('click', () => {
      Object.assign(state.design, applyLook(state.design, look));
      for (const it of state.series.items) {
        if (it && it.design) Object.assign(it.design, applyLook(it.design, look));
      }
      emit();
    });
    wrap.appendChild(chip);
    canvases.push({ c, look });
  }
  let queued = false;
  function renderChips() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      for (const { c, look } of canvases) {
        renderDesign(c, applyLook(state.design, look), { bakeText: true });
      }
    });
  }
  onChange(renderChips);
  renderChips();
  document.fonts.ready.then(renderChips);
  setTimeout(renderChips, 1500);
}
