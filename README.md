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
