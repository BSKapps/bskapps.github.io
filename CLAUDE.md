# bskapps.github.io — Rules for All Models

## Golden Rules

1. **DO NOT change anything you weren't explicitly asked to change.** No visual tweaks, no refactors, no "improvements".
2. **DO NOT add features** unless explicitly requested.
3. **Read before editing.** Always read a file before modifying it.
4. **If unsure, ask.** Don't guess. Don't assume.
5. **Match the existing style exactly.** Dark theme, section cards, same CSS patterns.

## Project Context

- Static website for BSK Apps, hosted on GitHub Pages
- Custom domain: bskapps.com (configured via CNAME + Cloudflare DNS)
- Repository: github.com/BSKapps/bskapps.github.io
- Deployment: push to `main` → auto-deploys via GitHub Pages (usually under 1 minute)
- The user is the sole developer. No team, no PRs, no CI/CD.

## Site Structure

```
bskapps.github.io/
├── index.html              # Homepage - lists QuickIP, Lab Assistant, EWP, Resources
├── CNAME                   # Custom domain mapping (bskapps.com)
├── favicon.png
├── robots.txt
├── sitemap.xml             # SEO sitemap (7 public pages)
├── ads.txt                 # AdSense verification
├── images/                 # All icons and logos
│   ├── bsk-logo.png
│   ├── quickip-icon.png
│   ├── labassistant-icon.png
│   ├── mvp-icon.png
│   ├── fetchpuppy-icon.png
│   └── favicon-180.png
├── quickip/
│   ├── index.html          # QuickIP product page (redirects to /quickerip)
│   └── images/             # Legacy screenshots (8 PNGs)
├── quickerip/
│   ├── index.html          # Quicker IP product page (video + 10-image gallery + features)
│   └── images/             # 10 framed product screenshots (ss-*.png, purple gradient 1280x800)
├── labassistant/
│   ├── index.html          # Lab Assistant product page (video + screenshot gallery + modules)
│   └── images/             # 8 product screenshots (horizontal scroll gallery)
├── ewp/
│   ├── index.html          # EWP product page (Elevated Work Platform, 3-image gallery)
│   └── images/             # 3 product screenshots
├── resources/
│   ├── index.html          # Free Reaper LUA scripts page
│   └── scripts/            # 5 LUA script files for download
├── articles/
│   ├── index.html          # Articles index (6 posts, category tags + coloured left borders)
│   ├── static-ips-av-networks/       # Multi-adapter networking
│   ├── find-devices-on-network/      # arp, ping sweep, Bonjour, scanner
│   ├── dante-mac-network-readiness/  # USB Ethernet chipsets, subnet clash
│   ├── qlab-workspace-habits/        # Levels, mono files, panic fade, continue modes
│   ├── reaper-lua-cue-workflows/     # LUA intro + CSV rename example
│   └── native-mac-over-electron/     # Native vs Electron
├── contact/index.html      # Contact page (support email, ABN)
├── about/index.html        # About page (who/what/how)
├── multiviewport/index.html# MultiViewPort product page (HIDDEN)
├── fetchpuppy/index.html   # Fetch Puppy product page (LIVE on homepage)
├── privacy/index.html      # Privacy policy
├── terms/index.html        # Terms of service
└── refund/index.html       # Refund policy
```

## Products Listed (homepage order)

1. **QuickIP** - Network toolkit. Lite (App Store, free) + Pro (LemonSqueezy, $19.99 USD)
2. **Lab Assistant** - QLab workspace automation. Sold via LemonSqueezy
3. **EWP** - Elevated Work Platform, window layout snapper. LemonSqueezy, $4.99 USD
4. **MultiViewPort** - Multi-window viewer. Not yet built - HIDDEN from homepage (April 2026)

## Hidden Products

- **MultiViewPort** - Removed from homepage (April 2026) for LemonSqueezy approval - not yet built, no demo available. The `/multiviewport/` page and icon still exist in the repo. Content saved in memory for re-adding later. Do not link or reference on the site without asking first.

(Fetch Puppy was previously hidden but has been re-added to the homepage and is live.)

## Payments

