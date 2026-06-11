import { state, deepClone } from './state.js?v=20';

export function seriesVariants() {
  const s = state.series;
  const base = state.design;
  const variants = [];

  if (s.mode === 'numbers') {
    const from = Math.min(s.from, s.to);
    const to = Math.max(s.from, s.to);
    const count = Math.min(to - from + 1, 64);
    for (let i = 0; i < count; i++) {
      const n = from + i;
      const d = deepClone(base);
      substituteLayers(d, n, String(n));
      variants.push({ design: d, label: String(n), companionText: firstText(d) });
    }
  } else if (s.mode === 'list') {
    s.items.slice(0, 64).forEach((item, i) => {
      const d = deepClone(base);
      substituteLayers(d, i + 1, item.label);
      if (item.iconSvg) {
        d.icon.svg = item.iconSvg;
        d.icon.name = item.iconName || null;
      }
      if (item.color) {
        if (s.colorTarget === 'bg' && base.bg.mode !== 'image') {
          d.bg.mode = 'solid';
          d.bg.color = item.color;
        } else if (s.colorTarget === 'icon') {
          d.icon.color = item.color;
        } else {
          for (const t of d.texts) t.color = item.color;
        }
      }
      variants.push({ design: d, label: item.label || String(i + 1), companionText: firstText(d) });
    });
  } else {
    variants.push({ design: deepClone(base), label: '', companionText: firstText(base) });
  }

  return variants;
}

function substituteLayers(design, n, label) {
  for (const t of design.texts) {
    t.value = substitute(t.value, n, label);
  }
}

function firstText(design) {
  const t = (design.texts || []).find((l) => l.value);
  return t ? t.value : '';
}

function substitute(text, n, label) {
  if (!text) return text;
  return text.replaceAll('{n}', String(n)).replaceAll('{label}', label);
}

export function safeFileName(text, index) {
  if (!text) return 'button-' + (index + 1);
  const base = text
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return base || 'button-' + (index + 1);
}
