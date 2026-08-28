<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Store, Search, Star, MapPin, Phone, Mail, MessageCircle, Lock, ShieldCheck,
  BadgeCheck, Sparkles, X, CreditCard, Bookmark, BookmarkCheck, Trash2,
  CheckCircle2, Building2, ArrowRight, Plus, Pencil, Clock, AlertCircle,
  Home, Package, Boxes, Hammer, Wrench, Grid3x3, Droplets, Zap, Paintbrush, Mountain,
} from 'lucide-vue-next'
import { useVendorsStore, LISTING_FEE } from '@/stores/vendors'
import { useToast } from '@/composables/useToast'
import { formatFull } from '@/utils/format'
import { normalizeUnit, COMMON_UNITS } from '@/utils/units'

const store = useVendorsStore()
const { toast } = useToast()

// Map the icon names stored in the categories data → real components.
const icons = { Home, Package, Boxes, Hammer, Wrench, Grid3x3, Droplets, Zap, Paintbrush, Mountain }

const query = ref('')
const activeCat = ref('all')

const activeVendor = ref(null)   // vendor open in profile modal
const payingFor = ref(null)      // vendor pending payment in unlock modal
const paid = ref(false)          // success state inside unlock modal
const showSaved = ref(false)     // saved-prices drawer
const registerOpen = ref(false)  // vendor sign-up / edit listing modal
const editingId = ref(null)      // set when editing an existing own listing
const formErrors = ref([])
const listingPayOpen = ref(false) // ₦1,000 listing fee, before a shop goes live
const listingPaid = ref(false)

// --- vendor registration ---------------------------------------------------
function blankListing() {
  return {
    name: '',
    category: 'cement',
    location: '',
    phone: '',
    email: '',
    whatsapp: '',
    years: 1,
    unlockPrice: 1000,
    description: '',
    products: [{ name: '', unit: '', price: null }],
  }
}

const listing = ref(blankListing())

function openRegister() {
  listing.value = blankListing()
  editingId.value = null
  formErrors.value = []
  registerOpen.value = true
}

function editListing(v) {
  listing.value = {
    name: v.name,
    category: v.category,
    location: v.location,
    phone: v.phone,
    email: v.email,
    whatsapp: v.whatsapp || '',
    years: v.years,
    unlockPrice: v.unlockPrice,
    description: v.description || '',
    products: v.products.length ? v.products.map((p) => ({ ...p })) : [{ name: '', unit: '', price: null }],
  }
  editingId.value = v.id
  formErrors.value = []
  activeVendor.value = null
  registerOpen.value = true
}

function addProductRow() {
  listing.value.products.push({ name: '', unit: '', price: null })
}
function removeProductRow(i) {
  if (listing.value.products.length === 1) {
    listing.value.products = [{ name: '', unit: '', price: null }]
    return
  }
  listing.value.products.splice(i, 1)
}

function submitListing() {
  // Editing a shop you already paid for is free.
  if (editingId.value) {
    const res = store.updateListing(editingId.value, listing.value)
    if (!res.ok) {
      formErrors.value = res.errors
      return
    }
    formErrors.value = []
    registerOpen.value = false
    toast(`${res.vendor.name} updated`)
    editingId.value = null
    activeVendor.value = res.vendor
    return
  }

  // Validate before asking anyone for money.
  const errors = store.validateListing(listing.value)
  if (errors.length) {
    formErrors.value = errors
    return
  }
  formErrors.value = []
  listingPaid.value = false
  listingPayOpen.value = true
}

function confirmListingPayment() {
  const res = store.registerVendor(listing.value, { feePaid: true })
  if (!res.ok) {
    formErrors.value = res.errors
    listingPayOpen.value = false
    return
  }
  listingPaid.value = true
  toast(`Listing fee paid — ${res.vendor.name} is now on the marketplace`)
  activeVendor.value = res.vendor
}

function closeListingPayment() {
  listingPayOpen.value = false
  // Only clear the form once the listing actually went live.
  if (listingPaid.value) {
    registerOpen.value = false
    editingId.value = null
    listing.value = blankListing()
  }
  listingPaid.value = false
}

