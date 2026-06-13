import { defineStore } from 'pinia'

// ---------------------------------------------------------------------------
// Vendor Marketplace store
// ---------------------------------------------------------------------------
// Contacts (phone / email / whatsapp) stay HIDDEN until a buyer unlocks a
// vendor with a one-off mock payment. Unlocked vendor ids + any prices the
// user saves for estimating are persisted to localStorage so the unlock
// "sticks" across reloads — the rest of the app is mock-only too.
// ---------------------------------------------------------------------------

const UNLOCK_KEY = 'buildq.vendors.unlocked'
const SAVED_KEY = 'buildq.vendors.savedPrices'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// --- Categories ------------------------------------------------------------
// icon = lucide-vue-next component name, resolved in the view.
export const categories = [
  { slug: 'roofing', name: 'Roofing Sheets', tagline: 'Aluminium, stone-coated & longspan', icon: 'Home', accent: 'from-primary to-primary-dark' },
  { slug: 'cement', name: 'Cement & Binders', tagline: 'Dangote, BUA, Lafarge & more', icon: 'Package', accent: 'from-secondary to-secondary-variant' },
  { slug: 'blocks', name: 'Blocks & Bricks', tagline: 'Sandcrete, hollow & interlocking', icon: 'Boxes', accent: 'from-success to-primary' },
  { slug: 'carpentry', name: 'Carpentry & Timber', tagline: 'Hardwood, plywood, doors & joinery', icon: 'Hammer', accent: 'from-warning to-danger' },
  { slug: 'steel', name: 'Steel & Reinforcement', tagline: 'Rebar, BRC mesh & structural steel', icon: 'Wrench', accent: 'from-secondary-variant to-secondary' },
  { slug: 'tiles', name: 'Tiles & Flooring', tagline: 'Ceramic, vitrified, marble & granite', icon: 'Grid3x3', accent: 'from-primary-light to-primary' },
  { slug: 'plumbing', name: 'Plumbing & Fittings', tagline: 'Pipes, tanks, taps & sanitary ware', icon: 'Droplets', accent: 'from-primary to-success' },
  { slug: 'electrical', name: 'Electrical & Fittings', tagline: 'Cables, DBs, fittings & solar', icon: 'Zap', accent: 'from-warning to-primary' },
  { slug: 'paint', name: 'Paints & Finishes', tagline: 'Emulsion, textured, POP & screeding', icon: 'Paintbrush', accent: 'from-danger to-warning' },
  { slug: 'aggregates', name: 'Sand & Aggregates', tagline: 'Sharp sand, granite & laterite', icon: 'Mountain', accent: 'from-secondary to-primary-dark' },
]

// --- Vendors ---------------------------------------------------------------
let _id = 0
const v = (data) => ({
  id: 'VND-' + String(++_id).padStart(3, '0'),
  rating: 4.5,
  reviews: 40,
  years: 5,
  verified: true,
  unlockPrice: 1000,
  ...data,
})

