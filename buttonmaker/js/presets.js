import { state, emit, deepClone, defaultDesign, defaultSeries } from './state.js?v=80';
import { renderDesign } from './renderer.js?v=80';
import { numberSet } from './series.js?v=80';
import { releaseSelection } from './ui.js?v=80';

const STORE_KEY = 'cbm-presets-v1';

const mdi = (d) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="' + d + '"/></svg>';

const ICONS = {
  play: mdi('M8,5.14V19.14L19,12.14L8,5.14Z'),
  pause: mdi('M14,19H18V5H14M6,19H10V5H6V19Z'),
  stop: mdi('M18,18H6V6H18V18Z'),
  next: mdi('M16,18H18V6H16M6,18L14.5,12L6,6V18Z'),
  prev: mdi('M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z'),
  rewind: mdi('m11.5 12l8.5 6V6m-9 12V6l-8.5 6z'),
  ffwd: mdi('M13 6v12l8.5-6M4 18l8.5-6L4 6z'),
  shuffle: mdi('m17 3l5.25 4.5L17 12l5.25 4.5L17 21v-3h-2.74l-2.82-2.82l2.12-2.12L15.5 15H17V9h-1.5l-9 9H2v-3h3.26l9-9H17zM2 6h4.5l2.82 2.82l-2.12 2.12L5.26 9H2z'),
  repeat: mdi('M17 17H7v-3l-4 4l4 4v-3h12v-6h-2M7 7h10v3l4-4l-4-4v3H5v6h2z'),
  record: mdi('M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z'),
  lowerthird: mdi('M3,13.5H13V15.5H3V13.5M3,17H21V19.5H3V17Z'),
  mute: mdi('M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z'),
  solo: mdi('M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10C21,5 16.97,1 12,1Z'),
  monitor: mdi('M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z'),
  marker: mdi('M14.4,6L14,4H5V21H7V14H12.6L13,16H20V6H14.4Z'),
  region: mdi('M9,3H5V21H9V19H7V5H9V3M19,3H15V5H17V19H15V21H19V3Z'),
  split: mdi('M19,3L13,9L15,11L22,4V3M12,12.5A0.5,0.5 0 0,1 11.5,12A0.5,0.5 0 0,1 12,11.5A0.5,0.5 0 0,1 12.5,12A0.5,0.5 0 0,1 12,12.5M6,20A2,2 0 0,1 4,18C4,16.89 4.9,16 6,16A2,2 0 0,1 8,18A2,2 0 0,1 6,20M6,8A2,2 0 0,1 4,6C4,4.89 4.9,4 6,4A2,2 0 0,1 8,6A2,2 0 0,1 6,8M9.64,7.64C9.87,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.87 7.64,9.64L10,12L7.64,14.36C7.14,14.13 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.87,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64Z'),
  heal: mdi('M17.73,12L19.5,10.23C21.17,8.55 21.17,5.83 19.5,4.16C17.83,2.5 15.11,2.5 13.44,4.16L11.67,5.93L17.73,12M10.94,6.66L4.16,13.44C2.5,15.11 2.5,17.83 4.16,19.5C5.83,21.17 8.55,21.17 10.23,19.5L17,12.72L10.94,6.66M8.5,10A1,1 0 0,1 9.5,11A1,1 0 0,1 8.5,12A1,1 0 0,1 7.5,11A1,1 0 0,1 8.5,10M11.5,13A1,1 0 0,1 12.5,14A1,1 0 0,1 11.5,15A1,1 0 0,1 10.5,14A1,1 0 0,1 11.5,13M8.5,14A1,1 0 0,1 9.5,15A1,1 0 0,1 8.5,16A1,1 0 0,1 7.5,15A1,1 0 0,1 8.5,14M14.04,12.61L11.39,9.96L9.96,11.39L12.61,14.04L14.04,12.61Z'),
  glue: mdi('M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76V7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24V16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.65L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z'),
  fade: mdi('M4,20H20V4L4,20Z'),
  crop: mdi('M7,17V1H5V5H1V7H5V17A2,2 0 0,0 7,19H17V23H19V19H23V17M17,15H19V7C19,5.89 18.1,5 17,5H9V7H17V15Z'),
  nudge: mdi('M13,11H18L16.5,9.5L17.92,8.08L21.84,12L17.92,15.92L16.5,14.5L18,13H13V18L14.5,16.5L15.92,17.92L12,21.84L8.08,17.92L9.5,16.5L11,18V13H6L7.5,14.5L6.08,15.92L2.16,12L6.08,8.08L7.5,9.5L6,11H11V6L9.5,7.5L8.08,6.08L12,2.16L15.92,6.08L14.5,7.5L13,6V11Z'),
  norm: mdi('M10,20H14V4H10V20M4,20H8V12H4V20M16,9V20H20V9H16Z'),
  render: mdi('M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z'),
  mixer: mdi('M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z'),
  dock: mdi('M20,4A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4H20M20,14H4V18H20V14Z'),
  fx: mdi('M7.5,5.6L5,7L6.4,4.5L5,2L7.5,3.4L10,2L8.6,4.5L10,7L7.5,5.6M19.5,15.4L22,14L20.6,16.5L22,19L19.5,17.6L17,19L18.4,16.5L17,14L19.5,15.4M22,2L20.6,4.5L22,7L19.5,5.6L17,7L18.4,4.5L17,2L19.5,3.4L22,2M13.34,12.78L15.78,10.34L13.66,8.22L11.22,10.66L13.34,12.78M14.37,7.29C14,6.9 13.35,6.9 12.96,7.29L1.29,18.96C0.9,19.35 0.9,20 1.29,20.37L3.63,22.71C4,23.1 4.65,23.1 5.04,22.71L16.71,11.04C17.1,10.65 17.1,10 16.71,9.63L14.37,7.29Z')
};

const faderSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="currentColor">' +
  '<rect x="4.4" y="3" width="1.3" height="18" rx="0.65"/>' +
  '<rect x="11.35" y="3" width="1.3" height="18" rx="0.65"/>' +
  '<rect x="18.3" y="3" width="1.3" height="18" rx="0.65"/>' +
  '<rect x="2.6" y="12.4" width="4.9" height="2.9" rx="1.3"/>' +
  '<rect x="9.55" y="6.4" width="4.9" height="2.9" rx="1.3"/>' +
  '<rect x="16.5" y="9.4" width="4.9" height="2.9" rx="1.3"/></g></svg>';

const meterSvg = (cols, levels) => {
  const rows = 7;
  const top = 2.5;
  const bottom = 21.5;
  const sg = 0.6;
  const sh = (bottom - top - sg * (rows - 1)) / rows;
  const left = 2.5;
  const right = 21.5;
  const cg = cols > 4 ? 0.8 : 1.4;
  const cw = (right - left - cg * (cols - 1)) / cols;
  const tone = ['#2fbf4f', '#2fbf4f', '#2fbf4f', '#9acb3b', '#d8b026', '#e8881f', '#e5484d'];
  let r = '';
  for (let c = 0; c < cols; c++) {
    const x = (left + c * (cw + cg)).toFixed(2);
    for (let i = 0; i < rows; i++) {
      const y = (bottom - sh - i * (sh + sg)).toFixed(2);
      const fill = i < levels[c] ? tone[i] : '#2a2f37';
      r += '<rect x="' + x + '" y="' + y + '" width="' + cw.toFixed(2) + '" height="' + sh.toFixed(2) + '" rx="0.4" fill="' + fill + '"/>';
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' + r + '</svg>';
};

function builtinPresets() {
  const mk = (over) => {
    const d = defaultDesign();
    over(d);
    return d;
  };
  return [
    {
      name: 'Blank',
      builtin: true,
      design: mk(() => {})
    },
    {
      name: 'Dark Label',
      builtin: true,
      design: mk((d) => {
        d.bg.color = '#111418';
        Object.assign(d.texts[0], { value: 'LABEL', size: 12 });
        d.shape.border = 2;
        d.shape.borderColor = '#2e3947';
        d.shape.radius = 12;
      })
    },
    {
      name: 'Light Label',
      builtin: true,
      design: mk((d) => {
        d.bg.color = '#d9d9de';
        Object.assign(d.texts[0], { value: 'LABEL', size: 12, color: '#16181c' });
        d.shape.radius = 12;
      })
    },
    {
      name: 'Transport',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'Play', color: '#4caf50', iconSvg: ICONS.play, iconName: 'builtin:play' },
          { label: 'Pause', color: '#ffb300', iconSvg: ICONS.pause, iconName: 'builtin:pause' },
          {
            label: 'Stop',
            color: '#e53935',
            iconSvg: ICONS.stop,
            iconName: 'builtin:stop',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: ICONS.stop, name: 'builtin:stop', color: '#e53935', size: 75, y: -4 });
              Object.assign(d.texts[0], { value: 'Stop', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
            })
          },
          { label: 'Prev', color: '#ffffff', iconSvg: ICONS.prev, iconName: 'builtin:prev' },
          {
            label: 'Next',
            color: '#ffffff',
            iconSvg: ICONS.next,
            iconName: 'builtin:next',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: ICONS.next, name: 'builtin:next', color: '#ffffff', size: 69, y: 0 });
              Object.assign(d.texts[0], { value: 'Next', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
            })
          },
          {
            label: 'Rew',
            color: '#ffffff',
            iconSvg: ICONS.rewind,
            iconName: 'builtin:rewind',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: ICONS.rewind, name: 'builtin:rewind', color: '#ffffff', size: 69, y: 0 });
              Object.assign(d.texts[0], { value: 'Rew', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
            })
          },
          { label: 'FFwd', color: '#ffffff', iconSvg: ICONS.ffwd, iconName: 'builtin:ffwd' },
          {
            label: 'Shuffle',
            color: '#ffffff',
            iconSvg: ICONS.shuffle,
            iconName: 'builtin:shuffle',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: ICONS.shuffle, name: 'builtin:shuffle', color: '#ffffff', size: 69, y: -7 });
              Object.assign(d.texts[0], { value: 'Shuffle', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
            })
          },
          {
            label: 'Repeat',
            color: '#ffffff',
            iconSvg: ICONS.repeat,
            iconName: 'builtin:repeat',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: ICONS.repeat, name: 'builtin:repeat', color: '#ffffff', size: 69, y: -7 });
              Object.assign(d.texts[0], { value: 'Repeat', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
            })
          },
          {
            label: 'Rec',
            color: '#e53935',
            iconSvg: ICONS.record,
            iconName: 'builtin:record',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: ICONS.record, name: 'builtin:record', color: '#e53935', size: 56, y: -6 });
              Object.assign(d.texts[0], { value: 'Rec', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
            })
          }
        ],
        colorTarget: 'icon'
      },
      design: mk((d) => {
        d.bg.color = '#1d1d22';
        d.icons[0].size = 69;
        d.icons[0].y = -4;
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
      })
    },
    {
      name: 'Track',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'ARM', color: '#ff5a52', iconSvg: ICONS.record, iconName: 'builtin:record' },
          { label: 'MUTE', color: '#ffb300', iconSvg: ICONS.mute, iconName: 'builtin:mute' },
          { label: 'SOLO', color: '#ffd54f', iconSvg: ICONS.solo, iconName: 'builtin:solo' },
          { label: 'MON', color: '#6fa3d9', iconSvg: ICONS.monitor, iconName: 'builtin:monitor' },
          { label: 'MARKER', color: '#2fd0b0', iconSvg: ICONS.marker, iconName: 'builtin:marker' },
          { label: 'REGION', color: '#b487e8', iconSvg: ICONS.region, iconName: 'builtin:region' },
          { label: 'PREV', color: '#ffffff', iconSvg: ICONS.prev, iconName: 'builtin:prev' },
          { label: 'NEXT', color: '#ffffff', iconSvg: ICONS.next, iconName: 'builtin:next' }
        ],
        colorTarget: 'icon'
      },
      design: mk((d) => {
        d.bg.color = '#1d1d22';
        d.icons[0].size = 50;
        d.icons[0].y = -6;
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
      })
    },
    {
      name: 'Edit',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'SPLIT', color: '#e8881f', iconSvg: ICONS.split, iconName: 'builtin:split' },
          { label: 'HEAL', color: '#2f9f8c', iconSvg: ICONS.heal, iconName: 'builtin:heal' },
          { label: 'GLUE', color: '#2f8f57', iconSvg: ICONS.glue, iconName: 'builtin:glue' },
          { label: 'FADE', color: '#3a6ea5', iconSvg: ICONS.fade, iconName: 'builtin:fade' },
          { label: 'CROP', color: '#6b4fa0', iconSvg: ICONS.crop, iconName: 'builtin:crop' },
          { label: 'NUDGE', color: '#55555c', iconSvg: ICONS.nudge, iconName: 'builtin:nudge' },
          { label: 'NORM', color: '#6d9c2a', iconSvg: ICONS.norm, iconName: 'builtin:norm' },
          { label: 'RENDER', color: '#b51f1f', iconSvg: ICONS.render, iconName: 'builtin:render' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        d.icons[0].size = 38;
        d.icons[0].y = -7;
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
      })
    },
    {
      name: 'Video Switch',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'AUTO', color: '#c9a227' },
          { label: 'CUT', color: '#e53935' },
          { label: 'PVW', color: '#1f9d3a' },
          { label: 'PGM', color: '#b51f1f' },
          { label: 'AUX', color: '#3a6ea5' },
          { label: 'IN 1', color: '#16324f' },
          { label: 'IN 2', color: '#16324f' },
          { label: 'IN 3', color: '#16324f' },
          { label: 'IN 4', color: '#16324f' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 25, align: 'center:center' });
      })
    },
    {
      name: 'Mixer',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'MIXER', color: '#3a6ea5', iconSvg: ICONS.mixer, iconName: 'builtin:mixer' },
          { label: 'DOCK', color: '#55555c', iconSvg: ICONS.dock, iconName: 'builtin:dock' },
          { label: 'FADER', color: '#1f7a8c', iconSvg: faderSvg, iconName: 'builtin:fader' },
          {
            label: 'MASTER',
            color: '#2f8f57',
            design: mk((d) => {
              d.bg.color = '#2f8f57';
              Object.assign(d.texts[0], { value: 'MASTER', font: 'Oswald', weight: '700', size: 17, align: 'center:center' });
            })
          },
          { label: 'FX', color: '#6b4fa0', iconSvg: ICONS.fx, iconName: 'builtin:fx' },
          {
            label: 'METERS',
            color: '#1d1d22',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: meterSvg(4, [5, 7, 4, 6]), name: 'builtin:meters4', size: 50, y: -7 });
              Object.assign(d.texts[0], { value: 'METERS', font: 'Oswald', weight: '700', size: 11, align: 'center:bottom', y: 3 });
            })
          },
          {
            label: 'Meters 8',
            color: '#1d1d22',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: meterSvg(8, [4, 6, 3, 5, 7, 4, 6, 5]), name: 'builtin:meters8', size: 62, y: 0 });
              d.texts[0].value = '';
            })
          },
          {
            label: 'Meters 2',
            color: '#1d1d22',
            design: mk((d) => {
              d.bg.color = '#1d1d22';
              Object.assign(d.icons[0], { svg: meterSvg(2, [6, 5]), name: 'builtin:meters2', size: 46, y: 0 });
              d.texts[0].value = '';
            })
          }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        d.icons[0].size = 40;
        d.icons[0].y = -7;
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 10, align: 'center:bottom', y: 3 });
      })
    },
    {
      name: 'QLab',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          {
            label: 'GO',
            color: '#1f9d3a',
            design: mk((d) => {
              d.bg.color = '#1f9d3a';
              Object.assign(d.texts[0], { value: 'GO', font: 'Oswald', weight: '700', size: 36, align: 'center:center' });
            })
          },
          { label: 'PAUSE', color: '#c9a227' },
          {
            label: 'RESUME',
            color: '#3a6ea5',
            design: mk((d) => {
              d.bg.color = '#3a6ea5';
              Object.assign(d.texts[0], { value: 'RESUME', font: 'Oswald', weight: '700', size: 20, align: 'center:center' });
            })
          },
          { label: 'PANIC', color: '#b51f1f' },
          { label: 'PREV', color: '#55555c' },
          { label: 'NEXT', color: '#55555c' },
          {
            label: 'PREVIEW',
            color: '#6b4fa0',
            design: mk((d) => {
              d.bg.color = '#6b4fa0';
              Object.assign(d.texts[0], { value: 'PREVIEW', font: 'Oswald', weight: '700', size: 18, align: 'center:center' });
            })
          },
          { label: 'LOOP', color: '#1f7a8c' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 22, align: 'center:center' });
      })
    },
    {
      name: 'Timers',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: '60', color: '#1d7730' },
          { label: '45', color: '#6d9c2a' },
          { label: '30', color: '#9aa427' },
          { label: '15', color: '#c9a227' },
          { label: '5', color: '#c96a17' },
          {
            label: '+1',
            color: '#3e8e5f',
            design: mk((d) => {
              d.bg.color = '#3e8e5f';
              Object.assign(d.texts[0], { value: '+1', font: 'Bebas Neue', weight: '400', size: 48, align: 'center:center', x: -4, y: -5 });
              d.texts.push({ value: 'MIN', font: 'Oswald', weight: '700', size: 11, color: '#ffffff', align: 'center:bottom', x: 0, y: 2 });
            })
          },
          {
            label: '-1',
            color: '#ed4a80',
            design: mk((d) => {
              d.bg.color = '#ed4a80';
              Object.assign(d.texts[0], { value: '-1', font: 'Bebas Neue', weight: '400', size: 48, align: 'center:center', x: -4, y: -5 });
              d.texts.push({ value: 'MIN', font: 'Oswald', weight: '700', size: 11, color: '#ffffff', align: 'center:bottom', x: 0, y: 2 });
            })
          },
          {
            label: 'SEND',
            color: '#3a6ea5',
            design: mk((d) => {
              d.bg.color = '#3a6ea5';
              Object.assign(d.texts[0], { value: 'SEND\nMESSAGE', font: 'Oswald', weight: '700', size: 17, align: 'center:center' });
            })
          },
          {
            label: 'START',
            color: '#1f9d3a',
            design: mk((d) => {
              d.bg.color = '#1f9d3a';
              Object.assign(d.texts[0], { value: 'START', font: 'Bebas Neue', weight: '400', size: 35, align: 'center:center' });
            })
          },
          {
            label: 'STOP',
            color: '#b51f1f',
            design: mk((d) => {
              d.bg.color = '#b51f1f';
              Object.assign(d.texts[0], { value: 'STOP', font: 'Bebas Neue', weight: '400', size: 35, align: 'center:center' });
            })
          },
          {
            label: 'RESET',
            color: '#c9a227',
            design: mk((d) => {
              d.bg.color = '#c9a227';
              Object.assign(d.texts[0], { value: 'RESET', font: 'Bebas Neue', weight: '400', size: 35, align: 'center:center' });
            })
          }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Bebas Neue', weight: '400', size: 48, align: 'center:center', y: -3 });
        d.texts.push({ value: 'MIN', font: 'Oswald', weight: '700', size: 11, color: '#ffffff', align: 'center:bottom', x: 0, y: 2 });
      })
    },
    {
      name: 'INPUT 1-8',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 8,
        items: [
          { label: '1' }, { label: '2' }, { label: '3' }, { label: '4' },
          { label: '5' }, { label: '6' }, { label: '7' }, { label: '8' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        d.bg.mode = 'gradient';
        d.bg.gradFrom = '#24507f';
        d.bg.gradTo = '#0a0e14';
        d.bg.angle = 182;
        Object.assign(d.texts[0], { value: 'INPUT', font: 'Roboto Condensed', weight: '700', size: 11, align: 'center:top', y: 4 });
        d.texts.push({ value: '{label}', font: 'Bebas Neue', weight: '400', size: 38, color: '#ffffff', align: 'center:center', x: 0, y: 4 });
      })
    },
    {
      name: 'Lower Thirds 1-8',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 8,
        items: [
          { label: '1' }, { label: '2' }, { label: '3' }, { label: '4' },
          { label: '5' }, { label: '6' }, { label: '7' }, { label: '8' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        d.bg.mode = 'gradient';
        d.bg.gradFrom = '#2c3440';
        d.bg.gradTo = '#0d1014';
        d.bg.angle = 0;
        d.icons[0].svg = ICONS.lowerthird;
        d.icons[0].name = 'builtin:lowerthird';
        d.icons[0].color = '#ffd54f';
        d.icons[0].size = 76;
        d.icons[0].x = 2;
        d.icons[0].y = 6;
        d.icons[0].align = 'left:bottom';
        Object.assign(d.texts[0], { value: 'L3 {label}', font: 'Roboto Condensed', weight: '700', size: 16, align: 'center:top', y: 2 });
      })
    },
    {
      name: 'Traffic Lights',
      builtin: true,
      series: {
        mode: 'list',
        from: 1,
        to: 4,
        items: [
          { label: 'GO', color: '#1f9d3a' },
          { label: 'WARN', color: '#c9a227' },
          { label: 'HOLD', color: '#c96a17' },
          { label: 'STOP', color: '#b51f1f' }
        ],
        colorTarget: 'bg'
      },
      design: mk((d) => {
        Object.assign(d.texts[0], { value: '{label}', font: 'Oswald', weight: '700', size: 25, align: 'center:center' });
      })
    }
  ];
}

function loadUserPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveUserPresets(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    alert('Could not save preset. Storage may be full, large custom images use a lot of space.');
    return false;
  }
}

export function initPresets() {
  const nameInput = document.getElementById('presetName');
  document.getElementById('presetSave').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Untitled';
    const list = loadUserPresets();
    const preset = { name, design: deepClone(state.design) };
    if (state.series.mode !== 'off') preset.series = deepClone(state.series);
    const existing = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing !== -1) {
      if (!confirm('Update your preset "' + list[existing].name + '" with the current design?')) return;
      list[existing] = preset;
    } else {
      list.unshift(preset);
    }
    if (saveUserPresets(list)) {
      nameInput.value = '';
      renderPresetList();
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('presetSave').click();
    }
  });

  document.getElementById('presetExport').addEventListener('click', () => {
    const presets = loadUserPresets();
    if (!presets.length) {
      alert('You have no saved presets yet. Click "Save to my presets" first, then back them up.');
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ app: 'companion-button-maker', version: 1, presets }, null, 2)],
      { type: 'application/json' }
    );
    downloadBlob(blob, 'bsk-button-presets.json');
  });

  const importFile = document.getElementById('presetImportFile');

  async function applyImportedFile(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data.presets) ? data.presets : [];
      const valid = incoming.filter((p) => p && p.design && p.design.bg && (p.design.texts || p.design.text));
      if (!valid.length) {
        alert('No presets found in that file.');
        return;
      }
      const list = valid.concat(loadUserPresets());
      if (saveUserPresets(list)) renderPresetList();
    } catch (e) {
      alert('Could not read that file.');
    }
  }

  document.getElementById('presetImportBtn').addEventListener('click', async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          startIn: 'downloads',
          types: [{ description: 'BSK Button presets', accept: { 'application/json': ['.json'] } }]
        });
        await applyImportedFile(await handle.getFile());
      } catch (e) {}
      return;
    }
    importFile.click();
  });

  importFile.addEventListener('change', async () => {
    await applyImportedFile(importFile.files[0]);
    importFile.value = '';
  });

  renderPresetList();
}

