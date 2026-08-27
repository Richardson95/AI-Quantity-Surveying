// ---------------------------------------------------------------------------
// Content for the standalone marketing / legal pages.
// ---------------------------------------------------------------------------
// Each footer link now resolves to a real route rendered by InfoView.vue.
// Blocks are simple and typed so one view can render them all:
//   { type: 'text',    body }
//   { type: 'bullets', items: [] }
//   { type: 'cards',   items: [{ title, body }] }
//   { type: 'rows',    items: [{ title, meta, body, tag }] }
//   { type: 'status',  items: [{ name, state }] }
// ---------------------------------------------------------------------------

export const pages = {
  about: {
    title: 'About BuildQ AI',
    kicker: 'Company',
    intro:
      'We build cost intelligence software for the people who price buildings — quantity surveyors, estimators and construction firms working in fast-moving markets.',
    blocks: [
      {
        type: 'text',
        heading: 'Why we started',
        body:
          'Preparing a Bill of Quantities by hand takes days, and a single missed measurement can cost a firm a tender. Rates move faster than spreadsheets can track, especially in Nigerian markets where material prices can shift several percent in a month. BuildQ AI exists to close that gap: read the drawings, produce the quantities, price them against live regional rates, and keep every revision auditable.',
      },
      {
        type: 'cards',
        heading: 'What we care about',
        items: [
          { title: 'Accuracy over theatre', body: 'An estimate you cannot defend in a tender meeting is worthless. Every generated quantity carries a confidence score and traces back to the drawing it came from.' },
          { title: 'Local rates, not global averages', body: 'We maintain regional material, labour and equipment rates across Lagos, Abuja, Port Harcourt and Kano rather than converting foreign benchmarks.' },
          { title: 'Standards compliance', body: 'Output follows RICS and NIQS measurement conventions, so what leaves the platform is ready for a client, not just for internal use.' },
          { title: 'The surveyor stays in charge', body: 'AI proposes, the QS disposes. Every quantity, rate and variation stays editable, and nothing is submitted without a human approving it.' },
        ],
      },
      {
        type: 'bullets',
        heading: 'By the numbers',
        items: [
          'Founded in Lagos, serving construction firms across West Africa',
          'Material, labour and equipment rate coverage in four Nigerian regions',
          'RICS / SMM7, NIQS and POMI measurement standards supported',
          'Verified supplier marketplace spanning ten material categories',
        ],
      },
    ],
  },

  careers: {
    title: 'Careers',
    kicker: 'Join us',
    intro:
      'We are a small team of engineers and quantity surveyors. If you have shipped software that professionals rely on, or you have priced real buildings and are tired of doing it in spreadsheets, we would like to talk.',
    blocks: [
      {
        type: 'rows',
        heading: 'Open roles',
        items: [
          { title: 'Senior Frontend Engineer', meta: 'Lagos · Hybrid · Full-time', tag: 'Engineering', body: 'Own the estimating workspace — the BOQ grid, takeoff canvas and reporting surfaces. Deep Vue or React experience, and an eye for dense, data-heavy interfaces.' },
          { title: 'Quantity Surveyor — Product Specialist', meta: 'Lagos · Hybrid · Full-time', tag: 'Product', body: 'Bring practising QS judgement into the product. You will define measurement rules, validate AI output against real projects, and shape the rate libraries.' },
          { title: 'Machine Learning Engineer (Document AI)', meta: 'Remote (WAT ±3) · Full-time', tag: 'Engineering', body: 'Work on drawing understanding: element detection, scale recognition and OCR over technical documents. Experience with vision models and PDF/CAD parsing.' },
          { title: 'Customer Success Manager', meta: 'Lagos · On-site · Full-time', tag: 'Operations', body: 'Onboard construction firms, run training sessions, and turn the messy reality of client workflows into product feedback we can act on.' },
        ],
      },
      {
        type: 'bullets',
        heading: 'How we work',
        items: [
          'Small teams with direct ownership — you ship, you support it',
          'Hybrid by default from our Victoria Island office, with remote roles where the work allows',
          'Annual learning budget and paid professional membership (RICS, NIQS, or equivalent)',
          'Private health cover for you and your immediate family',
        ],
      },
      {
        type: 'text',
        heading: 'Not seeing your role?',
        body:
          'Send us a note anyway. Tell us what you would want to build here and point us at something you have made. We read every message that arrives through the contact form.',
      },
    ],
    cta: { label: 'Get in touch', to: '/contact' },
  },

  blog: {
    title: 'Blog',
    kicker: 'Insights',
    intro: 'Notes on construction cost intelligence, estimating practice and what we are building.',
    blocks: [
      {
        type: 'rows',
        heading: 'Latest posts',
        items: [
          { title: 'Why your reinforcement estimate is probably 8% out', meta: '12 min read · Estimating', tag: 'Practice', body: 'Steel is the line item most often mispriced on Nigerian residential projects. We look at where the error creeps in — ratio assumptions, lap allowances and wastage — and how to sanity-check a figure before it reaches a tender.' },
          { title: 'Reading a Lagos cement price curve', meta: '8 min read · Market data', tag: 'Data', body: 'Cement moved more than 20% across twelve months. We break down what drove it, how far ahead you can reasonably forecast, and what that means for fixed-price contracts.' },
          { title: 'RICS vs NIQS: measuring the same building twice', meta: '10 min read · Standards', tag: 'Standards', body: 'The two standards disagree in more places than most estimators expect. A side-by-side walkthrough of substructure and finishes measurement, and where the quantities actually diverge.' },
          { title: 'What we learned putting AI on real drawings', meta: '6 min read · Engineering', tag: 'Engineering', body: 'Clean CAD exports are the easy case. Scanned revisions, hand annotations and inconsistent scales are the normal case. Notes from making element detection survive the real world.' },
        ],
      },
    ],
  },

  press: {
    title: 'Press',
    kicker: 'Newsroom',
    intro: 'Company announcements, media resources and contact details for journalists.',
    blocks: [
      {
        type: 'rows',
        heading: 'Announcements',
        items: [
          { title: 'BuildQ AI opens its verified supplier marketplace', meta: 'June 2026', tag: 'Product', body: 'Surveyors can now unlock direct contacts for verified material suppliers across ten categories and feed confirmed prices straight into an estimate.' },
          { title: 'Regional rate coverage extends to Kano and Port Harcourt', meta: 'April 2026', tag: 'Data', body: 'Material, labour and equipment rate libraries now cover four Nigerian markets, with regional adjustment applied across estimation and rate analysis.' },
          { title: 'BuildQ AI launches its AI Bill of Quantities engine', meta: 'January 2026', tag: 'Product', body: 'The platform generates tender-ready Bills of Quantities from uploaded drawings, with per-item confidence scoring and full revision history.' },
        ],
      },
      {
        type: 'bullets',
        heading: 'Media resources',
        items: [
          'Company name is written "BuildQ AI" — one word for BuildQ, capital Q',
          'Logo files, product screenshots and founder photography available on request',
          'Press enquiries: hello@buildq.ai, marked for the communications team',
          'We can usually arrange interviews within two business days',
        ],
      },
    ],
    cta: { label: 'Contact the press team', to: '/contact' },
  },

  docs: {
    title: 'Documentation',
    kicker: 'Resources',
    intro: 'How to get from an uploaded drawing to a priced, tender-ready Bill of Quantities.',
    blocks: [
      {
        type: 'cards',
        heading: 'Getting started',
        items: [
          { title: '1 · Create a project', body: 'From Projects, choose New Project and give it a client, location and budget. Everything else — drawings, BOQs, variations — hangs off that project.' },
          { title: '2 · Upload your drawings', body: 'Drag PDF, DWG, DXF, RVT or IFC files into the BOQ workspace. Files are analysed on upload and appear in the drawing list once ready.' },
          { title: '3 · Generate the BOQ', body: 'Regenerate BOQ reads the current drawing set and produces sectioned line items with quantities, rates and a confidence score per item.' },
          { title: '4 · Take off what AI missed', body: 'Open Quantity Takeoff, pick a measurement tool, and click the plan to add linear, area, volume or count measurements. Sync to BOQ pushes them across.' },
          { title: '5 · Price it', body: 'Cost Estimation applies regional material, labour and equipment factors. Switch region to reprice the whole estimate against that market.' },
          { title: '6 · Export', body: 'Export from the BOQ workspace for CSV, or use Reports for tender, cost and variation reports in PDF, XLSX and DOCX.' },
        ],
      },
      {
        type: 'bullets',
        heading: 'Supported file types',
        items: [
          'Drawings — PDF, DWG, DXF',
          'BIM models — RVT, IFC',
          'Images — PNG, JPG (useful for scanned or photographed plans)',
          'Data — XLSX, XLS, CSV for rate libraries; DOCX, DOC for specifications',
          'Maximum 25 MB per file',
        ],
      },
      {
        type: 'bullets',
        heading: 'Measurement standards',
        items: [
          'RICS / SMM7 — the default for most commercial work',
          'NIQS — Nigerian Institute of Quantity Surveyors conventions',
          'POMI — Principles of Measurement (International)',
          'Metric (ISO) — plain metric measurement without a governing standard',
          'Set your default under Settings → Preferences',
        ],
      },
    ],
    cta: { label: 'Open the app', to: '/app/dashboard' },
  },

  api: {
    title: 'API',
    kicker: 'Resources',
    intro:
      'A REST API for pushing projects, pulling Bills of Quantities and syncing rates with your ERP. Available on Professional and Enterprise plans.',
    blocks: [
      {
        type: 'text',
        heading: 'Access',
        body:
          'API keys are issued per organization from Settings → Security on Professional plans, and by your success manager on Enterprise. All requests are made over HTTPS to api.buildq.ai and authenticated with a bearer token. Keys carry the same role-based permissions as the user who created them.',
      },
      {
        type: 'cards',
        heading: 'Core endpoints',
        items: [
          { title: 'GET /v1/projects', body: 'List projects with status, budget, spend and progress. Supports pagination and filtering by status.' },
          { title: 'POST /v1/projects', body: 'Create a project from your own system of record. Returns the project id used by every other endpoint.' },
          { title: 'POST /v1/projects/{id}/drawings', body: 'Upload a drawing for analysis as multipart form data. Returns a document id and analysis status.' },
          { title: 'GET /v1/projects/{id}/boq', body: 'Retrieve the current Bill of Quantities — sectioned line items with quantity, unit, rate, amount and confidence.' },
          { title: 'GET /v1/rates', body: 'Read the rate library for a region and category, including 30-day movement.' },
          { title: 'POST /v1/variations', body: 'Raise a variation against a project and receive its calculated cost impact.' },
        ],
      },
      {
        type: 'bullets',
        heading: 'Conventions',
        items: [
          'All money values are integers in the minor unit, with an explicit currency field',
          'Timestamps are ISO 8601 in UTC',
          'Rate limit is 600 requests per minute per organization',
          'Errors return a machine-readable code alongside a human-readable message',
          'Breaking changes ship behind a new version prefix; /v1 is supported for at least 12 months after a successor lands',
        ],
      },
    ],
    cta: { label: 'Talk to sales about API access', to: '/contact' },
  },

  support: {
    title: 'Support',
    kicker: 'Resources',
    intro: 'Get help with estimating, uploads, billing or anything else in the platform.',
    blocks: [
      {
        type: 'cards',
        heading: 'How to reach us',
        items: [
          { title: 'Email', body: 'hello@buildq.ai — the fastest route for most questions. Include your project id where relevant.' },
          { title: 'Phone', body: '+234 801 234 5678, Monday to Friday, 9am to 6pm WAT.' },
          { title: 'In-app assistant', body: 'The AI Construction Assistant answers estimating and measurement questions directly inside the workspace.' },
          { title: 'Enterprise', body: 'Enterprise customers have a dedicated success manager and an agreed response SLA.' },
        ],
      },
      {
        type: 'rows',
        heading: 'Common questions',
        items: [
          { title: 'My drawing uploaded but no quantities appeared', meta: 'Uploads', body: 'Analysis runs after the upload completes. If the drawing is a scan, check that the scale is legible — an unreadable scale bar is the most common cause of an empty takeoff. Re-upload at a higher resolution if needed.' },
          { title: 'The rates look wrong for my region', meta: 'Estimating', body: 'Cost Estimation defaults to Lagos. Switch region in the header to reprice materials, labour and equipment against that market, and set a default under Settings → Preferences.' },
          { title: 'I unlocked a vendor but cannot see the contacts', meta: 'Marketplace', body: 'Unlocks are stored per browser. If you cleared site data or switched device, open the vendor profile again — your unlocks are tied to your account and will reappear once restored.' },
          { title: 'How do I add someone to my team?', meta: 'Account', body: 'Team → Invite member. Choose a role at the point of invitation; you can change it later from the member row.' },
        ],
      },
      {
        type: 'bullets',
        heading: 'Response times',
        items: [
          'Free Trial and Starter — within two business days by email',
          'Professional — priority queue, typically within one business day',
          'Enterprise — per your agreed SLA, with a named success manager',
        ],
      },
    ],
    cta: { label: 'Send us a message', to: '/contact' },
  },

  status: {
    title: 'System Status',
    kicker: 'Resources',
    intro: 'Live availability of BuildQ AI services. All systems are currently operational.',
    blocks: [
      {
        type: 'status',
        heading: 'Current status',
        items: [
          { name: 'Web application', state: 'Operational' },
          { name: 'AI BOQ generation', state: 'Operational' },
          { name: 'Document analysis & OCR', state: 'Operational' },
          { name: 'Pricing rate library', state: 'Operational' },
          { name: 'Vendor marketplace', state: 'Operational' },
          { name: 'Reports & exports', state: 'Operational' },
          { name: 'REST API', state: 'Operational' },
        ],
      },
      {
        type: 'rows',
        heading: 'Recent incidents',
        items: [
          { title: 'Slower BOQ generation for large drawing sets', meta: 'Resolved · 14 June 2026', tag: 'Degraded', body: 'Projects with more than 40 drawings queued behind smaller jobs for roughly two hours. Queue prioritisation has been rebalanced and generation times are back to normal.' },
          { title: 'Delayed invoice emails', meta: 'Resolved · 2 June 2026', tag: 'Minor', body: 'Monthly invoice emails went out around four hours late for a subset of accounts. Invoices themselves were unaffected and remained downloadable from Billing throughout.' },
        ],
      },
      {
        type: 'bullets',
        heading: 'Maintenance',
        items: [
          'Planned maintenance runs Sundays 01:00–03:00 WAT and is announced at least 48 hours ahead',
          'Enterprise customers can request maintenance windows outside these hours',
          'Incident notifications are sent to organization admins by email',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    kicker: 'Legal',
    intro: 'How BuildQ AI collects, uses and protects your information. Last updated 1 June 2026.',
    blocks: [
      {
        type: 'text',
        heading: 'What we collect',
        body:
          'We collect the account details you give us (name, work email, company, role and phone number), the project content you upload (drawings, specifications, Bills of Quantities and rate libraries), and technical data generated by using the service (log entries, device and browser information, and feature usage). We do not buy personal data from third parties.',
      },
      {
        type: 'bullets',
        heading: 'How we use it',
        items: [
          'To operate the service — generating BOQs, running takeoff, pricing estimates and producing reports',
          'To support you when you contact us, including reproducing a problem you report',
          'To improve accuracy, using aggregated and de-identified measurement data',
          'To bill you and to send service notices such as invoices and incident notifications',
          'To meet legal obligations where we are required to retain or disclose records',
        ],
      },
      {
        type: 'text',
        heading: 'Your project content',
        body:
          'Drawings, specifications and Bills of Quantities you upload belong to you. We process them to deliver the service to you and your team. We do not use one customer’s project content to train models served to other customers without an explicit written agreement, and we do not sell customer content in any form.',
      },
      {
        type: 'bullets',
        heading: 'Sharing',
        items: [
          'With people you invite to your organization, according to the role you assign them',
          'With infrastructure and payment providers acting on our instructions under contract',
          'Where the law requires it, or to protect the rights and safety of users',
          'On a business transfer, in which case you will be notified before your data moves',
        ],
      },
      {
        type: 'bullets',
        heading: 'Your rights',
        items: [
          'Access a copy of the personal data we hold about you',
          'Correct anything inaccurate, directly in Settings or by asking us',
          'Delete your account and associated project content',
          'Export your projects, BOQs and rate libraries in a portable format',
          'Object to or restrict certain processing',
        ],
      },
      {
        type: 'text',
        heading: 'Security and retention',
        body:
          'Data is encrypted in transit and at rest, access is role-based, and multi-factor authentication is available on every plan. We keep project content for as long as your account is active, and for 30 days after deletion to allow recovery from mistakes. Billing records are retained for the period tax law requires. Questions about this policy go to hello@buildq.ai.',
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    kicker: 'Legal',
    intro: 'The agreement between you and BuildQ AI for use of the platform. Last updated 1 June 2026.',
    blocks: [
      {
        type: 'text',
        heading: 'Agreement',
        body:
          'By creating an account or using BuildQ AI you agree to these terms. If you are accepting on behalf of a company, you confirm you have authority to bind that company. If you do not agree, do not use the service.',
      },
      {
        type: 'bullets',
        heading: 'Your account',
        items: [
          'You must give accurate registration details and keep them current',
          'You are responsible for activity under your account and for keeping credentials secure',
          'Organization admins control who may join, and with what role',
          'You must be legally able to enter a contract in your jurisdiction',
        ],
      },
      {
        type: 'bullets',
        heading: 'Acceptable use',
        items: [
          'Do not upload content you have no right to share',
          'Do not attempt to breach, probe or disrupt the service or other customers’ data',
          'Do not resell or white-label the service without a written agreement',
          'Do not use the service to break the law or infringe anyone’s rights',
        ],
      },
      {
        type: 'text',
        heading: 'Professional judgement',
        body:
          'BuildQ AI is a professional tool, not a substitute for a qualified quantity surveyor. Generated quantities, rates and estimates are decision support and carry confidence indicators for that reason. You remain responsible for reviewing, verifying and approving any output before you rely on it commercially, submit it in a tender, or issue it to a client.',
      },
      {
        type: 'bullets',
        heading: 'Plans and billing',
        items: [
          'Paid plans are billed monthly or annually in advance and renew automatically',
          'You can upgrade, downgrade or cancel at any time; changes are prorated',
          'Cancellation takes effect at the end of the current billing period',
          'Marketplace contact unlocks are one-off charges and are not refundable once contacts are revealed',
          'Fees exclude taxes unless stated otherwise',
        ],
      },
      {
        type: 'text',
        heading: 'Intellectual property',
        body:
          'You keep all rights in the content you upload and in the Bills of Quantities, estimates and reports produced from it. We keep all rights in the platform itself — the software, models, rate libraries and interfaces. You get a non-exclusive, non-transferable right to use the service for the duration of your subscription.',
      },
      {
        type: 'text',
        heading: 'Liability and changes',
        body:
          'The service is provided on an "as is" basis to the extent the law allows, and our aggregate liability is limited to the fees you paid in the twelve months before the claim. Nothing here excludes liability that cannot lawfully be excluded. We may update these terms; material changes will be notified at least 30 days before they take effect, and continuing to use the service after that constitutes acceptance. Questions go to hello@buildq.ai.',
      },
    ],
  },
}

export const pageSlugs = Object.keys(pages)
