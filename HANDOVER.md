# Handover — bskapps.github.io Website

## Session: 2026-04-12 (latest)

### App renamed: QuickIP → Quick Info Panel
- All display name references updated: "QuickIP" → "Quick Info Panel" in both `index.html` (homepage) and `quickip/index.html` (product page)
- JSON-LD structured data `name` field updated
- Appcast channel title updated
- URLs, bundle IDs, and internal identifiers unchanged — only user-visible names changed

### System Info Panel listed as new feature
- Green "NEW" badge added to top of features list on `quickip/index.html`
- "System Info Panel - CPU, RAM, Disk, and Uptime at a glance"
- This is a Pro-only feature planned for v2.1.0

### NOT yet pushed to GitHub Pages
- All changes are committed locally but not pushed
- Run `git push` when ready to go live

---

## Session: 2026-04-12 (earlier)

### QuickIP App Icons
- Replaced AppLogo (used in all alerts/dialogs) with new curved-tail icon from `Archive/QuickIP/Images and Video/Original Logo curved tail.png`
- Replaced StatusBarIcon (menu bar) with resized curved-tail icon (22x22 + 44x44), cropped to content first for larger appearance
- Replaced AppIcon (dock/Finder) with curved-tail icon composited on dark background (30,30,30), all sizes (16-1024)
- Originals backed up as `_old.png` in each asset folder

### Website (bskapps.github.io)
- Replaced `images/quickip-icon.png` with curved-tail icon
- Cropped all 8 product screenshots from full desktop (2880x1800) to UI content, normalized to 1400x1400 square on dark background (#0d0d0d)
- Gallery changed from horizontal scroll with scrollbar to prev/next arrow navigation with "X of 8" counter
- Added click-to-enlarge lightbox on screenshots
- Added mouse drag scrolling
- Added `?v=2` cache-busting to image URLs (can be removed later)

### Screenshots in gallery
1. Menu Overview (QIP Main.png)
2. More Info & Wi-Fi Details (QIP More info.png)
3. Wi-Fi Configuration (QIP Wi-Fi Menu.png)
4. LAN Scan Results (QIP LAN SCAN.png)
5. Network Scanner (QIP Network Scan.png)
6. Speed Test (QIP Speed Test.png)
7. Ping (QIP Ping.png)
8. Settings (QIP Settings.png)

Original uncropped screenshots backed up in `quickip/images/backup/`

## Still pending
- Ping and Network Scanner images may still need size tweaking — check live site after Cloudflare cache purge
- QuickIP Lite build 10 not archived yet (icon change only, user decided not to resubmit)
- NetworkService.swift has an uncommitted subnet parsing fix in the QuickIP repo
- Remove `?v=2` from image URLs once cache is confirmed fresh

## Files changed (QuickIP app repo)
- `QuickIP/QuickIP/AppLogo.png`
- `QuickIP/QuickIP/Assets.xcassets/AppLogo.imageset/AppLogo.png`
- `QuickIP/QuickIP/Assets.xcassets/StatusBarIcon.imageset/statusbar_1x.png`
- `QuickIP/QuickIP/Assets.xcassets/StatusBarIcon.imageset/statusbar_2x.png`
- `QuickIP/QuickIP/Assets.xcassets/AppIcon.appiconset/icon_*.png` (all sizes)

## Files changed (website repo)
- `images/quickip-icon.png`
- `quickip/index.html` (gallery CSS, arrows, lightbox, cache-bust)
- `quickip/images/*.png` (all 8 screenshots cropped and normalized)
