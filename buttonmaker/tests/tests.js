import { state, defaultDesign, defaultTextLayer, deepClone, editTarget, editTargets, dotLayer } from '../js/state.js?v=124';
import { seriesVariants, safeFileName, variantFileName, numberedRange, numberStep, numberSet, variantsFor } from '../js/series.js?v=124';
import { buildCompanionPage } from '../js/companion.js?v=124';
import { renderToDataUrl } from '../js/renderer.js?v=124';
import { selectListItem, releaseSelection, removeListItem } from '../js/ui.js?v=124';
import { buildStrip, buildReaperZip, buildPngZip, reaperLinks } from '../js/export.js?v=124';
import { applyEffectToDesign, makeOnState } from '../js/effects.js?v=124';
import { invertHex, mixHex } from '../js/color.js?v=124';
import { addSetToCurrent, normalizeDesign } from '../js/presets.js?v=124';

const results = [];

function check(name, cond) {
  results.push({ name, pass: !!cond });
}

async function centerPixel(design, size = 24) {
  const url = await renderToDataUrl(design, size, { bakeText: false });
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0);
  const d = cx.getImageData(size / 2, size / 2, 1, 1).data;
  return [d[0], d[1], d[2]];
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

  check('variantFileName text wins', variantFileName({ design: { icons: [{ svg: 'x', name: 'lucide:play' }] }, companionText: 'Go', label: '1' }, 0) === 'go');
  check('variantFileName falls back to icon name', variantFileName({ design: { icons: [{ svg: 'x', name: 'lucide:volume-x' }] }, companionText: '', label: '2' }, 1) === 'volume-x');
  check('variantFileName upload icon name strips prefix', variantFileName({ design: { icons: [{ svg: 'x', name: 'upload:mute' }] }, companionText: '', label: '' }, 0) === 'mute');
  check('variantFileName falls back to label', variantFileName({ design: { icons: [{ svg: null, name: null }] }, companionText: '', label: '3' }, 2) === '3');
  check('variantFileName blank numbered', variantFileName({ design: { icons: [] }, companionText: '', label: '' }, 4) === 'button-5');

  resetState();
  state.series.mode = 'list';
  state.series.items = [
    { label: 'A', color: '', design: defaultDesign() },
    { label: 'B', color: '', design: defaultDesign() }
  ];
  state.ui.selectedItems = [];
  check('edit-all targets the first button, not the hidden master', editTarget() === state.series.items[0].design);
  state.ui.selectedItems = [1];
  check('selecting one button targets that button', editTarget() === state.series.items[1].design);

  resetState();
  state.series.mode = 'list';
  const twoLayer = () => { const d = defaultDesign(); d.texts.push(defaultTextLayer()); return d; };
  state.series.items = [
    { label: 'A', color: '', design: twoLayer() },
    { label: 'B', color: '', design: twoLayer() }
  ];
  state.ui.selectedItems = [0];
  state.ui.activeText = 1;
  selectListItem(1);
  check('active text layer persists across button selection', state.ui.activeText === 1);

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

  check('background, icon and text invert default to false', defaultDesign().bg.invert === false && defaultDesign().icons[0].invert === false && defaultDesign().texts[0].invert === false);
  check('normalizeDesign heals an old design without invert flags to false', (() => {
    const healed = normalizeDesign({ bg: { mode: 'solid', color: '#222222' }, texts: [{ value: 'X' }], icons: [{ svg: null }] });
    return healed.bg.invert === false && healed.texts[0].invert === false && healed.icons[0].invert === false;
  })());

  check('default icon is centred via align', defaultDesign().icons[0].align === 'center:center' && defaultDesign().icons[0].y === 0);

  const legacy = { bg: { color: '#101010' }, text: { value: 'OLD', size: 14 }, icon: {}, shape: {} };
  const clone = deepClone(legacy);
  check('deepClone detaches', (clone.bg.color = '#fff') && legacy.bg.color === '#101010');

  const pvBase = defaultDesign();
  pvBase.texts[0].value = '{label}';
  const pvOwn = defaultDesign();
  pvOwn.texts[0].value = 'REC';
  pvOwn.bg.color = '#e53935';
  const pvSeries = { mode: 'list', from: 1, to: 4, colorTarget: 'bg', items: [{ label: 'A', color: '#111111' }, { label: 'Rec', color: '', design: pvOwn }] };
  const pv = variantsFor(pvBase, pvSeries);
  check('variantsFor enumerates every button in a preset set', pv.length === 2);
  check('variantsFor renders an item with its own design verbatim', pv[1].design.texts[0].value === 'REC' && pv[1].design.bg.color === '#e53935');
  check('variantsFor derives an undesigned item from the base and colour', pv[0].design.texts[0].value === 'A' && pv[0].design.bg.color === '#111111');
  const soloBase = defaultDesign();
  soloBase.texts[0].value = 'SOLO';
  const pvSingle = variantsFor(soloBase, undefined);
  check('variantsFor treats a non-set preset as one button', pvSingle.length === 1 && pvSingle[0].design.texts[0].value === 'SOLO');
  const copied = deepClone(pv[1].design);
  copied.texts[0].value = 'MUTATED';
  check('a copied button design detaches from the source variant', pv[1].design.texts[0].value === 'REC');

  const mkItem = (label, color) => {
    const d = defaultDesign();
    d.texts[0].value = label;
    if (color) d.bg.color = color;
    return { label, color: '', design: d };
  };

  resetState();
  state.design.texts[0].value = 'ARM';
  state.design.bg.color = '#b51f1f';
  makeOnState({ type: 'tint', color: '#1f9d3a', strength: 40, elements: { bg: true, icon: true, text: true } });
  check('makeOnState on a single button creates a 2-button set', state.series.mode === 'list' && state.series.items.length === 2);
  check('makeOnState auto-links the on-state to its source id', !!state.series.items[0].id && state.series.items[1].onStateOf === state.series.items[0].id);
  check('makeOnState bakes the effect into the on-state design', state.series.items[1].design.bg.color !== '#b51f1f');
  check('makeOnState selects the new on-state', state.ui.selectedItems.length === 1 && state.ui.selectedItems[0] === 1);
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  state.series.items = [mkItem('A', '#111111'), mkItem('B', '#222222')];
  state.ui.selectedItems = [0];
  makeOnState({ type: 'invert', elements: { bg: true, icon: true, text: true } });
  check('makeOnState inserts the on-state right after its source', state.series.items.length === 3 && !!state.series.items[1].onStateOf && state.series.items[2].label === 'B');
  check('makeOnState invert sets the invert flag on the on-state, leaving the colour to flip at render', state.series.items[1].design.bg.invert === true && state.series.items[1].design.bg.color === '#111111');
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  state.series.items = [mkItem('A'), mkItem('B'), mkItem('C')];
  state.ui.selectedItems = [0, 2];
  makeOnState({ type: 'highlight', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('makeOnState multi-select adds an on-state after each selected source', state.series.items.length === 5 && state.series.items[1].label.endsWith(' on') && state.series.items[2].label === 'B' && state.series.items[4].label.endsWith(' on'));
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  state.series.items = [mkItem('A'), mkItem('B')];
  state.ui.selectedItems = [0];
  makeOnState({ type: 'invert', elements: { bg: true, icon: true, text: true } });
  removeListItem(0);
  check('deleting a source also removes its linked on-state', state.series.items.length === 1 && state.series.items[0].label === 'B' && !state.series.items.some((it) => it.onStateOf));
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  state.series.items = [mkItem('A'), mkItem('B')];
  state.ui.selectedItems = [0];
  makeOnState({ type: 'invert', elements: { bg: true, icon: true, text: true } });
  removeListItem(1);
  check('deleting an on-state leaves its source button', state.series.items.length === 2 && !!state.series.items[0].id && state.series.items[1].label === 'B');
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  state.design.bg.color = '#0000aa';
  state.design.texts[0].value = 'X';
  state.series.items = [{ label: 'CAM', color: '' }];
  state.ui.selectedItems = [0];
  makeOnState({ type: 'tint', color: '#00ff00', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('makeOnState on an inherited item builds the on-state from the resolved look, not bare base', state.series.items[1].design.texts.some((t) => t.value === 'CAM') && state.series.items[1].design.bg.color !== '#0000aa');
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  state.series.items = [mkItem('A', '#111111')];
  state.ui.selectedItems = [0];
  makeOnState({ type: 'tint', color: '#00ff00', strength: 50, elements: { bg: true, icon: true, text: true } });
  const onIdFirst = state.series.items[1].onStateOf;
  const onBgFirst = state.series.items[1].design.bg.color;
  state.ui.selectedItems = [0];
  makeOnState({ type: 'tint', color: '#0000ff', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('re-Make from the source updates the single on-state instead of adding another', state.series.items.length === 2 && state.series.items[1].onStateOf === onIdFirst && state.series.items[1].design.bg.color !== onBgFirst);
  state.ui.selectedItems = [1];
  makeOnState({ type: 'tint', color: '#ffff00', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('re-Make from the on-state itself updates it, no chaining', state.series.items.length === 2 && state.series.items[1].onStateOf === onIdFirst);
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  state.series.items = Array.from({ length: 64 }, (_, i) => mkItem('B' + i));
  state.ui.selectedItems = [];
  const origAlert = window.alert;
  let capMsg = '';
  window.alert = (m) => { capMsg = m; };
  makeOnState({ type: 'tint', color: '#00ff00', strength: 40, elements: { bg: true, icon: true, text: true } });
  check('makeOnState refuses to exceed the 64-button cap and warns', state.series.items.length === 64 && /64/.test(capMsg));
  resetState();
  state.series.mode = 'list';
  state.series.items = Array.from({ length: 63 }, (_, i) => mkItem('B' + i));
  state.ui.selectedItems = [];
  capMsg = '';
  makeOnState({ type: 'tint', color: '#00ff00', strength: 40, elements: { bg: true, icon: true, text: true } });
  check('makeOnState fills up to 64 then warns about the rest', state.series.items.length === 64 && /could not be added/.test(capMsg));
  window.alert = origAlert;
  releaseSelection();

  resetState();
  state.series.mode = 'list';
  const orphanDesign = defaultDesign();
  orphanDesign.bg.color = '#123456';
  state.series.items = [{ label: 'orphan', color: '', design: orphanDesign, onStateOf: 'gone-source' }];
  state.ui.selectedItems = [0];
  makeOnState({ type: 'tint', color: '#00ff00', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('makeOnState clears a dangling onStateOf and treats the orphan as its own source', state.series.items[0].onStateOf === undefined && state.series.items.length === 2 && state.series.items[1].onStateOf === state.series.items[0].id);
  releaseSelection();
  const dl = dotLayer('#1f9d3a');
  check('dotLayer is a currentColor circle in the given colour', dl.svg.includes('currentColor') && dl.color === '#1f9d3a' && dl.align === 'right:top');

  resetState();
  const linkedPreset = {
    name: 'Toggle Set',
    design: defaultDesign(),
    series: {
      mode: 'list',
      from: 1,
      to: 2,
      colorTarget: 'bg',
      items: [
        { id: 'src1', label: 'ARM', design: (() => { const d = defaultDesign(); d.bg.color = '#b51f1f'; d.texts[0].value = 'ARM'; return d; })() },
        { onStateOf: 'src1', label: 'ARM on', design: (() => { const d = defaultDesign(); d.bg.color = '#1c5334'; d.texts[0].value = 'ARM'; return d; })() }
      ]
    }
  };
  addSetToCurrent(linkedPreset);
  check('re-adding a saved set keeps the on-state link with a fresh id', state.series.items.length === 2 && !!state.series.items[0].id && state.series.items[0].id !== 'src1' && state.series.items[1].onStateOf === state.series.items[0].id);
  releaseSelection();

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
  state.design.texts[0].value = '';
  state.design.icons[0].svg = playSvg;
  state.design.icons[0].size = 120;
  state.design.icons[0].align = 'left:top';
  const bigLeftTop = await renderToDataUrl(state.design, 72, { bakeText: false });
  state.design.icons[0].align = 'right:bottom';
  const bigRightBottom = await renderToDataUrl(state.design, 72, { bakeText: false });
  check('large icon still responds to grid position', bigLeftTop !== bigRightBottom);

  resetState();
  state.design.texts[0].value = '';
  state.design.shape.border = 4;
  state.design.shape.borderColor = '#ff0000';
  const fullBorder = await renderToDataUrl(state.design, 72, { bakeText: false });
  state.design.shape.edges = { top: true, bottom: false, left: false, right: false };
  const topEdgeOnly = await renderToDataUrl(state.design, 72, { bakeText: false });
  check('partial border edges render differently from full border', topEdgeOnly !== fullBorder);
  const allEdges = deepClone(state.design);
  allEdges.shape.edges = { top: true, bottom: true, left: true, right: true };
  const undefEdges = deepClone(state.design);
  delete undefEdges.shape.edges;
  check('missing edges field renders as a full border', (await renderToDataUrl(allEdges, 72, { bakeText: false })) === (await renderToDataUrl(undefEdges, 72, { bakeText: false })));

  resetState();
  state.design.texts[0].value = 'ARC';
  state.design.texts[0].align = 'center:center';
  const bendStraight = await renderToDataUrl(state.design, 72, { bakeText: true });
  state.design.texts[0].bend = 60;
  const bendCurved = await renderToDataUrl(state.design, 72, { bakeText: true });
  check('single-line bend changes the render', bendCurved !== bendStraight);
  state.design.texts[0].value = 'AR\nC';
  const bendMulti = await renderToDataUrl(state.design, 72, { bakeText: true });
  state.design.texts[0].bend = 0;
  const bendMultiStraight = await renderToDataUrl(state.design, 72, { bakeText: true });
  check('multi-line ignores bend', bendMulti === bendMultiStraight);

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
  const fileKeys = (z) => Object.keys(z.files).filter((k) => !z.files[k].dir);
  const stripBase = defaultDesign();
  stripBase.bg.color = '#1d6fd0';
  stripBase.texts[0].value = 'GO';
  const offStrip = await buildStrip(stripBase, 30);
  check('reaper strip is 90x30 (three 30px cells)', offStrip.width === 90 && offStrip.height === 30);
  const strip45 = await buildStrip(stripBase, 45);
  check('reaper 1.5x strip is 135x45', strip45.width === 135 && strip45.height === 45);

  check('invertHex flips a colour', invertHex('#000000') === '#ffffff' && invertHex('#204060') === '#dfbf9f');
  check('mixHex blends halfway', mixHex('#000000', '#ffffff', 0.5) === '#808080');
  const armBase = defaultDesign();
  armBase.bg.color = '#1d1d22';
  armBase.texts[0].value = 'ARM';
  armBase.texts[0].color = '#ffffff';
  const invAll = applyEffectToDesign(armBase, { type: 'invert', elements: { bg: true, icon: true, text: true } });
  check('invert effect flags the background to invert at render', invAll.bg.invert === true && invAll.bg.color === '#1d1d22');
  check('invert effect flags the text to invert at render', invAll.texts[0].invert === true && invAll.texts[0].color === '#ffffff');
  check('applyEffectToDesign does not mutate the source design', armBase.bg.color === '#1d1d22' && armBase.texts[0].color === '#ffffff' && armBase.bg.invert === false);
  const bgOnly = applyEffectToDesign(armBase, { type: 'invert', elements: { bg: true, icon: false, text: false } });
  check('element-choice invert flags only the background when only background is chosen', bgOnly.bg.invert === true && bgOnly.texts[0].invert === false);
  const blackBg = defaultDesign();
  blackBg.bg.color = '#000000';
  const tintDesign = applyEffectToDesign(blackBg, { type: 'tint', color: '#00ff00', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('tint mixes the background toward the tint colour', tintDesign.bg.color === '#008000');
  const highlightDark = applyEffectToDesign(blackBg, { type: 'highlight', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('highlight brightens a dark background toward white', highlightDark.bg.color === '#808080');
  const lightBg = defaultDesign();
  lightBg.bg.color = '#ffffff';
  lightBg.texts[0].color = '#16181c';
  const highlightLight = applyEffectToDesign(lightBg, { type: 'highlight', strength: 50, elements: { bg: true, icon: true, text: true } });
  check('highlight deepens a light background instead of washing it out', highlightLight.bg.color === '#808080' && parseInt(highlightLight.texts[0].color.slice(1, 3), 16) < 0x16);
  const dotDesign = applyEffectToDesign(defaultDesign(), { type: 'dot', color: '#1f9d3a' });
  check('dot effect adds a coloured circle icon layer', dotDesign.icons.length === defaultDesign().icons.length + 1 && dotDesign.icons[dotDesign.icons.length - 1].color === '#1f9d3a');
  const gradBase = defaultDesign();
  gradBase.bg.mode = 'gradient';
  gradBase.bg.gradFrom = '#000000';
  gradBase.bg.gradTo = '#ffffff';
  const gradInv = applyEffectToDesign(gradBase, { type: 'invert', elements: { bg: true, icon: true, text: true } });
  check('invert effect flags a gradient background to invert, stops unchanged', gradInv.bg.invert === true && gradInv.bg.gradFrom === '#000000' && gradInv.bg.gradTo === '#ffffff');

  const invRenderBase = defaultDesign();
  invRenderBase.bg.color = '#102030';
  const normalPx = await centerPixel(invRenderBase);
  invRenderBase.bg.invert = true;
  const invertedPx = await centerPixel(invRenderBase);
  check('renderer flips a solid background when bg.invert is set', invertedPx[0] === 255 - normalPx[0] && invertedPx[1] === 255 - normalPx[1] && invertedPx[2] === 255 - normalPx[2]);

  const redCanvas = document.createElement('canvas');
  redCanvas.width = 4;
  redCanvas.height = 4;
  const redCtx = redCanvas.getContext('2d');
  redCtx.fillStyle = '#ff0000';
  redCtx.fillRect(0, 0, 4, 4);
  const imgInvBase = defaultDesign();
  imgInvBase.bg.mode = 'image';
  imgInvBase.bg.imageData = redCanvas.toDataURL('image/png');
  imgInvBase.bg.imageFit = 'cover';
  imgInvBase.icons = [];
  imgInvBase.texts = [];
  const imgNormalPx = await centerPixel(imgInvBase);
  imgInvBase.bg.invert = true;
  const imgInvertedPx = await centerPixel(imgInvBase);
  check('renderer flips an image background when bg.invert is set', imgNormalPx[0] > 200 && imgNormalPx[1] < 60 && imgInvertedPx[0] < 60 && imgInvertedPx[1] > 200 && imgInvertedPx[2] > 200);

  const links = reaperLinks([{ id: 'a1', label: 'ARM' }, { onStateOf: 'a1', label: 'ARM on' }]);
  check('reaperLinks marks the on-state to skip and pairs it to its source', links.skip.has(1) && links.onStateFor[0] === 1 && !links.skip.has(0));
  const dangling = reaperLinks([{ onStateOf: 'missing', label: 'orphan' }]);
  check('reaperLinks ignores a dangling on-state link', dangling.skip.size === 0);

  const variants2 = [
    { design: defaultDesign(), label: 'Play', companionText: 'Play' },
    { design: defaultDesign(), label: 'Stop', companionText: 'Stop' }
  ];
  const rzPlain = fileKeys(await buildReaperZip(new JSZip(), variants2, null));
  check('reaper zip has base + 150 + 200 per button', rzPlain.includes('toolbar_icons/play.png') && rzPlain.includes('toolbar_icons/150/play.png') && rzPlain.includes('toolbar_icons/200/play.png'));
  check('reaper zip covers every button, unlinked = 6 files', rzPlain.includes('toolbar_icons/stop.png') && rzPlain.length === 6);
  check('reaper zip unlinked has no _on files', !rzPlain.some((k) => k.endsWith('_on.png')));
  const linkedVariants = [
    { design: defaultDesign(), label: 'Play', companionText: 'Play' },
    { design: defaultDesign(), label: 'Play on', companionText: 'Play on' }
  ];
  const rzLinked = fileKeys(await buildReaperZip(new JSZip(), linkedVariants, { skip: new Set([1]), onStateFor: { 0: 1 } }));
  check('linked on-state exports as the source name_on at every size', rzLinked.includes('toolbar_icons/play.png') && rzLinked.includes('toolbar_icons/play_on.png') && rzLinked.includes('toolbar_icons/150/play_on.png') && rzLinked.includes('toolbar_icons/200/play_on.png'));
  check('linked on-state is not a standalone strip and totals 6 files', !rzLinked.includes('toolbar_icons/play-on.png') && rzLinked.length === 6);

  const twoOn = reaperLinks([{ id: 's1', label: 'ARM' }, { onStateOf: 's1', label: 'ARM on 1' }, { onStateOf: 's1', label: 'ARM on 2' }]);
  check('reaperLinks pairs only the first on-state of a source', twoOn.onStateFor[0] === 1 && twoOn.skip.has(1) && !twoOn.skip.has(2));
  const threeVariants = [
    { design: defaultDesign(), label: 'ARM', companionText: 'ARM' },
    { design: defaultDesign(), label: 'ARM on 1', companionText: 'ARM on 1' },
    { design: defaultDesign(), label: 'ARM on 2', companionText: 'ARM on 2' }
  ];
  const rzTwoOn = fileKeys(await buildReaperZip(new JSZip(), threeVariants, twoOn));
  check('first on-state becomes name_on, the extra exports as its own strip', rzTwoOn.includes('toolbar_icons/arm.png') && rzTwoOn.includes('toolbar_icons/arm_on.png') && rzTwoOn.includes('toolbar_icons/arm-on-2.png'));

  const pzOff = fileKeys(await buildPngZip(new JSZip(), variants2, 72));
  check('png zip is one file per button with no _on', pzOff.length === 2 && pzOff.includes('play.png') && pzOff.includes('stop.png') && !pzOff.some((k) => k.endsWith('_on.png')));

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
