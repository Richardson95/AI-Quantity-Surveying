<script setup>
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, FolderKanban, FileSpreadsheet, Calculator, Ruler,
  GitCompareArrows, Database, BarChart3, Sparkles, Users, CreditCard,
  Settings, Search, Bell, Menu, X, Plus, LogOut, ChevronDown, Store,
} from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sidebarOpen = ref(false)
const userMenu = ref(false)
const notifMenu = ref(false)
const hasUnread = ref(true)

const notifications = [
  { id: 1, title: 'BOQ generation complete', detail: 'Lekki 4-Bedroom Duplex · Substructure', time: '12 min ago' },
  { id: 2, title: 'Variation VO-014 approved', detail: 'Tunde James approved a change order', time: '3 hours ago' },
  { id: 3, title: 'Price alert', detail: 'Cement rate up 4.2% in Lagos', time: 'Yesterday' },
]

function toggleNotif() {
  notifMenu.value = !notifMenu.value
  if (notifMenu.value) hasUnread.value = false
}

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

const pageTitle = computed(() => {
  for (const s of sections) {
    const found = s.items.find((i) => route.path.startsWith(i.to))
    if (found) return found.name
  }
  if (route.name === 'project-detail') return 'Project Details'
  return 'Dashboard'
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
                :class="{ 'sidebar-link-active': route.path.startsWith(item.to) }"
                @click="sidebarOpen = false"
              >
                <component :is="item.icon" class="h-[18px] w-[18px]" />
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </nav>
      </div>

      <!-- Plan card -->
      <div class="m-3 rounded-2xl bg-navy-gradient p-4 text-white">
        <div class="flex items-center gap-2">
          <Sparkles class="h-4 w-4 text-primary-light" />
          <span class="text-sm font-semibold">{{ auth.user.plan }} Plan</span>
        </div>
        <p class="mt-1 text-xs text-white/60">AI credits: 1,240 / 2,000 used this month</p>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div class="h-full rounded-full bg-primary-light" style="width: 62%"></div>
        </div>
        <RouterLink to="/app/billing" class="mt-3 block text-center text-xs font-semibold text-primary-light hover:underline">
          Upgrade plan →
        </RouterLink>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col lg:pl-72">
      <!-- Topbar -->
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-brand-border-light bg-white/80 px-4 backdrop-blur sm:px-6">
        <button class="btn btn-ghost btn-sm lg:hidden" @click="sidebarOpen = true"><Menu class="h-5 w-5" /></button>

        <h1 class="font-display text-lg font-bold text-secondary sm:text-xl">{{ pageTitle }}</h1>

        <div class="relative ml-auto hidden md:block">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input class="input w-64 pl-9" placeholder="Search projects, BOQs…" />
        </div>

        <div class="relative">
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

        <div class="relative">
          <button class="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-brand-border-light" @click="userMenu = !userMenu">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-xs font-bold text-white">{{ auth.user.avatar }}</div>
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
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-x-clip p-4 sm:p-6 lg:p-8">
        <RouterView v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>
