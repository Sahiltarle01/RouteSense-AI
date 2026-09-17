# RouteSense AI — Version 2
**"Smarter Routes. Safer Deliveries. Better Access."**

## The real-world problem
The North Eastern Region (NER) of India has mountainous terrain, heavy
rainfall, floods, landslides, and connectivity limitations that delay or
prevent delivery of essential goods — medicines, food, emergency supplies,
and disaster relief materials. RouteSense AI's long-term goal is to help
logistics operators make safer, more reliable delivery decisions by
combining GIS, weather, terrain, incidents, and AI risk analysis.

**Version 2 does not implement that intelligence yet.** It builds the
product workspace those future capabilities will plug into: authenticated
trip management, a real dashboard, and a basic alert system. See the
roadmap below for what's implemented vs. simulated vs. planned.

## What Version 2 adds over Version 1
Version 1 was authentication-only. Version 2 adds:
- Professional authenticated app shell (sidebar + responsive mobile drawer)
- Dashboard with real, per-user, database-backed statistics
- Trip planning, trip listing, trip details, and validated status transitions
- Profile view/update (name, phone, optional password change)
- Basic alert system (clearly labeled demo/simulated data)

## Implemented vs. Simulated vs. Planned

| Capability | Status |
|---|---|
| Auth, JWT, protected routes | **Implemented** (inherited from Version 1) |
| Trip CRUD, ownership enforcement, status transitions | **Implemented**, backend-validated |
| Dashboard statistics | **Implemented** — computed from real trip records, never hardcoded |
| Origin/destination locations | **Implemented** as a fixed NER location list — not live geocoding |
| Journey summary on trip details | **Implemented** as a labeled schematic (origin → destination text), not a routed map |
| Alerts | **Simulated** — seeded demo data, `is_demo: true` on every alert, no live weather/incident feed |
| Real GIS routing, distance/ETA, risk scoring | **Planned** — Version 3 |
| Weather, terrain, incident-driven risk | **Planned** — Version 4 |
| GPS tracking, dynamic rerouting | **Planned** — Version 5 |

## Architecture
Same clean separation as Version 1, extended:
```
backend/app/
  models/   user.py, trip.py, alert.py
  schemas/  auth.py, trip.py, alert.py, profile.py, dashboard.py
  routers/  auth.py, trips.py, alerts.py, profile.py, dashboard.py
  services/ demo_alerts.py (seeding, clearly labeled simulated)
  utils/    security.py (JWT + bcrypt, unchanged from Version 1)

frontend/src/
  layouts/  AppShell.jsx (sidebar, responsive drawer)
  pages/    Dashboard, PlanTrip, MyTrips, TripDetails, Profile, Alerts
            (+ Landing, Register, Login carried over from Version 1)
  components/ StatusBadge, Badges (priority/severity), EmptyState, ProtectedRoute
  services/ trips.js, alerts.js, profile.js, dashboard.js (+ Version 1's api.js, auth.js)
```

## Tech stack
React + Vite + React Router + Axios + Leaflet (reserved for Version 3) ·
FastAPI + SQLAlchemy + Pydantic · SQLite (PostgreSQL-ready via `DATABASE_URL`) ·
JWT + passlib/bcrypt · pytest + Playwright

## One-Command Development & Testing

`Version 2/run-tests.ps1` is the single entry point for running Version 2 on Windows — no manual venv activation, `pip install`, `npm install`, `uvicorn`, `npm run dev`, `pytest`, or Playwright commands required.

