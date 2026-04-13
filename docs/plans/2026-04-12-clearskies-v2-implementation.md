# ClearSkies AQ v2 — Premier Revamp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform ClearSkies AQ from a functional community air quality app into a premium, satisfying-as-hell platform with buttery animations, instant data loading, immersive visualizations, and next-level features.

**Architecture:** Layered enhancement — backend speed fixes first (unblocks everything), then frontend design system overhaul, then page-by-page revamp, then new features. Each phase builds on the previous. Keep existing deployment stable.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Framer Motion (new) + Recharts + Leaflet + leaflet.heat (new) + FastAPI + Web Audio API + Canvas 2D

---

## Phase 1: Backend Speed & New Endpoints

### Task 1: Fix Sequential Sensor Fetching (THE big speed win)

**Problem:** `generate_sensors()` in server.py makes 4 sequential HTTP calls per sensor. With 10 sensors = 40 sequential calls. This is the primary bottleneck.

**Files:**
- Modify: `src/backend/server.py:258-336`

**Step 1: Rewrite `generate_sensors` to use async + gather**

Replace the synchronous `generate_sensors` with an async version that fetches all sensor supplementary data in parallel:

```python
async def fetch_sensor_fields(client: httpx.AsyncClient, sensor_id: str, fields: list, range_hours: int = 1) -> dict:
    """Fetch all fields for a single sensor in parallel."""
    timestamp_str = datetime.now().isoformat()
    results = {}

    async def fetch_field(field_name: str):
        url = f"https://www.simpleaq.org/api/getgraphdata?id={sensor_id}&field={field_name}&rangehours={range_hours}&time={timestamp_str}"
        try:
            resp = await client.get(url, timeout=httpx.Timeout(10.0, read=30.0))
            resp.raise_for_status()
            graph_data = resp.json().get("value", [])
            if graph_data and len(graph_data) > 0:
                return field_name, float(graph_data[-1])
            return field_name, 0.0
        except Exception as e:
            print(f"  Error fetching {field_name} for {sensor_id}: {e}")
            return field_name, 0.0

    tasks = [fetch_field(f) for f in fields]
    field_results = await asyncio.gather(*tasks)
    return {k: v for k, v in field_results}


async def generate_sensors_async(sensor_json: dict) -> List[Sensor]:
    """Generate sensor objects with all data fetched in parallel."""
    fields = ["pm2.5_ug_m3", "pressure_hPa", "temperature_C", "humidity_percent"]
    sensors = []

    async with httpx.AsyncClient() as client:
        # Fetch all sensors' fields in parallel
        async def process_sensor(sensor_id, sensor_data):
            try:
                field_values = await fetch_sensor_fields(client, sensor_id, fields)
                pm25 = field_values.get("pm2.5_ug_m3", float(sensor_data.get("value", 0)))
                return Sensor(
                    id=sensor_id,
                    name=sensor_data.get("name"),
                    location=Location(lat=float(sensor_data.get("latitude")), lng=float(sensor_data.get("longitude"))),
                    pm25=pm25,
                    temperature=field_values.get("temperature_C", 0),
                    humidity=field_values.get("humidity_percent", 0),
                    pressure=field_values.get("pressure_hPa", 0),
                    lastUpdated=datetime.now(),
                    aqi=calculate_aqi(pm25),
                    aqiCategory=get_aqi_category(pm25),
                )
            except Exception as e:
                print(f"Error processing sensor {sensor_data.get('name')}: {e}")
                return None

        results = await asyncio.gather(*[
            process_sensor(sid, sdata) for sid, sdata in sensor_json.items()
        ])
        sensors = [s for s in results if s is not None]

    return sensors
```

**Step 2: Update `refresh_data` to be async**

