import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'
import { normalizeUnit } from '@/utils/units'

// ---------------------------------------------------------------------------
// Vendor Marketplace store
// ---------------------------------------------------------------------------
// Contacts (phone / email / whatsapp) stay hidden until a buyer unlocks a
// vendor, and that hiding is real: the contact fields are simply ABSENT from
// the payload until the organization has paid. There is nothing to read out of
// devtools. Unlocking is two-phase — the server starts a Paystack transaction,
// and only a reference it has verified itself reveals anything.
//
// The marketplace starts EMPTY. It used to ship ~50 invented supplier listings
// with fabricated ratings, phone numbers and prices; those are gone. A vendor
// appears once a real business pays to list.
// ---------------------------------------------------------------------------

// One-off fee a business pays to publish a listing on the marketplace.
export const LISTING_FEE = 1000

// Category metadata — icon, accent and tagline are presentation and stay
// client-side. The slugs match the server's own list, and the per-category
// vendor COUNT comes from the server.
export const VENDOR_CATEGORIES = [
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

export const categories = VENDOR_CATEGORIES

export const useVendorsStore = defineStore('vendors', {
  state: () => ({
    categories: VENDOR_CATEGORIES,
    vendors: [],
    savedPrices: [],
    loading: false,
    error: null,
    loaded: false,
  }),

  getters: {
    // `unlocked` is decided by the server and travels with the vendor — the
    // contact fields are absent from the payload until it is true.
    isUnlocked: (s) => (id) => Boolean(s.vendors.find((v) => v.id === id)?.unlocked),
    vendorCount: (s) => s.vendors.length,
    unlockedCount: (s) => s.vendors.filter((v) => v.unlocked && !v.owned).length,
    savedCount: (s) => s.savedPrices.length,
    categoryCount: (s) => (slug) => s.vendors.filter((v) => v.category === slug).length,
    vendorsByCategory: (s) => (slug) =>
      slug === 'all' ? s.vendors : s.vendors.filter((v) => v.category === slug),
    categoryMeta: (s) => (slug) => s.categories.find((c) => c.slug === slug),
    ownListings: (s) => s.vendors.filter((v) => v.owned),
    hasListing: (s) => s.vendors.some((v) => v.owned),
  },

  actions: {
    async fetchCategories() {
      try {
        const data = await api.get('/vendor-categories')
        const counts = Object.fromEntries((data.categories || []).map((c) => [c.slug, c.vendors]))
        this.categories = VENDOR_CATEGORIES.map((c) => ({ ...c, vendors: counts[c.slug] ?? 0 }))
      } catch {
        /* the marketplace still browses without the counts */
      }
      return this.categories
    },

    async fetchVendors({ category, q, force = false } = {}) {
      if (this.loaded && !force && !category && !q) return this.vendors

      this.loading = true
      this.error = null
      try {
        const params = new URLSearchParams()
        if (category && category !== 'all') params.set('category', category)
        if (q) params.set('q', q)
        const query = params.toString()
        const data = await api.get('/vendors' + (query ? '?' + query : ''))
        this.vendors = data.vendors || []
        this.loaded = true
        return this.vendors
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load the marketplace.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchSavedPrices() {
      try {
        const data = await api.get('/saved-prices')
        this.savedPrices = data.savedPrices || []
      } catch {
        this.savedPrices = []
      }
      return this.savedPrices
    },

    async fetchAll() {
      await Promise.all([this.fetchCategories(), this.fetchVendors(), this.fetchSavedPrices()])
    },

    // ------------------------------------------------------------------
    // Unlocking a vendor's contacts
    // ------------------------------------------------------------------
    /**
     * Two-phase, because the browser is never trusted to decide that a payment
     * succeeded. Called with no reference this STARTS a Paystack transaction
     * and returns { unlocked: false, payment } to send the browser to. Called
     * again with that reference, the server verifies it against Paystack and
     * only then returns the vendor with its contacts attached.
     */
    async unlock(id, reference = null) {
      const res = await api.post('/vendors/' + id + '/unlock', reference ? { reference } : {})
      if (res.vendor) {
        const i = this.vendors.findIndex((v) => v.id === id)
        if (i !== -1) this.vendors[i] = res.vendor
      } else if (res.unlocked) {
        await this.fetchVendors({ force: true })
      }
      return res
    },

    // ------------------------------------------------------------------
    // Vendor self-registration
    // ------------------------------------------------------------------
    /**
     * Validate a listing before asking anyone for money. The server checks the
     * same rules again — this only spares the round trip.
     */
    validateListing(data, { ignoreId = null } = {}) {
      const errors = []
      const name = String(data.name || '').trim()
      const phone = String(data.phone || '').trim()
      const email = String(data.email || '').trim()

      if (name.length < 3) errors.push('Business name must be at least 3 characters.')
      if (!this.categories.some((c) => c.slug === data.category)) errors.push('Choose a category.')
      if (!String(data.location || '').trim()) errors.push('Add the town or city you trade from.')
      if (!/^[+\d][\d\s-]{7,}$/.test(phone)) errors.push('Enter a valid phone number.')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('Enter a valid email address.')

      const products = (data.products || []).filter((p) => String(p.name || '').trim())
      if (!products.length) errors.push('Add at least one product with a price.')
      if (products.some((p) => !(Number(p.price) > 0))) errors.push('Every product needs a price above zero.')
      if (products.some((p) => !String(p.unit || '').trim())) errors.push('Every product needs a unit.')

      const clash = this.vendors.some(
        (v) => v.id !== ignoreId && v.name.trim().toLowerCase() === name.toLowerCase()
      )
      if (clash) errors.push('A vendor with that business name is already listed.')

      return errors
    },

    /** The listing fields both create and update send, normalised once. */
    _listingBody(data) {
      return {
        name: String(data.name).trim(),
        category: data.category,
        location: String(data.location).trim(),
        phone: String(data.phone).trim(),
        email: String(data.email).trim(),
        ...(data.whatsapp ? { whatsapp: String(data.whatsapp).trim() } : {}),
        ...(data.years != null ? { years: Math.max(0, Number(data.years) || 0) } : {}),
        ...(data.description ? { description: String(data.description).trim() } : {}),
        ...(data.unlockPrice != null
          ? { unlockPrice: Math.max(0, Number(data.unlockPrice) || 0) }
          : {}),
        products: (data.products || [])
          .filter((p) => String(p.name || '').trim())
          .map((p) => ({
            name: String(p.name).trim(),
            unit: normalizeUnit(p.unit),
            price: Number(p.price),
          })),
      }
    },

    /**
     * Publish a listing. The server creates it as "Unpaid" and hands back a
     * Paystack authorization URL — the listing stays invisible to everyone else
     * until the fee clears, so publishing for free is not possible.
     */
    async registerVendor(data) {
      const errors = this.validateListing(data)
      if (errors.length) return { ok: false, errors }

      try {
        const res = await api.post('/vendors', this._listingBody(data))
        await this.fetchVendors({ force: true })
        // `payment` carries the authorization URL to send the browser to.
        return { ok: true, vendor: res.vendor, payment: res.payment ?? null }
      } catch (err) {
        return {
          ok: false,
          errors: [err instanceof ApiError ? err.message : 'That listing could not be published.'],
        }
      }
    },

    async updateListing(id, data) {
      const errors = this.validateListing(data, { ignoreId: id })
      if (errors.length) return { ok: false, errors }

      try {
        const res = await api.patch('/vendors/' + id, this._listingBody(data))
        const i = this.vendors.findIndex((v) => v.id === id)
        if (i !== -1) this.vendors[i] = res.vendor
        return { ok: true, vendor: res.vendor }
      } catch (err) {
        return {
          ok: false,
          errors: [err instanceof ApiError ? err.message : 'That listing could not be updated.'],
        }
      }
    },

    async removeListing(id) {
      try {
        await api.del('/vendors/' + id)
      } catch {
        return false
      }
      this.vendors = this.vendors.filter((v) => v.id !== id)
      this.savedPrices = this.savedPrices.filter((p) => p.vendorId !== id)
      return true
    },

    /** Saving a price requires an unlocked vendor — the server enforces that. */
    async savePrice(vendor, product) {
      try {
        const res = await api.post('/saved-prices', {
          vendorId: vendor.id,
          productName: product.name,
          unit: normalizeUnit(product.unit) || product.unit,
          rate: Math.round(Number(product.price) || 0),
        })
        this.savedPrices.unshift(res.savedPrice)
        return true
      } catch {
        return false
      }
    },

    async removeSavedPrice(id) {
      this.savedPrices = this.savedPrices.filter((p) => p.id !== id)
      try {
        await api.del('/saved-prices/' + id)
      } catch {
        /* already gone server-side */
      }
    },
  },
})