```powershell
cd "path\to\RouteSense-AI-repo\Version 2"

# Full automated pipeline: environment check -> backend/frontend deps ->
# Playwright browsers -> backend pytest -> start both servers -> full
# Playwright suite -> cleanup -> PASS/FAIL report. Exit code 0 = all
# passed, non-zero = something failed.
powershell -ExecutionPolicy Bypass -File .\run-tests.ps1

# Development servers only: prepares both environments, starts backend +
# frontend, prints their URLs, and keeps them running until you press
# Ctrl+C -- no tests are run in this mode.
powershell -ExecutionPolicy Bypass -File .\run-tests.ps1 -StartOnly

# Removes safe-to-regenerate artifacts only: test-results/, the Playwright
# HTML report, and the backend pytest log. Source code, .env files,
# database files, and Version 1 are never touched. Add
# -IncludeDependencies to also remove node_modules and .venv (off by
# default -- conservative by design).
powershell -ExecutionPolicy Bypass -File .\run-tests.ps1 -Clean

# Validates tool availability and project structure (paths, venv python,
# test directories) without installing anything or starting servers.
powershell -ExecutionPolicy Bypass -File .\run-tests.ps1 -CheckOnly
```

Logs and the Playwright HTML report are written to `Version 2/test-results/`. The script never kills processes by executable name (no `taskkill /IM node.exe`-style commands) — it tracks the exact process IDs (and their child processes) it starts, and stops only those.