- Payments via LemonSqueezy (approved April 2026)
- Quicker IP Pro: $19.99 USD, buy button on homepage and /quickerip page
- Quicker IP Lite: free on Mac App Store (https://apps.apple.com/us/app/quicker-ip-lite/id6761874418). Mac App Store badge sits right of the Pro buy button on both homepage and /quickerip page, with a "LITE - Free version on App Store" label below the badge. Buy row uses flex with `gap: 180px` to space them apart. Buy button and buy-note ("One-time purchase · 2 activations included") are grouped inside `.buy-col` so the note reads as Pro purchase terms.
- Mobile (< 700px): `.buy-row` stacks vertically with `gap: 40px`; LITE label flips to `position: static` with `margin-bottom: 40px`; `.appstore-wrap` gets `margin-top: 8px` to nudge the App Store badge down slightly; `.buy-section` uses `padding-bottom: 48px` and `.description` uses `padding-top: 24px` to force a real gap (padding, not margin, to avoid collapse).
- /quickerip page also includes a "Lite vs Pro" comparison table (Pro column on left, Lite on right). Comparison table row for AV tools is labelled "Dante and pro audio network readiness".
- /quickerip Features card: bullet list of all features (Pro and shared), no Pro badge on the card itself — comparison table handles Pro vs Lite distinction.
- /quickerip detail card (after Status Dots): no h2 header — opens directly with h3 subheadings (IP Configuration, Presets, Speed Test, Network Scanner, Dante and Pro Audio Network Readiness, Wi-Fi Details). `.section h3:first-child` has `margin-top: 0`; all other h3s have `margin: 20px 0 10px`.
- Screenshot galleries on all product pages use `.screenshot-scroll` (horizontal scroll, grab cursor) with `.gallery-arrow` prev/next buttons and a `#gallery-counter` div showing "X of Y". Counter is populated by `updateCounter()` called on load and scroll — never hardcode the count in HTML.
- All product pages (quickerip, labassistant, fetchpuppy, ewp) have a lightbox (`#lightbox`) with prev/next arrow buttons (`#lb-prev`, `#lb-next`), a counter (`#lb-counter`, shown inside lightbox), and keyboard support (left/right/escape). Click outside image closes it.
- Buy buttons use LemonSqueezy overlay checkout (lemon.js + `lemonsqueezy-button` class)
- Checkout URL params: `?dark=1&desc=0&media=0` for dark backdrop, no description, no media
- Buy button colour: green `#26A95F`, white text
- Lab Assistant: $14.99 USD introductory price, buy button on homepage and /labassistant page
- EWP: $4.99 USD, buy button on homepage and /ewp page. LS variant c3235a75-6837-4d32-b495-a941806e9b90. Title is "EWP" with subtitle "Elevated Work Platform".
- LemonSqueezy store: bskapps.lemonsqueezy.com

## Design Conventions

- Dark theme: `#0d0d0d` background, `#1a1a1a` section cards, `#2a2a2a` borders
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)
- Section cards: `border-radius: 16px`, `padding: 28px 32px`
- Link colour: `#7ac4ff`
- Homepage main cards and resources script cards use a subtle gloss: `linear-gradient(160deg, #252525, #1a1a1a, #141414)` + `border: 1px solid #3a3a3a` + inset top highlight `inset 0 1px 0 rgba(255,255,255,0.08)`. Hover brightens to `#2d2d2d` gradient and `#4a4a4a` border.
- Homepage Resources + Articles mini cards: blue gloss variant (`#1f2a3a` gradient, `#2a4a6a` border, `#7ac4ff` heading). Sit side-by-side with flex `gap: 16px; flex-wrap: wrap; flex: 1 1 280px` so they stack on mobile.
- Articles index cards: category tags + coloured left border (4px). Networking = `#7ac4ff`, QLab = `#7aff8a`, Reaper = `#b48aff`, Development = `#ffb347`.
- Resources script cards: coloured left border. Transport scripts = `#7aff8a`, Hardware/AutoPatch scripts = `#b48aff`. Install and Companion how-to cards use `.setup` variant with dashed `#333` border and darker `#141414` bg.

## Homepage card wrappers (IMPORTANT)

All homepage `.app-card` wrappers use `<div onclick="window.location='...'">` — NOT `<a href>`. Reason: each card contains a nested LemonSqueezy/App Store `<a>` for the buy button, and nesting `<a>` inside `<a>` is invalid HTML. Browsers auto-close the outer anchor, knocking the inner `.app` div out of the wrapper and breaking hover styles + the gloss effect. If you add a new homepage card with any `<a>` inside, use the div+onclick pattern.
- Badges: `.badge.macos` (blue), `.badge.pro` (purple), `.badge.coming-soon` (orange)
- Buy button: green `#26A95F`, hover `#2fc06d`, white text
- All pages share the same CSS inline (no external stylesheet)
- Back link on subpages: `← BSK Apps` linking to `/`

## Footer

All pages include a consistent footer with:
```
© 2026 BSK Apps · ABN 75 146 604 896
Contact · About · Privacy · Terms · Refund Policy
```
Do NOT add an Articles link to the footer — article discovery happens via the homepage Articles mini card and sitemap.xml. Keeping only the "official" links in the footer reads cleaner.
## SEO

- sitemap.xml submitted to Google Search Console
- Canonical URLs on all pages
- JSON-LD structured data: Organization (homepage), SoftwareApplication (QIP, LA), ItemList (resources)
- og:type on all pages
- robots.txt blocks AI training bots, allows Google-Extended, PerplexityBot, Applebot-Extended
- All page titles use hyphens, not em dashes (e.g. "BSK Apps - Native macOS Apps")
- Buy buttons have aria-label attributes (e.g. `aria-label="Buy Quicker IP Pro for $19.99 USD"`)

## Ads

- AdSense on homepage (below Resources card) and resources page (above footer)
- AdSense script removed from all other pages (QIP, LA, privacy, terms, refund)
- Ad slot: 7195341222
- Fixed 728x90 leaderboard format (`display:inline-block; width:728px; max-width:100%; height:90px`)
- No `data-ad-format="auto"` or `data-full-width-responsive` - use fixed dimensions only

## Contact

- Support email: support@bskapps.com (Cloudflare Email Routing → Gmail)

## Do NOT

- Create pull requests or suggest PR workflows
- Run `git push` unless explicitly asked
- Change the dark theme, colours, fonts, or layout unless asked
- Add external CSS frameworks or JavaScript (lemon.js is the one exception)
- Add analytics or tracking
- Link to or mention Fetch Puppy without asking first
- Add emojis to code or output unless asked