function deleteListing(v) {
  if (v && store.removeListing(v.id)) {
    activeVendor.value = null
    registerOpen.value = false
    toast(`${v.name} removed from the marketplace`, 'info')
  }
}

// --- modal behaviour -------------------------------------------------------
const anyModalOpen = computed(
  () => !!activeVendor.value || !!payingFor.value || showSaved.value || registerOpen.value || listingPayOpen.value
)

function closeTopmost() {
  if (listingPayOpen.value) closeListingPayment()
  else if (registerOpen.value) registerOpen.value = false
  else if (payingFor.value) closePayment()
  else if (activeVendor.value) activeVendor.value = null
  else if (showSaved.value) showSaved.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') closeTopmost()
}

// Stop the page behind a modal from scrolling with it.
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.vendorsByCategory(activeCat.value).filter((v) => {
    if (!q) return true
    return (
      v.name.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q) ||
      v.products.some((p) => p.name.toLowerCase().includes(q))
    )
  })
})

const heading = computed(() =>
  activeCat.value === 'all' ? 'All vendors' : store.categoryMeta(activeCat.value)?.name
)

function openVendor(v) {
  activeVendor.value = v
}
function startPayment(v) {
  payingFor.value = v
  paid.value = false
}
function confirmPayment() {
  store.unlock(payingFor.value.id)
  paid.value = true
  toast(`Contacts unlocked for ${payingFor.value.name}`)
}
function closePayment() {
  payingFor.value = null
  paid.value = false
}
function savePrice(vendor, product) {
  const added = store.savePrice(vendor, product)
  toast(added ? `${product.name} added to your estimate prices` : 'Already saved', added ? 'success' : 'info')
}
</script>

