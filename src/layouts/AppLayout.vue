<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, FolderKanban, FileSpreadsheet, Calculator, Ruler,
  GitCompareArrows, Database, BarChart3, Sparkles, Users, CreditCard,
  Settings, Search, Bell, Menu, X, Plus, LogOut, ChevronDown, Store,
} from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useSubscriptionStore, TRIAL_DAYS } from '@/stores/subscription'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projects = useProjectsStore()
const subscription = useSubscriptionStore()

// Colour the countdown by how close the trial is to running out.
const trialBanner = computed(() => {
  if (!subscription.isTrialing) return null
  const d = subscription.trialDaysLeft
  const tone = {
    calm: 'bg-primary/10 text-primary-dark border-primary/20',
    warning: 'bg-warning/10 text-warning border-warning/30',
    critical: 'bg-danger/10 text-danger border-danger/30',
  }[subscription.trialUrgency] || 'bg-primary/10 text-primary-dark border-primary/20'
  return {
    tone,
    text: d === 1 ? 'Last day of your free trial' : `${d} days left in your free trial`,
  }
})
const sidebarOpen = ref(false)
const userMenu = ref(false)
const notifMenu = ref(false)
const hasUnread = ref(true)

const notifications = [
  { id: 1, title: 'BOQ generation complete', detail: 'Lekki 4-Bedroom Duplex · Substructure', time: '12 min ago' },
  { id: 2, title: 'Variation VO-014 approved', detail: 'Tunde James approved a change order', time: '3 hours ago' },
  { id: 3, title: 'Price alert', detail: 'Cement rate up 4.2% in Lagos', time: 'Yesterday' },
]

const notifWrap = ref(null)
const userWrap = ref(null)

function toggleNotif() {
  notifMenu.value = !notifMenu.value
  if (notifMenu.value) hasUnread.value = false
  if (notifMenu.value) userMenu.value = false
}
function toggleUser() {
  userMenu.value = !userMenu.value
  if (userMenu.value) notifMenu.value = false
}
function closeMenus() {
  notifMenu.value = false
  userMenu.value = false
  searchOpen.value = false
}
// Dropdowns must dismiss when you click away or press Escape, not just on re-click.
function onDocClick(e) {
  if (notifMenu.value && notifWrap.value && !notifWrap.value.contains(e.target)) notifMenu.value = false
  if (userMenu.value && userWrap.value && !userWrap.value.contains(e.target)) userMenu.value = false
  if (searchOpen.value && searchWrap.value && !searchWrap.value.contains(e.target)) searchOpen.value = false
}
function onKeydown(e) {
  if (e.key === 'Escape') closeMenus()
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})

// --- global search -------------------------------------------------------
// Searches projects and BOQ items and jumps straight to the match.
const searchQuery = ref('')
const searchOpen = ref(false)
const searchWrap = ref(null)

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const hits = []
  for (const p of projects.projects) {
    if (p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) {
      hits.push({ key: 'p:' + p.id, label: p.name, detail: p.client, kind: 'Project', to: `/app/projects/${p.id}` })
    }
  }
  for (const i of projects.boqItems) {
    if (i.desc.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)) {
      hits.push({ key: 'b:' + i.code + i.desc, label: i.desc, detail: `${i.code} · ${i.section}`, kind: 'BOQ item', to: '/app/boq' })
    }
  }
  return hits.slice(0, 8)
})

function goToResult(r) {
  searchQuery.value = ''
  searchOpen.value = false
  sidebarOpen.value = false
  router.push(r.to)
}

// Close every transient panel whenever the route changes.
watch(() => route.fullPath, () => {
  closeMenus()
  sidebarOpen.value = false
})

