export const APP_VERSION = '130';

export function defaultTextLayer() {
  return {
    value: '',
    font: 'Arial',
    weight: '700',
    size: 11,
    color: '#ffffff',
    opacity: 100,
    align: 'center:bottom',
    x: 0,
    y: 0,
    rotation: 0,
    bend: 0,
    invert: false,
    outline: 0,
    outlineColor: '#000000'
  };
}

export function defaultIconLayer() {
  return {
    name: null,
    svg: null,
    color: '#ffffff',
    tint: false,
    size: 52,
    align: 'center:center',
    x: 0,
    y: 0,
    opacity: 100,
    rotation: 0,
    reverse: false,
    invert: false
  };
}

export function dotLayer(color) {
  return Object.assign(defaultIconLayer(), {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/></svg>',
    name: 'status-dot',
    color: color || '#1f9d3a',
    size: 22,
    align: 'right:top'
  });
}

export function defaultDesign() {
  return {
    bg: {
      mode: 'solid',
      color: '#1a2230',
      opacity: 100,
      gradFrom: '#16324f',
      gradTo: '#0a0e14',
      angle: 135,
      blend: 100,
      imageData: null,
      imageFit: 'cover',
      imageDim: 0,
      imageRotation: 0,
      invert: false
    },
    icons: [defaultIconLayer()],
    texts: [defaultTextLayer()],
    shape: {
      radius: 0,
      border: 0,
      borderColor: '#ffffff',
      edges: { top: true, bottom: true, left: true, right: true },
      rotation: 0,
      zoom: 100,
      squircle: false
    }
  };
}

export function defaultSeries() {
  return {
    mode: 'off',
    from: 1,
    to: 4,
    items: [],
    colorTarget: 'bg'
  };
}

export const state = {
  design: defaultDesign(),
  series: defaultSeries(),
  export: { size: 288 },
  ui: { activeText: 0, activeIcon: 0, allText: false, allIcons: false, selectedItems: [] }
};

export function primarySelection() {
  const sel = state.ui.selectedItems;
  return sel.length ? sel[sel.length - 1] : null;
}

export function buttonCount() {
  return state.series.mode === 'list' ? state.series.items.length : 1;
}

export function editTarget() {
  const i = primarySelection();
  if (state.series.mode === 'list') {
    const item = state.series.items[i !== null ? i : 0];
    if (item && item.design) return item.design;
  }
  return state.design;
}

export function editTargets() {
  if (state.series.mode === 'list') {
    const selected = state.ui.selectedItems
      .map((i) => state.series.items[i] && state.series.items[i].design)
      .filter(Boolean);
    if (selected.length) return selected;
    const detached = state.series.items.map((it) => it.design).filter(Boolean);
    return [state.design, ...detached];
  }
  return [state.design];
}

const listeners = [];

export function onChange(fn) {
  listeners.push(fn);
}

export function emit() {
  for (const fn of listeners) fn();
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