```python
async def refresh_data():
    global todaysPoints
    raw_data = fetch_pm25_data()
    sensors = await generate_sensors_async(raw_data)

    # ... rest of existing logic stays the same ...

    if sensors:
        default_sensor_id = sensors[0].id
        hourly = generate_24hour_data(datetime.now().isoformat(), "pm2.5_ug_m3", default_sensor_id)
    else:
        hourly = []

    stats = calculate_statistics(sensors)
    DATA["sensors"] = sensors
    DATA["hourly"] = hourly
    DATA["statistics"] = stats
    print("Data refreshed", datetime.now().isoformat())
```

**Step 3: Switch scheduler to AsyncIOScheduler**

Replace `BackgroundScheduler` with `AsyncIOScheduler` from APScheduler:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# At startup, use lifespan event:
@app.on_event("startup")
async def startup():
    await refresh_data()
    scheduler = AsyncIOScheduler()
    scheduler.add_job(refresh_data, 'interval', minutes=10)
    scheduler.start()
```

Remove the global `refresh_data()` call at module level (line 641) — this blocks startup. Move to the lifespan event.

**Step 4: Verify server starts and `/api/sensors` responds**

Run: `python src/backend/server.py`
Expected: Server starts, sensors load in ~3-5s instead of ~15-30s

**Step 5: Commit**

```bash
git add src/backend/server.py
git commit -m "perf: parallelize sensor data fetching with asyncio.gather"
```

---

### Task 2: Add In-Memory Cache + Stale-While-Revalidate

**Problem:** Historical data (7d/30d) is fetched fresh on every request — 30 seconds per request.

**Files:**
- Modify: `src/backend/server.py`

**Step 1: Add cache infrastructure**

```python
import time as time_module
from typing import Tuple

class DataCache:
    """Simple in-memory cache with TTL."""
    def __init__(self):
        self._store: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str, max_age: float = 300) -> Any:
        if key in self._store:
            data, timestamp = self._store[key]
            if time_module.time() - timestamp < max_age:
                return data
            # Return stale data (caller can refresh in background)
            return data
        return None

    def is_fresh(self, key: str, max_age: float = 300) -> bool:
        if key in self._store:
            _, timestamp = self._store[key]
            return time_module.time() - timestamp < max_age
        return False

    def set(self, key: str, data: Any):
        self._store[key] = (data, time_module.time())

cache = DataCache()
```

**Step 2: Cache historical data endpoint**

```python
@app.get("/api/historical")
async def get_historical(
    sensor_id: Optional[str] = Query(None),
    metric: Optional[str] = Query(None),
    time_range: Optional[str] = Query(None),
):
    if not sensor_id:
        if not DATA["sensors"]:
            return []
        sensor_id = DATA["sensors"][0].id
    if not metric:
        metric = "pm2.5"

    backend_field = DATA_VAL_DICT.get(metric)
    if backend_field is None:
        return []

    cache_key = f"historical:{sensor_id}:{backend_field}:{time_range}"

    # Return cached data immediately if available
    cached = cache.get(cache_key, max_age=600)  # 10 min TTL
    if cached is not None:
        # If stale, trigger background refresh
        if not cache.is_fresh(cache_key, max_age=600):
            asyncio.create_task(_refresh_historical(cache_key, sensor_id, backend_field, time_range))
        return cached

    # No cache — fetch and cache
    result = await generate_historical_data(sensor_id, backend_field, time_range)
    cache.set(cache_key, result)
    return result

async def _refresh_historical(cache_key, sensor_id, backend_field, time_range):
    try:
        result = await generate_historical_data(sensor_id, backend_field, time_range)
        cache.set(cache_key, result)
    except Exception as e:
        print(f"Background refresh failed for {cache_key}: {e}")
```

**Step 3: Add gzip compression**

```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)
```

**Step 4: Add /health endpoint**

```python
@app.get("/health")
def health():
    return {"status": "ok", "sensors": len(DATA["sensors"]), "timestamp": datetime.now().isoformat()}
