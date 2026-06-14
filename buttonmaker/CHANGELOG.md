# BSK Button Maker changelog

Internal version log. The app version lives in js/state.js (APP_VERSION), index.html (window.BM_V) and every ?v= asset URL - all three move together on each release.

## v92 - 2026-06-14
- Duplicating a button now makes a plain, independent button: it drops the on state link, so the copy no longer carries the "on" tag. Only the on state made by the presets keeps it. To turn an on state into a normal button, duplicate it.
- The "on" tag now sits below the button next to its number, instead of over the top corner, so it no longer looks like part of the button. It is only an on-screen marker and never appears in exports.
- Renamed the Glow preset to Highlight, and made it adapt to the button: it lifts dark buttons brighter and deepens light ones, so it always reads as an active state instead of washing a white button's text out.
- "Number them" and the From and To boxes now sit on one line at a normal size.

## v91 - 2026-06-14
- The "On state & effects" card is now just four presets: Tint, Glow, Invert and Dot. Pick one and it drops a linked, editable on state button into your set, shown in the main preview - then tweak it with the cards on the left, like any other button.
- One on state per button: picking a preset creates it once and updates that same one next time, instead of adding more. Selecting either the button or its on state and picking again updates it.
- On states link automatically, so REAPER still exports name_on with no renaming.
- Invert is now a tick in the Background, Icon and Text cards, next to each colour: flip just that part of any button, live. The Invert preset is the same thing, applied to all three at once.
- New "Status dot" button in the Icon/Image card adds a dot you can colour, size and place.
- Picker: "Start fresh" also sits next to "Choose buttons & sets"; the (user) delete x sits right after the preset name; "Add set" buttons line up on the right; button tiles are lighter and cleaner.
- Sets and on states are now one card, "Make a set & on states", with the on state presets under their own heading - they are the heart of the app, so they sit together as the headline feature. Download is its own card below it.
- Dropped the step numbers and the "Pick a starting point" / "Make it yours" headings; the layout reads as a free-form tool, not a numbered wizard.
- The little x to remove a button from a set, and the x on your own presets, now sit centred in their circles.

## v90 - 2026-06-14
- On states and effects are now a design tool, not an export option. New "On state and effects" card: pick Tint, Glow, Invert or a status Dot, then "Make on state" to drop a real, editable on-state button into your set. Edit it like any other button, or duplicate it and lower its opacity to build a ramp.
- Invert lets you choose what flips - background, icon, text, or any combination.
- Effects apply to your single button (which becomes a set), the selected buttons, or the whole set.
- Linked on states show an "on" badge and pair automatically on REAPER export as name_on, so you assign the base icon and REAPER finds the on state - no renaming.
- Removed the old "Include active toggle state" checkbox from the Download card; the effects card replaces it.
- "Download set as ZIP" is now greyed whenever there is only one button (previously a set trimmed back to one button could leave it enabled).
- Large sets stay readable: button thumbnails shrink as the set grows past 24 and 40 buttons (cap is still 64).

## v89 - 2026-06-14
- New preset picker: "1. Pick a starting point" now opens one "Choose buttons & sets" picker instead of the side-scrolling strip. Click any button to add it to your set, or "Add set" to add a whole row in one go.
- Your own presets sit at the top of the picker, marked (user), with rename (double-click the name) and delete (x). Adding one of your own brings its name back into the Save box so you can edit it and Save over it.
- "Start fresh" moved into the picker. The first button you add to an empty canvas becomes your single button; add a second and it turns into a set.
- Removed the separate "Add from a preset" button under "Make it a set" - the one picker now both starts you off and adds buttons to a set.

## v88 - 2026-06-14
- Active toggle state: Invert is now a proper full invert - the whole button goes negative (background, icon and text) instead of only flipping the background, so text stays legible on dark buttons.

## v87 - 2026-06-14
- REAPER export: a Stream Deck / REAPER toggle in the Download card. REAPER mode turns each button into a 3-state toolbar strip (normal, hover, active) at 1x, 1.5x and 2x, zipped to mirror REAPER's toolbar_icons folder (with the 150 and 200 hi-DPI subfolders).
- Active toggle state (both Stream Deck and REAPER): tick "Include active toggle state" to add an on image, with a choice of Tint (colour), Glow, Invert or a status Dot. REAPER gets a matching name_on strip; in Stream Deck mode the PNG button greys out and the ZIP carries both the off and on PNG.
- Text and image Size boxes now accept half points: type a value like 32.5 for finer control at larger sizes. The sliders still move a point at a time.
- Tagline and footer now mention REAPER (and Cockos in the not-affiliated line).