const vendors = [
  // ---------------- Roofing Sheets ----------------
  v({ name: 'StoneCoat Roofing Ltd', category: 'roofing', location: 'Ikeja, Lagos', phone: '+234 803 412 7785', email: 'sales@stonecoat.ng', whatsapp: '+234 803 412 7785', rating: 4.8, reviews: 214, years: 12, products: [
    { name: 'Stone-coated step tile (Milano)', unit: 'm²', price: 6800 },
    { name: 'Stone-coated shingle', unit: 'm²', price: 7200 },
    { name: 'Ridge cap & accessories', unit: 'no', price: 3500 },
  ] }),
  v({ name: 'Alumaco Longspan Depot', category: 'roofing', location: 'Mararaba, Abuja', phone: '+234 805 998 1023', email: 'orders@alumaco.com', whatsapp: '+234 805 998 1023', rating: 4.6, reviews: 168, years: 9, products: [
    { name: 'Aluminium longspan 0.55mm', unit: 'm²', price: 9200 },
    { name: 'Aluminium longspan 0.45mm', unit: 'm²', price: 7600 },
    { name: 'Step screws (pack of 100)', unit: 'pack', price: 4500 },
  ] }),
  v({ name: 'RoofMart Nigeria', category: 'roofing', location: 'Trans-Amadi, Port Harcourt', phone: '+234 802 776 5510', email: 'info@roofmart.ng', whatsapp: '+234 802 776 5510', rating: 4.4, reviews: 91, years: 6, products: [
    { name: 'Gerard classic tile', unit: 'm²', price: 7800 },
    { name: 'Aluzinc longspan 0.5mm', unit: 'm²', price: 8400 },
  ] }),
  v({ name: 'Dover Stone Tiles', category: 'roofing', location: 'Awka, Anambra', phone: '+234 806 233 8841', email: 'dover.tiles@gmail.com', whatsapp: '+234 806 233 8841', rating: 4.7, reviews: 132, years: 8, products: [
    { name: 'Stone-coated bond tile', unit: 'm²', price: 6500 },
    { name: 'Nosing & valley flashing', unit: 'm', price: 2800 },
  ] }),
  v({ name: 'Coverland Roofs', category: 'roofing', location: 'Ring Road, Ibadan', phone: '+234 809 145 6677', email: 'sales@coverland.ng', whatsapp: '+234 809 145 6677', rating: 4.5, reviews: 77, years: 5, products: [
    { name: 'Stone-coated classic tile', unit: 'm²', price: 6900 },
    { name: 'Galvanised longspan 0.5mm', unit: 'm²', price: 6200 },
  ] }),
  v({ name: 'Apex Aluminium Works', category: 'roofing', location: 'Aba, Abia', phone: '+234 807 552 9930', email: 'apexalum@yahoo.com', whatsapp: '+234 807 552 9930', rating: 4.3, reviews: 64, years: 7, products: [
    { name: 'Aluminium longspan 0.55mm', unit: 'm²', price: 9000 },
    { name: 'Roofing nails (50kg bag)', unit: 'bag', price: 38000 },
  ] }),

  // ---------------- Cement & Binders ----------------
  v({ name: 'Dangote Cement Distributor', category: 'cement', location: 'Apapa, Lagos', phone: '+234 803 001 4422', email: 'lagos@dcpdist.ng', whatsapp: '+234 803 001 4422', rating: 4.9, reviews: 402, years: 15, products: [
    { name: 'Dangote 3X (42.5R) 50kg', unit: 'bag', price: 9500 },
    { name: 'Full trailer (600 bags)', unit: 'trailer', price: 5550000 },
  ] }),
  v({ name: 'BUA Cement Hub', category: 'cement', location: 'Kano', phone: '+234 805 667 1180', email: 'sales@buahub.ng', whatsapp: '+234 805 667 1180', rating: 4.7, reviews: 233, years: 10, products: [
    { name: 'BUA Cement 50kg', unit: 'bag', price: 9300 },
    { name: 'Half trailer (300 bags)', unit: 'load', price: 2760000 },
  ] }),
  v({ name: 'Lafarge Elephant Depot', category: 'cement', location: 'Ewekoro, Ogun', phone: '+234 802 339 7741', email: 'depot@lafargedist.com', whatsapp: '+234 802 339 7741', rating: 4.6, reviews: 156, years: 11, products: [
    { name: 'Elephant Supaset 50kg', unit: 'bag', price: 9600 },
    { name: 'Powermax 50kg', unit: 'bag', price: 9450 },
  ] }),
  v({ name: 'BuildWell Cement Stores', category: 'cement', location: 'Wuse, Abuja', phone: '+234 809 884 2200', email: 'orders@buildwell.ng', whatsapp: '+234 809 884 2200', rating: 4.5, reviews: 98, years: 6, products: [
    { name: 'Dangote 3X 50kg', unit: 'bag', price: 9700 },
    { name: 'Lime (hydrated) 25kg', unit: 'bag', price: 6500 },
  ] }),
  v({ name: 'Citadel Building Materials', category: 'cement', location: 'Uyo, Akwa Ibom', phone: '+234 806 712 4419', email: 'citadelbm@gmail.com', whatsapp: '+234 806 712 4419', rating: 4.4, reviews: 71, years: 7, products: [
    { name: 'BUA Cement 50kg', unit: 'bag', price: 9550 },
    { name: 'White cement 50kg', unit: 'bag', price: 16500 },
  ] }),

  // ---------------- Blocks & Bricks ----------------
  v({ name: 'SolidBlock Industries', category: 'blocks', location: 'Sangotedo, Lagos', phone: '+234 803 556 8821', email: 'sales@solidblock.ng', whatsapp: '+234 803 556 8821', rating: 4.7, reviews: 187, years: 9, products: [
    { name: 'Sandcrete block 9" (vibrated)', unit: 'no', price: 480 },
    { name: 'Sandcrete block 6"', unit: 'no', price: 400 },
    { name: 'Hollow block 9"', unit: 'no', price: 520 },
  ] }),
  v({ name: 'InterPave Blocks', category: 'blocks', location: 'Lugbe, Abuja', phone: '+234 805 220 7763', email: 'interpave@outlook.com', whatsapp: '+234 805 220 7763', rating: 4.6, reviews: 142, years: 8, products: [
    { name: 'Interlocking paving block', unit: 'm²', price: 5200 },
    { name: 'Kerb stone', unit: 'no', price: 1800 },
  ] }),
  v({ name: 'RockFirm Blocks', category: 'blocks', location: 'Enugu', phone: '+234 802 998 4410', email: 'rockfirm@gmail.com', whatsapp: '+234 802 998 4410', rating: 4.5, reviews: 88, years: 6, products: [
    { name: 'Sandcrete block 9"', unit: 'no', price: 470 },
    { name: 'Solid block 9"', unit: 'no', price: 560 },
  ] }),
  v({ name: 'ClayCraft Bricks', category: 'blocks', location: 'Jos, Plateau', phone: '+234 809 337 6628', email: 'sales@claycraft.ng', whatsapp: '+234 809 337 6628', rating: 4.8, reviews: 113, years: 12, products: [
    { name: 'Fired clay brick (facing)', unit: 'no', price: 320 },
    { name: 'Perforated clay brick', unit: 'no', price: 290 },
  ] }),
  v({ name: 'Foundation Blockworks', category: 'blocks', location: 'Benin City, Edo', phone: '+234 807 661 2204', email: 'foundationblocks@yahoo.com', whatsapp: '+234 807 661 2204', rating: 4.3, reviews: 59, years: 5, products: [
    { name: 'Sandcrete block 6"', unit: 'no', price: 390 },
    { name: 'Hollow block 9"', unit: 'no', price: 510 },
  ] }),

  // ---------------- Carpentry & Timber ----------------
  v({ name: 'Mahogany Timber Yard', category: 'carpentry', location: 'Oko-Oba, Lagos', phone: '+234 803 774 1182', email: 'sales@mahoganyyard.ng', whatsapp: '+234 803 774 1182', rating: 4.7, reviews: 164, years: 14, products: [
    { name: 'Hardwood 2x2 (12ft)', unit: 'length', price: 2200 },
    { name: 'Hardwood 2x4 (12ft)', unit: 'length', price: 4100 },
    { name: 'Marine plywood 18mm', unit: 'sheet', price: 28000 },
  ] }),
  v({ name: 'WoodCraft Joinery', category: 'carpentry', location: 'Kubwa, Abuja', phone: '+234 805 119 8847', email: 'woodcraft@gmail.com', whatsapp: '+234 805 119 8847', rating: 4.8, reviews: 121, years: 10, products: [
    { name: 'Flush door + hardwood frame', unit: 'no', price: 65000 },
    { name: 'Wardrobe carcass (per run)', unit: 'm', price: 42000 },
  ] }),
  v({ name: 'Sapele Wood Depot', category: 'carpentry', location: 'Sapele, Delta', phone: '+234 802 445 9930', email: 'sapelewood@outlook.com', whatsapp: '+234 802 445 9930', rating: 4.6, reviews: 97, years: 11, products: [
    { name: 'Sapele plank 1x12 (12ft)', unit: 'length', price: 5600 },
    { name: 'Mahogany plank 1x10', unit: 'length', price: 4800 },
  ] }),
  v({ name: 'PlyMart Boards', category: 'carpentry', location: 'Onitsha, Anambra', phone: '+234 809 663 2218', email: 'plymart@gmail.com', whatsapp: '+234 809 663 2218', rating: 4.4, reviews: 73, years: 7, products: [
    { name: 'Plywood 12mm', unit: 'sheet', price: 18500 },
    { name: 'MDF board 18mm', unit: 'sheet', price: 21000 },
  ] }),
  v({ name: 'Carpenters Hub NG', category: 'carpentry', location: 'Akure, Ondo', phone: '+234 807 228 5561', email: 'carpentershub@yahoo.com', whatsapp: '+234 807 228 5561', rating: 4.5, reviews: 68, years: 6, products: [
    { name: 'Roof truss timber (per m²)', unit: 'm²', price: 3800 },
    { name: 'Ceiling noggin set', unit: 'm²', price: 1500 },
  ] }),

  // ---------------- Steel & Reinforcement ----------------
  v({ name: 'IronRod Steel Mart', category: 'steel', location: 'Ikorodu, Lagos', phone: '+234 803 992 1147', email: 'sales@ironrodmart.ng', whatsapp: '+234 803 992 1147', rating: 4.8, reviews: 248, years: 13, products: [
    { name: 'Y16 reinforcement bar', unit: 'tonne', price: 980000 },
    { name: 'Y12 reinforcement bar', unit: 'tonne', price: 985000 },
    { name: 'BRC mesh A142', unit: 'sheet', price: 32000 },
  ] }),
  v({ name: 'Federated Steel Co.', category: 'steel', location: 'Ota, Ogun', phone: '+234 805 443 7762', email: 'orders@federatedsteel.com', whatsapp: '+234 805 443 7762', rating: 4.7, reviews: 176, years: 16, products: [
    { name: 'Y10 reinforcement bar', unit: 'tonne', price: 990000 },
    { name: 'UB/UC structural section', unit: 'tonne', price: 1250000 },
  ] }),
  v({ name: 'PrimeBar Distributors', category: 'steel', location: 'Kaduna', phone: '+234 802 117 5538', email: 'primebar@gmail.com', whatsapp: '+234 802 117 5538', rating: 4.5, reviews: 102, years: 8, products: [
    { name: 'Y16 reinforcement bar', unit: 'tonne', price: 975000 },
    { name: 'Binding wire (25kg)', unit: 'roll', price: 38000 },
  ] }),
  v({ name: 'MeshTech Steel', category: 'steel', location: 'Nnewi, Anambra', phone: '+234 809 558 9921', email: 'meshtech@outlook.com', whatsapp: '+234 809 558 9921', rating: 4.6, reviews: 84, years: 9, products: [
    { name: 'BRC mesh A193', unit: 'sheet', price: 41000 },
    { name: 'Angle iron 50x50x5', unit: 'length', price: 18500 },
  ] }),
  v({ name: 'BuildSteel Depot', category: 'steel', location: 'Warri, Delta', phone: '+234 807 334 1129', email: 'buildsteel@yahoo.com', whatsapp: '+234 807 334 1129', rating: 4.4, reviews: 61, years: 6, products: [
    { name: 'Y12 reinforcement bar', unit: 'tonne', price: 988000 },
    { name: 'Flat bar 40x6', unit: 'length', price: 9800 },
  ] }),

  // ---------------- Tiles & Flooring ----------------
  v({ name: 'TileScape Showroom', category: 'tiles', location: 'Lekki, Lagos', phone: '+234 803 221 9984', email: 'sales@tilescape.ng', whatsapp: '+234 803 221 9984', rating: 4.8, reviews: 209, years: 10, products: [
    { name: 'Vitrified floor tile 600x600', unit: 'm²', price: 11500 },
    { name: 'Porcelain wall tile 300x600', unit: 'm²', price: 9800 },
    { name: 'Polished marble slab', unit: 'm²', price: 42000 },
  ] }),
  v({ name: 'Marble & More', category: 'tiles', location: 'Maitama, Abuja', phone: '+234 805 778 3310', email: 'info@marbleandmore.ng', whatsapp: '+234 805 778 3310', rating: 4.9, reviews: 187, years: 12, products: [
    { name: 'Italian marble (premium)', unit: 'm²', price: 68000 },
    { name: 'Granite slab (polished)', unit: 'm²', price: 38000 },
  ] }),
  v({ name: 'CeramicWorld NG', category: 'tiles', location: 'Owerri, Imo', phone: '+234 802 664 1175', email: 'ceramicworld@gmail.com', whatsapp: '+234 802 664 1175', rating: 4.5, reviews: 96, years: 7, products: [
    { name: 'Ceramic floor tile 400x400', unit: 'm²', price: 6800 },
    { name: 'Ceramic wall tile 250x400', unit: 'm²', price: 6200 },
  ] }),
  v({ name: 'FloorPro Tiles', category: 'tiles', location: 'Ibadan, Oyo', phone: '+234 809 442 7763', email: 'floorpro@outlook.com', whatsapp: '+234 809 442 7763', rating: 4.4, reviews: 74, years: 6, products: [
    { name: 'Vitrified tile 600x600 (matte)', unit: 'm²', price: 10800 },
    { name: 'Skirting tile', unit: 'm', price: 1900 },
  ] }),
  v({ name: 'Granite Galleria', category: 'tiles', location: 'Asaba, Delta', phone: '+234 807 119 5582', email: 'granitegalleria@yahoo.com', whatsapp: '+234 807 119 5582', rating: 4.6, reviews: 81, years: 8, products: [
    { name: 'Granite worktop (per m)', unit: 'm', price: 55000 },
    { name: 'Terrazzo (cast in-situ)', unit: 'm²', price: 14500 },
  ] }),

  // ---------------- Plumbing & Fittings ----------------
  v({ name: 'AquaFlow Plumbing', category: 'plumbing', location: 'Surulere, Lagos', phone: '+234 803 887 2241', email: 'sales@aquaflow.ng', whatsapp: '+234 803 887 2241', rating: 4.7, reviews: 158, years: 11, products: [
    { name: 'PVC pipe 4" (per length)', unit: 'length', price: 4800 },
    { name: 'PPR pipe 20mm', unit: 'length', price: 2600 },
    { name: 'Water closet (complete set)', unit: 'set', price: 95000 },
  ] }),
  v({ name: 'PipeLine Stores', category: 'plumbing', location: 'Gwarinpa, Abuja', phone: '+234 805 553 8829', email: 'pipeline@gmail.com', whatsapp: '+234 805 553 8829', rating: 4.5, reviews: 102, years: 8, products: [
    { name: 'GP overhead tank 1000L', unit: 'no', price: 78000 },
    { name: 'Pressure pump (0.5HP)', unit: 'no', price: 62000 },
  ] }),
  v({ name: 'SanitaryWare Hub', category: 'plumbing', location: 'Aba, Abia', phone: '+234 802 229 6610', email: 'sanitaryhub@outlook.com', whatsapp: '+234 802 229 6610', rating: 4.6, reviews: 89, years: 7, products: [
    { name: 'Wash hand basin + pedestal', unit: 'set', price: 42000 },
    { name: 'Kitchen mixer tap', unit: 'no', price: 28000 },
  ] }),
  v({ name: 'FlowMaster Fittings', category: 'plumbing', location: 'Port Harcourt', phone: '+234 809 771 4438', email: 'flowmaster@yahoo.com', whatsapp: '+234 809 771 4438', rating: 4.4, reviews: 67, years: 6, products: [
    { name: 'PVC pipe 3"', unit: 'length', price: 3600 },
    { name: 'Gate valve 2"', unit: 'no', price: 8500 },
  ] }),
  v({ name: 'HydroBuild Supplies', category: 'plumbing', location: 'Ilorin, Kwara', phone: '+234 807 446 1193', email: 'hydrobuild@gmail.com', whatsapp: '+234 807 446 1193', rating: 4.5, reviews: 58, years: 5, products: [
    { name: 'Soakaway ring', unit: 'no', price: 12000 },
    { name: 'Floor trap & grating', unit: 'no', price: 4200 },
  ] }),

  // ---------------- Electrical & Fittings ----------------
  v({ name: 'VoltEdge Electricals', category: 'electrical', location: 'Ojota, Lagos', phone: '+234 803 665 1129', email: 'sales@voltedge.ng', whatsapp: '+234 803 665 1129', rating: 4.8, reviews: 176, years: 12, products: [
    { name: '2.5mm² single core cable (per m)', unit: 'm', price: 520 },
    { name: '6-way distribution board', unit: 'no', price: 28000 },
    { name: 'Surface conduit (per length)', unit: 'length', price: 1900 },
  ] }),
  v({ name: 'PowerLine Stores', category: 'electrical', location: 'Garki, Abuja', phone: '+234 805 882 3317', email: 'powerline@gmail.com', whatsapp: '+234 805 882 3317', rating: 4.6, reviews: 121, years: 9, products: [
    { name: '1.5mm² cable (per m)', unit: 'm', price: 380 },
    { name: '13A switched socket', unit: 'no', price: 3200 },
  ] }),
  v({ name: 'SolarBright Energy', category: 'electrical', location: 'Ibadan, Oyo', phone: '+234 802 553 7741', email: 'info@solarbright.ng', whatsapp: '+234 802 553 7741', rating: 4.9, reviews: 143, years: 7, products: [
    { name: 'Solar panel 450W mono', unit: 'no', price: 145000 },
    { name: 'Inverter 3.5kVA hybrid', unit: 'no', price: 420000 },
  ] }),
  v({ name: 'CircuitPro Fittings', category: 'electrical', location: 'Enugu', phone: '+234 809 117 6628', email: 'circuitpro@outlook.com', whatsapp: '+234 809 117 6628', rating: 4.4, reviews: 72, years: 6, products: [
    { name: 'LED panel light 18W', unit: 'no', price: 4800 },
    { name: 'Ceiling fan (56")', unit: 'no', price: 22000 },
  ] }),
  v({ name: 'Wattline Supplies', category: 'electrical', location: 'Kaduna', phone: '+234 807 334 9921', email: 'wattline@yahoo.com', whatsapp: '+234 807 334 9921', rating: 4.5, reviews: 64, years: 5, products: [
    { name: '4mm² cable (per m)', unit: 'm', price: 760 },
    { name: 'MCB 32A', unit: 'no', price: 3500 },
  ] }),

  // ---------------- Paints & Finishes ----------------
  v({ name: 'ColourMix Paints', category: 'paint', location: 'Yaba, Lagos', phone: '+234 803 442 7718', email: 'sales@colourmix.ng', whatsapp: '+234 803 442 7718', rating: 4.7, reviews: 168, years: 10, products: [
    { name: 'Emulsion paint (20L)', unit: 'bucket', price: 38000 },
    { name: 'Textured coating (25kg)', unit: 'bucket', price: 52000 },
    { name: 'Screeding putty (25kg)', unit: 'bag', price: 12500 },
  ] }),
  v({ name: 'FinishLine Coatings', category: 'paint', location: 'Wuye, Abuja', phone: '+234 805 229 6643', email: 'finishline@gmail.com', whatsapp: '+234 805 229 6643', rating: 4.6, reviews: 112, years: 8, products: [
    { name: 'Silk vinyl emulsion (20L)', unit: 'bucket', price: 46000 },
    { name: 'Gloss paint (4L)', unit: 'tin', price: 14500 },
  ] }),
  v({ name: 'POP Masters', category: 'paint', location: 'Benin City, Edo', phone: '+234 802 778 1130', email: 'popmasters@outlook.com', whatsapp: '+234 802 778 1130', rating: 4.8, reviews: 96, years: 9, products: [
    { name: 'POP ceiling (per m²)', unit: 'm²', price: 4200 },
    { name: 'POP screeding (per m²)', unit: 'm²', price: 1800 },
  ] }),
  v({ name: 'PrimeCoat Paints', category: 'paint', location: 'Aba, Abia', phone: '+234 809 553 2218', email: 'primecoat@yahoo.com', whatsapp: '+234 809 553 2218', rating: 4.4, reviews: 68, years: 6, products: [
    { name: 'Emulsion paint (20L)', unit: 'bucket', price: 34000 },
    { name: 'Wood lacquer (4L)', unit: 'tin', price: 16800 },
  ] }),
  v({ name: 'TexturePro Finishes', category: 'paint', location: 'Uyo, Akwa Ibom', phone: '+234 807 116 4419', email: 'texturepro@gmail.com', whatsapp: '+234 807 116 4419', rating: 4.5, reviews: 54, years: 5, products: [
    { name: 'Stucco textured finish (per m²)', unit: 'm²', price: 5600 },
    { name: 'Marble-stone wall finish (per m²)', unit: 'm²', price: 8400 },
  ] }),

  // ---------------- Sand & Aggregates ----------------
  v({ name: 'GraniteSource Quarry', category: 'aggregates', location: 'Mowe, Ogun', phone: '+234 803 119 8842', email: 'sales@granitesource.ng', whatsapp: '+234 803 119 8842', rating: 4.7, reviews: 152, years: 14, products: [
    { name: 'Granite 3/4" (per trip — 20T)', unit: 'trip', price: 320000 },
    { name: 'Granite 1/2" (per m³)', unit: 'm³', price: 42000 },
  ] }),
  v({ name: 'SharpSand Logistics', category: 'aggregates', location: 'Ikorodu, Lagos', phone: '+234 805 663 7729', email: 'sharpsand@gmail.com', whatsapp: '+234 805 663 7729', rating: 4.5, reviews: 118, years: 9, products: [
    { name: 'Sharp sand (per trip — 20T)', unit: 'trip', price: 95000 },
    { name: 'Plaster sand (per m³)', unit: 'm³', price: 16000 },
  ] }),
  v({ name: 'AggregatePro NG', category: 'aggregates', location: 'Abuja', phone: '+234 802 558 3310', email: 'aggregatepro@outlook.com', whatsapp: '+234 802 558 3310', rating: 4.6, reviews: 87, years: 7, products: [
    { name: 'Laterite (per trip — 30T)', unit: 'trip', price: 110000 },
    { name: 'Crushed stone base', unit: 'm³', price: 24000 },
  ] }),
  v({ name: 'Riverbed Sand Co.', category: 'aggregates', location: 'Onitsha, Anambra', phone: '+234 809 226 6618', email: 'riverbed@yahoo.com', whatsapp: '+234 809 226 6618', rating: 4.4, reviews: 63, years: 6, products: [
    { name: 'River sand (per trip — 20T)', unit: 'trip', price: 88000 },
    { name: 'Filling sand (per trip)', unit: 'trip', price: 65000 },
  ] }),
  v({ name: 'StoneHaul Aggregates', category: 'aggregates', location: 'Akure, Ondo', phone: '+234 807 449 1193', email: 'stonehaul@gmail.com', whatsapp: '+234 807 449 1193', rating: 4.5, reviews: 49, years: 5, products: [
    { name: 'Granite 3/4" (per m³)', unit: 'm³', price: 40000 },
    { name: 'Stone dust (per trip)', unit: 'trip', price: 72000 },
  ] }),
]