export function renderPresetList() {
  const wrap = document.getElementById('presetList');
  wrap.innerHTML = '';
  const user = loadUserPresets();
  const all = user.map((p, i) => ({ ...p, userIndex: i })).concat(builtinPresets());

  for (const preset of all) {
    const tile = document.createElement('div');
    tile.className = 'strip-item';
    tile.title = preset.name + (preset.series ? ' - loads a whole set' : '');

    const thumb = document.createElement('canvas');
    thumb.width = 72;
    thumb.height = 72;
    renderDesign(thumb, thumbDesign(preset));

    const label = document.createElement('span');
    label.className = 'strip-name';
    label.textContent = preset.name;
    if (!preset.builtin) {
      label.title = 'Double-click to rename';
      label.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const next = (prompt('Rename preset', preset.name) || '').trim();
        if (!next) return;
        const list = loadUserPresets();
        list[preset.userIndex].name = next;
        saveUserPresets(list);
        renderPresetList();
      });
    }

    tile.appendChild(thumb);
    tile.appendChild(label);

    if (preset.series) {
      const setTag = document.createElement('span');
      setTag.className = 'strip-set';
      setTag.textContent = 'SET';
      tile.appendChild(setTag);
    }

    tile.addEventListener('click', () => {
      Object.assign(state.design, normalizeDesign(deepClone(preset.design)));
      state.ui.activeText = 0;
      state.ui.activeIcon = 0;
      releaseSelection();
      if (preset.series) {
        const series = deepClone(preset.series);
        if (series.mode === 'numbers') {
          series.items = numberSet(state.design, series.from, series.to);
          series.mode = 'list';
        }
        if (Array.isArray(series.items)) {
          for (const it of series.items) {
            if (it && it.design) it.design = normalizeDesign(it.design);
          }
        }
        Object.assign(state.series, series);
      } else {
        Object.assign(state.series, defaultSeries());
      }
      document.getElementById('presetName').value = preset.builtin ? '' : preset.name;
      emit();
    });

    if (!preset.builtin) {
      const delBtn = document.createElement('span');
      delBtn.className = 'strip-del';
      delBtn.textContent = 'x';
      delBtn.title = 'Delete preset';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const list = loadUserPresets();
        list.splice(preset.userIndex, 1);
        saveUserPresets(list);
        renderPresetList();
      });
      tile.appendChild(delBtn);
    }

    wrap.appendChild(tile);
  }
}

