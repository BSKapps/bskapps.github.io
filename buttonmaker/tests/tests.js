import { state, defaultDesign, defaultTextLayer, deepClone, editTarget, editTargets } from '../js/state.js?v=84';
import { seriesVariants, safeFileName, numberedRange, numberStep, numberSet } from '../js/series.js?v=84';
import { buildCompanionPage } from '../js/companion.js?v=84';
import { renderToDataUrl } from '../js/renderer.js?v=84';
import { selectListItem, releaseSelection } from '../js/ui.js?v=84';

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
  state.ui.activeIcon = 0;
  state.ui.selectedItems = [];
}

function run() {
  resetState();
  state.design.texts[0].value = 'CAM {n}';
  state.series.items = numberSet(state.design, 1, 4);
  state.series.mode = 'list';
  let v = seriesVariants();
  check('number fill produces 4 variants', v.length === 4);
  check('token {n} substituted', v[0].design.texts[0].value === 'CAM 1' && v[3].design.texts[0].value === 'CAM 4');
  check('companionText carries substituted text', v[2].companionText === 'CAM 3');
  check('numbering swaps base token to {label}, variants do not mutate it', state.design.texts[0].value === 'CAM {label}');

  state.series.items = numberSet(state.design, 9, 5);
  check('inverted range still counts', seriesVariants().length === 5);

  state.series.items = numberSet(state.design, 1, 500);
  check('number fill capped at 64', seriesVariants().length === 64);

  check('numberedRange integer sequence', JSON.stringify(numberedRange(1, 4)) === JSON.stringify(['1', '2', '3', '4']));
  check('numberedRange tenths', JSON.stringify(numberedRange(0.1, 0.4)) === JSON.stringify(['0.1', '0.2', '0.3', '0.4']));
  check('numberedRange mixed precision pads decimals', JSON.stringify(numberedRange(1, 1.5)) === JSON.stringify(['1.0', '1.1', '1.2', '1.3', '1.4', '1.5']));
  check('numberedRange inverted range counts', numberedRange(9, 5).length === 5);
  check('numberedRange decimal capped at 64', numberedRange(0, 100).length === 64);

  check('numberStep integer is 1', numberStep(1, 4) === 1);
  check('numberStep tenths is 0.1', numberStep(0.1, 0.5) === 0.1);
  check('numberStep hundredths is 0.01', numberStep(1, 1.05) === 0.01);
  check('adding one step grows a decimal set by exactly one', (() => {
    const before = numberedRange(1.1, 1.3).length;
    const to2 = Math.round((1.3 + numberStep(1.1, 1.3)) * 100) / 100;
    return before === 3 && numberedRange(1.1, to2).length === 4;
  })());

  resetState();
  state.design.texts[0].value = 'CUE';
  state.series.items = numberSet(state.design, 1.1, 1.3);
  state.series.mode = 'list';
  v = seriesVariants();
  check('decimal numbered appends decimals to stem', v.length === 3 && v[0].design.texts[0].value === 'CUE 1.1' && v[2].design.texts[0].value === 'CUE 1.3');

  resetState();
  state.design.texts[0].value = 'PC';
  state.series.items = numberSet(state.design, 1, 3);
  state.series.mode = 'list';
  v = seriesVariants();
  check('plain text numbered: PC becomes PC 1, PC 2, PC 3', v[0].design.texts[0].value === 'PC 1' && v[2].design.texts[0].value === 'PC 3');

  resetState();
  state.series.items = numberSet(state.design, 1, 2);
  state.series.mode = 'list';
  v = seriesVariants();
  check('empty design numbered: number drawn as big centred text', v[0].design.texts.some((t) => t.value === '1' && t.align === 'center:center'));

  resetState();
  state.design.texts[0].value = 'PC 1';
  state.series.items = numberSet(state.design, 2, 4);
  state.series.mode = 'list';
  v = seriesVariants();
  check('existing trailing number replaced: PC 1 from 2 gives PC 2..PC 4', v[0].design.texts[0].value === 'PC 2' && v[2].design.texts[0].value === 'PC 4');

  resetState();
  state.design.texts[0].value = 'STATE';
  state.series.mode = 'list';
  state.series.items = [{ label: 'GO', color: '' }, { label: 'STOP', color: '' }];
  v = seriesVariants();
  check('plain text list: item name becomes the button text', v[0].design.texts[0].value === 'GO' && v[1].design.texts[0].value === 'STOP');

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
  check('per-item icon overrides design icon', v[1].design.icons[0].svg === '<svg>x</svg>' && v[1].design.icons[0].name === 'test:stop');
  check('items without icon keep base icon', v[0].design.icons[0].svg === null);

  state.series.colorTarget = 'icon';
  v = seriesVariants();
  check('colour target icon recolours icon', v[0].design.icons[0].color === '#1f9d3a');

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

  resetState();
  state.design.icons.push(Object.assign(deepClone(state.design.icons[0]), { svg: '<svg>2</svg>', name: 'test:two' }));
  state.series.mode = 'list';
  state.series.items = [{ label: 'GO', color: '#1f9d3a', iconSvg: '<svg>1</svg>', iconName: 'test:one' }];
  state.series.colorTarget = 'icon';
  v = seriesVariants();
  check('item icon replaces first layer only', v[0].design.icons[0].svg === '<svg>1</svg>' && v[0].design.icons[1].svg === '<svg>2</svg>');
  check('colour target icon recolours every icon layer', v[0].design.icons.every((ic) => ic.color === '#1f9d3a'));

  resetState();
  state.design.texts[0].value = 'BASE';
  state.series.mode = 'list';
  const ownDesign = defaultDesign();
  ownDesign.texts[0].value = 'CUSTOM';
  ownDesign.bg.color = '#123456';
  state.series.items = [
    { label: 'GO', color: '#1f9d3a', design: ownDesign },
    { label: 'STOP', color: '#b51f1f' }
  ];
  v = seriesVariants();
  check('item with own design renders it verbatim', v[0].design.texts[0].value === 'CUSTOM' && v[0].design.bg.color === '#123456');
  check('own design skips label and swatch substitution', v[0].design.texts[0].value !== 'GO' && v[0].design.bg.color !== '#1f9d3a');
  check('designed item companionText is its label', v[0].companionText === 'GO');
  check('undesigned item in same list still substitutes', v[1].design.texts[0].value === 'STOP' && v[1].design.bg.color === '#b51f1f');
  v[0].design.texts[0].value = 'MUTATED';
  check('variant design detached from stored item design', state.series.items[0].design.texts[0].value === 'CUSTOM');

  resetState();
  state.series.mode = 'list';
  const dA = defaultDesign();
  dA.bg.color = '#0000aa';
  state.series.items = [
    { label: 'A', color: '', design: dA },
    { label: 'B', color: '' }
  ];
  state.ui.selectedItems = [0];
  check('editTarget returns the selected item design', editTarget() === dA);
  check('editTargets returns only selected designs', editTargets().length === 1 && editTargets()[0] === dA);
  state.ui.selectedItems = [];
  const all = editTargets();
  check('editTargets with no selection covers base and detached designs', all.length === 2 && all[0] === state.design && all[1] === dA);
  resetState();
  check('editTargets outside list mode is just the base design', editTargets().length === 1 && editTargets()[0] === state.design);

  resetState();
  state.series.mode = 'list';
  state.design.texts[0].value = 'BASE';
  const preDesign = defaultDesign();
  preDesign.texts[0].value = 'MESSAGE';
  state.series.items = [
    { label: 'A', color: '' },
    { label: 'Message', color: '', design: preDesign }
  ];
  selectListItem(1);
  selectListItem(0);
  check('pre-existing per-item design survives look-only selection', !!state.series.items[1].design && state.series.items[1].design.texts[0].value === 'MESSAGE');
  const inheritedHadDesign = !!state.series.items[0].design;
  releaseSelection();
  check('look-only inherited selection does not bake a per-item design', inheritedHadDesign && !state.series.items[0].design);

  check('gradient blend defaults to 100', defaultDesign().bg.blend === 100);

  check('default icon is centred via align', defaultDesign().icons[0].align === 'center:center' && defaultDesign().icons[0].y === 0);

  const legacy = { bg: { color: '#101010' }, text: { value: 'OLD', size: 14 }, icon: {}, shape: {} };
  const clone = deepClone(legacy);
  check('deepClone detaches', (clone.bg.color = '#fff') && legacy.bg.color === '#101010');

  resetState();
}