export const useVendorsStore = defineStore('vendors', {
  state: () => ({
    categories,
    vendors,
    unlockedIds: load(UNLOCK_KEY, []),
    savedPrices: load(SAVED_KEY, []),
  }),
  getters: {
    isUnlocked: (s) => (id) => s.unlockedIds.includes(id),
    vendorCount: (s) => s.vendors.length,
    unlockedCount: (s) => s.unlockedIds.length,
    savedCount: (s) => s.savedPrices.length,
    categoryCount: (s) => (slug) => s.vendors.filter((v) => v.category === slug).length,
    vendorsByCategory: (s) => (slug) =>
      slug === 'all' ? s.vendors : s.vendors.filter((v) => v.category === slug),
    categoryMeta: (s) => (slug) => s.categories.find((c) => c.slug === slug),
  },
  actions: {
    unlock(id) {
      if (!this.unlockedIds.includes(id)) {
        this.unlockedIds.push(id)
        this._persist(UNLOCK_KEY, this.unlockedIds)
      }
    },
    savePrice(vendor, product) {
      const entry = {
        id: vendor.id + ':' + product.name,
        vendor: vendor.name,
        item: product.name,
        unit: product.unit,
        rate: product.price,
        category: vendor.category,
        savedAt: new Date().toISOString(),
      }
      if (!this.savedPrices.some((p) => p.id === entry.id)) {
        this.savedPrices.unshift(entry)
        this._persist(SAVED_KEY, this.savedPrices)
        return true
      }
      return false
    },
    removeSavedPrice(id) {
      this.savedPrices = this.savedPrices.filter((p) => p.id !== id)
      this._persist(SAVED_KEY, this.savedPrices)
    },
    _persist(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* storage unavailable — keep in-memory only */
      }
    },
  },
})
