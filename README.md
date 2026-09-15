# Global Market Intelligence — Next.js build

This is the real, live-data version of the dashboard: a Next.js app with
server-side API routes that call free public market-data APIs, a scoring
engine that turns those readings into the NIFTY/BTC mood scores, and pages
that poll those routes every 60 seconds. No fake numbers — every field
either shows a real, sourced value or an honest **DATA UNAVAILABLE** / **STALE**
label.

## What already works out of the box

| Data | Source | Needs a key? |
|---|---|---|
| NIFTY 50 price | Yahoo Finance | No |
| India VIX | Yahoo Finance | No |
| BTC price | Yahoo Finance | No |
| BTC funding rate & open interest | Binance (public) | No |
| US Dollar Index (DXY) | Yahoo Finance | No |
| US equity indices & VIX | Yahoo Finance | No |
| Crude oil (Brent & WTI) | Yahoo Finance | No |
| US Treasury yields (10Y/2Y) | FRED (official Fed data) | **Yes — free**, see step 3 |

## What shows as DATA UNAVAILABLE, and why

Three things don't have a free, terms-of-service-compliant API, so rather
than scrape a protected endpoint or guess, they're left honestly blank:

- **GIFT NIFTY** — no public feed; brokers quote it, NSE IX doesn't publish one.
- **NIFTY options chain / OI / PCR** — NSE's own feed is bot-protected.
- **India 10Y G-Sec yield** — no clean free JSON API.

Four more factors (Fed rate-hike odds, crypto news, BTC ETF flows,
liquidations, geopolitical events) need a news or paid-data API this build
doesn't include. Every one of these has a comment in `lib/nifty.ts` /
`lib/btc.ts` explaining exactly what to plug in. The standard next step for
the three NSE-specific gaps is a broker API — **Zerodha Kite Connect**,
**Upstox API**, or **Angel One SmartAPI** all offer GIFT NIFTY, live option
chains and (via NSE) Indian bond data once you register a free developer
app with them.

## Fastest way to see it live (no coding, no terminal)

1. **Create a free GitHub account** at github.com if you don't have one.
2. Create a new repository (the "+" button → "New repository"), any name,
   e.g. `market-intelligence`.
3. On the new repo's page, click **"uploading an existing file"** and drag
   in every file and folder from this project, keeping the folder structure
   (`app/`, `lib/`, `components/`, `package.json`, etc.). Commit.
4. Go to **vercel.com**, sign up with your GitHub account (free).
5. Click **"Add New" → "Project"**, pick the repo you just created, and
   click **Deploy**. Vercel detects it's a Next.js app automatically —
   you don't need to change any settings.
6. Once it finishes (about a minute), you'll get a live URL like
   `market-intelligence.vercel.app`. That's your app, live on the internet,
   auto-refreshing every 60 seconds.

### Adding the free FRED key (unlocks the bond-market factors)

1. Go to **fred.stlouisfed.org/docs/api/api_key.html** and request a free key
   (instant, just an email).
2. In your Vercel project, go to **Settings → Environment Variables**.
3. Add one: Name `FRED_API_KEY`, Value = the key you got. Save.
4. Go to **Deployments**, click the ⋯ menu on the latest one, **Redeploy**.

Without this key, the app still works — the bond-market factor just shows
DATA UNAVAILABLE instead of crashing anything else.

## Running it on your own computer (optional, for later)

Needs [Node.js](https://nodejs.org) installed (the free LTS version).

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste in your FRED_API_KEY
npm run dev
```

Then open `http://localhost:3000` in a browser. `npm run build` checks for
errors the same way Vercel will before it deploys.

## What to expect

- The Home tab shows a blended Global Mood score.
- NIFTY and BTC tabs show the live price, the mood score, and every factor
  behind it — tap a factor to expand its evidence, source and timestamp.
- A factor with a **STALE** badge has real data that's just too old to
  count toward the score (shown, not hidden, not faked).
- A factor with **DATA UNAVAILABLE** has no verified reading at all.

## If something breaks

- **Vercel build fails**: click into the failed deployment's log. The two
  most likely causes are a file that didn't upload correctly (compare
  against the folder list above) or a typo introduced while editing —
  paste the error into a fresh chat with Claude Code and it can fix it
  directly in the repo.
- **A page loads but every field says DATA UNAVAILABLE**: your Vercel
  server region may be blocked by one of the upstream providers (Binance
  blocks a few countries). Try adding a `regions` setting in
  `vercel.json` pinned to a region like `sin1` (Singapore) or `bom1`
  (Mumbai) — ask Claude Code to help wire this up if you want it done for you.
- **Bond factors always unavailable**: almost always a missing or
  mistyped `FRED_API_KEY` — recheck step 3 above.