```

**Step 5: Commit**

```bash
git add src/backend/server.py
git commit -m "perf: add in-memory cache, gzip compression, and health endpoint"
```

---

### Task 3: New Backend Endpoints

**Files:**
- Modify: `src/backend/server.py`

**Step 1: Add breathability score endpoint**

```python
@app.get("/api/breathability")
def get_breathability():
    if not DATA["sensors"]:
        return {"score": 0, "label": "No data", "description": "No sensors available"}

    avg_pm25 = sum(s.pm25 for s in DATA["sensors"]) / len(DATA["sensors"])
    avg_humidity = sum(s.humidity for s in DATA["sensors"]) / len(DATA["sensors"])
    avg_temp = sum(s.temperature for s in DATA["sensors"]) / len(DATA["sensors"])

    # Score 0-100: weighted combination
    # PM2.5 component (60% weight) — lower is better
    pm25_score = max(0, 100 - (avg_pm25 / 50) * 100)

    # Temperature comfort (20% weight) — 18-24C is ideal
    temp_ideal = 21
    temp_score = max(0, 100 - abs(avg_temp - temp_ideal) * 5)

    # Humidity comfort (20% weight) — 30-60% is ideal
    humidity_score = max(0, 100 - abs(avg_humidity - 45) * 2)

    score = round(pm25_score * 0.6 + temp_score * 0.2 + humidity_score * 0.2)
    score = max(0, min(100, score))

    if score >= 80: label, desc = "Excellent", "Perfect conditions for outdoor activities"
    elif score >= 60: label, desc = "Good", "Great day to be outside"
    elif score >= 40: label, desc = "Fair", "Consider limiting prolonged outdoor exertion"
    elif score >= 20: label, desc = "Poor", "Sensitive groups should stay indoors"
    else: label, desc = "Very Poor", "Everyone should limit outdoor exposure"

    return {"score": score, "label": label, "description": desc,
            "components": {"pm25": round(pm25_score), "temperature": round(temp_score), "humidity": round(humidity_score)}}
```

**Step 2: Add streak endpoint**

```python
@app.get("/api/streak")
async def get_streak():
    """Count consecutive days of Good air quality."""
    if not DATA["sensors"]:
        return {"days": 0, "active": False}

    sensor_id = DATA["sensors"][0].id
    try:
        history = await generate_historical_data(sensor_id, "pm2.5_ug_m3", "30d")
        cache_key = f"historical:{sensor_id}:pm2.5_ug_m3:30d"
        cache.set(cache_key, history)
    except:
        return {"days": 0, "active": False}

    streak = 0
    for day in reversed(history):
        pm25_val = day.get("pm2.5")
        if pm25_val is not None and pm25_val <= 12:
            streak += 1
        else:
            break

    return {"days": streak, "active": streak > 0}
```

**Step 3: Add compare endpoint**

```python
@app.get("/api/compare")
async def compare_sensors(
    sensors: str = Query(..., description="Comma-separated sensor IDs"),
    metric: str = Query("pm2.5"),
    time_range: str = Query("24h"),
):
    sensor_ids = [s.strip() for s in sensors.split(",")]
    backend_field = DATA_VAL_DICT.get(metric, "pm2.5_ug_m3")

    results = {}
    if time_range == "24h":
        for sid in sensor_ids:
            data = generate_24hour_data(datetime.now().isoformat(), backend_field, sid)
            sensor_name = next((s.name for s in DATA["sensors"] if s.id == sid), sid)
            results[sensor_name] = data
    else:
        tasks = [generate_historical_data(sid, backend_field, time_range) for sid in sensor_ids]
        fetched = await asyncio.gather(*tasks, return_exceptions=True)
        for sid, data in zip(sensor_ids, fetched):
            if isinstance(data, Exception):
                continue
            sensor_name = next((s.name for s in DATA["sensors"] if s.id == sid), sid)
            results[sensor_name] = data

    return results