function thumbDesign(preset) {
  const s = preset.series;
  if (s && s.mode === 'list' && s.items[0] && s.items[0].design) {
    return normalizeDesign(deepClone(s.items[0].design));
  }
  const d = normalizeDesign(deepClone(preset.design));
  const n = s && s.mode === 'numbers' ? String(Math.min(s.from, s.to)) : '1';
  const first = s && s.mode === 'list' && s.items[0] ? s.items[0] : null;
  const label = first ? first.label : '';
  for (const t of d.texts) {
    t.value = t.value.replaceAll('{n}', n).replaceAll('{label}', label);
  }
  if (first && first.iconSvg) {
    d.icons[0].svg = first.iconSvg;
    d.icons[0].name = first.iconName || null;
  }
  if (first && first.color) {
    if (s.colorTarget === 'bg' && d.bg.mode !== 'image') {
      d.bg.mode = 'solid';
      d.bg.color = first.color;
    } else if (s.colorTarget === 'icon') {
      for (const ic of d.icons) ic.color = first.color;
    } else if (s.colorTarget === 'text') {
      for (const t of d.texts) t.color = first.color;
    }
  }
  return d;
}

export function normalizeDesign(design) {
  const base = defaultDesign();
  const merged = deepClone(base);
  for (const key of Object.keys(base)) {
    if (key === 'texts' || key === 'icons') continue;
    if (design[key]) Object.assign(merged[key], design[key]);
  }
  if (Array.isArray(design.texts) && design.texts.length) {
    merged.texts = design.texts.map((t) => Object.assign(deepClone(base.texts[0]), t));
  } else if (design.text) {
    merged.texts = [Object.assign(deepClone(base.texts[0]), design.text)];
  }
  if (Array.isArray(design.icons) && design.icons.length) {
    merged.icons = design.icons.map((i) => Object.assign(deepClone(base.icons[0]), i));
  } else if (design.icon) {
    merged.icons = [Object.assign(deepClone(base.icons[0]), design.icon)];
  }
  return merged;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
