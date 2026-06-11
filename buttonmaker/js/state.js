export const APP_VERSION = '33';

export function defaultTextLayer() {
  return {
    value: '',
    font: 'Inter',
    weight: '600',
    size: 11,
    color: '#ffffff',
    align: 'center:bottom',
    x: 0,
    y: 0
  };
}

export function defaultIconLayer() {
  return {
    name: null,
    svg: null,
    color: '#ffffff',
    tint: false,
    size: 52,
    x: 0,
    y: -6,
    opacity: 100
  };
}

export function defaultDesign() {
  return {
    bg: {
      mode: 'solid',
      color: '#1a2230',
      gradFrom: '#16324f',
      gradTo: '#0a0e14',
      angle: 135,
      blend: 100,
      imageData: null,
      imageFit: 'cover',
      imageDim: 0
    },
    icons: [defaultIconLayer()],
    texts: [defaultTextLayer()],
    shape: {
      radius: 0,
      border: 0,
      borderColor: '#ffffff'
    }
  };
}

export const state = {
  design: defaultDesign(),
  series: {
    mode: 'off',
    from: 1,
    to: 4,
    items: [
      { label: 'ON AIR', color: '#b51f1f' },
      { label: 'PREVIEW', color: '#1f9d3a' },
      { label: 'OFF', color: '#55555c' }
    ],
    colorTarget: 'bg'
  },
  export: { size: 288 },
  ui: { activeText: 0, activeIcon: 0, activeListItem: null }
};

export function editTarget() {
  const i = state.ui.activeListItem;
  if (state.series.mode === 'list' && i !== null) {
    const item = state.series.items[i];
    if (item && item.design) return item.design;
  }
  return state.design;
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
