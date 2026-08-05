# BSK Promo Kit

Internal. Lives in `_promo/` so Jekyll never publishes it.

Everything here is paste-and-send. The rule behind all of it: **lead with the free thing, answer questions instead of posting, and let the site do the selling.**

---

## 1. Directories - do these once, they keep paying

Each listing is free distribution with no gatekeeper, and each one is a backlink. Backlinks are what move your brand terms off position 8, so this list fixes distribution and search ranking with the same action.

Work down it. Tick as you go.

### Menu bar directories (Quicker IP is a perfect fit - the menu bar IS the app)

- [ ] **MacMenuBar.com** - https://macmenubar.com/submit-your-menu-bar-app/
- [ ] **MacMenuBars.com** - https://macmenubars.com/submit
- [ ] **MacOSMenuBar.com** - https://www.macosmenubar.com/

### General software directories (all five apps)

- [ ] **AlternativeTo** - sign up, then "Add new application" from your profile. It can pull straight from the Mac App Store listing for Quicker IP Lite and Stimulus. Its product pages rank well for "<product> alternative" searches. ~10 minutes per app.
- [ ] **Product Hunt** - one launch per app, not all at once. Best for Button Maker, because free tools do far better there than paid utilities.
- [ ] **MacUpdate**
- [ ] **SaaSHub**

### Community and forum presences (not submissions - accounts you participate under)

- [ ] **Bitfocus Companion Slack / GitHub** - your modules genuinely belong there
- [ ] **Cockos REAPER forum** - the live recording template is a real contribution
- [ ] **Rational Acoustics forum** - Target Trace is directly on-topic
- [ ] **Audinate community** - Dante network questions, where Quicker IP fits
- [ ] **ControlBooth** and **Blue Room** - theatre tech
- [ ] **ProSoundWeb LAB Lounge** - live sound

### Reddit

Only these: r/livesound, r/techtheatre, r/CommercialAV, r/VIDEOENGINEERING, r/StreamDeck.
**Never** r/networking (wrong audience - they live in a terminal and will tell you so) or r/macapps.

---

## 2. Outreach

### Nathan Lively, Sound Design Live

The single best-matched audience found so far. Podcast with 789K downloads, a school built on Smaart training, an email list of exactly the people who buy Target Trace. He also builds tools himself (Tracebook, SubAligner), so read what Tracebook actually is before writing, and pitch as complementary rather than competing.

> Subject: Target Trace - a visual target curve editor for Smaart
>
> Hi Nathan,
>
> I make a small Mac app called Target Trace. It's a visual editor for Smaart target curves - drag control points or draw freehand over your own measurement, convert between TF and RTA, and save straight into Smaart's TargetCurves folder or export as an REW house curve.
>
> I built it because authoring curves by hand in a text file was the worst part of the job, and reshaping one for a different room meant starting over.
>
> Happy to send you a licence, no strings and no expectation of coverage. If it's useful to your students I'd rather they had it than not.
>
> Brad
> bskapps.com/targettrace

Keep it that short. No pitch, no ask, offer the licence outright.

---

## 3. The comment playbook

This is the channel that works and that admins never block. Ten minutes a day.

**Where:** the Dante, QLab, live sound and corporate AV Facebook groups you are already in, set to Following - All Posts so questions actually reach you.

**How:** answer the question properly first, in full, so the comment stands on its own with the link removed. Then one sentence on why you built the thing. Include a link where the group rules allow, because the name alone will not move today's number - it only shows up later as a brand search.

**Never:** paste the same comment twice, answer a question you cannot actually answer, or lead with the app.

### Ready patterns

**Someone cannot see a Dante device / suspects the network**

> What does your Mac say the interface is actually set to? Nine times out of ten it's a subnet mismatch or a second adapter grabbing a 169.254 address and winning the route. Worth checking link speed and duplex too - a gig NIC negotiated at 100 half will pass audio right up until it doesn't.
>
> I got tired of digging through System Settings for this so I built Quicker IP, which puts every adapter, its IP and its warnings in the menu bar, plus IGMP querier presence and PTP clock so you can see whether the switch is actually doing its job: bskapps.com/quickerip

**Someone asks about tuning to a target curve / flat vs house curve**