```

**Step 4: Add export endpoint**

```python
from fastapi.responses import StreamingResponse
import csv
import io

@app.get("/api/export")
async def export_data(
    format: str = Query("csv"),
    sensor_id: Optional[str] = Query(None),
    time_range: str = Query("7d"),
):
    if not sensor_id and DATA["sensors"]:
        sensor_id = DATA["sensors"][0].id
    if not sensor_id:
        return {"error": "No sensors available"}

    data = await generate_historical_data(sensor_id, "pm2.5_ug_m3", time_range)

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["timestamp", "pm2.5"])
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=clearskies_{time_range}.csv"}
        )

    return data  # JSON by default
```

**Step 5: Add network health endpoint**

```python
@app.get("/api/network-health")
def get_network_health():
    if not DATA["sensors"]:
        return {"sensors": [], "overall_health": 0}

    now = datetime.now()
    sensor_health = []
    for s in DATA["sensors"]:
        last = s.lastUpdated
        minutes_ago = (now - last).total_seconds() / 60 if last else 999

        if minutes_ago < 30: status = "online"
        elif minutes_ago < 120: status = "delayed"
        else: status = "offline"

        # Data quality: check for zero/null readings
        quality = 100
        if s.pm25 == 0: quality -= 25
        if s.temperature == 0: quality -= 25
        if s.humidity == 0: quality -= 25
        if s.pressure == 0: quality -= 25

        sensor_health.append({
            "id": s.id, "name": s.name, "status": status,
            "minutes_since_update": round(minutes_ago),
            "data_quality": max(0, quality),
            "location": {"lat": s.location.lat, "lng": s.location.lng}
        })

    online = sum(1 for s in sensor_health if s["status"] == "online")
    overall = round((online / len(sensor_health)) * 100) if sensor_health else 0

    return {"sensors": sensor_health, "overall_health": overall, "total": len(sensor_health), "online": online}
```

**Step 6: Commit**

```bash
git add src/backend/server.py
git commit -m "feat: add breathability, streak, compare, export, and network health endpoints"
```

---

## Phase 2: Frontend Foundation

### Task 4: Install Dependencies & Create API Config

**Files:**
- Modify: `package.json`
- Create: `src/config/api.ts`
- Create: `src/hooks/useApi.ts`

**Step 1: Install framer-motion, date-fns, leaflet.heat**

```bash
npm install framer-motion date-fns leaflet.heat @types/leaflet.heat
```

**Step 2: Create centralized API config**

```typescript
// src/config/api.ts
const API_BASE = import.meta.env.VITE_API_URL || "https://clearairwave-obf5.onrender.com";

export const API = {
  sensors: `${API_BASE}/api/sensors`,
  hourly: `${API_BASE}/api/hourly`,
  historical: `${API_BASE}/api/historical`,
  statistics: `${API_BASE}/api/statistics`,
  refreshTable: `${API_BASE}/api/refreshtable`,
  counter: `${API_BASE}/api/counter`,
  breathability: `${API_BASE}/api/breathability`,
  streak: `${API_BASE}/api/streak`,
  compare: `${API_BASE}/api/compare`,
  export: `${API_BASE}/api/export`,
  networkHealth: `${API_BASE}/api/network-health`,
  health: `${API_BASE}/health`,
} as const;
```

**Step 3: Replace all hardcoded URLs across components**

Search for `https://clearairwave-obf5.onrender.com` in all `.tsx` files and replace with `API.<endpoint>` imports.

Files to update:
- `src/components/HeroSection.tsx`
- `src/components/AQSummary.tsx`
- `src/components/AQMap.tsx`
- `src/components/dashboard/DashboardPage.tsx`
- `src/components/dashboard/AQIChart.tsx`
- `src/components/dashboard/DataTable.tsx`
- `src/pages/Map.tsx`

**Step 4: Add .env entry for local dev**

