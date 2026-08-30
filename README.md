# BuildQ AI — AI Quantity Surveying Platform

Frontend for an AI-powered quantity surveying & construction cost management SaaS.
Built with **Vue 3 (Composition API)**, **Vite**, **Tailwind CSS**, **Vue Router** and **Pinia**.

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview the build
```

## Project structure

```
src/
├── components/        # BrandLogo, StatCard, charts/ (Area/Bar/Doughnut)
├── layouts/           # MarketingLayout, AuthLayout, AppLayout (sidebar shell)
├── views/
│   ├── marketing/     # Home, Features, Pricing, Contact
│   ├── auth/          # Login, Signup, Reset
│   └── app/           # Dashboard, Projects, BOQ, Takeoff, Estimation,
│                      # Variations, PricingDb, Reports, Assistant, Team,
│                      # Billing, Settings
├── services/          # api.js (the one seam to the backend), analysis.js
├── stores/            # Pinia: auth, subscription, projects (+BOQ), documents,
│                      # takeoff, variations, rates, costs, vendors, team,
│                      # billing, reports, assistant, demo (seed data)
├── utils/             # format helpers (currency/number), units, takeoff
└── router/            # route definitions (marketing / auth / app)
```

## Design system

Brand tokens live in `tailwind.config.js` and reusable component classes
(`.btn-primary`, `.card`, `.input`, `.badge`, `.sidebar-link`, …) in `src/style.css`.

| Token | Hex |
| --- | --- |
| primary / light / dark | `#1CA5F6` / `#6DCBFB` / `#0D8FD9` |
| secondary / variant | `#1B2540` / `#2D3D63` |
| success / warning / danger | `#2DC875` / `#FFA726` / `#E63946` |

Fonts: **Sora** (display) + **Inter** (body). Fully responsive (mobile → desktop).

## Notes

- **Every store is wired to the API.** Set `VITE_API_URL` and projects, drawings,
  takeoff, BOQ, variations, rates, cost data, vendors, team, billing, reports and
  the assistant all read and write the server. Leave it unset and the app runs on
  its original in-memory demo data with no backend at all — each store keeps both
  paths, and `store.live` says which one is active.
- Auth is real (`stores/auth.js`): access token in memory, refresh token in an
  httpOnly cookie, route guard enforced, and the paywall driven by the server.
- Charts use Chart.js via `vue-chartjs`.

### Connecting it

```bash
cp .env.example .env            # VITE_API_URL=/api/buildq
npm run dev                     # Vite proxies /api to BUILDQ_API_TARGET
```

`BUILDQ_API_TARGET` (default `http://localhost:4000`) points the dev proxy at
wherever the BRG Prime service is running. Proxying keeps the app and the API
same-origin, which is what lets the refresh token stay in an httpOnly cookie
rather than localStorage, where any XSS could read it.

## Payments (Paystack)

All charges — subscriptions, vendor contact unlocks and the vendor listing fee —
go through Paystack.

### Keys

| Key | Where it goes | Notes |
| --- | --- | --- |
| `VITE_PAYSTACK_PUBLIC_KEY` | `.env` and Vercel env vars | `pk_test_…` / `pk_live_…`. Safe in the browser bundle. |
| `PAYSTACK_SECRET_KEY` | Vercel env vars **only** | `sk_test_…` / `sk_live_…`. Never prefix with `VITE_`, or Vite will ship it to the browser. |

Copy `.env.example` to `.env` for local development.

### How a payment works

With a backend connected, the **server** starts every charge:

1. The app asks the server to begin the transaction (`POST /billing/subscribe`,
   `POST /vendors/:id/unlock`, `POST /vendors`).
2. The server decides the amount, generates the reference, records the payment
   as pending against the organization, and returns an authorization URL.
3. The browser follows that URL to Paystack and comes back with the reference
   in the query string.
4. The app hands the reference to `POST /payments/verify`. The server re-checks
   it against Paystack with the **secret** key, confirms the amount covers what
   the product costs, and only then grants the plan, contact or listing.

The browser never picks the price and never decides that a payment succeeded.
A reference unlocks its product exactly once, and if the user closes the tab
before step 4, a reconciler settles the payment server-side anyway.

Without a backend the app falls back to the original browser-popup flow against
`POST /api/paystack/verify`, which is the demo path.

### Free trial

Every account starts on a **14-day free trial**, no card required. A countdown
shows in the sidebar and, from the trial's start, as a banner above the page —
turning amber at 7 days and red at 3.

When the trial elapses, `TrialPaywall` covers the workspace with a modal the
user cannot dismiss — no close button, Escape is swallowed, backdrop clicks do
nothing, and page scrolling is locked. The dashboard stays visible behind it,
so the user can see their projects are still there. The only ways out are to
pay or to sign out. Access returns the moment a payment verifies.

Trial and subscription state lives in `src/stores/subscription.js`, and with a
backend connected it is a **mirror of the server**, not a source of truth:
`/auth/me` fills it on every load and `hasAccess` returns exactly what the
server said. Editing browser storage no longer restores access — every business
endpoint returns 402 regardless of what the browser believes, which is what
closes the bypass this modal used to have.

## Drawing analysis

The engine is **real and lives in the backend**: Claude reads the uploaded PDF,
PNG, JPG or DXF and reports what is actually on the sheet. DWG, RVT and IFC are
stored and downloadable but reported as un-analysable, because there is no
converter for them — a template keyed off the file name is what made the same
drawing worth ₦54.1M or ₦8.5M depending on what it was called.

Every figure carries how it was obtained:

- **read** — off a dimension string, schedule row or annotated area
- **counted** — symbols counted on the sheet
- **derived** — computed from an assumption (a standard thickness, a typical
  storey height)

Only `read` and `counted` figures carry a confidence. A `derived` one has it
stripped, because a confidence score on a number nothing measured is a lie.

`src/services/analysis.js` is still the only place the app talks to the engine,
but it now goes through the ordinary authenticated API client rather than a
separate host — one backend, one base URL, one session. With no backend
configured it falls back to the local template stand-in, badges the result
**Template estimate**, and never presents an estimate as a measurement.

Two rules the engine honours, enforced on both sides:

- **Units are canonical** — see `src/utils/units.js`. In-situ concrete is `m³`,
  formwork `m²` (billed separately), reinforcement `tonne`, blockwork and
  finishes `m²`, pipes and cables `m`, fittings `no`, site clearance `m²`. A
  quantity returned in the wrong unit is flagged and dropped rather than billed.
- **Confidence is 0–1 on the engine endpoints** (`POST /analyze`, `POST /boq`)
  and 0–100 everywhere the app reads it, and is omitted where a quantity was not
  actually measured.

The engine needs `ANTHROPIC_API_KEY` set on the backend. Without it, analysis,
BOQ generation and the assistant all report themselves unavailable rather than
falling back to invented figures.
