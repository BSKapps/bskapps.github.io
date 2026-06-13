# BSK Button Maker changelog

Internal version log. The app version lives in js/state.js (APP_VERSION), index.html (window.BM_V) and every ?v= asset URL - all three move together on each release.

## v53 - 2026-06-13
- The "Editing X" status moved from the top of the sidebar to directly under the button row, where you actually select buttons.
- Help now explains the PNG sizes (72/144/288) in full; the Download card keeps a one-line tip.
- Help gained a dedicated Duplicate line and the tip that clicking empty space goes back to editing all.

## v52 - 2026-06-13
- Text opacity fixed: in All-layers mode the slider now sets every layer to the chosen value instead of drifting or jumping. Behaves the same as image opacity.
- Image position grid now lights up like the text grid: the chosen square stays highlighted while you fine-tune with Nudge X/Y, and the centre square is lit by default. Image alignment is now a coarse anchor plus a separate nudge, matching how text works. Existing designs and presets render exactly as before.
- Smoother preview while dragging the colour picker sliders (renders are batched to one per frame).
- Colour picker shows which control it belongs to and follows that control when you scroll.
- Consistent control order in the Image and Text sections: Size, Colour, Position, Nudge X, Nudge Y, Opacity, Rotate.
- Double-click any slider to reset it to its default.
- Saved presets are editable: double-click a preset name to rename it, the x removes it, and saving with the same name updates that preset instead of making a duplicate.
- Help panel under the Download card explaining single buttons, sets, editing one or many, duplicating, reordering and shortcuts.
- A + tile now sits under the preview in single-button mode: click it to turn your button into an editable, duplicated set.

## v51 - 2026-06-12
- Hotfix: force fresh asset URLs so the broken v50 module imports clear from the CDN cache.

## v50 - 2026-06-12
- Background opacity (solid and gradient) and per-layer text opacity controls. Image opacity already existed.

## v49 - 2026-06-12
- Icon search results show true colours: coloured icons (logos, emoji) no longer display inverted in the picker grid. Monochrome icons are requested light from the API (?color=) instead of CSS-inverting everything.

## v48 - 2026-06-12
- "Blank" preset first in the strip: a plain empty button (no text, icon or border) so starting from scratch does not require finding the Start fresh button.

## v47 - 2026-06-12
- Reverse checkbox in the Image section: flips the icon horizontally around its own centre (e.g. a right-curving arrow becomes left-curving). Per layer, composes with Rotate, works across sets like every other control.
- Icon search understands AV terms: searches like transport, reaper, fader, mixer, daw, obs, protools, ableton and stream deck surface curated AV icons first, with normal web results below. QLab has no icon in any library - use Upload image for true brand logos.

## v46 - 2026-06-12
- Rotation sliders (-180 to 180): per image layer (spins around its own centre), per text layer, background image (Image mode only), and Border/Shape gains a whole-face Rotate that spins background + images + text together while the border and corners stay put. Backgrounds draw oversized while rotated so corners never show empty. Works with the All chips and set selection like every other slider; old presets load as 0.
- Zoom slider in Border/Shape (25 to 200): scales every image and text layer together around the button centre. Background keeps filling the button and the border/corners stay as set. Old presets load as 100.
- Delete layer now appears with a single text layer too (when it has text): deleting the only layer clears it to a fresh empty one, so removing a set's label no longer requires adding a throwaway layer first.

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