**Note:** the script polls `http://127.0.0.1:8000/api/health` for backend readiness — the actual endpoint defined in `app/main.py` (not `/health`, which doesn't exist in this codebase).

**Note on Overall PASS/FAIL:** the script tracks 8 explicit boolean flags (one per required phase) and only reports Overall PASS if every single one is `$true` — never inferred from "nothing failed yet". A crash mid-phase, pytest not running, or Playwright not running all correctly force Overall to FAIL, per a real bug found and fixed during Windows testing (see Known Limitations / Bug Fix History below for detail).



```bash
## Manual Setup (without the script)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload          # http://127.0.0.1:8000

# Frontend
cd frontend
npm install && npx playwright install
cp .env.example .env
npm run dev                             # http://localhost:5173
```

Version 2 uses its own `routesense.db` file (independent of Version 1's),
its own `.env`, and its own `node_modules` — the two versions share no
runtime state. Both default to ports 8000/5173, so don't run both backends
at once unless you change one's port.

## Environment variables
See `backend/.env.example` and `frontend/.env.example`. Notably:
- `CORS_ORIGINS` allows both `localhost` and `127.0.0.1` on port 5173, plus a regex fallback for any port on either loopback host — a real CORS/origin-mismatch bug was hit and fixed earlier in this project's development, so this is deliberately defensive.
- `JWT_SECRET_KEY` must be changed from the placeholder before any real deployment.

## API overview
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/dashboard/summary

POST   /api/trips
GET    /api/trips
GET    /api/trips/{id}
PUT    /api/trips/{id}/status
DELETE /api/trips/{id}

GET    /api/alerts
PUT    /api/alerts/{id}/read

GET    /api/profile
PUT    /api/profile
```
Every trip/profile/alert endpoint requires a valid JWT. Trip endpoints verify
ownership server-side (a trip belonging to another user returns 404, not
403 — this avoids confirming the trip's existence to someone who shouldn't
see it).

## Testing

**Recommended: use `run-tests.ps1`** (see above) — it runs both suites automatically with correct setup and produces a single PASS/FAIL report. The commands below are the manual equivalent if you'd rather run things by hand.

**Backend (pytest)** — 34 real automated tests: `test_auth.py` (12, carried over from Version 1), `test_trips.py` (9), `test_alerts.py` (3), `test_profile.py` (5), `test_timestamps.py` (5, regression coverage for the UTC timestamp bug fix).
```bash
cd backend && pytest -v
```

**Frontend (Playwright)** — 6 real automated tests currently exist and run: `trip-flow.spec.js` (5: dashboard load, full plan→view→status-update flow, dashboard stat update, profile update, logout/protection) + `multi-tab-auth.spec.js` (1: full A–O security-isolation scenario — independent identity across two tabs sharing the same browser context, trip ownership enforced both in the UI and via direct URL access, survival across reload, and logout isolation verified in both directions).

> **Known gap, found during Windows verification:** `auth-flow.spec.js` (registration validation, duplicate email, invalid password, unknown email, landing page — 5 tests) exists in **Version 1** but was never actually copied into Version 2's `e2e/` folder when V2 was first built. An earlier draft of this README claimed 11 Playwright tests for V2; the real, currently-running count is 6. If you'd like that coverage added to V2, say so explicitly — it's a deliberate omission to flag, not a silent fix, since it changes the expected test count.
```bash
cd frontend && npx playwright test    # requires both servers running
```

### EXECUTED TESTS
None — this project was built in a sandboxed environment with no network
access to install FastAPI/Vite/pytest/Playwright or run a live server, and
no PowerShell interpreter to run `run-tests.ps1` itself either. Every test
and the script above are real, written, working code — not a description
of intended behavior — but none of it has been executed by the assistant
that wrote it.

### NOT EXECUTED TESTS
All 34 backend tests, all 6 Playwright tests, and `run-tests.ps1` itself.
**Run the script yourself** and treat its printed report as the real
PASS/FAIL result — not this document.

### Verification actually performed (static, not a substitute for running tests)
- Every backend `.py` file compiled successfully (`py_compile`)
- Every `app.*` import resolves to a real file
- The trip status-transition matrix was extracted and tested standalone in pure Python — all 8 transition cases (valid and invalid) match the spec exactly
- The UTC timestamp serialization fix was extracted and run standalone, printing the old (buggy) vs. new (fixed) output side by side against the exact target format from the bug report
- Every frontend file's braces/parens/brackets are balanced
- Every relative import resolves to a real file
- Every default-import matches a real default-export (and vice versa)
- Every field name read in a frontend page (`trip.trip_name`, `a.is_demo`, etc.) was cross-checked character-for-character against the backend Pydantic schema that produces it
- Cargo type values in the Plan Trip dropdown were cross-checked against the backend `CargoType` enum values
- Confirmed zero remaining `localStorage` reads/writes anywhere in Version 2's frontend (multi-tab fix)
- `run-tests.ps1`: braces/parens/brackets balanced, every `Exit-OnFailure` call site verified to have a preceding `Set-Failure` call (so the final report always has a reason), function definition order checked, Push-Location/Pop-Location pairing checked on every code path including early-exit branches — but **not executed**, since no PowerShell interpreter is available in this environment either

## Known limitations
- `Base.metadata.create_all()` and demo-alert seeding touch the real `routesense.db` at import time even during test runs (tests still isolate correctly via dependency override — a minor side effect, not a correctness bug)
- No rate-limiting on login attempts
- No email verification/change workflow (email is read-only in Profile by design, not oversight)
- Alerts are global/shared, not per-user (matches the spec's Alert field list, which has no `user_id`)
- Origin/destination are free-standing location names, not coordinates — no map is rendered yet in Version 2
- "Remember me" no longer persists a session across a full browser/tab close — it now only controls JWT lifetime, not storage location. This is the deliberate trade-off for genuine per-tab session isolation (see Bug Fix History below); a persistent-yet-isolated session would need a different mechanism (e.g. a rotating refresh-token cookie)
- `run-tests.ps1`'s process-tree cleanup uses `Get-CimInstance Win32_Process`, which requires normal WMI access (available by default on standard Windows accounts, but may be restricted in locked-down/managed environments)
- The script's "are backend deps installed" check imports a handful of key packages (`fastapi`, `sqlalchemy`, `pydantic_settings`, `jose`, `passlib`, `bcrypt`, `pytest`), not literally every line of `requirements.txt` — a reasonable-but-not-exhaustive heuristic to avoid an unconditional pip run on every invocation
- `run-tests.ps1` has not been executed by the assistant that wrote it — no PowerShell interpreter was available in the build environment (see Testing section)

## Bug Fix History
- **Multi-tab session isolation**: fixed by moving all auth token/user storage from `localStorage` to `sessionStorage` (see `frontend/src/services/auth.js`, `api.js`) — sessionStorage is scoped per-tab, unlike localStorage which is shared across every tab of the same origin.
- **UTC timestamp display**: fixed by adding `app/utils/time.py`'s `serialize_utc()`, applied via a shared `UTCDateTime` Pydantic type on every `created_at`/`updated_at` field, plus a direct fix to the dashboard's raw dict-based timestamp path. Root cause was naive (tzinfo-less) `datetime.utcnow()` values serializing without a UTC marker, which browsers then misread as local time.
- **`run-tests.ps1` false-PASS crash** (found via a real Windows run): `$ErrorActionPreference = "Stop"` combined with PowerShell's `2>` redirect on a native command escalates that command's stderr into a script-terminating exception — even completely expected stderr, like the `ModuleNotFoundError` a fresh venv's Python correctly produces during the dependency check. That crash then exposed a second bug: `Overall` was computed as "no phase explicitly recorded FAIL", so a phase cut off mid-execution (recording nothing) was silently treated as passing. Fixed by routing every external command through a new `Invoke-ExternalCommand` helper (never escalates native stderr, captures full stdout/stderr/exit code) and by replacing the success calculation with 8 explicit boolean flags that are each set `$true` only at the exact point that phase genuinely succeeds.
- **`run-tests.ps1` runner log file-lock warning** (found via a real Windows run): `Start-Transcript` held `runner.log` open for the whole run while `Invoke-ExternalCommand` also tried to write to that same path for pip/npm/playwright-install output, causing repeated "file in use" warnings. Fixed by giving the transcript its own dedicated file (`runner-transcript.log`) and relying on `-EchoToConsole` (already captured by the transcript) for those three commands instead of a separate, conflicting log file.
- **Playwright strict-mode selector failures** (found via a real Windows run — 34/34 backend tests passed, 4/6 Playwright passed): two selectors matched more than one link by accessible name — `"My Trips"` also matched `"View My Trips"`, and `"Profile"` also matched `"Update Profile"` (Playwright's default name matching is substring-based). Fixed by adding `exact: true` to exactly those two selectors; every other `getByRole("link", ...)` call in the suite was individually cross-referenced against every actual link on its page and confirmed non-ambiguous, so no blanket `exact: true` was applied.
- **`multi-tab-auth.spec.js` invalid test assumption** (found via a real Windows run — 5/6 Playwright passed): the test asserted `tabA.reload()` would land on `/dashboard`, but by that point Tab A had already navigated to `/trips/{id}` to create a trip and never navigated back. Reload correctly preserves the current route in an SPA — verified directly against `ProtectedRoute.jsx`/`AuthContext.jsx`, neither of which contains (or should contain) logic to redirect an authenticated user away from a valid deep link. The bug was in the test's assumption, not the application. Rewritten to assert the real requirement (identity and data ownership survive reload, regardless of route) and expanded into a full A–O security-isolation scenario: trip ownership enforced in the UI, enforced via direct URL access (not just a missing link), survival across reload for both tabs, and logout isolation verified in both directions. Also hardened `uniqueEmail()` in both `trip-flow.spec.js` and `multi-tab-auth.spec.js` with a random component, since Playwright's default parallel-worker execution made pure `Date.now()` a real (if low-probability) collision risk.
- **`datetime.utcnow()` deprecation warnings** (found via a real Windows pytest run): Python 3.12 deprecates `datetime.utcnow()`. Fixed in `app/utils/time.py`'s `utc_now()` by switching to `datetime.now(timezone.utc).replace(tzinfo=None)` — directly verified byte-for-byte equivalent in value and naive-tzinfo contract to the old call (same downstream `serialize_utc()` behavior, zero database/migration impact), and directly confirmed the old call raises the warning while the new one doesn't.

## Roadmap
- **Version 3**: real GIS map, road network, route calculation, distance/ETA, accessibility
- **Version 4**: weather + terrain + incident data, AI/ML route risk prediction with explanation
- **Version 5**: GPS tracking, dynamic rerouting, real-time incidents, field reporting
- **Version 6+**: advanced ML, historical disaster intelligence, predictive alerts, offline-first, SMS/USSD, multilingual, analytics, government integrations