Add to `.env`:
```
VITE_API_URL=http://localhost:3001
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: centralize API config, install framer-motion and date-fns"
```

---

### Task 5: Dark Mode + Theme Toggle

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Step 1: Enable dark mode toggle in Header**

Uncomment the dark mode toggle button in `Header.tsx:134-136`. Add the button to both desktop and mobile nav.

**Step 2: Add dark mode CSS for glass-card**

In `src/index.css`, update the glass-card utility:

```css
.glass-card {
  @apply bg-white/80 backdrop-blur-lg border border-white/20 shadow-glass transition-all duration-300;
}
.dark .glass-card {
  @apply bg-gray-900/80 border-gray-700/30;
}
```

**Step 3: Persist dark mode preference in localStorage**

Update Header's `toggleDarkMode`:
```typescript
const toggleDarkMode = () => {
  const next = !isDarkMode;
  setIsDarkMode(next);
  document.documentElement.classList.toggle('dark', next);
  localStorage.setItem('theme', next ? 'dark' : 'light');
};
```

On mount, read from localStorage instead of always removing dark.

**Step 4: Verify dark mode works across pages**

**Step 5: Commit**

```bash
git add src/components/Header.tsx src/index.css src/App.tsx
git commit -m "feat: working dark mode with localStorage persistence"
```

---

### Task 6: Framer Motion Page Transitions & Scroll Animations

**Files:**
- Create: `src/components/AnimatedPage.tsx`
- Create: `src/components/ScrollReveal.tsx`
- Modify: `src/App.tsx`

**Step 1: Create AnimatedPage wrapper**

```typescript
// src/components/AnimatedPage.tsx
import { motion } from 'framer-motion';

export const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);
```

**Step 2: Create ScrollReveal component**

```typescript
// src/components/ScrollReveal.tsx
import { motion } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const ScrollReveal = ({ children, delay = 0, className }: ScrollRevealProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);
```

**Step 3: Wrap pages with AnimatePresence in App.tsx**

```typescript
import { AnimatePresence } from 'framer-motion';
// Wrap <Routes> with AnimatePresence
```

**Step 4: Add ScrollReveal to Index page sections**

Wrap each major section in Index.tsx with `<ScrollReveal>`.

**Step 5: Commit**

```bash
git add src/components/AnimatedPage.tsx src/components/ScrollReveal.tsx src/App.tsx src/pages/Index.tsx
git commit -m "feat: add framer-motion page transitions and scroll reveal animations"
```

---

## Phase 3: Home Page Revamp

### Task 7: Particle Canvas Background

**Files:**
- Create: `src/components/ParticleCanvas.tsx`
- Modify: `src/components/HeroSection.tsx`

**Step 1: Create ParticleCanvas component**

Canvas 2D animated particles whose density/speed reflects current AQI. Green calm particles for good air, dense fast red particles for bad air. Rendered behind the hero content.

Key implementation:
- Use `useRef` for canvas element
- `requestAnimationFrame` loop
- Accept `aqi` prop (0-500)
- Particle count = 20 + (aqi * 0.3)
- Particle speed scales with AQI
- Color interpolates between green→yellow→orange→red based on AQI
- Semi-transparent, floating, gentle organic motion
- Clean up animation frame on unmount

**Step 2: Integrate into HeroSection**

Add `<ParticleCanvas aqi={avgAQI} />` as absolute-positioned background element behind hero content.

**Step 3: Verify visual effect with different AQI values**

**Step 4: Commit**

```bash
git add src/components/ParticleCanvas.tsx src/components/HeroSection.tsx
git commit -m "feat: add live particle canvas reflecting real-time AQI"
```

---

### Task 8: Revamp HeroSection with Breathability Score

**Files:**
- Modify: `src/components/HeroSection.tsx`
- Create: `src/components/BreathabilityGauge.tsx`
- Create: `src/components/AnimatedCounter.tsx`

**Step 1: Create AnimatedCounter**

