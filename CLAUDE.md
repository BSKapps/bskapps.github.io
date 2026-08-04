# bskapps.github.io — Rules for All Models

## Golden Rules

1. **DO NOT change anything you weren't explicitly asked to change.** No visual tweaks, no refactors, no "improvements".
2. **DO NOT add features** unless explicitly requested.
3. **Read before editing.** Always read a file before modifying it.
4. **If unsure, ask.** Don't guess. Don't assume.
5. **Match the existing style exactly.** Mid-tone graphite theme, shared stylesheet, same patterns. See `.claude/rules/design.md`.

## Project Context

- Static website for BSK Apps, hosted on GitHub Pages
- Custom domain: bskapps.com (configured via CNAME + Cloudflare DNS)
- Repository: github.com/BSKapps/bskapps.github.io
- Deployment: push to `main` → auto-deploys via GitHub Pages (usually under 1 minute)
- The user is the sole developer. No team, no PRs, no CI/CD.
- June 2026 redesign lives on the `redesign-midtone` branch until merged: mid-tone graphite theme, shared stylesheet, homepage grid.

## Site Structure

```
bskapps.github.io/
├── index.html              # Homepage - nav, hero, 2-col product grid (QIP, TT, LA, FP) with screenshot + price line per tile, Free Tools grid, flat 'Also from BSK' links (Stimulus, Articles, Go Games)
├── css/site.css            # THE shared stylesheet - all pages link it, all theme tokens live here
├── _data/content.json      # App names, subtitles, taglines, prices, versions, DESCRIPTIONS, FEATURES - edited via /admin
├── CNAME / favicon.png / robots.txt / sitemap.xml / ads.txt
├── images/                 # App icons and logos
├── quickerip/              # Product page (hero image + 6 alternating .fblock feature blocks + Lite vs Pro table + features + guide link + closing buy row). No carousel - unlike the other product pages
├── labassistant/           # Product page (video + gallery + Mint + Processing Modules sections)
├── fetchpuppy/             # Product page (video + gallery + features + disclaimer)
├── targettrace/            # Product page (video + gallery + features)
├── gogames/                # 4 game cards (Solitaire, Sudoku, Minesweeper, Battle Boats) + screenshots
├── tools/                  # Free Tools hub (renamed from resources/ June 2026, URLs moved)
│   ├── index.html          # Hub - 3 entries (REAPER scripts, Companion modules, BSK Button Maker)
│   ├── reaper/             # 6 Lua scripts + install instructions
│   ├── companion/          # BSK Spotify module + setup guide
│   └── scripts/            # .lua download files
├── resources/              # Meta-refresh redirect stubs only (old URLs -> /tools/...) - do not add content here
├── buttonmaker/            # BSK Button Maker web app - self-contained (own css/js, NOT site.css, like /admin). Canonical copy; dev repo at ../companion-button-maker is archive. Bump ?v= + BM_V + APP_VERSION on every change
├── articles/               # Index grouped by category + 9 article pages
├── admin/index.html        # Self-contained admin: content editor + articles editor + analytics (GitHub token auth)
├── contact/ about/ privacy/ terms/ refund/
└── multiviewport/          # DEAD product, unlinked, old theme - do not touch
```

## Products (homepage grid order)

1. **Quicker IP** - Network toolkit. Lite (App Store, free) + Pro (LemonSqueezy, $18.99 USD)
2. **Lab Assistant** - QLab workspace automation. LemonSqueezy, $14.99 USD
3. **Fetch Puppy** - Media downloader. LemonSqueezy, $14.99 USD
4. **Target Trace** - Smaart/REW target curve editor. LemonSqueezy, $12.99 USD
5. **Go Games** - Solitaire, Sudoku, Minesweeper, Battle Boats. iOS + Mac, free on App Store, $1.99 IAP unlock

EWP was pulled from the site June 2026 (project shelved). MultiViewPort is DEAD (never worked) - see `.claude/rules/hidden-products.md`.

## Content lives in _data/content.json (IMPORTANT)

