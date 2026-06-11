export const APP_VERSION = '13';

export function defaultTextLayer() {
  return {
    value: '',
    font: 'Inter',
    weight: '600',
    size: 11,
    color: '#ffffff',
    align: 'center:bottom'
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
      imageData: null,
      imageFit: 'cover',
      imageDim: 0
    },
    icon: {
      name: null,
      svg: null,
      color: '#ffffff',
      tint: false,
      size: 52,
      x: 0,
      y: -6,
      opacity: 100
    },
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
  guides: { topbar: false },
  export: { size: 288, bakeText: true },
  ui: { activeText: 0 }
};

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
