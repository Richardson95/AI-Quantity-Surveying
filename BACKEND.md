# BuildQ AI — System Specification

**Purpose of this document.** This is the complete description of the BuildQ AI
system as it exists today, written so that a backend and an analysis/AI engine
can be built against it. It covers the product, the visual design, every screen,
every data shape, every business rule, and the API surface the backend must
provide.

**Status of the current build.** Everything described under *Frontend* exists
and works. Everything under *Backend to be built* does not exist yet. Where the
frontend currently fakes something, this document says so explicitly and in
bold. Do not assume anything is real unless it says so.

**Repository:** `https://github.com/Richardson95/AI-Quantity-Surveying`
**Deployment:** Vercel (static SPA + serverless functions under `/api`)

---

## Table of contents

1. [What the product is](#1-what-the-product-is)
2. [Current architecture](#2-current-architecture)
3. [Technology stack](#3-technology-stack)
4. [Design system](#4-design-system)
5. [Route map](#5-route-map)
6. [Domain model](#6-domain-model)
7. [Screen-by-screen functionality](#7-screen-by-screen-functionality)
8. [Business rules](#8-business-rules)
9. [Measurement and units — critical](#9-measurement-and-units--critical)
10. [What is real and what is faked](#10-what-is-real-and-what-is-faked)
11. [Backend API to be built](#11-backend-api-to-be-built)
12. [The analysis / AI engine](#12-the-analysis--ai-engine)
13. [Database schema](#13-database-schema)
14. [Authentication and authorisation](#14-authentication-and-authorisation)
15. [Payments](#15-payments)
16. [Security requirements](#16-security-requirements)
17. [Migration from localStorage](#17-migration-from-localstorage)
18. [Environment variables](#18-environment-variables)
19. [Frontend file map](#19-frontend-file-map)
20. [Glossary](#20-glossary)

---

## 1. What the product is

BuildQ AI is a construction cost-intelligence platform for **quantity surveyors,
estimators and construction firms**, targeted at the Nigerian market (Naira,
Lagos/Abuja/Port Harcourt/Kano regional pricing, RICS and NIQS measurement
standards).

The core promise: **upload architectural and structural drawings, and get back a
priced, tender-ready Bill of Quantities.**

### The intended workflow

```
Create project
      ↓
Upload drawings (PDF / DWG / DXF / RVT / IFC / images)
      ↓
Analysis engine reads them  ──────────►  detected elements + measurements
      ↓                                        ↓
Quantity Takeoff                         (review / correct / add by hand)
      ↓
Generate Bill of Quantities  ──────────►  sectioned, priced line items
      ↓
Cost Estimation  ◄──── regional rates, vendor prices, own uploaded costs
      ↓
Variations (change orders)  ──────────►  cost impact on the account
      ↓
Reports & export (PDF / XLSX / CSV / DOCX)
```

Supporting features: a **vendor marketplace** (pay to unlock supplier contacts,
suppliers pay to list), a **pricing database** of material/labour/equipment
rates, **team management** with roles, an **AI assistant**, and
**subscription billing** after a 14-day trial.

### Who uses it

| Role | What they do |
| --- | --- |
| Company Admin | Manage users, projects, workflows, reports, billing |
| Quantity Surveyor | Generate BOQs, edit quantities, upload drawings |
| Project Manager | Review budgets, approve variations, monitor progress |
| Client Viewer | View approved documents, reports and variations only |
| Vendor | Not a workspace role — a supplier who pays to list products |

---

## 2. Current architecture

### Today

```
Browser (Vue 3 SPA, static)
   │
   ├── all state in Pinia stores, persisted to localStorage
   ├── no server, no database, no real authentication
   │
   └── /api/paystack/verify   ← the ONLY server code that exists
                                (Vercel serverless function)
```

There is **no backend**. Every store reads and writes `localStorage`. Clearing
site data wipes everything. Two browsers on the same account share nothing.

### Target

```
Browser (Vue 3 SPA)
   │
   ├── REST API (auth, projects, documents, BOQ, estimates, vendors, billing)
   │        │
   │        ├── PostgreSQL          (relational data)
   │        ├── Object storage      (drawings, exports)
   │        └── Job queue           (analysis is slow — must be async)
   │
   ├── Analysis engine   (PDF/CAD/BIM parsing, OCR, geometry recognition)
   └── Paystack          (payments; verification stays server-side)
```

The frontend already has a **single seam** for the analysis engine
(`src/services/analysis.js`). Nothing else in the app talks to it.

---

## 3. Technology stack

### Frontend (existing)

| Package | Version | Role |
| --- | --- | --- |
| `vue` | ^3.5.34 | Framework, Composition API, `<script setup>` |
| `vue-router` | ^4.6.4 | Routing, `createWebHistory` |
| `pinia` | ^3.0.4 | State management |
| `tailwindcss` | ^3.4.19 | Styling, utility-first |
| `chart.js` + `vue-chartjs` | ^4.5.1 / ^5.3.3 | Charts |
| `lucide-vue-next` | ^1.0.0 | Icons |
| `vite` | ^8.0.12 | Build tool |

Build: `npm run dev` (dev), `npm run build` (production → `dist/`),
`npm run preview`.

`vercel.json` rewrites all paths to `/index.html` for SPA client-side routing.

### Backend (to be chosen)

Not yet decided. Requirements that constrain the choice:

- Must handle **long-running document analysis** (async jobs, not request/response)
- Must parse **PDF, DWG, DXF, RVT, IFC** — Python has the richest ecosystem
  (`ezdxf`, `ifcopenshell`, `pdfplumber`, `PyMuPDF`), and ML tooling lives there
- Must integrate Paystack (simple REST)
- Suggested: **Python (FastAPI)** for the analysis service, with either the same
  or a separate service for CRUD. PostgreSQL. Redis + Celery/RQ for jobs. S3 or
  Cloudflare R2 for files.

---

## 4. Design system

All tokens are defined in `tailwind.config.js`. Reuse these exactly for any
server-rendered output, PDF exports or emails so branding stays consistent.

### Colours

| Token | Hex | Used for |
| --- | --- | --- |
| `primary` | `#1CA5F6` | Primary actions, links, active nav, brand accent |
| `primary-light` | `#6DCBFB` | Accents on dark backgrounds, progress fills |
| `primary-dark` | `#0D8FD9` | Gradient end, badge text on light primary tints |
| `secondary` | `#1B2540` | Body text, dark panels, navy gradient start |
| `secondary-variant` | `#2D3D63` | Navy gradient end, grid lines on blueprints |
| `brand-bg` | `#F4F7FF` | App page background |
| `brand-border` | `#DDE3F0` | Input borders, dividers |
| `brand-border-light` | `#EEF2FA` | Card borders, table row dividers |
| `brand-muted` | `#5E6A8A` | Secondary text |
| `brand-light` | `#9AA3BB` | Tertiary text, placeholders, icons at rest |
| `success` | `#2DC875` | Paid, approved, operational, savings |
| `warning` | `#FFA726` | Pending, trial nearing end, degraded |
| `danger` | `#E63946` | Errors, rejected, cost increases, destructive |

**Semantic use of success/danger in a QS context:** a cost **increase** is
`danger` (red) and a cost **saving/omission** is `success` (green). This is
inverted from finance dashboards — get it right in reports.

### Typography

| Family | Stack | Used for |
| --- | --- | --- |
| `font-sans` | Inter, system-ui, -apple-system, sans-serif | Body, tables, forms |
| `font-display` | Sora, Inter, system-ui, sans-serif | Headings, figures, brand |

### Elevation, radius, gradients

```
shadow-card        0 4px 24px rgba(27,37,64,0.08)
shadow-card-hover  0 8px 32px rgba(27,37,64,0.14)

rounded-xl         0.875rem
rounded-2xl        1.25rem

bg-brand-gradient  linear-gradient(135deg, #1CA5F6 0%, #0D8FD9 100%)
bg-navy-gradient   linear-gradient(135deg, #1B2540 0%, #2D3D63 100%)
bg-hero-glow       radial-gradient(circle at 30% 20%, rgba(28,165,246,0.18), transparent 55%)
```

### Animations

`fade-up` (0.6s ease-out), `float` (6s infinite), `shimmer` (2s linear infinite).

### Component classes (`src/style.css`)

`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`,
`.btn-sm`, `.btn-md`, `.btn-lg`, `.card`, `.input`, `.label`, `.badge`,
`.chip`, `.sidebar-link`, `.sidebar-link-active`, `.section`,
`.text-gradient`, `.glass`, `.no-scrollbar`.

### Status colour mapping

| Domain | Value | Colour |
| --- | --- | --- |
| Project status | In Progress | `primary` tint |
| | Tender | `warning` tint |
| | Completed | `success` tint |
| | On Hold | `brand-border` / muted |
| Variation status | Approved | `success` |
| | Pending | `warning` |
| | Rejected | `danger` |
| Team status | Active | `success` |
| | Invited | `warning` |
| Document kind | Drawing (PDF) | `danger` tint |
| | CAD (DWG/DXF) | `primary` tint |
| | BIM (RVT/IFC) | `secondary` tint |
| | Image | `warning` tint |
| | Spreadsheet | `success` tint |
| | Document | `primary-light` tint |

### Currency and number formatting

- Currency is **Naira (₦)** throughout. Locale `en-NG`.
- `formatFull(v)` → `₦1,234,567` (full precision, used in tables and totals)
- `formatMoney(v)` → `₦1.2M` / `₦185.0M` / `₦4.20B` (compact, used on cards)
  - ≥1e9 → `B` with 2dp; ≥1e6 → `M` with 1dp; ≥1e3 → `K` with 0dp
- `null`/`undefined` renders as `—`, never `₦0` or `NaN`.
- Paystack amounts are in **kobo** (naira × 100).

---

## 5. Route map

`createWebHistory`. Scroll behaviour: restore saved position, else scroll to
`to.hash` smoothly, else top.

### Marketing (layout: `MarketingLayout`, public)

| Path | Name | View |
| --- | --- | --- |
| `/` | `home` | HomeView |
| `/features` | `features` | FeaturesView (sections have anchor ids) |
| `/pricing` | `pricing` | PricingView |
| `/contact` | `contact` | ContactView |
| `/about` `/careers` `/blog` `/press` | slug | InfoView (content-driven) |
| `/docs` `/api` `/support` `/status` | slug | InfoView |
| `/privacy` `/terms` | slug | InfoView |

The ten InfoView pages are driven by `src/content/pages.js`, keyed by
`route.meta.page`. Block types: `text`, `bullets`, `cards`, `rows`, `status`.

### Auth (layout: `AuthLayout`, `meta.guestOnly`)

| Path | Name |
| --- | --- |
| `/auth/login` | `login` |
| `/auth/signup` | `signup` |
| `/auth/reset` | `reset` |

Signed-in users hitting these are redirected to `dashboard`.

### Workspace (layout: `AppLayout`, `meta.requiresAuth`)

| Path | Name |
| --- | --- |
| `/app` | → redirect to `dashboard` |
| `/app/dashboard` | `dashboard` |
| `/app/projects` | `projects` |
| `/app/projects/:id` | `project-detail` |
| `/app/boq` | `boq` |
| `/app/takeoff` | `takeoff` |
| `/app/estimation` | `estimation` |
| `/app/variations` | `variations` |
| `/app/pricing-db` | `pricing-db` |
| `/app/vendors` | `vendors` |
| `/app/reports` | `reports` |
| `/app/assistant` | `assistant` |
| `/app/team` | `team` |
| `/app/billing` | `billing` |
| `/app/settings` | `settings` |

`/:pathMatch(.*)*` → `not-found`.

### Navigation guard

```
requiresAuth && !isAuthenticated  → /auth/login?redirect=<fullPath>
guestOnly    &&  isAuthenticated  → /app/dashboard
requiresAuth                      → subscription.refresh()  (recompute trial)
```

The trial paywall is **not** a redirect — see §8.

### Sidebar structure

```
Workspace     Dashboard · Projects
Estimating    BOQ Workspace · Quantity Takeoff · Cost Estimation ·
              Variations · Pricing Database
Marketplace   Vendors
Intelligence  AI Assistant · Reports
Organization  Team · Billing · Settings
```

---

## 6. Domain model

Field names below are exactly those the frontend uses. Keep them, or provide a
mapping layer.

### User

```jsonc
{
  "name":    "Dammie Adetunji",
  "email":   "adetunjidammie2@gmail.com",
  "role":    "Quantity Surveyor",     // free text; distinct from team role
  "company": "Adetunji & Associates",
  "phone":   "+234 801 234 5678",
  "avatar":  "DA",                    // derived initials, 2 chars
  "photo":   "data:image/...",        // optional; base64 today, URL in future
  "plan":    "Professional"
}
```

`avatar` is derived from `name`: first letter of first word + first letter of
last word, uppercased; single word → first two letters; empty → `??`.

### Project

```jsonc
{
  "id":       "PRJ-1042",            // PRJ- + 4 digits
  "name":     "Lekki 4-Bedroom Duplex",
  "client":   "Oceanview Developments",
  "location": "Lekki, Lagos",
  "type":     "Residential",         // Residential|Commercial|Industrial|Renovation|Infrastructure
  "status":   "In Progress",         // In Progress|Tender|Completed|On Hold
  "progress": 68,                    // integer 0-100
  "budget":   185000000,             // naira, integer
  "spent":    121300000,
  "currency": "₦",
  "updated":  "2 hours ago",         // display string today; use ISO + format client-side
  "team":     ["DA", "KO", "TJ"],    // initials today; use user ids
  "cover":    "from-primary to-primary-dark"  // tailwind gradient classes
}
```

Cover gradients in use: `from-primary to-primary-dark`,
`from-secondary to-secondary-variant`, `from-success to-primary`,
`from-warning to-danger`, `from-primary-light to-primary`.

### BOQ item

```jsonc
{
  "id":         1,                   // unique within project
  "code":       "A1.1",              // section letter + group.item
  "desc":       "Reinforced concrete (1:2:4) in foundation bases",
  "unit":       "m³",                // canonical — see §9
  "qty":        142,
  "rate":       78000,               // naira per unit
  "section":    "Substructure",
  "confidence": 92,                  // 0-100, or null when not measured
  "sources":    ["Foundation Layout.dwg"]
}
```

Amount is always computed as `qty × rate`; never stored.

**Sections, in bill order, with code letters:**

| Letter | Section |
| --- | --- |
| A | Substructure |
| B | Superstructure |
| C | Roofing |
| D | Finishes |
| E | Doors & Windows |
| F | Services |
| G | External Works |

Code format: `{letter}{ceil(n/3)}.{((n-1) % 3) + 1}` where `n` is the item's
ordinal within its section — i.e. A1.1, A1.2, A1.3, A2.1, A2.2 …

### Document

```jsonc
{
  "id":         "DOC-XXXXX",
  "name":       "Ground Floor Plan.pdf",
  "ext":        "pdf",
  "kind":       "Drawing",           // Drawing|CAD|BIM|Image|Spreadsheet|Document|File
  "size":       820000,              // bytes
  "sizeLabel":  "800 KB",
  "mime":       "application/pdf",
  "scope":      "PRJ-1042",          // project id, or "library"
  "uploadedBy": "You",
  "uploadedAt": "2026-08-28T09:15:00.000Z",
  "status":     "Ready",             // Analyzing|Ready
  "elements":   14,                  // FAKE today — see §10
  "dataUrl":    "data:application/pdf;base64,..."   // browser-only, temporary
}
```

**Extension → kind mapping:**

| Kind | Extensions |
| --- | --- |
| Drawing | pdf |
| CAD | dwg, dxf |
| BIM | rvt, ifc |
| Image | png, jpg, jpeg |
| Spreadsheet | xlsx, xls, csv |
| Document | docx, doc |

Accepted upload types (`ACCEPTED_TYPES`):
`.pdf,.dwg,.dxf,.rvt,.ifc,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx,.doc`
Max file size (`MAX_FILE_MB`): **25 MB**.

Only `Drawing|CAD|BIM|Image` count as drawings for analysis and BOQ generation.

### Measurement (takeoff)

```jsonc
{
  "id":      6,
  "name":    "Ground floor slab",
  "type":    "Area",                 // Linear|Area|Volume|Count
  "value":   "186.4 m²",             // display string
  "numeric": 186.4,
  "color":   "#1CA5F6",
  "auto":    true,                   // detected vs entered by hand
  "source":  "Ground Floor Plan.pdf"
}
```

Type → unit and colour:

| Type | Unit | Colour |
| --- | --- | --- |
| Linear | `m` | `#2DC875` |
| Area | `m²` | `#1CA5F6` |
| Volume | `m³` | `#FFA726` |
| Count | `no` | `#E63946` |

### Variation (change order)

```jsonc
{
  "id":     "VO-015",                // VO- + 3 digits, zero-padded
  "title":  "Upgrade kitchen finishes to imported tiles",
  "rev":    "Rev B → Rev C",
  "impact": 4200000,                 // naira; NEGATIVE for an omission
  "status": "Pending",               // Pending|Approved|Rejected
  "date":   "Jun 9",
  "by":     "TJ"                     // author initials
}
```

Net approved impact = sum of `impact` where `status === "Approved"`.

### Vendor

```jsonc
{
  "id":          "VND-001",          // seeded; user listings are VND-Unnn-XXXX
  "name":        "StoneCoat Roofing Ltd",
  "category":    "roofing",          // slug, see below
  "location":    "Ikeja, Lagos",
  "phone":       "+234 803 412 7785",
  "email":       "sales@stonecoat.ng",
  "whatsapp":    "+234 803 412 7785",
  "rating":      4.8,                // 0 for new listings
  "reviews":     214,                // 0 for new listings
  "years":       12,
  "verified":    true,               // false for new listings
  "unlockPrice": 1000,               // naira a buyer pays to reveal contacts
  "products":    [ { "name": "...", "unit": "m²", "price": 6800 } ],

  // present only on user-created listings
  "owned":       true,
  "status":      "Pending review",
  "description": "...",
  "createdAt":   "2026-08-28T...",
  "listingFee":  1000,
  "feePaidAt":   "2026-08-28T...",
  "receiptId":   "LISTING-XXXX-YYYY"  // Paystack reference
}
```

**10 categories**, 51 seeded vendors:

| Slug | Name |
| --- | --- |
| `roofing` | Roofing Sheets |
| `cement` | Cement & Binders |
| `blocks` | Blocks & Bricks |
| `carpentry` | Carpentry & Timber |
| `steel` | Steel & Reinforcement |
| `tiles` | Tiles & Flooring |
| `plumbing` | Plumbing & Fittings |
| `electrical` | Electrical & Fittings |
| `paint` | Paints & Finishes |
| `aggregates` | Sand & Aggregates |

Each category has `tagline`, a lucide `icon` name, and an `accent` gradient.

### Saved vendor price

```jsonc
{
  "id":       "VND-001:Stone-coated step tile (Milano)",  // vendorId + ":" + product name
  "vendor":   "StoneCoat Roofing Ltd",
  "item":     "Stone-coated step tile (Milano)",
  "unit":     "m²",
  "rate":     6800,
  "category": "roofing",
  "savedAt":  "2026-08-28T..."
}
```

### Rate (pricing database)

```jsonc
{
  "id":     1,
  "name":   "Portland Cement (50kg bag)",
  "cat":    "Materials",             // Materials|Labour|Equipment
  "unit":   "bag",
  "rate":   9500,
  "change": 4.2,                     // % movement over 30 days; 0 = no data
  "region": "Lagos"                  // Lagos|Abuja|Port Harcourt|Kano
}
```

### Cost line (user-uploaded cost data)

```jsonc
{
  "id":         "CST-XXXXX",
  "item":       "Reinforced concrete (1:2:4) in foundation bases",
  "unit":       "m³",
  "rate":       78000,
  "qty":        142,                 // 0 when the file had no quantity column
  "section":    "Substructure",      // "" when not supplied
  "source":     "subcontractor-quote.csv",
  "uploadedAt": "2026-08-28T..."
}
```

### Subscription

```jsonc
{
  "status":           "trialing",    // trialing|active|expired
  "plan":             "Professional",
  "trialStartedAt":   "2026-08-14T...",
  "currentPeriodEnd": "2026-09-28T...",
  "payments": [
    { "id": "SUB-XXXX", "plan": "Professional", "amount": 54000,
      "paidAt": "2026-08-28T...", "periodEnd": "2026-09-28T..." }
  ]
}
```

### Team member

```jsonc
{
  "name":   "Kemi Olu",
  "email":  "kemi@adetunji.co",
  "role":   "Quantity Surveyor",     // one of the four roles
  "avatar": "KO",
  "status": "Active",                // Active|Invited
  "online": true
}
```

---

## 7. Screen-by-screen functionality

### Dashboard (`/app/dashboard`)

- Greeting using the user's first name.
- Four stat cards: Active Projects (derived), Total Portfolio Value (sum of
  budgets), BOQs Generated (**static 146**), AI Credits Used (**static 1,240**).
- Cost Performance area chart: estimated vs actual, 6 months (**static data**).
- Cost Breakdown doughnut by element (**static**).
- Recent Projects list (first 4, links to detail).
- Activity feed (**static**, 5 entries, types: `edit|ai|approve|upload|comment`).
- CTA banner to the AI Assistant.

**Backend must supply:** real counts, real monthly cost series, real activity
events.

### Projects (`/app/projects`)

- Search by name or client; filter by status; grid/list toggle.
- **New Project** modal: name (required), client (required), location, type,
  budget. Creates `PRJ-` + random 4 digits, then navigates to detail.
- Empty state offers project creation.

### Project Detail (`/app/projects/:id`)

- **Unknown id shows a not-found state**, never a different project.
- Header: name, status badge, client, location, updated; Open BOQ; Export.
- Four stat cards: Budget, Spent, Remaining, Completion.
- Cumulative spend chart (**static series**).
- Project team list.
- Quick actions: variations, reports.
- **Documents**: always-visible dropzone with uploaded documents listed directly
  beneath it, plus a "Sample project files" block (**static, 4 rows**).

### BOQ Workspace (`/app/boq`)

Currently hardcoded to project `PRJ-1042`. **Must become project-scoped.**

- Toolbar: Upload drawing (opens picker), Export (real CSV download),
  Regenerate BOQ (disabled with no drawings).
- Header shows provenance badge — **Template estimate** or **Analyzed** — and
  lists the source drawings.
- Drawing viewer: SVG blueprint placeholder; shows an uploaded image if the
  active document is an image. Badge reads *Not analyzed* until a real engine
  is connected.
- Drawings & Plans panel: dropzone + selectable document list.
- Bill Review panel: notes derived from the produced BOQ.
- BOQ table: code, description, qty, unit, rate, amount, confidence, actions.
  - Section tabs (All + each section present)
  - Search across description and code
  - **Inline editing** of every field, with a warning if a unit change breaks
    the rate's dimension
  - Add item modal (description, section, unit, qty, rate, live amount preview)
  - Delete item
  - Footer shows section or grand total

### Quantity Takeoff (`/app/takeoff`)

- Tools: Select, Linear, Area, Volume, Count. The active tool determines what a
  canvas click creates.
- Zoom 25–400 % in 25 % steps; the SVG actually scales; click the percentage to
  reset.
- Canvas: SVG blueprint; an uploaded image plan renders behind the overlay.
- Plans panel: dropzone + selectable plan list.
- **Auto-detect all**: reads the active plan (via the analysis seam).
- Measurements list: inline-editable name and value, remove, colour dot, AI badge.
- **Sync to BOQ**: converts measurements into priced BOQ items and appends them.
  Shows "N of M ready to price"; zero-value measurements are skipped.

### Cost Estimation (`/app/estimation`)

- Region selector: Lagos, Abuja, Port Harcourt, Kano — **actually reprices**.
- Total banner with benchmark comparison, scaled to the job size.
- Four category cards: Materials, Labour, Equipment, Overheads & Profit.
- Cost by Element bar chart — real BOQ section totals.
- Cost Split doughnut.
- Rate Analysis table: material / labour / equipment / unit rate, region-adjusted.
- **Your Cost Data**: CSV upload of your own priced schedule, with AI-vs-yours
  variance, editable qty/rate, and Apply into the rate analysis.
- **Vendor-Confirmed Prices**: saved marketplace prices, applyable.

Estimate basis: `boqTotal` when a BOQ exists, else a fallback of ₦185,200,000.

Category split: Materials 53 %, Labour 28 %, Equipment 11 %, O&P 8 %, each
multiplied by its regional driver.

**Regional factors:**

| Region | Material | Labour | Equipment | Benchmark (₦) |
| --- | --- | --- | --- | --- |
| Lagos | 1.00 | 1.00 | 1.00 | 193,400,000 |
| Abuja | 1.06 | 1.12 | 1.04 | 205,600,000 |
| Port Harcourt | 1.09 | 1.05 | 1.08 | 203,100,000 |
| Kano | 0.94 | 0.86 | 0.97 | 176,800,000 |

Benchmark scales by `basis / 185,200,000`.

### Variations (`/app/variations`)

- Summary: total, pending count, net approved impact.
- Filter: All / Pending / Approved / Rejected.
- **New Variation** modal: description, revision from/to, addition vs omission,
  cost impact. Omissions are stored negative.
- Per row: inline-edit title and impact, Approve / Reject (pending) or Reopen,
  delete.

### Pricing Database (`/app/pricing-db`)

- Region selector; search; category filter (All/Materials/Labour/Equipment).
- **Import library**: parses a real CSV (`name,category,unit,rate`).
- **Add rate** modal: item, category, unit, rate.
- Table rows are fully inline-editable; delete per row.
- 30-day change shown as up (danger) / down (success) / — .

### Vendor Marketplace (`/app/vendors`)

- Stat strip: vendors, categories, unlocked, saved prices.
- Category cards (on "All"), search across name/location/products, category chips.
- Vendor card: name, verified badge, "You" badge for own listings, rating or
  "No ratings yet", years, top 3 products, **blurred contacts until unlocked**.
- **Unlock flow**: modal → Paystack → contacts revealed (phone, WhatsApp, email).
- Profile modal: full products list, save price to estimates, owner controls.
- **List your business**: full registration form (name, category, location,
  phone, WhatsApp, email, years, description, unlock fee, product rows) →
  validation → **₦1,000 Paystack payment** → listing published as
  "Pending review". Editing an existing listing is free.
- Saved prices drawer.

### Reports (`/app/reports`)

- Four KPI cards (**static**): win rate 72 %, avg margin 18.4 %, estimate
  accuracy 98.2 %, reports generated 64.
- Project Value Won area chart, Tender Outcomes bar chart (**static**).
- Recent reports list; View all expands with search and type filter; download
  produces a placeholder file.

### AI Assistant (`/app/assistant`)

- Chat UI with typing indicator, suggested prompts, attach (real file picker).
- **Replies are canned keyword matches** — no LLM. See §10.
- User text is HTML-escaped before `v-html`; only `**bold**` is honoured.

### Team (`/app/team`)

- Role cards with **derived** counts.
- Members list; role changeable inline; resend invite; remove (admin protected).
- **Invite** modal: name, email, role, with duplicate and format validation.

### Billing (`/app/billing`)

- Current plan / trial banner with days remaining.
- Usage cards driven by the current plan's allowances.
- Payment method: states that Paystack holds the card.
- Invoices: real verified payments when present, else samples.
- Change plan modal → Paystack.

### Settings (`/app/settings`)

Three tabs: **Profile**, **Company**, **Security**.
(Notifications and Preferences tabs were removed.)

- Profile: photo upload, name, email, role, phone.
- Company: company name, industry, country, default currency.
- Security: change password (validated), 2FA status (**display only**).
- Save persists everything; Cancel reverts.

---

## 8. Business rules

### Free trial and paywall

- Every account starts on a **14-day free trial**, no card required.
- `trialDaysLeft = ceil((trialStartedAt + 14 days - now) / 1 day)`, floored at 0.
- Urgency: `calm` > 7 days, `warning` 4–7, `critical` 1–3, `over` at 0.
- A countdown appears in the sidebar and as a banner above page content.
- **On expiry, `TrialPaywall` covers the workspace with a modal that cannot be
  dismissed** — no close button, Escape is swallowed, backdrop clicks do
  nothing, page scroll is locked. The dashboard stays visible behind it. The
  only ways out are paying or signing out.
- Access rules:
  - `status === "active"` → access while `currentPeriodEnd > now`
  - `status === "trialing"` → access while `trialDaysLeft > 0`
  - otherwise → no access
- Paying sets `status = "active"` and extends `currentPeriodEnd` by one month
  from the later of now or the existing period end.

**This is currently client-side only and therefore bypassable.** See §16.

### Plans

| Plan | ₦/month | Seats | AI credits | Storage |
| --- | --- | --- | --- | --- |
| Starter | 18,000 | 2 | 500 | 10 GB |
| Professional | 54,000 | 10 | 2,000 | 100 GB |
| Enterprise | Custom | Unlimited | Unlimited | 1,000 GB |

Public pricing page also lists a Free Trial tier and annual pricing
(Starter ₦15,000, Professional ₦54,000 — annual is ~16 % off monthly).

### Marketplace economics

- Buyer pays `vendor.unlockPrice` (default **₦1,000**) once to reveal a
  vendor's phone, WhatsApp and email. Unlock is permanent per buyer.
- Vendor pays a **₦1,000 listing fee** once to publish. Editing is free.
- New listings: `rating: 0`, `reviews: 0`, `verified: false`,
  `status: "Pending review"`. **Nothing is fabricated.**
- A vendor's own listing is auto-unlocked to them.
- Business names must be unique across the marketplace.

### Validation rules

**Vendor listing:** name ≥ 3 chars and unique; category must exist; location
required; phone matches `^[+\d][\d\s-]{7,}$`; valid email; at least one product;
every product needs a unit and a price > 0.

**Team invite:** name and email required; email format checked; no duplicate
email on the team; Company Admin cannot be removed.

**BOQ item:** description required; unit required; qty > 0; rate ≥ 0.

**Rate:** name required and unique; unit required; rate > 0.

**Variation:** description required; impact ≥ 0 (direction chosen separately).

**Project:** name and client required; budget ≥ 0.

---

## 9. Measurement and units — critical

**This section is the most important one for the AI engine.** Getting units
wrong produces bills that are wrong by factors of 3 to 20.

### Canonical units (`src/utils/units.js`)

| Unit | Dimension | Meaning |
| --- | --- | --- |
| `m` | length | metre |
| `mm`, `km` | length | |
| `m²` | area | square metre |
| `m³` | volume | cubic metre |
| `no` | count | number |
| `pair`, `set` | count | |
| `kg`, `tonne` | mass | |
| `L` | capacity | litre |
| `hr`, `day`, `week`, `month` | time | plant hire, labour |
| `bag`, `bucket`, `tin`, `roll`, `pack`, `sheet`, `length`, `trip`, `load`, `trailer` | pack | trade packaging |
| `item`, `sum` | lump | lump sums |

**The engine must return these exact strings.** The frontend normalises
aliases (`m2`, `M2`, `SQM`, `sq.m`, `㎡` → `m²`; `nr`, `pcs`, `each`, `EA` →
`no`; `ton`, `MT`, `t` → `tonne`; `ltr`, `litres` → `L`; `LM`, `metres` → `m`;
`cum`, `cu.m`, `m^3` → `m³`), but returning canonical values avoids the round trip.

### Measurement conventions (SMM7 / NRM / NIQS)

| Trade | Unit | Note |
| --- | --- | --- |
| Site clearance, topsoil removal | `m²` | superficial |
| Excavation, filling, hardcore | `m³` | cubic |
| **In-situ concrete (all of it)** | **`m³`** | slabs, beams, columns, footings, blinding |
| **Formwork** | **`m²`** | billed separately from the concrete |
| **Reinforcement** | **`tonne`** | |
| Blockwork and walling | `m²` | |
| Plaster, render, paint, tiling, screed | `m²` | |
| Damp-proof membrane | `m²` | |
| Roof coverings, ceilings | `m²` | |
| Fascia, skirting, ridge, pipes, cables | `m` | |
| Doors, sanitary fittings, sockets, lights | `no` | |
| Windows | `m²` or `no` | state which |

**Never bill a slab in `m²` as if it were concrete.** A slab area measured off a
plan yields **two** items: concrete by volume (area × thickness) and formwork to
the soffit by area.

### Standard conversion factors used

| From | To | Factor |
| --- | --- | --- |
| Slab area (m²), 150 mm | concrete (m³) | × 0.15 |
| Slab area (m²) | soffit formwork (m²) | × 1.0 |
| Column count, 225×225×3.0 m | concrete (m³) | × 0.152 |
| Column count | formwork (m²) | × 2.70 |
| Beam run (m), 225×450 | concrete (m³) | × 0.101 |
| Beam run (m) | formwork (m²) | × 1.125 |
| Strip footing run (m), 600×225 | concrete (m³) | × 0.135 |
| Strip footing run (m) | formwork (m²) | × 0.45 |
| Blinding area (m²), 50 mm | concrete (m³) | × 0.05 |
| Wall run (m) | wall area (m²) | × 3.0 (storey height) |
| Boundary wall run (m) | area (m²) | × 2.4 |
| Window count | area (m²) | × 1.8 (1.2 × 1.5 m) |

These are **assumptions** for Nigerian residential work. The engine should
derive real dimensions from the drawing where it can, and state its assumption
in the item description where it cannot — the current descriptions do exactly
that, e.g. *"Reinforced concrete strip footing (600 x 225mm)"*.

### Sanity check

Reinforcement should land at **100–130 kg per m³ of concrete** for typical
residential work. The frontend flags anything below 90 kg/m³.

### Reference rates (Lagos, current seed data)

| Item | Unit | ₦ |
| --- | --- | --- |
| Excavation to reduce levels | m³ | 3,500 |
| Plain concrete (1:3:6) blinding | m³ | 52,000 |
| RC (1:2:4) foundations | m³ | 78,000 |
| RC (1:2:4) columns | m³ | 82,000 |
| RC (1:2:4) beams | m³ | 80,000 |
| RC (1:2:4) suspended slab | m³ | 80,000 |
| Formwork to slab soffit | m² | 4,500 |
| Formwork to beams / columns | m² | 5,200 |
| Y16 reinforcement | tonne | 980,000 |
| 225 mm sandcrete block wall | m² | 6,800 |
| 150 mm block partition | m² | 5,200 |
| 12 mm plaster | m² | 2,400 |
| Vitrified floor tiles 600×600 | m² | 11,500 |
| Emulsion paint, 3 coats | m² | 1,450 |
| Aluminium roofing sheet 0.55 mm | m² | 9,200 |
| Flush door + hardwood frame | no | 65,000 |
| Aluminium sliding window | m² | 38,000 |
| 2.5 mm² cable in conduit | m | 520 |
| 13A socket outlet | no | 3,200 |
| PVC soil pipe 4" | m | 4,800 |
| Interlocking paving | m² | 5,200 |

---

## 10. What is real and what is faked

### Real

- File upload, storage in the browser, preview, download, delete
- All CRUD on projects, BOQ items, variations, rates, cost lines, team, vendors
- CSV import (cost data, rate libraries) with a tolerant parser
- CSV export of the BOQ
- Unit normalisation and dimensional checking
- Regional repricing, BOQ-driven estimation
- Trial countdown and paywall logic
- Paystack popup + server-side verification
- Charts (rendering is real; **most underlying data is static**)

### Faked — must be replaced by the backend and AI

| What the UI shows | What actually happens |
| --- | --- |
| "AI analyzed your drawing" | **Nothing reads the file.** Not one byte of content. |
| BOQ generated from drawings | Template chosen by **keyword-matching the filename**. `foundation` → substructure items, `roof` → roofing items. |
| Quantities | `template base × (0.8 + hash(filename+size) % 56 / 100) × (elements / 14)` |
| "14 elements detected" | Literally `8 + (filename.length % 14)` |
| Confidence % | Derived from file extension: BIM 97, CAD 94, PDF 90, image 82, minus a hash-derived 0–4 |
| Takeoff auto-detect | Same approach — template per discipline, scaled by filename hash |
| AI Assistant replies | Regex keyword matching against 5 canned paragraphs. **No LLM.** |
| Dashboard stats, charts, activity | Static arrays |
| Reports KPIs and charts | Static arrays |
| Authentication | No auth. Hardcoded user, `isAuthenticated` defaults to `true`. |
| Team members, invitations | In-memory; no emails sent |
| Vendor ratings and reviews | Seed data |
| Notifications | Static array of 3 |
| Invoice downloads | Generated placeholder text files |

**Proof that analysis is filename-driven:** the same file named three ways
returns three different bills — `Ground Floor Plan.pdf` → ₦54.1M,
`Foundation Layout.pdf` → ₦27.8M, `Roof Plan.pdf` → ₦8.5M. An empty PDF named
`Foundation Layout.pdf` returns a full substructure bill.

The UI is now honest about this: output is badged **Template estimate**, the
viewer says **Not analyzed**, the element count says **Preview only — drawing
not read**, and per-item confidence is hidden until quantities are genuinely
measured.

---

## 11. Backend API to be built

Suggested base: `https://api.buildq.ai/v1`. JSON throughout. Bearer token auth.
Money in **naira as integers** (kobo only at the Paystack boundary).

### Conventions

- `GET` list endpoints support `?page=&limit=&q=&sort=`
- Errors: `{ "error": { "code": "string", "message": "human readable", "fields": {} } }`
- Timestamps ISO 8601 UTC
- All endpoints except auth require `Authorization: Bearer <token>`
- Every resource is scoped to the caller's **organization**

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/signup` | name, email, company, password → user + token + starts 14-day trial |
| POST | `/auth/login` | email, password → user + token + subscription |
| POST | `/auth/logout` | invalidate token |
| POST | `/auth/refresh` | rotate token |
| POST | `/auth/password/reset-request` | email → sends reset link |
| POST | `/auth/password/reset` | token, new password |
| GET | `/auth/me` | current user + org + subscription + entitlements |
| PATCH | `/auth/me` | update profile (name, email, role, phone, company, photo) |
| POST | `/auth/me/photo` | multipart avatar upload |
| POST | `/auth/password/change` | current + new password |

`/auth/me` **must** return the subscription so the paywall is server-driven:

```jsonc
{
  "user": { ... },
  "organization": { "id": "ORG-1", "name": "Adetunji & Associates" },
  "subscription": {
    "status": "trialing",
    "plan": null,
    "trialStartedAt": "2026-08-14T00:00:00Z",
    "trialEndsAt": "2026-08-28T00:00:00Z",
    "currentPeriodEnd": null,
    "hasAccess": true
  }
}
```

### Projects

| Method | Path |
| --- | --- |
| GET | `/projects` |
| POST | `/projects` |
| GET | `/projects/{id}` |
| PATCH | `/projects/{id}` |
| DELETE | `/projects/{id}` |
| GET | `/projects/{id}/activity` |
| GET | `/projects/{id}/spend` — monthly cumulative series for the chart |

### Documents

| Method | Path |
| --- | --- |
| POST | `/projects/{id}/documents` — multipart upload, returns doc + analysis job id |
| GET | `/projects/{id}/documents` |
| GET | `/documents/{id}` |
| GET | `/documents/{id}/download` — signed URL |
| GET | `/documents/{id}/preview` — signed URL, rendered page for CAD/BIM |
| PATCH | `/documents/{id}` — rename |
| DELETE | `/documents/{id}` |

Upload response must include `status: "analyzing"` and a job reference. The
frontend already models `Analyzing → Ready`.

### Analysis (see §12)

| Method | Path |
| --- | --- |
| POST | `/analyze` |
| GET | `/analyze/{jobId}` |
| POST | `/boq` |

### BOQ

| Method | Path |
| --- | --- |
| GET | `/projects/{id}/boq` |
| POST | `/projects/{id}/boq/generate` — from documents, async |
| POST | `/projects/{id}/boq/items` |
| PATCH | `/boq/items/{itemId}` |
| DELETE | `/boq/items/{itemId}` |
| POST | `/projects/{id}/boq/import` — from takeoff measurements |
| GET | `/projects/{id}/boq/export?format=csv\|xlsx\|pdf` |
| GET | `/projects/{id}/boq/revisions` |

### Takeoff

| Method | Path |
| --- | --- |
| GET | `/documents/{id}/measurements` |
| POST | `/documents/{id}/measurements` |
| PATCH | `/measurements/{id}` |
| DELETE | `/measurements/{id}` |
| POST | `/documents/{id}/detect` — run detection, async |

### Estimation

| Method | Path |
| --- | --- |
| GET | `/projects/{id}/estimate?region=Lagos` |
| POST | `/projects/{id}/estimate/recalculate` |
| GET | `/regions` — factors and benchmarks |
| POST | `/projects/{id}/costs/import` — CSV of user cost data |
| GET/DELETE | `/projects/{id}/costs` |

### Variations

| Method | Path |
| --- | --- |
| GET/POST | `/projects/{id}/variations` |
| PATCH | `/variations/{id}` — includes status transitions |
| DELETE | `/variations/{id}` |

### Pricing database

| Method | Path |
| --- | --- |
| GET | `/rates?region=&category=&q=` |
| POST | `/rates` |
| PATCH | `/rates/{id}` |
| DELETE | `/rates/{id}` |
| POST | `/rates/import` — CSV |
| GET | `/rates/{id}/history` — for 30-day change |

Rates are partly **global** (curated market data, updated by BuildQ) and partly
**per-organization** (a firm's own schedule). The API must distinguish them.

### Vendor marketplace

| Method | Path |
| --- | --- |
| GET | `/vendors?category=&q=` — contacts omitted unless unlocked |
| GET | `/vendors/{id}` |
| POST | `/vendors` — register a listing (requires paid fee) |
| PATCH | `/vendors/{id}` — own listing only |
| DELETE | `/vendors/{id}` |
| POST | `/vendors/{id}/unlock` — after payment verification |
| GET | `/vendors/unlocked` |
| GET/POST/DELETE | `/saved-prices` |
| GET | `/vendor-categories` |

**Contacts must be stripped server-side** for locked vendors. Today the frontend
merely blurs them — the data is in the payload, so anyone can read it in
devtools. This is a real leak that the backend must close.

### Team

| Method | Path |
| --- | --- |
| GET | `/team` |
| POST | `/team/invitations` — sends a real email |
| POST | `/team/invitations/{id}/resend` |
| DELETE | `/team/invitations/{id}` |
| PATCH | `/team/members/{id}` — change role |
| DELETE | `/team/members/{id}` |

### Billing

| Method | Path |
| --- | --- |
| GET | `/billing/subscription` |
| GET | `/billing/plans` |
| POST | `/billing/subscribe` — verify Paystack reference, activate |
| POST | `/billing/cancel` |
| GET | `/billing/invoices` |
| GET | `/billing/invoices/{id}/download` |
| GET | `/billing/usage` — credits, storage, seats consumed |

### Payments

| Method | Path |
| --- | --- |
| POST | `/payments/verify` | already exists as `/api/paystack/verify` |
| POST | `/payments/webhook` | **Paystack webhook — see §15** |

### Reports & assistant

| Method | Path |
| --- | --- |
| GET | `/reports` |
| POST | `/reports/generate` |
| GET | `/reports/{id}/download` |
| GET | `/analytics/kpis` |
| GET | `/analytics/tenders` |
| POST | `/assistant/chat` — real LLM, streaming preferred |
| GET | `/notifications` |
| POST | `/notifications/{id}/read` |

---

## 12. The analysis / AI engine

The frontend calls this through **one file**: `src/services/analysis.js`. Set
`VITE_ANALYSIS_API_URL` and implement the two endpoints below; nothing else in
the frontend changes.

### `POST /analyze`

Request — `multipart/form-data`:

| Field | Type |
| --- | --- |
| `file` | the drawing |
| `projectId` | string |

Response `200`:

```jsonc
{
  "documentId": "DOC-123",
  "scale": "1:100",                 // detected, or null
  "pages": 3,
  "elements": [
    { "type": "wall",   "count": 24, "length": 148.2, "unit": "m"  },
    { "type": "slab",   "count": 2,  "area":   186.4, "unit": "m²" },
    { "type": "column", "count": 18 },
    { "type": "door",   "count": 9  },
    { "type": "window", "count": 14 }
  ],
  "measurements": [
    { "name": "Ground floor slab", "type": "Area",
      "value": 186.4, "unit": "m²", "confidence": 0.94 }
  ],
  "warnings": ["Scale bar unreadable on sheet 2"]
}
```

`type` must be one of `Linear|Area|Volume|Count`.

### `POST /boq`

Request:

```jsonc
{ "projectId": "PRJ-1042",
  "documentIds": ["DOC-123", "DOC-124"],
  "standard": "NIQS",               // NIQS | RICS/SMM7 | POMI | Metric (ISO)
  "region": "Lagos" }
```

Response:

```jsonc
{
  "items": [
    { "code": "B2.1",
      "desc": "Reinforced concrete (1:2:4) in suspended slab, 150mm thick",
      "section": "Superstructure",
      "unit": "m³",
      "qty": 27.96,
      "rate": 80000,
      "confidence": 0.93,           // 0-1; OMIT when not measured
      "sources": ["Ground Floor Plan.pdf"] }
  ],
  "notes": [ { "type": "warning", "text": "No roofing drawing supplied" } ]
}
```

`notes[].type` ∈ `success|info|warning`.

### Engine requirements

**Input handling**
- PDF: vector extraction preferred (`PyMuPDF`, `pdfplumber`); OCR fallback for
  scans (`Tesseract`, or a cloud OCR)
- DWG/DXF: `ezdxf` (DXF native; DWG needs ODA File Converter or Teigha)
- RVT: Revit is proprietary — export to IFC, or use Autodesk Platform Services
- IFC: `ifcopenshell` — this is the richest source and should be prioritised
- Images: OCR + vision model

**Pipeline**
1. Identify sheet type (plan, section, elevation, detail, schedule)
2. Detect scale — from scale bar, title block text, or known dimension strings
3. Recognise geometry: walls (with thickness), slabs, beams, columns, openings,
   stairs, roof planes
4. Measure: lengths, areas, volumes, counts
5. Map to work items and units per §9
6. Price from the rate library for the region
7. Score confidence per item and report warnings

**Non-negotiables**
- Return **canonical units** (§9)
- **Never** return a quantity in a unit that does not match the item's
  measurement convention — concrete is always `m³`
- Bill formwork **separately** from concrete
- Omit `confidence` rather than inventing one
- Always populate `sources` so a figure can be traced to a drawing
- Analysis is slow: expose it as an **async job**, not a blocking request

**Assistant**
`POST /assistant/chat` should use a real LLM with the project's BOQ, drawings
and rates as context. The current canned replies cover: reinforcement
estimation, BOQ generation, cost-saving alternatives, and market-rate
comparison — good starting intents.

---

## 13. Database schema

Indicative PostgreSQL. Adjust to taste, but keep the field names where the
frontend already uses them.

```sql
organizations      id, name, industry, country, currency, created_at
users              id, org_id, name, email UNIQUE, password_hash, role,
                   phone, avatar, photo_url, created_at, last_login_at
team_invitations   id, org_id, email, name, role, token, status, expires_at

subscriptions      id, org_id, status, plan, trial_started_at, trial_ends_at,
                   current_period_end, created_at
payments           id, org_id, reference UNIQUE, purpose, amount_naira,
                   status, channel, paid_at, metadata JSONB

projects           id, org_id, code UNIQUE, name, client, location, type,
                   status, progress, budget, spent, currency, cover,
                   created_at, updated_at
project_members    project_id, user_id, role

documents          id, org_id, project_id, name, ext, kind, size_bytes, mime,
                   storage_key, uploaded_by, uploaded_at, status,
                   analysis_job_id, page_count, detected_scale
analysis_jobs      id, document_id, status, started_at, finished_at,
                   error, result JSONB
detected_elements  id, document_id, type, count, length, area, volume, unit,
                   confidence, geometry JSONB

measurements       id, document_id, project_id, name, type, value, unit,
                   color, auto, confidence, created_by, created_at

boq_revisions      id, project_id, version, generated_from UUID[],
                   source ('engine'|'stand-in'), created_by, created_at
boq_items          id, revision_id, project_id, code, description, section,
                   unit, qty, rate, confidence, sources TEXT[], sort_order

variations         id, project_id, code, title, revision_from, revision_to,
                   impact_naira, status, raised_by, raised_at, decided_by,
                   decided_at

rates              id, org_id NULLABLE, name, category, unit, rate_naira,
                   region, source, effective_from
rate_history       rate_id, rate_naira, recorded_at
cost_lines         id, org_id, project_id, item, unit, rate, qty, section,
                   source_file, uploaded_at

vendors            id, name UNIQUE, category, location, phone, email, whatsapp,
                   rating, reviews_count, years, verified, unlock_price,
                   description, owner_org_id NULLABLE, status,
                   listing_fee_payment_id, created_at
vendor_products    id, vendor_id, name, unit, price_naira
vendor_unlocks     id, org_id, vendor_id, payment_id, unlocked_at
saved_prices       id, org_id, vendor_id, product_name, unit, rate, saved_at

reports            id, org_id, project_id, name, type, format, storage_key,
                   generated_at
notifications      id, org_id, user_id, title, detail, type, link, read_at
activity_events    id, org_id, project_id, actor_id, action, target, type,
                   created_at
```

Indexes on every foreign key, plus `vendors(category)`,
`rates(region, category)`, `boq_items(revision_id, sort_order)`,
`documents(project_id, kind)`.

---

## 14. Authentication and authorisation

**There is no authentication today.** `src/stores/auth.js` holds a hardcoded
user and `isAuthenticated` defaults to `true`. This must be replaced entirely.

Requirements:

- Email + password with a strong hash (Argon2id or bcrypt cost ≥ 12)
- The signup form already scores password strength: ≥ 8 chars, uppercase,
  digit, symbol — enforce a real minimum server-side
- JWT access token (short-lived) + refresh token (httpOnly, secure, SameSite)
- Password reset via emailed single-use token with expiry
- 2FA — the Settings screen already claims it is enabled; make it real or
  remove the claim
- "Continue with Google" exists on the login screen — implement OAuth or remove it
- Rate-limit login, signup and password reset

**Role permissions:**

| Capability | Admin | QS | PM | Client Viewer |
| --- | :-: | :-: | :-: | :-: |
| View projects | ✓ | ✓ | ✓ | ✓ (approved only) |
| Create/edit projects | ✓ | ✓ | ✓ | |
| Upload drawings | ✓ | ✓ | ✓ | |
| Generate/edit BOQ | ✓ | ✓ | | |
| Approve variations | ✓ | | ✓ | |
| Edit rate library | ✓ | ✓ | | |
| Manage team | ✓ | | | |
| Billing | ✓ | | | |
| Unlock vendors | ✓ | ✓ | ✓ | |

---

## 15. Payments

Paystack is the single payment provider. Currency **NGN**, amounts in **kobo**.

### Three charge types

| Purpose | Reference prefix | Amount |
| --- | --- | --- |
| Subscription | `SUB-` | plan price |
| Vendor contact unlock | `UNLOCK-` | `vendor.unlockPrice`, default ₦1,000 |
| Vendor listing fee | `LISTING-` | ₦1,000 |

Reference format: `{PREFIX}-{base36 timestamp}-{6 random chars}`.

### Flow (already implemented client-side)

1. Browser opens Paystack popup with `VITE_PAYSTACK_PUBLIC_KEY`
2. Paystack returns a reference
3. App calls verification with that reference
4. Server re-checks with `PAYSTACK_SECRET_KEY` against
   `https://api.paystack.co/transaction/verify/{reference}`
5. Server confirms `status === "success"` **and** `amount >= expected kobo`
6. Only then is the product unlocked

`api/paystack/verify.js` implements steps 4–5 and **fails closed** when the
secret key is missing.

### What the backend must add

- **Persist payments** — currently a verified payment exists only in the
  browser. Clearing storage loses the subscription.
- **Webhook** at `/payments/webhook`, verifying the `x-paystack-signature`
  HMAC-SHA512 of the raw body with the secret key. Handle `charge.success`,
  `subscription.disable`, `invoice.payment_failed`.
- **Idempotency** — a reference must unlock its product exactly once.
- **Recurring billing** — use Paystack Plans/Subscriptions, or charge the
  authorization code monthly via a scheduled job.
- **Grace period and dunning** — retry failed renewals before locking.
- **Vendor payouts** — unlock fees are currently collected but never paid to
  vendors. Decide the split and build settlement.

---

## 16. Security requirements

Known holes in the current build. **All must be closed before real customers.**

| Issue | Severity | Fix |
| --- | --- | --- |
| No authentication at all | Critical | §14 |
| Trial paywall is client-side; editing `localStorage` restores access | Critical | Server-side entitlement on every request |
| Clearing site data resets the trial to a fresh 14 days | Critical | Trial tied to a server account |
| Locked vendor contacts are present in the payload, merely blurred | High | Strip server-side until unlocked |
| Payments persist only in the browser | High | Persist server-side; webhook |
| No rate limiting | High | On auth, upload, analysis |
| Files held as base64 in `localStorage` | Medium | Object storage + signed URLs |
| No audit trail | Medium | `activity_events` |
| No per-organization isolation | Critical | Scope every query by `org_id` |
| Uploads not virus-scanned | Medium | Scan on ingest |
| No file content validation | Medium | Verify magic bytes, not just extension |

Already handled correctly, keep it that way:

- Paystack secret key is server-only; verified absent from the built bundle
- Payment verification fails closed
- Assistant escapes user HTML before `v-html`
- Amount tampering rejected at verification

---

## 17. Migration from localStorage

Eight keys are in use:

| Key | Contents |
| --- | --- |
| `buildq.auth` | user + `isAuthenticated` |
| `buildq.subscription` | trial and plan state |
| `buildq.documents` | document metadata + small file bodies |
| `buildq.costs` | uploaded cost lines |
| `buildq.settings` | company and preference fields |
| `buildq.vendors.own` | user-created vendor listings |
| `buildq.vendors.unlocked` | unlocked vendor ids |
| `buildq.vendors.savedPrices` | saved vendor prices |

Suggested order of replacement:

1. **Auth** — everything else depends on knowing who is calling
2. **Subscription** — closes the paywall bypass, protects revenue
3. **Projects + BOQ** — the core data users would be devastated to lose
4. **Documents** — needs object storage; unblocks analysis
5. **Analysis engine** — the actual product promise
6. **Vendors** — closes the contact leak
7. **Rates, costs, variations, reports** — the remainder

Each store's `_persist()` becomes an API call. The getters and actions already
define the operations the API needs, so the shapes can stay identical.

---

## 18. Environment variables

### Frontend (`VITE_` prefix — shipped to the browser, never secret)

| Variable | Purpose |
| --- | --- |
| `VITE_PAYSTACK_PUBLIC_KEY` | `pk_test_…` / `pk_live_…` |
| `VITE_ANALYSIS_API_URL` | Base URL of the analysis engine; unset = template fallback |

### Server (never `VITE_` prefixed)

| Variable | Purpose |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` / `sk_live_…` — verification and webhooks |

To be added with the backend: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`,
`S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY`, `SMTP_*`, `OPENAI_API_KEY`
(or equivalent), `SENTRY_DSN`.

---

## 19. Frontend file map

```
api/
  paystack/verify.js        Vercel function — Paystack verification (ONLY server code)

src/
  main.js                   Bootstrap: pinia then router, mount #app
  App.vue                   RouterView + ToastHost
  style.css                 Tailwind layers + component classes

  router/index.js           All routes, auth guard, trial refresh

  layouts/
    MarketingLayout.vue     Public nav + footer (no transition on RouterView)
    AuthLayout.vue          Split-screen auth
    AppLayout.vue           Sidebar, topbar, global search, trial banner, paywall

  stores/
    auth.js                 User + isAuthenticated + initials derivation
    projects.js             Projects, BOQ items, activity
    documents.js            Uploaded files, validation, persistence budget
    costs.js                User cost lines + CSV parser
    vendors.js              Marketplace, unlocks, saved prices, listing fee
    subscription.js         Trial, plan, payments, access rules

  services/
    analysis.js             THE SEAM to the analysis engine + contract docs

  utils/
    units.js                Canonical units, aliases, dimensions, compatibility
    boqGenerator.js         Template BOQ generation (STAND-IN)
    takeoff.js              Measurement detection + BOQ conversion (STAND-IN)
    paystack.js             Popup + server verification + kobo conversion
    format.js               formatMoney, formatFull, formatNumber
    download.js             Blob download helper

  components/
    FileDropzone.vue        Drag-and-drop upload
    DocumentList.vue        Uploaded document rows
    CostUpload.vue          Cost CSV upload + template
    TrialPaywall.vue        Undismissable expiry modal
    ToastHost.vue           Toast queue renderer
    StatCard.vue, BrandLogo.vue
    charts/                 AreaChart, BarChart, DoughnutChart, registerCharts

  composables/useToast.js   Global toast queue
  content/pages.js          Content for the 10 marketing/legal pages
  views/                    marketing/ (5), auth/ (3), app/ (14), NotFoundView
```

### Frontend conventions

- Vue 3 `<script setup>`, Composition API only
- **Every routed view must have a single root element.** Multi-root views
  previously broke rendering under a transition; the transitions are gone but
  the rule stands.
- Pinia option stores (`state`, `getters`, `actions`)
- Toasts for feedback: `toast(message, 'success'|'info'|'warning')`
- Modals: `fixed inset-0 z-[60]`, `@click.self` to close, Escape handled
- All money through `formatFull` / `formatMoney`
- All units through `normalizeUnit` on entry

---

## 20. Glossary

| Term | Meaning |
| --- | --- |
| **BOQ** | Bill of Quantities — itemised, measured, priced schedule of work |
| **Takeoff** | Measuring quantities from drawings |
| **Variation / VO** | Change order altering scope and cost after contract |
| **Provisional sum** | Allowance for work not yet fully defined |
| **Preliminaries** | Project-wide costs (site setup, supervision, plant) |
| **Substructure** | Everything up to and including ground floor slab |
| **Superstructure** | Everything above the ground floor slab |
| **Formwork** | Temporary moulds into which concrete is poured; measured in m² |
| **Blinding** | Thin layer of weak concrete over excavation before structural concrete |
| **Sandcrete block** | Cement/sand block, the standard Nigerian walling unit |
| **Longspan** | Long roofing sheet, typically aluminium |
| **Screeding / POP** | Wall/ceiling levelling before finishing; POP = plaster of Paris |
| **Soakaway** | Pit for drainage dispersal |
| **RICS** | Royal Institution of Chartered Surveyors |
| **SMM7 / NRM** | Standard Method of Measurement / New Rules of Measurement |
| **NIQS** | Nigerian Institute of Quantity Surveyors |
| **POMI** | Principles of Measurement (International) |
| **Rate** | Cost per unit of a work item |
| **Rate analysis** | Breakdown of a rate into material, labour and equipment |
| **Tender** | A priced bid for construction work |
| **Kobo** | 1/100 of a naira; Paystack's unit |

---

*This document describes the system as at commit `cf6732e`. Update it as the
backend lands, particularly §10, which must shrink to nothing.*