Per app: name, subtitle, tagline (homepage tile), price, macos, version, released, plus:
- `description` - the product page intro paragraph (all 5 product pages)
- `features` - the product page Features list (QIP, FP, TT; LA's structured sections stay in HTML)

Homepage tiles and product pages render these via Liquid. The /admin Content tab edits this file through the GitHub API and commits to main. Never hardcode taglines, descriptions, or feature lists in page HTML - edit content.json.

Lab Assistant's Mint / Processing Modules sections and QIP's Lite vs Pro table are hardcoded HTML by design. QIP's old detail subsections (IP Configuration, Presets, Speed Test, Network Scanner, Dante, Wi-Fi) and Status Dots legend were removed June 2026 - that detail now lives in the Quicker IP user guide, linked from the page.

## Payments

- Payments via LemonSqueezy (overlay checkout: lemon.js + `lemonsqueezy-button` class)
- Checkout URL params: `?dark=1&desc=0&media=0`
- Buy buttons: flat green `--accent` (#3E8E5F), `.buy-btn.large` on product pages. Homepage tiles have NO buy button - a muted `.tile-price` line and a blue `View ->` instead, so the tile reads as a door not an offer
- Buy notes: "One-time purchase · 2 activations" + version line; QIP and FP add "May be tax deductible for AV professionals."
- Quicker IP Lite: free on Mac App Store (id6761874418). Badge + plain small-caps "Lite · Free version on App Store" note next to the Pro buy button (`.appstore-col`, `.lite-note`)
- /quickerip has a Lite vs Pro comparison table (`.compare-table`)
- Buy buttons have aria-labels (e.g. `aria-label="Buy Quicker IP Pro for $18.99 USD"`)
- LemonSqueezy store: bskapps.lemonsqueezy.com

## Galleries and lightbox (product pages)

- `.screenshot-scroll` horizontal scroll with grab cursor, `.gallery-arrow` prev/next, `#gallery-counter` "X of Y" populated by `updateCounter()` - never hardcode the count
- `#lightbox` with `#lb-prev`/`#lb-next`, counter, keyboard left/right/escape, click outside to close

## Homepage tile wrappers (IMPORTANT)

Tiles are `<a class="app-card" href="...">` wrapping a `.tile`. This is only safe because the tiles contain NO inner links - the buy buttons were removed August 2026. If you ever put a link back inside a tile you must revert to the old `<div class="app-card" onclick>` pattern, because nesting `<a>` inside `<a>` is invalid HTML and browsers auto-close the outer anchor, breaking the layout.

Each tile: `.tile-shot` screenshot (152px, object-fit cover, negative margins to bleed to the card edge), `.tile-head` icon + name + subtitle, `.tile-line` tagline, then `.tile-foot` with `.tile-price` (price + small meta line) and `.tile-view`.

## Contrast

`--text-on-card` (#C6C6CC) is for muted text sitting on a `--card` background. `--text-muted` (#A9A9AF) fails AA at 3.76:1 on cards - it is only for text on `--bg`. Use `--text-on-card` inside `.tile`, `.game-card` and `.article-cta`.

## Link previews (Open Graph)

Every page has a 1200x630 `images/og-*.png` card plus `og:image:width`/`height`. `og:title` is the SELLING line and is deliberately different from `<title>`, which stays keyword-shaped for Google. Cards are generated from HTML, not hand-drawn - regenerate rather than editing the PNGs. After changing any OG tag, re-scrape the URL in Facebook's Sharing Debugger or the old preview persists.

## Footer

All pages:
```
© 2026 BSK Apps · ABN 75 146 604 896
Contact · About · Privacy · Terms · Refund Policy
```
Do NOT add an Articles link to the footer - articles are reached via the homepage Articles link and sitemap.xml.

## Admin (/admin)

- Single self-contained page, own inline CSS in the site palette (only page not using site.css)
- GitHub token auth, stored in localStorage (persists across launches, auto-restores on load). Recommended: fine-grained token scoped to bskapps.github.io + bsk-stats with Contents + Secrets read/write; classic repo-scope tokens still work. Edits commit directly to main → deploys live
- Content tab: site title/tagline + per-app fields incl. description and features (see content.json section)
- Articles tab: edits title/meta description/h1/date/body of article pages (parses markers: `<h1>`, `<p class="date">`, body runs to `<div class="article-cta">` or `</article>` - keep these markers when editing article HTML)
- Analytics tab: reads stats.json from BSKapps/bsk-stats (hourly Action), ranges 24h/7d/30d/90d/FY, USD/AUD, LS gross/net, Apple sales/proceeds, conversion. API Keys panel writes encrypted GitHub Action secrets (CF_API_TOKEN, LS_API_KEY, APPLE_*)

## SEO

- sitemap.xml submitted to Google Search Console
- Canonical URLs on all pages; og:type on all pages
- JSON-LD: Organization (homepage), SoftwareApplication (product pages), ItemList (resources/reaper)
- robots.txt blocks AI training bots, allows Google-Extended, PerplexityBot, Applebot-Extended
- Page titles use hyphens, never em dashes

## Ads

- NO ads anywhere. AdSense was removed May 2026 after rejection - do not re-add. ads.txt remains for verification only.

## Analytics

- Cloudflare Web Analytics (cookieless RUM, auto-injected at the edge, no snippet in the repo, no consent banner) is the ONE allowed form of analytics. It is privacy-first: no cookies, no third-party ad network, no cross-site tracking.
- The hourly Action `.github/scripts/fetch-stats.js` queries it via GraphQL (`rumPageloadEventsAdaptiveGroups`): site totals, per-page visits (grouped by `requestPath`), and Button Maker in-house ad click-throughs (pageviews where `refererPath` is `/buttonmaker/`). These feed `stats.json` -> `/admin` Analytics tab (Page Views by Page + Button Maker Ad Clicks tables).
- The Button Maker page CSP allows `static.cloudflareinsights.com` (script-src) and `cloudflareinsights.com` (connect-src) so its own visits are counted; every other page is counted automatically.
- STILL banned: ad networks, cookie-based tracking, consent-banner trackers, and any third-party analytics JS (Google Analytics, etc.). Cookieless Cloudflare RUM only.

## Contact

- Support email: support@bskapps.com (Cloudflare Email Routing → Gmail)

## Do NOT

- Create pull requests or suggest PR workflows
- Run `git push` unless explicitly asked
- Change the theme, colours, fonts, or layout unless asked (see .claude/rules/design.md)
- Add external CSS frameworks or JavaScript (lemon.js is the one exception)
- Add ads, cookie-based tracking, or third-party analytics scripts (cookieless Cloudflare RUM is allowed - see Analytics)
- Link to or mention MultiViewPort
- Add emojis to code or output unless asked