## v85 - 2026-06-14
- New "Add from a preset" button in Make it a set (Custom set mode): opens a picker that lists every preset and its buttons as thumbnails, so you can drop a single button (like Transport's Rec) into the set you are building without rebuilding it by hand. Add as many as you like, the picker stays open.

## v84 - 2026-06-13
- Tuned Mixer icon sizes: Mixer/Dock/Faders/Master/FX icons to 50, and the meter icons larger (Meters 70, Meters 8 92, Meters 2 82).

## v83 - 2026-06-13
- Mixer Master button now has a single-fader icon (matching the other icon buttons in the set) instead of being a text-only tile.
- Renamed the Mixer Fader button to Faders.

## v82 - 2026-06-13
- The label under each button in a set is now just its position number (1, 2, 3...), a simple count - no names or reflected text.
- Mixer button icon is now an upright 5-fader bank instead of the sideways sliders.
- Mixer Master button back to the set's Oswald font so the Mixer set is visually consistent.

## v81 - 2026-06-13
- Reworked the Track set: removed Region, renamed Marker/Prev/Next to Drop Marker / Prev Marker / Next Marker, and added Save and Go To Start (with new save and go-to-start icons).
- Mixed up the fonts: the Mixer Master button now uses Bebas Neue and the Edit set labels use Montserrat.
- Switching a background from Solid to Gradient now seeds the gradient from the solid colour you were on (top colour = your solid, bottom = a darker shade) instead of jumping to the default blue.

## v80 - 2026-06-13
- Gave the Track, Edit and Mixer sets real icons (record, mute, solo, monitor, marker, region, split, heal, glue, fade, crop, nudge, normalize, render, mixer, dock, fader, FX) so they show off what is possible, not just text tiles.
- Mixer set: dropped Strip and 2nd Row, added FX and a stereo meter variant.
- Reordered the preset strip: Track and Edit now follow Transport, Mixer follows Video Switch, QLab sits before Timers, and Traffic Lights is last.
- The little name caption under each button in a set now only shows for icon-only buttons, so it no longer mirrors text the button already displays.

## v79 - 2026-06-13
- Added three REAPER-oriented preset sets: Track (Arm, Mute, Solo, Mon, Marker, Region, Prev, Next), Mixer (Mixer, Strip, Dock, 2nd Row, Master, Fader, plus green-yellow-red LED meter buttons), and Edit (Split, Heal, Glue, Fade, Crop, Nudge, Norm, Render).
- New meterbridge-style LED meter and fader icons used by the Mixer set.

## v78 - 2026-06-13
- Made the "Number them" button a solid, clearly clickable button instead of a faint outline.
- Reworded its hint so "Number them" is explained first, then From and To.

## v77 - 2026-06-13
- The set button tooltip now mentions dragging a button onto the big preview to use just that one.
- Redo is Cmd-Shift-Z (Ctrl-Y on Windows); dropped Cmd-Y on Mac since browsers use it for their own window.

## v76 - 2026-06-13
- Added Redo (Cmd-Shift-Z) alongside Undo, and Cmd-A to select every button in a set. Both noted in Help.
- Tidied the Number them controls: the button now sits above the From/To boxes, From and To sit side by side, with a clearer note that they set how many buttons are built. Removed a redundant hint line.

## v75 - 2026-06-13
- Refreshed the INPUT and Lower Thirds preset sets (now INPUT 1-8 and Lower Thirds 1-8, with bigger, clearer numbers and graphics).
- On Chrome, Edge and other Chromium browsers, Restore now opens straight to your Downloads folder. Firefox and Safari open wherever the browser last left off.

## v74 - 2026-06-13
- Refreshed the Transport, QLab and Timers preset sets: better-centred transport icons, sized-up QLab labels, and a fuller Timers set (new colours, plus START, STOP, RESET and a SEND MESSAGE button).

## v73 - 2026-06-13
- "Number them" now uses the From/To values even if you click it straight after typing, without clicking away first.
- "Number them" now asks before replacing a set you have already built, so you do not lose your buttons by accident.
- Old sets left open from before this update now restore correctly as editable sets. Plus internal tidy-ups from a review of the set logic.

## v72 - 2026-06-13
- Fixed buttons with their own style (like the Message button in the Timers set) losing that style and reverting to the big number look when you clicked between buttons.

## v71 - 2026-06-13
- Simplified sets: there are now just two choices, One button and Custom set. The separate "Numbered" mode is gone.
- Custom set gains a "Number them" tool (From / To) that fills the set with numbered buttons you can edit straight away - "PC" becomes PC 1, PC 2..., and cue numbers like 1.1 to 1.5 work too.
- This removes the old, confusing behaviour where switching between modes could change which buttons appeared. Numbered presets like INPUT 1-8 now open straight as an editable set.

## v70 - 2026-06-13
- The page header and the "2. Make it yours / Start fresh" row now stay pinned in place instead of scrolling away, so Start fresh is always reachable and the page stops shifting around as you scroll.
- Card titles "Icon / Image" and "Border / Shape" now use the same, tighter spacing around the slash.
- Made the Border / Shape card's edge a touch more visible.

## v69 - 2026-06-13
- Step 3 and 4 no longer jump down when you switch to Custom set. The "Editing the set" banner now keeps its place, so clicking Custom set (or any set mode) holds the cards still instead of shoving them down.

## v68 - 2026-06-13
- Made the Icon / Image and Text card watermarks a touch larger.

## v67 - 2026-06-13
- Icon / Image and Text cards now carry a single faint watermark beside the Position grid (instead of a repeating pattern), so the controls and labels stay easy to read.
- Background card icon changed to a colour palette; the "Image" card is now labelled "Icon / Image".
- Fixed a numbered set "blowing out" when switching to Custom set: once you change a numbered set's From/To or text, Custom set now converts the numbered set you see instead of restoring an earlier custom set.

## v65 - 2026-06-13
- Icon/Image card now uses a faint picture motif instead of a dot grid.
- Background card icon is now a paint-fill icon (the previous droplet read as water).
- Card icons no longer flash at full size for a moment while the page loads.

## v64 - 2026-06-13
- Switching One button / Numbered / Custom set is now stable: flipping between Numbered and Custom set no longer wipes or renumbers a custom set you have built. Clicking Custom set from a numbered set still turns the numbers into editable buttons.
- Numbered sets now support decimals (handy for cue numbers): From 1.1 To 1.5 makes 1.1, 1.2, 1.3, 1.4, 1.5. The step matches the decimals you type.
- Typing a trailing number in a numbered set now sets the start: "cue 22" makes cue 22, 23, 24..., and the From box follows.
- Renamed the "Image" card to "Icon/Image" to match its Choose icon and Upload image buttons.

## v63 - 2026-06-13
- Sidebar cards now each carry a small icon and a subtle texture so Background, Image, Text and Border/Shape are easy to tell apart at a glance (Background gets the transparency checkerboard, Image a dot grid, Text ruled lines, Border/Shape a rounder edge).
- Numbered sets now have an Add (+) tile under the preview to add the next number, matching custom sets.
- The Add (+) tile in a custom set now has a label, like the Duplicate tile on a single button.
- From and To now reject typed text: an invalid entry snaps back to the last number instead of sticking.
- Dropping a background image onto the preview, or pasting an image, now applies to all the buttons you have selected, matching the sidebar pickers.
- Image and text Opacity sliders now go down to 0, matching the background Opacity slider.
- Companion and ZIP export are hardened against malformed imported presets, and ZIP filenames no longer collide on tricky labels.
- Undo and "make this my single button" now reset the active layer cleanly, saved sessions heal old designs the same way loading a preset does, and the in-memory image cache is now capped.

## v62 - 2026-06-13
- "One button" now keeps the button you are previewing (its icon, colour and text) instead of dropping to a blank base design. Same as dragging a button onto the preview.
- "Custom set" from a single button now duplicates that button into the set (matches the + Duplicate tile) instead of jumping to the camera tally.
- "Custom set" from Numbered now converts your numbered buttons into the editable set.
- Deleting every button in a set drops back to single-button mode: the base design stays and the ZIP button correctly disables (no more empty ZIP).

## v61 - 2026-06-13
- Fixed the set list holding onto a previously-loaded set (e.g. Transport) and resurrecting it. Loading a non-set preset, or dragging a button onto the preview to make it single, now resets the set back to the default. Toggling One button and Custom set on a set you are building still keeps it.

## v60 - 2026-06-13
- Removed the standalone Record preset from the strip (the Transport set already includes a Rec button), tidying the row.

## v59 - 2026-06-13
- Pressing Enter in the preset name field now saves (or updates) the preset, same as clicking Save to my presets.

## v58 - 2026-06-13
- The delete x on your saved presets is now a tidy circular badge in the corner that appears on hover, matching the x on set buttons (was a bare character floating off-corner).

## v57 - 2026-06-13
- Loading one of your own presets now fills in its name, so editing it is a clean loop: load, tweak, Save with the same name to update it (works for sets too). Loading a built-in clears the name. Delete is still the x on your preset tiles.

## v56 - 2026-06-13
- Download summary for a set drops the leading button count (you can see them under the preview): "Download PNG saves the one you are previewing; the ZIP saves all N as separate PNGs."

## v55 - 2026-06-13
- The + tile under a single button now has a "Duplicate" label so it is clear that clicking it copies the button into a set.
- Clearer set guidance: "Click one to style it alone, Cmd-click or Shift-click to grab a few" in the set hint and Help.

## v54 - 2026-06-13
- Download PNG now saves the single button you are previewing. Download set as ZIP still saves all buttons. Previously, with a set, Download PNG quietly gave you the ZIP.
- Accurate download summary: it no longer claims the PNG/ZIP lay out as a row on the Companion page (that only applies to the Companion page file).
- Renamed "Custom list" to "Custom set" to match "Make it a set".
- The "Editing X" status no longer changes height when you select or deselect buttons, so the cards below stay put.

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