const sections = [
  {
    label: 'Workspace',
    items: [
      { name: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
      { name: 'Projects', to: '/app/projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Estimating',
    items: [
      { name: 'BOQ Workspace', to: '/app/boq', icon: FileSpreadsheet },
      { name: 'Quantity Takeoff', to: '/app/takeoff', icon: Ruler },
      { name: 'Cost Estimation', to: '/app/estimation', icon: Calculator },
      { name: 'Variations', to: '/app/variations', icon: GitCompareArrows },
      { name: 'Pricing Database', to: '/app/pricing-db', icon: Database },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { name: 'Vendors', to: '/app/vendors', icon: Store },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'AI Assistant', to: '/app/assistant', icon: Sparkles },
      { name: 'Reports', to: '/app/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Organization',
    items: [
      { name: 'Team', to: '/app/team', icon: Users },
      { name: 'Billing', to: '/app/billing', icon: CreditCard },
      { name: 'Settings', to: '/app/settings', icon: Settings },
    ],
  },
]

const navItems = sections.flatMap((s) => s.items)

const pageTitle = computed(() => {
  if (route.name === 'project-detail') return 'Project Details'
  // Longest matching prefix, so nested routes don't get the parent's title.
  const found = navItems
    .filter((i) => route.path === i.to || route.path.startsWith(i.to + '/'))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return found ? found.name : 'Dashboard'
})

function logout() {
  auth.logout()
  router.push('/auth/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-brand-bg">
    <!-- Mobile overlay -->
    <transition name="page">
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-secondary/40 lg:hidden" @click="sidebarOpen = false"></div>
    </transition>

    <!-- Sidebar -->
    <aside
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-brand-border-light bg-white transition-transform duration-300 lg:translate-x-0"
    >
      <div class="flex h-16 items-center justify-between border-b border-brand-border-light px-5">
        <RouterLink to="/app/dashboard"><BrandLogo /></RouterLink>
        <button class="btn btn-ghost btn-sm lg:hidden" @click="sidebarOpen = false"><X class="h-5 w-5" /></button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-5 no-scrollbar">
        <RouterLink to="/app/boq" class="btn-primary btn-md mb-6 w-full" @click="sidebarOpen = false">
          <Plus class="h-4 w-4" /> New BOQ
        </RouterLink>

        <nav class="space-y-6">
          <div v-for="s in sections" :key="s.label">
            <p class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-light">{{ s.label }}</p>
            <div class="space-y-1">
              <RouterLink
                v-for="item in s.items"
                :key="item.name"
                :to="item.to"
                class="sidebar-link"
                :class="{ 'sidebar-link-active': route.path === item.to || route.path.startsWith(item.to + '/') }"
                @click="sidebarOpen = false"
              >
                <component :is="item.icon" class="h-[18px] w-[18px]" />
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </nav>
      </div>

      <!-- Plan / trial card -->
      <div class="m-3 rounded-2xl bg-navy-gradient p-4 text-white">
        <div class="flex items-center gap-2">
          <Sparkles class="h-4 w-4 text-primary-light" />
          <span class="text-sm font-semibold">
            {{ subscription.status === 'active' ? subscription.plan + ' Plan' : 'Free Trial' }}
          </span>
        </div>

        <template v-if="subscription.isTrialing">
          <p class="mt-1 text-xs text-white/60">
            {{ subscription.trialDaysLeft }} of {{ TRIAL_DAYS }} days remaining
          </p>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div class="h-full rounded-full transition-all"
              :class="subscription.trialUrgency === 'critical' ? 'bg-danger' : 'bg-primary-light'"
              :style="{ width: (subscription.trialDaysLeft / TRIAL_DAYS) * 100 + '%' }"></div>
          </div>
        </template>
        <template v-else-if="subscription.status === 'active'">
          <p class="mt-1 text-xs text-white/60">
            Renews {{ subscription.renewsOn ? subscription.renewsOn.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }}
          </p>
        </template>
        <template v-else>
          <p class="mt-1 text-xs text-danger">Your trial has ended</p>
        </template>

        <RouterLink to="/app/billing" class="mt-3 block text-center text-xs font-semibold text-primary-light hover:underline">
          {{ subscription.status === 'active' ? 'Manage plan →' : 'Subscribe now →' }}
        </RouterLink>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col lg:pl-72">
      <!-- Topbar -->
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-brand-border-light bg-white/80 px-4 backdrop-blur sm:px-6">
        <button class="btn btn-ghost btn-sm lg:hidden" @click="sidebarOpen = true"><Menu class="h-5 w-5" /></button>

        <h1 class="min-w-0 flex-1 truncate font-display text-lg font-bold text-secondary sm:flex-none sm:text-xl">{{ pageTitle }}</h1>

        <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <div ref="searchWrap" class="relative hidden md:block">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input
            v-model="searchQuery"
            class="input w-56 pl-9 lg:w-64"
            placeholder="Search projects, BOQs…"
            @focus="searchOpen = true"
            @keydown.enter="searchResults.length && goToResult(searchResults[0])"
          />
          <div v-if="searchOpen && searchQuery.trim()" class="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-brand-border-light bg-white shadow-card-hover">
            <button
              v-for="r in searchResults"
              :key="r.key"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-bg"
              @click="goToResult(r)"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-secondary">{{ r.label }}</p>
                <p class="truncate text-xs text-brand-muted">{{ r.detail }}</p>
              </div>
              <span class="badge shrink-0 bg-brand-border-light text-brand-muted">{{ r.kind }}</span>
            </button>
            <p v-if="!searchResults.length" class="px-4 py-3 text-sm text-brand-muted">No matches for “{{ searchQuery }}”.</p>
          </div>
        </div>

        <div ref="notifWrap" class="relative">
          <button class="relative grid h-10 w-10 place-items-center rounded-xl text-brand-muted transition-colors hover:bg-brand-border-light" @click="toggleNotif">
            <Bell class="h-5 w-5" />
            <span v-if="hasUnread" class="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-white"></span>
          </button>

          <transition name="page">
            <div v-if="notifMenu" class="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-brand-border-light bg-white shadow-card-hover">
              <div class="border-b border-brand-border-light px-4 py-3">
                <p class="text-sm font-semibold text-secondary">Notifications</p>
              </div>
              <div class="max-h-80 divide-y divide-brand-border-light overflow-y-auto">
                <div v-for="n in notifications" :key="n.id" class="px-4 py-3 transition-colors hover:bg-brand-bg">
                  <p class="text-sm font-semibold text-secondary">{{ n.title }}</p>
                  <p class="mt-0.5 text-xs text-brand-muted">{{ n.detail }}</p>
                  <p class="mt-0.5 text-[11px] text-brand-light">{{ n.time }}</p>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <div ref="userWrap" class="relative">
          <button class="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-brand-border-light" @click="toggleUser">
            <img v-if="auth.user.photo" :src="auth.user.photo" alt="" class="h-8 w-8 rounded-lg object-cover" />
            <div v-else class="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-xs font-bold text-white">{{ auth.user.avatar }}</div>
            <div class="hidden text-left sm:block">
              <p class="text-sm font-semibold leading-tight text-secondary">{{ auth.user.name }}</p>
              <p class="text-[11px] leading-tight text-brand-muted">{{ auth.user.role }}</p>
            </div>
            <ChevronDown class="hidden h-4 w-4 text-brand-light sm:block" />
          </button>

          <transition name="page">
            <div v-if="userMenu" class="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-brand-border-light bg-white shadow-card-hover" @click="userMenu = false">
              <div class="border-b border-brand-border-light px-4 py-3">
                <p class="text-sm font-semibold text-secondary">{{ auth.user.name }}</p>
                <p class="truncate text-xs text-brand-muted">{{ auth.user.email }}</p>
              </div>
              <RouterLink to="/app/settings" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-muted hover:bg-brand-border-light hover:text-secondary">
                <Settings class="h-4 w-4" /> Settings
              </RouterLink>
              <button class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/5" @click="logout">
                <LogOut class="h-4 w-4" /> Sign out
              </button>
            </div>
          </transition>
        </div>
        </div>
      </header>

      <!-- Trial countdown -->
      <RouterLink
        v-if="trialBanner"
        to="/app/billing"
        class="flex items-center justify-center gap-2 border-b px-4 py-2.5 text-sm font-medium transition-colors hover:brightness-95"
        :class="trialBanner.tone"
      >
        <Sparkles class="h-4 w-4 shrink-0" />
        <span>{{ trialBanner.text }}</span>
        <span class="font-bold underline">Subscribe now</span>
      </RouterLink>

      <!-- Page content -->
      <main class="flex-1 overflow-x-clip p-4 sm:p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