Number that counts up from 0 to target value on scroll-into-view. Uses framer-motion `useSpring` and `useInView`.

```typescript
// src/components/AnimatedCounter.tsx
import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, motion } from 'framer-motion';

export const AnimatedCounter = ({ value, suffix = '', duration = 1 }: { value: number; suffix?: string; duration?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest) + suffix;
      }
    });
  }, [spring, suffix]);

  return <span ref={ref}>0{suffix}</span>;
};
```

**Step 2: Create BreathabilityGauge**

Radial/circular gauge showing 0-100 breathability score. Animated SVG arc that fills on mount. Color transitions from red→yellow→green.

**Step 3: Revamp HeroSection layout**

New layout:
- Left: heading, subtext, CTA buttons
- Right top: BreathabilityGauge (large, prominent)
- Right bottom: 4 stat cards with AnimatedCounter values
- Background: ParticleCanvas

Friendly copy: "87 — Great day for a run." / "Your air is cleaner than 73% of US cities"

**Step 4: Fetch breathability data from new endpoint**

**Step 5: Commit**

```bash
git add src/components/HeroSection.tsx src/components/BreathabilityGauge.tsx src/components/AnimatedCounter.tsx
git commit -m "feat: revamp hero with breathability gauge and animated counters"
```

---

### Task 9: Streak Counter + Best Time Timeline

**Files:**
- Create: `src/components/StreakCounter.tsx`
- Create: `src/components/BestTimeTimeline.tsx`
- Modify: `src/pages/Index.tsx`

**Step 1: Create StreakCounter**

Displays consecutive good air quality days with satisfying animation. If streak hits milestones (7, 14, 30), show confetti burst using canvas.

**Step 2: Create BestTimeTimeline**

Horizontal 24-hour strip showing green/yellow/red windows based on hourly AQI data. Fetches `/api/hourly` data and renders as colored segments.

**Step 3: Add both to Index page between hero and features section**

**Step 4: Commit**

```bash
git add src/components/StreakCounter.tsx src/components/BestTimeTimeline.tsx src/pages/Index.tsx
git commit -m "feat: add streak counter and best-time-to-go-outside timeline"
```

---

## Phase 4: Dashboard Revamp

### Task 10: AQI Radial Gauge

**Files:**
- Create: `src/components/dashboard/AQIGauge.tsx`
- Modify: `src/components/dashboard/DashboardPage.tsx`

**Step 1: Create animated radial AQI gauge**

SVG-based radial gauge with:
- Animated arc fill using framer-motion
- Color transitions matching AQI category
- Large center number with AnimatedCounter
- Category label below
- Subtle glow effect matching the AQI color

**Step 2: Add to DashboardPage top section**

Replace one of the stat cards or add as a prominent element above the chart section.

**Step 3: Commit**

```bash
git add src/components/dashboard/AQIGauge.tsx src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add animated radial AQI gauge to dashboard"
```

---

### Task 11: Lung Impact Visualizer

**Files:**
- Create: `src/components/dashboard/LungVisualizer.tsx`

**Step 1: Create lung SVG visualization**

Animated SVG lung that responds to current AQI:
- **Good (0-50):** Clean pink color, smooth breathing animation (scale 1.0→1.03), no particles
- **Moderate (51-100):** Slightly warmer color, a few floating particles inside
- **Unhealthy (101-200):** Orange/red tint, more particles, slight inflammation glow
- **Hazardous (300+):** Red/dark, dense particles, pulsing inflammation, particles accumulating

Implementation:
- SVG lung outline (simplified anatomical shape)
- Canvas overlay for animated particles inside the lung shape
- framer-motion for breathing animation
- Color interpolation based on AQI prop

**Step 2: Add to dashboard as a card**

**Step 3: Commit**

```bash
git add src/components/dashboard/LungVisualizer.tsx src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add lung impact visualizer responding to real-time AQI"
```

