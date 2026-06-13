import { state, deepClone } from './state.js?v=67';

export function hasToken(design) {
  return design.texts.some((t) => t.value && (t.value.includes('{n}') || t.value.includes('{label}')));
}

function numberLayer(value) {
  return { value, font: 'Inter', weight: '600', size: 28, color: '#ffffff', align: 'center:center', x: 0, y: 0 };
}

function decimalsOf(n) {
  const s = String(n);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

export function numberedRange(from, to) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const dp = Math.min(2, Math.max(decimalsOf(from), decimalsOf(to)));
  const scale = Math.pow(10, dp);
  const loS = Math.round(lo * scale);
  const hiS = Math.round(hi * scale);
  const count = Math.min(hiS - loS + 1, 64);
  const out = [];
  for (let i = 0; i < count; i++) out.push(((loS + i) / scale).toFixed(dp));
  return out;
}

export function numberStep(from, to) {
  const dp = Math.min(2, Math.max(decimalsOf(from), decimalsOf(to)));
  return Math.pow(10, -dp);
}

export function seriesVariants() {
  const s = state.series;
  const base = state.design;
  const variants = [];
  const tokens = hasToken(base);

  if (s.mode === 'numbers') {
    for (const numStr of numberedRange(s.from, s.to)) {
      const d = deepClone(base);
      if (tokens) {
        substituteLayers(d, numStr, numStr);
      } else {
        const t = d.texts.find((l) => l.value);
        if (t) {
          const stem = t.value.replace(/\s*\d+(\.\d+)?$/, '');
          t.value = stem ? stem + ' ' + numStr : numStr;
        } else {
          d.texts.push(numberLayer(numStr));
        }
      }
      variants.push({ design: d, label: numStr, companionText: firstText(d) });
    }
  } else if (s.mode === 'list') {
    s.items.slice(0, 64).forEach((item, i) => {
      if (item.design) {
        const d = deepClone(item.design);
        variants.push({ design: d, label: item.label || String(i + 1), companionText: item.label || firstText(d) });
        return;
      }
      const d = deepClone(base);
      if (tokens) {
        substituteLayers(d, i + 1, item.label);
      } else if (item.label) {
        const t = d.texts.find((l) => l.value);
        if (t) t.value = item.label;
        else if (!item.iconSvg && !base.icons.some((ic) => ic.svg)) d.texts.push(numberLayer(item.label));
      }
      if (item.iconSvg) {
        d.icons[0].svg = item.iconSvg;
        d.icons[0].name = item.iconName || null;
      }
      if (item.color) {
        if (s.colorTarget === 'bg' && base.bg.mode !== 'image') {
          d.bg.mode = 'solid';
          d.bg.color = item.color;
        } else if (s.colorTarget === 'icon') {
          for (const ic of d.icons) ic.color = item.color;
        } else {
          for (const t of d.texts) t.color = item.color;
        }
      }
      variants.push({ design: d, label: item.label || String(i + 1), companionText: firstText(d) });
    });
  } else {
    const d = deepClone(base);
    if (tokens) {
      const firstLabel = (s.items[0] && s.items[0].label) || '';
      substituteLayers(d, Math.min(s.from, s.to), firstLabel);
    }
    variants.push({ design: d, label: '', companionText: firstText(d) });
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
