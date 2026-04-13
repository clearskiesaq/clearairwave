# ClearSkies AQ v2 — Premier Revamp Design

## Vision
Premium air quality platform: Apple-clean, Duolingo-friendly, Grafana-deep. The kind of app where people go "wait, this is for air quality?"

## Audience
Layered — community members get instant understanding, researchers get deep analytical tools.

## Constraints
- Keep Render deployment stable (optimize code only, no infra changes)
- Keep existing tech stack (React/Vite/FastAPI), enhance don't replace
- Must not break existing working deployment

---

## Backend Overhaul

### Speed Fixes (Priority #1)
- **30-day fetch is 30 seconds** — fix by:
  - Pre-aggregating historical data in memory on a schedule (not per-request)
  - Background refresh with stale-while-revalidate pattern
  - `asyncio.gather` for parallel sensor fetches (currently sequential)
  - In-memory cache with TTL for all endpoints
  - gzip compression middleware
- **Startup optimization:**
  - Serve cached/empty responses immediately, populate in background
  - `/health` endpoint for keep-alive pings
  - Structured startup logging

### New Endpoints
- `GET /api/forecast/{sensor_id}` — trend projection (rolling avg extrapolation)
- `GET /api/compare?sensors=id1,id2` — multi-sensor comparison data
- `GET /api/export?format=csv&range=7d` — CSV/JSON data export
- `GET /api/heatmap` — spatial aggregation for heatmap layer
- `GET /api/sensor/{id}/history` — full history for detail page
- `GET /api/timelapse?range=30d&interval=1h` — pre-aggregated timelapse frames
- `GET /api/network-health` — sensor uptime, data quality, coverage
- `GET /api/breathability` — combined breathability score
- `GET /api/streak` — consecutive good air quality days
- `GET /api/best-times` — best outdoor windows for next 24h

### Reliability
- Graceful degradation: serve stale cache if SimpleAQ is down
- Better timeout/retry handling
- Structured logging

---

## Frontend Revamp

### Design System
- Apple whitespace + Duolingo personality + Grafana depth
- Framer Motion for all transitions, scroll reveals, micro-interactions
- Dark/light mode toggle
- Skeleton shimmer loading states everywhere
- AQI color language consistent throughout
- Sound design: subtle optional audio feedback on interactions

### Home Page — "Breathe at a glance"
- **Live particle canvas** — WebGL particles whose density/speed reflects actual AQI
- Giant AQI readout: "42 — Good. Breathe easy today."
- **Breathability Score** — 0-100, combines all pollutants + weather
- **"Best time to go outside"** — 24h color-coded timeline strip
- **Live comparison** — "Your air is cleaner than 73% of US cities"
- **Streak counter** — "12 consecutive Good days" with confetti on milestones
- 4 animated stat cards (sensors live, avg AQI, cleanest area, data points)
- Scroll parallax into deeper sections

### Dashboard — Grafana meets Duolingo
- **Radial AQI gauge** — animated, color-shifting
- **"What you're breathing" molecular view** — animated molecules at relative proportions (PM2.5, NO2, O3, SO2 rendered as particles)
- **Lung impact visualizer** — animated lung that responds to current AQI (clean=pink/smooth, bad=particles accumulating, inflammation)
- **Multi-sensor comparison tool** — overlay 2-3 sensors
- **GitHub-style heatmap calendar** — 30/90/365 day history
- **Sparkline cards** for each metric
- **Interactive charts** with zoom/pan/brush time selection
- **Pollution hotspot ranking** with mini charts
- **CSV/JSON export** for researchers
- Polished sortable/filterable data table

### Map — Immersive
- **Heatmap overlay toggle** — interpolated AQI gradient
- **Timelapse mode** — scrub/animate through 24h/7d/30d, watch pollution patterns move like weather
- **Clustered markers** zoomed out, expand on zoom
- **Rich popups** with mini sparkline charts
- Layer toggles (satellite, terrain, dark basemap)
- Better geolocation with nearest sensor distance

### Sensor Network Health Dashboard (new page)
- Sensor uptime % bars
- Data quality scores per sensor
- Coverage gap visualization on map
- Last-seen timestamps
- Network-wide reliability metrics
- "Adopt a sensor" community engagement

### Air Quality Soundscape
- Generative ambient audio reflecting current conditions
- Clean air = calm nature sounds
- Degrading air = subtle industrial tones
- Toggle on/off, volume control
- Runs from Web Audio API, no heavy assets

### Additional Features
- **Shareable AQI cards** — generates image for social media
- **Dark mode** — full theme toggle
- **Skeleton loading states** — shimmer placeholders everywhere
- **Framer Motion** — page transitions, scroll reveals, staggered animations
- **Browser push notifications** — opt-in AQI degradation alerts

---

## Tech Additions
- framer-motion — animations
- date-fns — date formatting
- leaflet.heat — heatmap layer
- Web Audio API — soundscape (no new deps)
- Canvas/WebGL — particle visualization (no new deps)
- html-to-canvas or similar — shareable card generation

---

## What We're NOT Changing
- Vercel frontend deployment
- Render backend deployment
- Firebase/Firestore email subscriptions
- Pipedream webhook integrations
- SimpleAQ as data source
- Core React/Vite/FastAPI stack