async function runAsync() {
  resetState();
  const playSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8,5V19L19,12Z"/></svg>';
  state.design.icons[0].svg = playSvg;
  state.design.texts[0].value = 'T';
  const url = await renderToDataUrl(state.design, 72, { bakeText: true });
  check('renderer outputs png data url', url.startsWith('data:image/png;base64,') && url.length > 500);
  const noText = await renderToDataUrl(state.design, 72, { bakeText: false });
  check('bakeText false changes output', noText !== url);

  state.design.icons.push(Object.assign(deepClone(state.design.icons[0]), { x: 20, color: '#ff0000' }));
  const twoIcons = await renderToDataUrl(state.design, 72, { bakeText: false });
  check('second icon layer changes output', twoIcons !== noText);

  resetState();
  const legacySingle = deepClone(state.design);
  legacySingle.icon = Object.assign(deepClone(legacySingle.icons[0]), { svg: playSvg });
  delete legacySingle.icons;
  const legacyUrl = await renderToDataUrl(legacySingle, 72, {});
  check('legacy single-icon design still renders', legacyUrl.startsWith('data:image/png;base64,'));

  resetState();
  state.design.icons[0].svg = playSvg;
  state.design.icons[0].size = 40;
  const iconCentre = await renderToDataUrl(state.design, 72, { bakeText: false });
  state.design.icons[0].align = 'right:center';
  const iconRight = await renderToDataUrl(state.design, 72, { bakeText: false });
  check('icon align moves the icon', iconCentre !== iconRight);

  resetState();
  const legacyIcon = deepClone(state.design);
  legacyIcon.icons[0].svg = playSvg;
  legacyIcon.icons[0].size = 40;
  legacyIcon.icons[0].x = 20;
  delete legacyIcon.icons[0].align;
  const legacyPos = await renderToDataUrl(legacyIcon, 72, { bakeText: false });
  const healedIcon = deepClone(legacyIcon);
  healedIcon.icons[0].align = 'center:center';
  const healedPos = await renderToDataUrl(healedIcon, 72, { bakeText: false });
  check('legacy icon without align renders same as centre align', legacyPos === healedPos);

  resetState();
  state.design.bg.mode = 'gradient';
  state.design.bg.blend = 0;
  const hard = await renderToDataUrl(state.design, 72, {});
  state.design.bg.blend = 100;
  const soft = await renderToDataUrl(state.design, 72, {});
  check('gradient blend changes output', hard !== soft);
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
