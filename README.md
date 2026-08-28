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

When the trial elapses the router locks every `/app` route except billing, so
the workspace cannot be used until a plan is paid for. Nothing is deleted: the
lock screen says so, and access returns the moment a payment verifies.

Trial and subscription state lives in `src/stores/subscription.js`. It drives
the UI, but it is **not** a security boundary — a determined user can edit
browser storage. What actually prevents free access is that a valid
subscription record can only be produced by a server-verified payment. When a
real backend exists, read this state from the server on login.
