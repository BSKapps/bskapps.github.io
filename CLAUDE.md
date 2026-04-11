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
├── index.html              # Homepage - lists QuickIP, Lab Assistant, Resources
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
│   ├── index.html          # QuickIP product page (video + screenshot gallery + features)
│   └── images/             # 8 product screenshots (horizontal scroll gallery)
├── labassistant/
│   ├── index.html          # Lab Assistant product page (video + screenshot gallery + modules)
│   └── images/             # 8 product screenshots (horizontal scroll gallery)
├── resources/
│   ├── index.html          # Free Reaper LUA scripts page
│   └── scripts/            # 5 LUA script files for download
├── multiviewport/index.html# MultiViewPort product page (HIDDEN)
├── fetchpuppy/index.html   # Fetch Puppy product page (HIDDEN)
├── privacy/index.html      # Privacy policy
├── terms/index.html        # Terms of service
└── refund/index.html       # Refund policy
```

## Products Listed (homepage order)

1. **QuickIP** — Network toolkit. Lite (App Store, free) + Pro (LemonSqueezy, $19.99 USD)
2. **Lab Assistant** — QLab workspace automation. Sold via LemonSqueezy
3. **MultiViewPort** — Multi-window viewer. Not yet built — HIDDEN from homepage (April 2026)

## Hidden Products

- **Fetch Puppy** — Removed from homepage and unlinked (April 2026) for LemonSqueezy approval. The `/fetchpuppy/` page and icon still exist in the repo. Content saved in memory for re-adding later. Do not link or reference on the site without asking first.
- **MultiViewPort** — Removed from homepage (April 2026) for LemonSqueezy approval — not yet built, no demo available. The `/multiviewport/` page and icon still exist in the repo. Content saved in memory for re-adding later. Do not link or reference on the site without asking first.

## Payments

- Payments via LemonSqueezy (approved April 2026)
- QuickIP Pro: $19.99 USD, buy button on homepage and /quickip page
- Buy buttons use LemonSqueezy overlay checkout (lemon.js + `lemonsqueezy-button` class)
- Checkout URL params: `?dark=1&desc=0&media=0` for dark backdrop, no description, no media
- Buy button colour: green `#26A95F`, white text
- Lab Assistant: not yet on sale (Coming Soon)
- LemonSqueezy store: bskapps.lemonsqueezy.com

## Design Conventions

- Dark theme: `#0d0d0d` background, `#1a1a1a` section cards, `#2a2a2a` borders
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)
- Section cards: `border-radius: 16px`, `padding: 28px 32px`
- Link colour: `#7ac4ff`
- Badges: `.badge.macos` (blue), `.badge.pro` (purple), `.badge.coming-soon` (orange)
- Buy button: green `#26A95F`, hover `#2fc06d`, white text
- All pages share the same CSS inline (no external stylesheet)
- Back link on subpages: `← BSK Apps` linking to `/`

## Footer

All pages include a consistent footer with:
```
© 2026 BSK Apps
support@bskapps.com · Privacy · Terms · Refund Policy
```
## SEO

- sitemap.xml submitted to Google Search Console
- Canonical URLs on all pages
- JSON-LD structured data: Organization (homepage), SoftwareApplication (QIP, LA), ItemList (resources)
- og:type on all pages
- robots.txt blocks AI training bots, allows Google-Extended, PerplexityBot, Applebot-Extended

## Ads

- AdSense only on homepage (above Resources card) and resources page (above footer)
- AdSense script removed from all other pages (QIP, LA, privacy, terms, refund)
- Ad slot: 7195341222

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
