import { state, defaultDesign, defaultTextLayer, deepClone } from '../js/state.js?v=14';
import { seriesVariants, safeFileName } from '../js/series.js?v=14';
import { buildCompanionPage } from '../js/companion.js?v=14';
import { renderToDataUrl } from '../js/renderer.js?v=14';

const results = [];

function check(name, cond) {
  results.push({ name, pass: !!cond });
}

function resetState() {
  state.design = defaultDesign();
  state.series.mode = 'off';
  state.series.from = 1;
  state.series.to = 4;
  state.series.items = [];
  state.series.colorTarget = 'bg';
  state.ui.activeText = 0;
}

function run() {
  resetState();
  state.design.texts[0].value = 'CAM {n}';
  state.series.mode = 'numbers';
  let v = seriesVariants();
  check('numbered set produces 4 variants', v.length === 4);
  check('token {n} substituted', v[0].design.texts[0].value === 'CAM 1' && v[3].design.texts[0].value === 'CAM 4');
  check('companionText carries substituted text', v[2].companionText === 'CAM 3');
  check('base design untouched by variants', state.design.texts[0].value === 'CAM {n}');

  state.series.from = 9;
  state.series.to = 5;
  check('inverted range still counts', seriesVariants().length === 5);

  state.series.from = 1;
  state.series.to = 500;
  check('numbered set capped at 64', seriesVariants().length === 64);

  resetState();
  state.design.texts[0].value = '{label}';
  state.design.texts.push(Object.assign(defaultTextLayer(), { value: 'No {n} here: {label}' }));
  state.series.mode = 'list';
  state.series.items = [
    { label: 'GO', color: '#1f9d3a' },
    { label: 'STOP', color: '#b51f1f', iconSvg: '<svg>x</svg>', iconName: 'test:stop' }
  ];
  v = seriesVariants();
  check('list set produces one variant per item', v.length === 2);
  check('{label} substituted in every layer', v[1].design.texts[0].value === 'STOP' && v[1].design.texts[1].value === 'No 2 here: STOP');
  check('item colour applied to background', v[0].design.bg.color === '#1f9d3a' && v[0].design.bg.mode === 'solid');
  check('per-item icon overrides design icon', v[1].design.icon.svg === '<svg>x</svg>' && v[1].design.icon.name === 'test:stop');
  check('items without icon keep base icon', v[0].design.icon.svg === null);

  state.series.colorTarget = 'icon';
  v = seriesVariants();
  check('colour target icon recolours icon', v[0].design.icon.color === '#1f9d3a');

  state.series.colorTarget = 'text';
  v = seriesVariants();
  check('colour target text recolours all layers', v[0].design.texts.every((t) => t.color === '#1f9d3a'));

  state.series.colorTarget = 'bg';
  state.design.bg.mode = 'image';
  state.design.bg.imageData = 'data:image/png;base64,x';
  v = seriesVariants();
  check('image background not replaced by item colour', v[0].design.bg.mode === 'image');

  check('safeFileName slugifies', safeFileName('CAM 1 / *#!', 0) === 'cam-1');
  check('safeFileName empty text numbered', safeFileName('', 4) === 'button-5');
  check('safeFileName symbols-only numbered', safeFileName('***', 0) === 'button-1');

  const buttons = Array.from({ length: 10 }, (_, i) => ({
    png64: 'iVBORfake' + i,
    text: i === 0 ? 'HELLO' : '',
    color: '#ffffff',
    bgcolor: '#cc0000',
    alignment: 'center:bottom'
  }));
  const cfg = buildCompanionPage(buttons);
  check('companion export version 4 page', cfg.version === 4 && cfg.type === 'page');
  check('controls keyed by row and column', cfg.page.controls['0']['7'].type === 'button' && cfg.page.controls['1']['1'].type === 'button');
  check('gridSize default 8x4', cfg.page.gridSize.maxColumn === 7 && cfg.page.gridSize.maxRow === 3);
  check('colors converted to decimal ints', cfg.page.controls['0']['0'].style.color === 16777215 && cfg.page.controls['0']['0'].style.bgcolor === 13369344);
  check('text and alignment set when provided', cfg.page.controls['0']['0'].style.text === 'HELLO' && cfg.page.controls['0']['0'].style.alignment === 'center:bottom');
  check('options object present with era fields', cfg.page.controls['0']['0'].options.stepAutoProgress === true && cfg.page.controls['0']['0'].options.rotaryActions === false);
  check('step 0 with action sets present', JSON.stringify(cfg.page.controls['0']['0'].steps['0'].action_sets) === '{"down":[],"up":[]}');
  check('instances and oldPageNumber present', JSON.stringify(cfg.instances) === '{}' && cfg.oldPageNumber === 1);
  const big = buildCompanionPage(Array.from({ length: 40 }, () => ({ png64: 'x' })));
  check('gridSize grows for 5 rows', big.page.gridSize.maxRow === 4);

  const legacy = { bg: { color: '#101010' }, text: { value: 'OLD', size: 14 }, icon: {}, shape: {} };
  const clone = deepClone(legacy);
  check('deepClone detaches', (clone.bg.color = '#fff') && legacy.bg.color === '#101010');

  resetState();
}

async function runAsync() {
  resetState();
  state.design.icon.svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8,5V19L19,12Z"/></svg>';
  state.design.texts[0].value = 'T';
  const url = await renderToDataUrl(state.design, 72, { bakeText: true });
  check('renderer outputs png data url', url.startsWith('data:image/png;base64,') && url.length > 500);
  const noText = await renderToDataUrl(state.design, 72, { bakeText: false });
  check('bakeText false changes output', noText !== url);
  resetState();
}

run();
await runAsync();

const passed = results.filter((r) => r.pass).length;
document.getElementById('summary').textContent = passed + ' / ' + results.length + ' passed';
document.getElementById('results').innerHTML = results
  .map((r) => '<div class="' + (r.pass ? 'pass' : 'fail') + '">' + (r.pass ? 'PASS' : 'FAIL') + ' - ' + r.name + '</div>')
  .join('');
window.__testResults = results;
