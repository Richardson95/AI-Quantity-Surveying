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
├── stores/            # Pinia: auth, projects (mock data)
├── utils/             # format helpers (currency/number)
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

- All data is currently mocked in Pinia stores — ready to swap for a real API.
- Auth is a UI-only mock (`stores/auth.js`); no route guard is enforced yet.
- Charts use Chart.js via `vue-chartjs`.

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

1. The browser opens the Paystack popup with the **public** key.
2. Paystack returns a transaction reference.
3. The app calls `POST /api/paystack/verify`, which re-checks that reference
   against Paystack using the **secret** key and confirms the amount paid.
4. Only after that does the app unlock the plan, vendor contact or listing.

Step 3 is what makes this safe. The browser is never trusted to decide that a
payment succeeded, and the verifier fails closed if the secret key is missing.

### Free trial

Every account starts on a **14-day free trial**, no card required. A countdown
shows in the sidebar and, from the trial's start, as a banner above the page —
turning amber at 7 days and red at 3.

When the trial elapses, `TrialPaywall` covers the workspace with a modal the
user cannot dismiss — no close button, Escape is swallowed, backdrop clicks do
nothing, and page scrolling is locked. The dashboard stays visible behind it,
so the user can see their projects are still there. The only ways out are to
pay or to sign out. Access returns the moment a payment verifies.

Trial and subscription state lives in `src/stores/subscription.js`. It drives
the UI, but it is **not** a security boundary — a determined user can edit
browser storage. What actually prevents free access is that a valid
subscription record can only be produced by a server-verified payment. When a
real backend exists, read this state from the server on login.

## Drawing analysis

**There is no drawing analysis yet.** Uploaded files are stored, previewed and
downloaded for real, but nothing reads their contents — no OCR, no CAD parsing,
no geometry extraction. Quantities come from a template matched on the file
name and scaled by a hash of the name and size.

The app says so. Anything derived this way is badged **Template estimate**, the
drawing viewer reads *Not analyzed*, and per-item confidence is hidden, because
a confidence score on a figure nothing measured is a lie.

### Connecting the real engine

`src/services/analysis.js` is the only place the app talks to the engine. Set
`VITE_ANALYSIS_API_URL` and implement two endpoints; nothing else changes.

| Endpoint | Purpose |
| --- | --- |
| `POST /analyze` | One drawing in, detected elements and measurements out |
| `POST /boq` | Document ids in, priced BOQ lines out |

The full request and response shapes are documented at the top of
`src/services/analysis.js`. Two rules the engine must honour:

- **Units are canonical** — see `src/utils/units.js`. In-situ concrete is `m³`,
  formwork `m²`, reinforcement `tonne`, blockwork and finishes `m²`, pipes and
  cables `m`, fittings `no`, site clearance `m²`.
- **Confidence is 0–1**, and omitted where a quantity was not actually
  measured.

If the engine is configured but unreachable, the app falls back to template
figures, tells the user it has done so, and re-labels the output accordingly —
it never silently presents estimates as measurements.