---

### Task 12: Molecular Breakdown Visualizer

**Files:**
- Create: `src/components/dashboard/MoleculeView.tsx`

**Step 1: Create animated molecule visualization**

Canvas-based visualization showing what you're breathing:
- Different molecule types: PM2.5 (gray dots), NO2 (brown), O3 (blue), SO2 (yellow)
- Each molecule type rendered at relative proportions to actual readings
- Molecules float/drift organically within a card boundary
- Labels showing actual values
- Tooltip on hover for each molecule type

Uses real sensor data to determine relative sizes/counts.

**Step 2: Add to dashboard**

**Step 3: Commit**

```bash
git add src/components/dashboard/MoleculeView.tsx src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add molecular breakdown visualizer"
```

---

### Task 13: Sensor Comparison Tool

**Files:**
- Create: `src/components/dashboard/SensorCompare.tsx`
- Modify: `src/components/dashboard/DashboardPage.tsx`

**Step 1: Create comparison component**

Multi-select dropdown to pick 2-3 sensors. Fetches data from `/api/compare` endpoint. Renders overlaid line charts with different colors per sensor. Uses existing Recharts setup.

**Step 2: Add to dashboard as a tab or section**

**Step 3: Commit**

```bash
git add src/components/dashboard/SensorCompare.tsx src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add multi-sensor comparison tool"
```

---

### Task 14: GitHub-Style Heatmap Calendar

**Files:**
- Create: `src/components/dashboard/HeatmapCalendar.tsx`

**Step 1: Create heatmap calendar component**

Grid of small squares (7 rows x ~52 cols for a year, or fewer for 30/90 days). Each square colored by daily average AQI using the standard AQI color scale. Tooltip on hover showing date + value.

Uses CSS grid or SVG. Fetches historical data for the selected sensor.

**Step 2: Add to dashboard below chart**

**Step 3: Commit**

```bash
git add src/components/dashboard/HeatmapCalendar.tsx src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add GitHub-style air quality heatmap calendar"
```

---

### Task 15: CSV/JSON Export

**Files:**
- Create: `src/components/dashboard/ExportButton.tsx`
- Modify: `src/components/dashboard/DashboardPage.tsx`

**Step 1: Create export button**

Dropdown button with CSV and JSON options. Calls `/api/export` endpoint with current sensor/time range selection. Triggers file download.

**Step 2: Add to dashboard toolbar**

**Step 3: Commit**

```bash
git add src/components/dashboard/ExportButton.tsx src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add CSV/JSON data export for researchers"
```

---

## Phase 5: Map Revamp

### Task 16: Heatmap Overlay + Layer Toggles

**Files:**
- Modify: `src/components/AQMap.tsx`

**Step 1: Add leaflet.heat heatmap layer**

```typescript
import 'leaflet.heat';

// Create heat layer from sensor data
const heatData = sensors.map(s => [s.location.lat, s.location.lng, s.pm25 / 50]);
const heatLayer = L.heatLayer(heatData, { radius: 40, blur: 30, maxZoom: 15 });
```

**Step 2: Add toggle buttons for heatmap/markers/satellite**

Floating button group in top-left: "Markers" | "Heatmap" | both
Tile layer toggle: Light | Dark | Satellite

**Step 3: Commit**

```bash
git add src/components/AQMap.tsx
git commit -m "feat: add heatmap overlay and layer toggles to map"
```

---

### Task 17: Map Timelapse Mode

**Files:**
- Create: `src/components/map/TimeSlider.tsx`
- Modify: `src/components/AQMap.tsx`

**Step 1: Create TimeSlider component**

Horizontal slider at bottom of map. Shows 24h/7d range. Scrubbing updates marker colors/positions to reflect historical data at that time point.

Uses framer-motion for smooth transitions. Play/pause button for auto-animation.

**Step 2: Fetch timelapse data**