> Flat on the analyser is not flat to the ear - at show level you want a downward tilt and some low-end support, otherwise it reads thin and harsh. Most working curves are a 0.5 to 1 dB per octave tilt with a shelf below 100-200 Hz.
>
> I wrote up the reasoning here: bskapps.com/articles/smaart-target-curves/ - and there's a Mac app on that page if you'd rather draw the curve than hand-write the text file.

**Someone is prepping a QLab show / levels are all over the place**

> If you're setting levels cue by cue, measure integrated LUFS instead of eyeballing peaks - pick a target (-18 works for theatre, -23 for broadcast) and normalise everything to it, then your fades and your operator both behave predictably.
>
> I built Lab Assistant to do that across a whole workspace in one pass, along with mono routing and top-and-tail trimming: bskapps.com/labassistant

**Someone is building Companion or Stream Deck buttons**

> If you want them to look consistent, there's a free browser tool I made for exactly this - presets, 200,000+ icons, and it exports a whole Companion page or REAPER toolbar strip in one go. No signup: bskapps.com/buttonmaker

---

## 4. Post copy (your own page and permitted group posts)

Lead with the free tool. It is not read as promotion, it gets shared, and the site converts.

**Button Maker**

> Free browser tool for making Companion, Stream Deck and REAPER buttons. Pick a preset or start blank, 200,000+ icons, build a whole numbered set at once, export a Companion page or a REAPER toolbar strip. No signup, nothing to install, works on Mac or PC.
> bskapps.com/buttonmaker

**REAPER live recording template**

> Free REAPER template for live multitrack: patched to 128 inputs, virtual soundcheck ready, safe Stream Deck transport buttons, console track-name import and 1-to-1 autopatch. Windows, Mac and Linux.
> bskapps.com/tools/reaper/

**Companion modules**

> Two free open source Companion modules: full Spotify control, and Smaart control with live SPL readout.
> bskapps.com/tools/companion/

**Quicker IP update post** (this format already produced your best single day)

> Quicker IP 2.6 is out. New in this one: IGMP querier detection and PTP audio clock info so you can see whether the network is actually fit for Dante before the show, plus per-adapter error counters you can clear so only new faults show.
> Free Lite version on the App Store, full version at bskapps.com/quickerip

---

## 5. Video

The one asset that scales past the admin problem. Sixty to ninety seconds, screen recording, no voiceover needed, captions burned in. Nobody deletes a member for sharing a useful clip, and other people share it for you.

Priority order: Quicker IP (menu bar, IP switch, LAN scan), Target Trace (draw a curve, export to Smaart), Button Maker (blank to full set in 60 seconds).

---

## 6. What to measure

- **/admin Analytics** - per-page visits, per-product orders and conversion, Button Maker click-throughs. Read the Button Maker number as a rate, not a count: it was roughly 170 clicks from 1210 visits over 90 days, about 14%.
- **LemonSqueezy custom data** - every article and closer checkout link now carries `checkout[custom][src]`, so orders record which page produced them. Values look like `article-smaart-target-curves`, `guide-target-trace`, `product-page-closer`.
- **Search Console** - sort by impressions, not clicks. Anything ranking 5 to 15 with impressions is traffic already earned and not captured.

---

## 7. Listening - bring the questions to you

Three mechanisms, none of them paid. RSS does Reddit posts, F5Bot does Reddit comments, Google Alerts does the public forums. Manual reading covers what no keyword reaches.

Marketing spend on this is zero and stays zero until something here produces a sale.

### The RSS wall (Reddit posts) - do this one first

Every Reddit search has an RSS feed. Verified working 2026-08-05:

`https://www.reddit.com/search.rss?q=QUERY&sort=new&t=week`

Point them at NetNewsWire (free, Mac and iPhone, no account). This beats any keyword tool on the free tier because there are no slots, no daily caps, and Reddit's own search syntax gives real boolean and `subreddit:` scoping. It is also not email, so it never becomes an inbox to avoid.

URL-encode the query. Feeds to add:

- [ ] **Target Trace / Stimulus** - `subreddit:livesound (smaart OR "target curve" OR "house curve")`
- [ ] **Lab Assistant** - `(subreddit:livesound OR subreddit:techtheatre) qlab`
- [ ] **Quicker IP** - `(subreddit:livesound OR subreddit:CommercialAV OR subreddit:VIDEOENGINEERING) (igmp OR "dante controller" OR "static ip" OR ptp)`
- [ ] **Fetch Puppy** - `yt-dlp OR "youtube to mp3" OR "4k video downloader"`
- [ ] **Button Maker** - `subreddit:StreamDeck (icons OR "button design" OR bitfocus)`
- [ ] **Lab Assistant, the licence question** - `qlab (license OR licence OR "worth it" OR free)` - highest-intent feed in the wall. Unlicensed QLab users doing by hand what a licence automates are Lab Assistant's buyers: price-sensitive, already frustrated, and $14.99 against a QLab licence at multiples of that.
- [ ] **Brand watch** - `bskapps OR "quicker ip" OR "target trace" OR "fetch puppy"`

Two things to know. Reddit rate-limits bursts, so a normal reader interval is fine but do not hammer it. And the `subreddit:` scoping above is standard Reddit search syntax but was not verified live, because the test IP hit a 429 mid-check - confirm each feed returns hits when you add it.

### F5Bot (Reddit comments only)

Free tier is roughly five keywords, which is useless as general coverage. It has exactly one job here: **comments**. Reddit search indexes posts, not comments, and comments are where "what should I use for this" actually gets answered.

So use the free `no-posts` flag on every keyword and it becomes the comment layer with zero overlap against the RSS wall. Sign up at https://f5bot.com.

**Watch tool names, not topics.** In comments people do not describe a problem, they name the thing they are recommending - "level playing field" in a thread about setting levels. Every hit is someone being actively told what to use, in a thread where your app is the alternative. That is the whole value of the comment layer, and topic words waste it.

- [ ] `level playing field no-posts` - Lab Assistant's territory
- [ ] `downie no-posts` - the Mac downloader everyone recommends, Fetch Puppy's thread
- [ ] `yt-dlp no-posts` - same thread, other half
- [ ] `dante controller no-posts` - named constantly, and Quicker IP is usually what they needed
- [ ] `tracebook no-posts` - Nathan Lively's, the Target Trace audience. `subaligner` if the other proves quiet.

Add more QLab and Smaart tool names as they come up in threads - that list is worth more than any topic keyword and only comes from reading the rooms.

Matching is literal case-insensitive substring, sitewide, no wildcards or regex, with a daily alert cap per keyword. Good at nouns, useless at intents - nobody types "auto set levels" or "trim silence" as a phrase. That is also why bare "dante", "av", "companion", "elgato" and "level" are not here: one noisy word eats its own cap by mid-morning. `rew` needs the `whole` flag and is still not worth a slot.

If a comment thread ever turns into an actual sale, Silver at $9.99/month buys 20 slots and the queue is: `quickerip` and `quicker ip` (both spellings, substring matching will not join them), `fetch puppy`, `target trace`, `bskapps`, `dante controller`, `rational acoustics`, `audinate`, `ptp grandmaster`, `self-assigned ip`, `house curve`, `target curve`, `bitfocus`, `companion button`, `streamdeck icons`. Not before.

### Google Alerts (the public forums)

F5Bot cannot see vBulletin boards, which is every forum in section 1. Google Alerts can, because they are public and indexed. Slower - hours to days, and indexed pages only - but it reaches phrasings F5Bot's literal matching never will.

One alert per query at https://google.com/alerts:

- [ ] `site:forums.rationalacoustics.com (target curve OR house curve OR trace)`
- [ ] `site:forum.cockos.com (live recording OR multitrack template)`
- [ ] `site:community.audinate.com (igmp OR querier OR ptp OR "static ip")`
- [ ] `site:prosoundweb.com (smaart OR "target curve")`
- [ ] `site:controlbooth.com qlab`
- [ ] `bskapps OR "quicker ip" OR "target trace" OR "fetch puppy"` - unscoped brand watch outside Reddit

Both those forums run vBulletin, which will email on new posts if you subscribe to a subforum. Higher volume than an alert, but instant and complete. Worth it for Rational Acoustics.

### Manual, twice a week

The concept-shaped stuff no keyword reaches. Ten minutes on r/livesound and r/techtheatre, sorted new, beats any keyword list for "someone is describing a problem my app solves". Facebook groups are the same job and there is no tool for them at all - notifications set to All Posts on four or five groups is the only mechanism that works.