<template>
  <div>
    <datalist id="unit-options">
      <option v-for="u in COMMON_UNITS" :key="u" :value="u" />
    </datalist>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-display text-2xl font-bold text-secondary">Vendor Marketplace</h2>
          <p class="mt-1 text-brand-muted">Verified suppliers across Nigeria · unlock contacts, confirm live prices, feed your estimates</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-outline btn-md" @click="showSaved = true">
            <Bookmark class="h-4 w-4" /> Saved prices
            <span v-if="store.savedCount" class="badge bg-primary/10 text-primary-dark">{{ store.savedCount }}</span>
          </button>
          <button class="btn-primary btn-md" @click="openRegister">
            <Store class="h-4 w-4" /> List your business · {{ formatFull(LISTING_FEE) }}
          </button>
        </div>
      </div>

      <!-- Your listings -->
      <div v-if="store.ownListings.length" class="card p-5">
        <div class="mb-3 flex items-center gap-2">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Store class="h-4 w-4" /></div>
          <h3 class="font-display font-bold text-secondary">Your listings</h3>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="v in store.ownListings" :key="v.id" class="flex items-center gap-3 rounded-xl border border-brand-border-light p-3">
            <div :class="['bg-gradient-to-br', store.categoryMeta(v.category)?.accent]" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white">
              <component :is="icons[store.categoryMeta(v.category)?.icon]" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-secondary">{{ v.name }}</p>
              <p class="truncate text-xs text-brand-muted">{{ v.products.length }} products · {{ v.location }}</p>
            </div>
            <span class="badge shrink-0 bg-warning/10 text-warning"><Clock class="h-3 w-3" /> {{ v.status }}</span>
            <button class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary" title="Edit listing" @click="editListing(v)">
              <Pencil class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Stat strip -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="card flex items-center gap-3 p-4">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Store class="h-5 w-5" /></div>
          <div><p class="font-display text-xl font-bold text-secondary">{{ store.vendorCount }}</p><p class="text-xs text-brand-muted">Vendors</p></div>
        </div>
        <div class="card flex items-center gap-3 p-4">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-secondary/10 text-secondary"><Boxes class="h-5 w-5" /></div>
          <div><p class="font-display text-xl font-bold text-secondary">{{ store.categories.length }}</p><p class="text-xs text-brand-muted">Categories</p></div>
        </div>
        <div class="card flex items-center gap-3 p-4">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-success/10 text-success"><ShieldCheck class="h-5 w-5" /></div>
          <div><p class="font-display text-xl font-bold text-secondary">{{ store.unlockedCount }}</p><p class="text-xs text-brand-muted">Unlocked</p></div>
        </div>
        <div class="card flex items-center gap-3 p-4">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-warning/10 text-warning"><Bookmark class="h-5 w-5" /></div>
          <div><p class="font-display text-xl font-bold text-secondary">{{ store.savedCount }}</p><p class="text-xs text-brand-muted">Saved prices</p></div>
        </div>
      </div>

      <!-- Category cards (only on All) -->
      <div v-if="activeCat === 'all'" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <button
          v-for="c in store.categories"
          :key="c.slug"
          @click="activeCat = c.slug"
          class="card group flex flex-col items-start gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <div :class="['bg-gradient-to-br', c.accent]" class="grid h-11 w-11 place-items-center rounded-xl text-white shadow-card">
            <component :is="icons[c.icon]" class="h-5 w-5" />
          </div>
          <div>
            <p class="font-semibold leading-tight text-secondary">{{ c.name }}</p>
            <p class="mt-1 text-xs text-brand-muted">{{ c.tagline }}</p>
          </div>
          <span class="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary-dark">
            {{ store.categoryCount(c.slug) }} vendors <ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="relative flex-1">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="query" class="input pl-10" placeholder="Search vendors, products or location…" />
        </div>
        <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
          <button @click="activeCat = 'all'"
            class="whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors"
            :class="activeCat === 'all' ? 'border-primary bg-primary/10 text-primary-dark' : 'border-brand-border bg-white text-brand-muted hover:border-primary/40'">
            All
          </button>
          <button v-for="c in store.categories" :key="c.slug" @click="activeCat = c.slug"
            class="whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors"
            :class="activeCat === c.slug ? 'border-primary bg-primary/10 text-primary-dark' : 'border-brand-border bg-white text-brand-muted hover:border-primary/40'">
            {{ c.name }}
          </button>
        </div>
      </div>

      <!-- Results header -->
      <div class="flex items-center justify-between">
        <h3 class="font-display text-lg font-bold text-secondary">{{ heading }} <span class="text-brand-light">· {{ filtered.length }}</span></h3>
      </div>

      <!-- Vendor grid -->
      <div v-if="filtered.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="v in filtered" :key="v.id"
          class="card flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
          <div class="flex items-start gap-3">
            <div :class="['bg-gradient-to-br', store.categoryMeta(v.category)?.accent]" class="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-card">
              <component :is="icons[store.categoryMeta(v.category)?.icon]" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <p class="truncate font-semibold text-secondary">{{ v.name }}</p>
                <BadgeCheck v-if="v.verified" class="h-4 w-4 shrink-0 text-primary" />
                <span v-if="v.owned" class="badge shrink-0 bg-primary/10 text-[10px] text-primary-dark">You</span>
              </div>
              <p class="mt-0.5 flex items-center gap-1 text-xs text-brand-muted"><MapPin class="h-3.5 w-3.5" /> {{ v.location }}</p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span v-if="v.reviews" class="inline-flex items-center gap-1 font-semibold text-warning"><Star class="h-4 w-4 fill-warning" /> {{ v.rating }}</span>
            <span v-else class="inline-flex items-center gap-1 text-brand-light"><Star class="h-4 w-4" /> No ratings yet</span>
            <span v-if="v.reviews" class="text-brand-light">·</span>
            <span v-if="v.reviews" class="text-brand-muted">{{ v.reviews }} reviews</span>
            <span class="text-brand-light">·</span>
            <span class="text-brand-muted">{{ v.years }} yrs</span>
          </div>

          <!-- Products -->
          <div class="mt-4 space-y-1.5">
            <div v-for="p in v.products.slice(0, 3)" :key="p.name" class="flex items-center justify-between gap-2 text-sm">
              <span class="truncate text-brand-muted">{{ p.name }}</span>
              <span class="shrink-0 font-semibold text-secondary">{{ formatFull(p.price) }}<span class="text-xs font-normal text-brand-light">/{{ p.unit }}</span></span>
            </div>
          </div>

          <!-- Contact area -->
          <div class="mt-4 border-t border-brand-border-light pt-4">
            <div v-if="store.isUnlocked(v.id)" class="space-y-1.5">
              <a :href="`tel:${v.phone}`" class="flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary"><Phone class="h-4 w-4 text-primary" /> {{ v.phone }}</a>
              <a :href="`mailto:${v.email}`" class="flex items-center gap-2 text-sm text-brand-muted hover:text-primary"><Mail class="h-4 w-4 text-primary" /> {{ v.email }}</a>
            </div>
            <div v-else class="flex items-center gap-2 rounded-xl bg-brand-bg px-3 py-2.5 text-sm text-brand-muted">
              <Lock class="h-4 w-4 text-brand-light" />
              <span class="font-mono tracking-wider select-none blur-[3px]">+234 80• ••• ••••</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex gap-2">
            <button class="btn-outline btn-sm flex-1" @click="openVendor(v)">View profile</button>
            <button v-if="v.owned" class="btn-secondary btn-sm flex-1" @click="editListing(v)">
              <Pencil class="h-4 w-4" /> Edit listing
            </button>
            <button v-else-if="store.isUnlocked(v.id)" class="btn-secondary btn-sm flex-1" disabled>
              <CheckCircle2 class="h-4 w-4" /> Unlocked
            </button>
            <button v-else class="btn-primary btn-sm flex-1" @click="startPayment(v)">
              <Lock class="h-4 w-4" /> Unlock · {{ formatFull(v.unlockPrice) }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="card flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-bg text-brand-light"><Search class="h-6 w-6" /></div>
        <p class="font-semibold text-secondary">No vendors found</p>
        <p class="text-sm text-brand-muted">Try a different search term or category.</p>
        <button class="btn-outline btn-md mt-2" @click="openRegister"><Store class="h-4 w-4" /> List your business here</button>
      </div>
    </div>

    <!-- ============================= Vendor profile modal ============================= -->
    <transition name="page">
      <div v-if="activeVendor" class="fixed inset-0 z-50 flex items-end justify-center bg-secondary/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="activeVendor = null">
        <div class="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <!-- header -->
          <div :class="['bg-gradient-to-br', store.categoryMeta(activeVendor.category)?.accent]" class="relative p-6 text-white">
            <button class="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white transition-colors hover:bg-white/25" @click="activeVendor = null"><X class="h-5 w-5" /></button>
            <div class="flex items-center gap-3">
              <div class="grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><component :is="icons[store.categoryMeta(activeVendor.category)?.icon]" class="h-7 w-7" /></div>
              <div>
                <div class="flex items-center gap-1.5"><h3 class="font-display text-xl font-bold">{{ activeVendor.name }}</h3><BadgeCheck v-if="activeVendor.verified" class="h-5 w-5" /></div>
                <p class="mt-0.5 flex items-center gap-1 text-sm text-white/80"><MapPin class="h-4 w-4" /> {{ activeVendor.location }}</p>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2 text-sm">
              <span v-if="activeVendor.reviews" class="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-semibold"><Star class="h-4 w-4 fill-white" /> {{ activeVendor.rating }}</span>
              <span v-if="activeVendor.reviews" class="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1">{{ activeVendor.reviews }} reviews</span>
              <span v-else class="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1">New listing</span>
              <span class="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1">{{ activeVendor.years }} years trading</span>
              <span class="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1"><Building2 class="h-4 w-4" /> {{ store.categoryMeta(activeVendor.category)?.name }}</span>
            </div>
          </div>

          <div class="flex-1 space-y-5 overflow-y-auto p-6">
            <!-- owner controls -->
            <div v-if="activeVendor.owned" class="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-secondary">This is your listing</p>
                <p class="text-xs text-brand-muted">Status: {{ activeVendor.status }} · buyers pay {{ formatFull(activeVendor.unlockPrice) }} to unlock your contacts.</p>
              </div>
              <button class="btn-outline btn-sm" @click="editListing(activeVendor)"><Pencil class="h-4 w-4" /> Edit</button>
              <button class="btn-outline btn-sm !border-danger/40 !text-danger hover:!border-danger" @click="deleteListing(activeVendor)"><Trash2 class="h-4 w-4" /> Delete</button>
            </div>

            <p v-if="activeVendor.description" class="text-sm leading-relaxed text-brand-muted">{{ activeVendor.description }}</p>

            <!-- contacts -->
            <div>
              <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-light">Contact</p>
              <div v-if="store.isUnlocked(activeVendor.id)" class="grid gap-2 sm:grid-cols-3">
                <a :href="`tel:${activeVendor.phone}`" class="flex items-center gap-2 rounded-xl border border-brand-border-light bg-brand-bg px-3 py-2.5 text-sm font-medium text-secondary hover:border-primary"><Phone class="h-4 w-4 text-primary" /> Call</a>
                <a :href="`https://wa.me/${activeVendor.whatsapp.replace(/[^0-9]/g, '')}`" target="_blank" rel="noopener" class="flex items-center gap-2 rounded-xl border border-brand-border-light bg-brand-bg px-3 py-2.5 text-sm font-medium text-secondary hover:border-primary"><MessageCircle class="h-4 w-4 text-success" /> WhatsApp</a>
                <a :href="`mailto:${activeVendor.email}`" class="flex items-center gap-2 rounded-xl border border-brand-border-light bg-brand-bg px-3 py-2.5 text-sm font-medium text-secondary hover:border-primary"><Mail class="h-4 w-4 text-primary" /> Email</a>
              </div>
              <div v-if="store.isUnlocked(activeVendor.id)" class="mt-2 space-y-1 text-sm text-brand-muted">
                <p class="flex items-center gap-2"><Phone class="h-4 w-4 text-brand-light" /> {{ activeVendor.phone }}</p>
                <p class="flex items-center gap-2"><Mail class="h-4 w-4 text-brand-light" /> {{ activeVendor.email }}</p>
              </div>
              <div v-else class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-border bg-brand-bg px-4 py-6 text-center">
                <div class="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-light shadow-card"><Lock class="h-5 w-5" /></div>
                <div>
                  <p class="font-semibold text-secondary">Contacts are hidden</p>
                  <p class="mx-auto mt-1 max-w-sm text-sm text-brand-muted">Unlock to reveal phone, WhatsApp & email — then call to confirm today's prices and feed them into your estimate.</p>
                </div>
                <button class="btn-primary btn-md" @click="startPayment(activeVendor)"><Lock class="h-4 w-4" /> Unlock for {{ formatFull(activeVendor.unlockPrice) }}</button>
              </div>
            </div>

            <!-- products / price list -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wider text-brand-light">Products & indicative prices</p>
                <span v-if="store.isUnlocked(activeVendor.id)" class="text-xs text-brand-light">Tap <Bookmark class="inline h-3 w-3" /> to add to your estimate</span>
              </div>
              <div class="divide-y divide-brand-border-light overflow-hidden rounded-2xl border border-brand-border-light">
                <div v-for="p in activeVendor.products" :key="p.name" class="flex items-center justify-between gap-3 px-4 py-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-secondary">{{ p.name }}</p>
                    <p class="text-xs text-brand-light">per {{ p.unit }} · indicative</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-3">
                    <span class="font-bold text-secondary">{{ formatFull(p.price) }}</span>
                    <button v-if="store.isUnlocked(activeVendor.id)" class="grid h-9 w-9 place-items-center rounded-lg border border-brand-border text-brand-muted transition-colors hover:border-primary hover:text-primary" title="Save price to estimate" @click="savePrice(activeVendor, p)">
                      <Bookmark class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p class="mt-2 flex items-start gap-1.5 text-xs text-brand-light"><Sparkles class="mt-0.5 h-3.5 w-3.5 shrink-0" /> Indicative rates only. Always call the vendor to confirm the live price before adding it to a tender.</p>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ============================= Payment / unlock modal ============================= -->
    <transition name="page">
      <div v-if="payingFor" class="fixed inset-0 z-[60] flex items-center justify-center bg-secondary/50 p-4 backdrop-blur-sm" @click.self="closePayment">
        <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-hover">
          <!-- success state -->
          <div v-if="paid" class="p-8 text-center">
            <div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success"><CheckCircle2 class="h-8 w-8" /></div>
            <h3 class="mt-4 font-display text-xl font-bold text-secondary">Contacts unlocked!</h3>
            <p class="mx-auto mt-1 max-w-xs text-sm text-brand-muted">You can now call, WhatsApp or email <span class="font-semibold text-secondary">{{ payingFor.name }}</span> to confirm prices.</p>
            <div class="mt-5 space-y-2 rounded-2xl bg-brand-bg p-4 text-left text-sm">
              <p class="flex items-center gap-2 font-medium text-secondary"><Phone class="h-4 w-4 text-primary" /> {{ payingFor.phone }}</p>
              <p class="flex items-center gap-2 text-brand-muted"><Mail class="h-4 w-4 text-primary" /> {{ payingFor.email }}</p>
            </div>
            <button class="btn-primary btn-md mt-5 w-full" @click="closePayment">Done</button>
          </div>

          <!-- payment form -->
          <div v-else>
            <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
              <h3 class="font-display text-lg font-bold text-secondary">Unlock vendor contacts</h3>
              <button class="btn btn-ghost btn-sm" @click="closePayment"><X class="h-5 w-5" /></button>
            </div>
            <div class="space-y-5 p-6">
              <div class="flex items-center gap-3 rounded-2xl bg-brand-bg p-4">
                <div :class="['bg-gradient-to-br', store.categoryMeta(payingFor.category)?.accent]" class="grid h-11 w-11 place-items-center rounded-xl text-white"><component :is="icons[store.categoryMeta(payingFor.category)?.icon]" class="h-5 w-5" /></div>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-secondary">{{ payingFor.name }}</p>
                  <p class="text-xs text-brand-muted">{{ payingFor.location }}</p>
                </div>
              </div>

              <ul class="space-y-2 text-sm text-brand-muted">
                <li class="flex items-center gap-2"><CheckCircle2 class="h-4 w-4 text-success" /> Direct phone & WhatsApp line</li>
                <li class="flex items-center gap-2"><CheckCircle2 class="h-4 w-4 text-success" /> Email for formal quotes</li>
                <li class="flex items-center gap-2"><CheckCircle2 class="h-4 w-4 text-success" /> Save confirmed prices to your estimates</li>
              </ul>

              <div class="flex items-center justify-between rounded-xl border border-brand-border-light px-4 py-3">
                <span class="text-sm text-brand-muted">One-off unlock fee</span>
                <span class="font-display text-xl font-bold text-secondary">{{ formatFull(payingFor.unlockPrice) }}</span>
              </div>

              <button class="btn-primary btn-md w-full" @click="confirmPayment">
                <CreditCard class="h-4 w-4" /> Pay {{ formatFull(payingFor.unlockPrice) }} & unlock
              </button>
              <p class="text-center text-xs text-brand-light">Mock payment for demo — no real charge is made.</p>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ============================= Vendor registration ============================= -->
    <transition name="page">
      <div v-if="registerOpen" class="fixed inset-0 z-[70] flex items-end justify-center bg-secondary/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="registerOpen = false">
        <div class="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <div class="flex items-start justify-between gap-3 border-b border-brand-border-light px-6 py-4">
            <div>
              <h3 class="font-display text-lg font-bold text-secondary">
                {{ editingId ? 'Edit your listing' : 'List your business' }}
              </h3>
              <p class="mt-0.5 text-sm text-brand-muted">
                Sell materials or services? Publish your shop and get paid enquiries from surveyors.
              </p>
              <p v-if="!editingId" class="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary-dark">
                <CreditCard class="h-3.5 w-3.5" /> One-off listing fee: {{ formatFull(LISTING_FEE) }}
              </p>
            </div>
            <button class="btn btn-ghost btn-sm shrink-0" @click="registerOpen = false"><X class="h-5 w-5" /></button>
          </div>

          <form class="flex-1 space-y-5 overflow-y-auto p-6" @submit.prevent="submitListing">
            <div v-if="formErrors.length" class="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <p class="flex items-center gap-1.5 text-sm font-semibold text-danger"><AlertCircle class="h-4 w-4" /> Please fix the following:</p>
              <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-danger">
                <li v-for="(e, i) in formErrors" :key="i">{{ e }}</li>
              </ul>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="label">Business name</label>
                <input v-model="listing.name" class="input" placeholder="e.g. Adeyemi Building Materials" />
              </div>
              <div>
                <label class="label">Category</label>
                <select v-model="listing.category" class="input">
                  <option v-for="c in store.categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="label">Location</label>
                <input v-model="listing.location" class="input" placeholder="Ikeja, Lagos" />
              </div>
              <div>
                <label class="label">Phone</label>
                <input v-model="listing.phone" class="input" placeholder="+234 801 234 5678" />
              </div>
              <div>
                <label class="label">WhatsApp <span class="text-brand-light">(optional)</span></label>
                <input v-model="listing.whatsapp" class="input" placeholder="Same as phone if left blank" />
              </div>
              <div>
                <label class="label">Email</label>
                <input v-model="listing.email" type="email" class="input" placeholder="sales@yourbusiness.ng" />
              </div>
              <div>
                <label class="label">Years trading</label>
                <input v-model.number="listing.years" type="number" min="0" class="input" />
              </div>
              <div class="sm:col-span-2">
                <label class="label">About your business <span class="text-brand-light">(optional)</span></label>
                <textarea v-model="listing.description" rows="3" class="input resize-none" placeholder="What you supply, delivery areas, minimum order…"></textarea>
              </div>
              <div class="sm:col-span-2">
                <label class="label">Contact unlock fee</label>
                <input v-model.number="listing.unlockPrice" type="number" min="0" step="100" class="input" />
                <p class="mt-1.5 text-xs text-brand-muted">What a buyer pays once to reveal your phone, WhatsApp and email.</p>
              </div>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <label class="label mb-0">Products &amp; prices</label>
                <button type="button" class="text-sm font-semibold text-primary hover:underline" @click="addProductRow">
                  <Plus class="inline h-3.5 w-3.5" /> Add product
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(p, i) in listing.products" :key="i" class="flex flex-col gap-2 rounded-xl border border-brand-border-light p-3 sm:flex-row sm:items-center">
                  <input v-model="p.name" class="input flex-1" placeholder="Product name" />
                  <input v-model="p.unit" list="unit-options" class="input sm:w-24" placeholder="Unit"
                    @change="p.unit = normalizeUnit(p.unit)" />
                  <input v-model.number="p.price" type="number" min="0" class="input sm:w-36" placeholder="Price ₦" />
                  <button type="button" class="grid h-10 w-10 shrink-0 place-items-center self-end rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger sm:self-auto" title="Remove product" @click="removeProductRow(i)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 border-t border-brand-border-light pt-5">
              <button v-if="editingId" type="button" class="btn-outline btn-md !border-danger/40 !text-danger hover:!border-danger"
                @click="deleteListing(store.vendors.find((v) => v.id === editingId))">
                <Trash2 class="h-4 w-4" /> Delete listing
              </button>
              <button type="button" class="btn-outline btn-md ml-auto" @click="registerOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md">
                <Store class="h-4 w-4" />
                {{ editingId ? 'Save changes' : `Continue · pay ${formatFull(LISTING_FEE)}` }}
              </button>
            </div>

            <p v-if="!editingId" class="text-center text-xs text-brand-light">
              You pay {{ formatFull(LISTING_FEE) }} once. New listings show as “Pending review” until our team verifies your business.
            </p>
          </form>
        </div>
      </div>
    </transition>

    <!-- ============================= Listing fee ============================= -->
  <transition name="page">
    <div v-if="listingPayOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-secondary/50 p-4 backdrop-blur-sm" @click.self="closeListingPayment">
      <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-hover">
        <!-- paid -->
        <div v-if="listingPaid" class="p-8 text-center">
          <div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success"><CheckCircle2 class="h-8 w-8" /></div>
          <h3 class="mt-4 font-display text-xl font-bold text-secondary">You're listed!</h3>
          <p class="mx-auto mt-1 max-w-xs text-sm text-brand-muted">
            <span class="font-semibold text-secondary">{{ listing.name }}</span> is now on the marketplace. Surveyors pay
            {{ formatFull(listing.unlockPrice) }} to unlock your contacts.
          </p>
          <div class="mt-5 rounded-2xl bg-brand-bg p-4 text-left text-sm">
            <div class="flex justify-between"><span class="text-brand-muted">Listing fee paid</span><span class="font-semibold text-secondary">{{ formatFull(LISTING_FEE) }}</span></div>
            <div class="mt-1.5 flex justify-between"><span class="text-brand-muted">Status</span><span class="font-semibold text-warning">Pending review</span></div>
          </div>
          <button class="btn-primary btn-md mt-5 w-full" @click="closeListingPayment">Done</button>
        </div>

        <!-- pay -->
        <div v-else>
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Pay your listing fee</h3>
            <button class="btn btn-ghost btn-sm" @click="closeListingPayment"><X class="h-5 w-5" /></button>
          </div>
          <div class="space-y-5 p-6">
            <div class="flex items-center gap-3 rounded-2xl bg-brand-bg p-4">
              <div :class="['bg-gradient-to-br', store.categoryMeta(listing.category)?.accent]" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white">
                <component :is="icons[store.categoryMeta(listing.category)?.icon]" class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <p class="truncate font-semibold text-secondary">{{ listing.name }}</p>
                <p class="truncate text-xs text-brand-muted">{{ listing.location }} · {{ listing.products.filter((x) => x.name).length }} products</p>
              </div>
            </div>

            <ul class="space-y-2 text-sm text-brand-muted">
              <li class="flex items-center gap-2"><CheckCircle2 class="h-4 w-4 shrink-0 text-success" /> Your shop listed across the marketplace</li>
              <li class="flex items-center gap-2"><CheckCircle2 class="h-4 w-4 shrink-0 text-success" /> Buyers pay you {{ formatFull(listing.unlockPrice) }} per contact unlock</li>
              <li class="flex items-center gap-2"><CheckCircle2 class="h-4 w-4 shrink-0 text-success" /> Edit your prices and products any time, free</li>
            </ul>

            <div class="flex items-center justify-between rounded-xl border border-brand-border-light px-4 py-3">
              <span class="text-sm text-brand-muted">One-off listing fee</span>
              <span class="font-display text-xl font-bold text-secondary">{{ formatFull(LISTING_FEE) }}</span>
            </div>

            <button class="btn-primary btn-md w-full" @click="confirmListingPayment">
              <CreditCard class="h-4 w-4" /> Pay {{ formatFull(LISTING_FEE) }} &amp; publish
            </button>
            <button class="btn-outline btn-md w-full" @click="closeListingPayment">Back to my details</button>
            <p class="text-center text-xs text-brand-light">Mock payment for demo — no real charge is made.</p>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- ============================= Saved prices drawer ============================= -->
    <transition name="page">
      <div v-if="showSaved" class="fixed inset-0 z-[60] flex justify-end bg-secondary/40 backdrop-blur-sm" @click.self="showSaved = false">
        <div class="flex h-full w-full max-w-md flex-col bg-white shadow-card-hover">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <div>
              <h3 class="font-display text-lg font-bold text-secondary">Saved prices</h3>
              <p class="text-xs text-brand-muted">Confirmed vendor rates ready for your estimates</p>
            </div>
            <button class="btn btn-ghost btn-sm" @click="showSaved = false"><X class="h-5 w-5" /></button>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="store.savedCount" class="space-y-2">
              <div v-for="p in store.savedPrices" :key="p.id" class="flex items-start justify-between gap-3 rounded-xl border border-brand-border-light p-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-secondary">{{ p.item }}</p>
                  <p class="mt-0.5 truncate text-xs text-brand-muted">{{ p.vendor }}</p>
                  <p class="mt-1 text-sm font-bold text-secondary">{{ formatFull(p.rate) }} <span class="text-xs font-normal text-brand-light">/ {{ p.unit }}</span></p>
                </div>
                <button class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-light transition-colors hover:bg-danger/10 hover:text-danger" @click="store.removeSavedPrice(p.id)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-bg text-brand-light"><BookmarkCheck class="h-6 w-6" /></div>
              <p class="font-semibold text-secondary">No saved prices yet</p>
              <p class="mx-auto max-w-xs text-sm text-brand-muted">Unlock a vendor, confirm a price by phone, then save it from their profile to reuse it in estimates.</p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