Call `/api/hourly` for each sensor to get 24h history. Interpolate between time points as slider moves.

**Step 3: Add to map page**

**Step 4: Commit**

```bash
git add src/components/map/TimeSlider.tsx src/components/AQMap.tsx
git commit -m "feat: add timelapse mode with time slider to map"
```

---

## Phase 6: Next-Level Features

### Task 18: Air Quality Soundscape

**Files:**
- Create: `src/components/Soundscape.tsx`
- Create: `src/hooks/useSoundscape.ts`

**Step 1: Create Web Audio API-based soundscape**

Uses OscillatorNode and GainNode to generate ambient audio:
- **Good AQI:** Low-frequency gentle hum, birds-like high oscillation, calm
- **Moderate:** Slightly warmer tones, gentle wind
- **Unhealthy:** Industrial-ish lower frequencies, subtle tension
- **Hazardous:** Dissonant tones, rumble

All generated procedurally — no audio files needed. Toggle button with volume control.

**Step 2: Create floating toggle button**

Small speaker icon in bottom-right corner. Click to enable/disable. Volume slider on hover.

**Step 3: Add to App.tsx as global overlay**

**Step 4: Commit**

```bash
git add src/components/Soundscape.tsx src/hooks/useSoundscape.ts src/App.tsx
git commit -m "feat: add generative air quality soundscape using Web Audio API"
```

---

### Task 19: Sensor Network Health Dashboard

**Files:**
- Create: `src/pages/NetworkHealth.tsx`
- Modify: `src/App.tsx` (add route)
- Modify: `src/components/Header.tsx` (add nav link)

**Step 1: Create NetworkHealth page**

Fetches from `/api/network-health`. Displays:
- Overall network health % with large gauge
- Per-sensor status cards (online/delayed/offline)
- Data quality bars per sensor
- Coverage map (map with sensor locations + coverage radius circles)
- Uptime timeline per sensor

**Step 2: Add route and nav link**

**Step 3: Commit**

```bash
git add src/pages/NetworkHealth.tsx src/App.tsx src/components/Header.tsx
git commit -m "feat: add sensor network health dashboard page"
```

---

### Task 20: Polish Pass — Skeleton States + Micro-interactions

**Files:**
- Modify: All page components
- Modify: `src/index.css`

**Step 1: Add shimmer skeleton states to every loading state**

Replace all "Loading..." text with proper skeleton components that match the layout shape. Every card, chart, table gets a skeleton variant.

**Step 2: Add hover micro-interactions**

- Cards: subtle lift + shadow increase on hover (framer-motion whileHover)
- Buttons: satisfying spring press effect (scale: 0.97 on tap)
- Stat numbers: gentle pulse when value changes
- Navigation: smooth underline slide animation

**Step 3: Add smooth number transitions**

When data refreshes, numbers should animate from old value to new (not jump).

**Step 4: Final visual polish**

- Consistent border-radius
- Consistent spacing
- Gradient refinements
- Typography hierarchy check

**Step 5: Commit**

```bash
git add -A
git commit -m "polish: skeleton states, micro-interactions, and visual refinements"
```

---

## Execution Order Summary

| Phase | Tasks | Estimated Complexity |
|-------|-------|---------------------|
| 1: Backend Speed | Tasks 1-3 | High (most impactful) |
| 2: Frontend Foundation | Tasks 4-6 | Medium |
| 3: Home Page | Tasks 7-9 | Medium-High |
| 4: Dashboard | Tasks 10-15 | High |
| 5: Map | Tasks 16-17 | Medium |
| 6: Next-Level | Tasks 18-20 | Medium-High |

**Critical path:** Task 1 → Task 2 → Task 4 → everything else can run in parallel.

**Dependencies:**
- Tasks 4 must come before any frontend task (API config)
- Task 7 (particles) needed before Task 8 (hero revamp)
- Task 1-2 (backend speed) should come first to unblock historical data features
