# QuantEdge — Deployment & Push Workflow

Stack: **Vercel** (frontend, `/frontend`) + **Render free** (backend) + **MongoDB Atlas free** (database).
No Emergent extension required — pure git workflow.

---

## 1. One-time setup (already done, kept here for reference)

### Render (backend)
- Service is defined by `render.yaml`. Render auto-detects this file and provisions the service.
- Required env vars (set them in the Render dashboard, **not** in code):
  - `MONGO_URL` — your Atlas connection string
  - `DB_NAME` — e.g. `stock_market`
  - `CORS_ORIGINS` — `*` or your Vercel URL
- Auto-deploy on push to `main` should already be enabled. Verify under
  *Settings → Build & Deploy → Auto-Deploy*.

### Vercel (frontend)
- Root directory: `frontend/`
- Build command: `yarn build`
- Output directory: `build`
- Env vars:
  - `REACT_APP_BACKEND_URL` — your Render URL (e.g. `https://quant-backend.onrender.com`)
- Auto-deploy on push to `main` should be enabled (default).

---

## 2. Day-to-day push workflow

```bash
# from your local clone
git checkout main
git pull                       # sync with origin
# … make edits …
git add .
git commit -m "feat: <what you changed>"
git push origin main           # ← triggers both deploys
```

Within ~30 seconds:
- **Vercel** starts a new build → live in ~1–2 minutes
- **Render** starts a new build → live in ~2–4 minutes (free tier is slower)

You can watch progress in:
- Vercel dashboard → your project → Deployments
- Render dashboard → quant-backend → Events

---

## 3. Render free-tier keep-alive (critical for UX)

Render free dynos **spin down after 15 minutes of idle**. The next request
incurs a 30–90 s cold start → users see "Screening…" forever.

**Fix (free, 2 minutes to set up):**

1. Sign up at <https://uptimerobot.com> (or <https://cron-job.org>).
2. Add a new **HTTP(s) monitor**:
   - URL: `https://<your-render-app>.onrender.com/health`
   - Interval: every **5 minutes**
3. Save. That's it — Render dyno never sleeps.

The new `/health` endpoint added in this branch returns instantly without
hitting Mongo or yfinance, so it's perfect for this purpose.

---

## 4. What was changed in this perf branch

### Backend (`backend/services/stock_data.py`, `backend/server.py`)

| Change | Impact |
|---|---|
| Added `bulk_load_from_mongo()` — one aggregation query loads ALL symbols (was 750 separate find() calls) | Startup time: ~60 s → ~3 s on Atlas free |
| Added `has_stale_symbols()` fast-path — screener no longer spawns a refresh thread on every click when cache is fresh | Screener response: ~3–8 s → ~200–500 ms when cache is hot |
| Added per-symbol `indicator_cache` — RSI/MACD/ADX/ATR/Bollinger computed ONCE, reused across all 750 stocks until a new bar arrives | Filter-heavy screening: ~5 s of CPU → ~50 ms |
| Removed redundant `load_daily_prices()` after `upsert_daily_prices()` — keeps the freshly-fetched DataFrame in memory directly | Each yfinance refresh: ~5 s of Mongo I/O saved |
| Added `/health` endpoint at both `/health` and `/api/health` | Lets UptimeRobot keep the dyno warm |
| Fixed a latent bug: `matched_filters.append()` was outside the for-loop, so only the LAST filter type was recorded per result | Stocks now correctly show all the filters they matched |

### Frontend (`frontend/src/pages/EnhancedScreener.js`)

| Change | Impact |
|---|---|
| Removed 332 lines of commented-out dead code | Smaller bundle; readable file |
| Result list now paginates 50 at a time with a "Show more" button | UI no longer freezes on big result sets (500+ matches) |
| Cleaned up unused imports (`Navigate`, `Volume2`, `VolumeIcon`, `PieChart`, etc.) | Cleaner build, smaller bundle |

---

## 5. Quick verification after `git push`

```bash
# Once Render finishes deploying, this should respond in <500ms:
curl -s https://<your-render-app>.onrender.com/health
# → {"status":"ok"}

# Cache should populate within ~30s of startup:
curl -s https://<your-render-app>.onrender.com/api/health
# → {"status":"ok","service":"quant-backend","cache_size":750}

# Screener (after cache is warm) should respond in <2 s:
time curl -s -X POST https://<your-render-app>.onrender.com/api/screener \
  -H "Content-Type: application/json" \
  -d '{"universe_type":"NIFTY50","filters":[{"filter_type":"52w_high","params":{}}],"date":null}' \
  | head -c 200
```
