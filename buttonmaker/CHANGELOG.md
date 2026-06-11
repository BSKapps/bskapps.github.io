# BSK Button Maker changelog

Internal version log. The app version lives in js/state.js (APP_VERSION), index.html (window.BM_V) and every ?v= asset URL - all three move together on each release.

## v45 - 2026-06-11
- Mobile layout fix: the Download card no longer overlaps the footer note. Stacked step cards were locked to a fixed 420px height in a column, so the Download card's taller content spilled past its border into the footer; cards now size to their content on narrow screens.

## v44 - 2026-06-11
- Mobile layout fix: step order is now 1 (presets), canvas, 2 (editing), 3 (set), 4 (download).

## v43 - 2026-06-11
- Audit fixes: From/To fields no longer snap to 0 while typing; One button mode after a list preset keeps the first item's text; + Layer / Delete layer apply to every selected button; icon size All mode reaches 150; undo and autosave no longer bake designs for buttons that were only clicked; drag-to-preview no longer permanently detaches the selected button; cmd/shift-click keeps the active layer; All-layer sliders move layers as a rigid group at the limits.

## v42 - 2026-06-11
- One button mode substitutes {n}/{label} tokens instead of drawing them literally.
- Position grid highlights only the centre cell for icons sized 100+.
- Transport icons default 72.

## v41 - 2026-06-11
- Shift-click range-selects set buttons.
- Text edits apply to the whole multi-selection (select all, clear text = remove all labels).
- Transport preset ships with labels under the icons.

## v40 - 2026-06-11
- Slider value readouts are typeable number fields (commit on Enter/blur, clamped).

## v39 - 2026-06-11
- Custom list with nothing selected locks the shared text field (button text comes from names).

## v38 - 2026-06-11
- Click dead space around the preview or set to clear the selection.

## v37 - 2026-06-11
- Icon size cap raised to 150 (full-bleed). Transport icons 75.

## v36 - 2026-06-11
- "All" layer chip in Text and Image sections: relative size/nudge across all layers, absolute font/weight/colour/align.

## v35 - 2026-06-11
- Preset size tuning: QLab GO 36 (own design)/rest 18, Video Switch + Traffic Lights 25, timer numbers 48, Transport icons 64.

## v34 - 2026-06-11
- Cmd-click multi-select; edit-all reaches individually styled buttons; plain click never deselects; preset text sizes bumped; timer gradient green-to-yellow; +1/-1 green/red; Lower Thirds dark slate.

## v33 - 2026-06-11
- Drop a set button on the + tile to duplicate it.

## v32 - 2026-06-11
- Timers preset set: 60/45/30/15/5 countdowns, +1/-1 min, Message.

## v31 - 2026-06-11
- Set managed under the preview: + tile adds, corner x removes, list rows and swatch controls removed.
- Transport extended (Rew/FFwd/Shuffle/Repeat), QLab extended (Prev/Next/Preview/Loop), new Video Switch set; Go Green/CUT/AUTO/PVW singles folded in.

## v30 - 2026-06-11
- Per-button editing in custom lists: click a set button to style it alone; copy-on-select designs with discard-if-unchanged.

## v29 - 2026-06-11
- Shape section renamed Border/Shape, border controls first.

## v28 and earlier - 2026-06-11
- Icon layers, gradient blend slider, multiline text, Start fresh, custom list colour fixes, numbered-mode bug fixes, launch (see git log for detail).
