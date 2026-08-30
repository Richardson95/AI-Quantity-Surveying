import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'

const routes = [
  // ---------- Marketing ----------
  {
    path: '/',
    component: () => import('@/layouts/MarketingLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/marketing/HomeView.vue') },
      { path: 'features', name: 'features', component: () => import('@/views/marketing/FeaturesView.vue') },
      { path: 'pricing', name: 'pricing', component: () => import('@/views/marketing/PricingView.vue') },
      { path: 'contact', name: 'contact', component: () => import('@/views/marketing/ContactView.vue') },

      // Company, resource and legal pages — every footer link resolves here.
      ...[
        'about', 'careers', 'blog', 'press',
        'docs', 'api', 'support', 'status',
        'privacy', 'terms',
      ].map((slug) => ({
        path: slug,
        name: slug,
        meta: { page: slug },
        component: () => import('@/views/marketing/InfoView.vue'),
      })),
    ],
  },

  // ---------- Auth ----------
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      { path: 'login', name: 'login', component: () => import('@/views/auth/LoginView.vue') },
      { path: 'signup', name: 'signup', component: () => import('@/views/auth/SignupView.vue') },
      // Also the landing page for the emailed reset link (?token=…).
      { path: 'reset', name: 'reset', component: () => import('@/views/auth/ResetView.vue') },
      // Where an invited teammate lands from their invitation email (?token=…).
      { path: 'accept-invite', name: 'accept-invite', component: () => import('@/views/auth/AcceptInviteView.vue') },
    ],
  },

  // ---------- App ----------
  {
    path: '/app',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/app/DashboardView.vue') },
      { path: 'projects', name: 'projects', component: () => import('@/views/app/ProjectsView.vue') },
      { path: 'projects/:id', name: 'project-detail', component: () => import('@/views/app/ProjectDetailView.vue') },
      { path: 'boq', name: 'boq', component: () => import('@/views/app/BoqWorkspaceView.vue') },
      { path: 'estimation', name: 'estimation', component: () => import('@/views/app/EstimationView.vue') },
      { path: 'takeoff', name: 'takeoff', component: () => import('@/views/app/TakeoffView.vue') },
      { path: 'variations', name: 'variations', component: () => import('@/views/app/VariationsView.vue') },
      { path: 'pricing-db', name: 'pricing-db', component: () => import('@/views/app/PricingDbView.vue') },
      { path: 'vendors', name: 'vendors', component: () => import('@/views/app/VendorsView.vue') },
      { path: 'reports', name: 'reports', component: () => import('@/views/app/ReportsView.vue') },
      { path: 'assistant', name: 'assistant', component: () => import('@/views/app/AssistantView.vue') },
      { path: 'team', name: 'team', component: () => import('@/views/app/TeamView.vue') },
      { path: 'billing', name: 'billing', component: () => import('@/views/app/BillingView.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/views/app/SettingsView.vue') },
    ],
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  // BuildQ is served under a sub-path of the BRG Prime site
  // (https://brgprime.com/boq), so every route is relative to that prefix.
  // BASE_URL comes from `base` in vite.config.js, which keeps the router and
  // the built asset paths in sync — set it in one place, not two.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

// Keep signed-out users out of the workspace, and signed-in users out of the
// auth screens. `redirect` lets us return to the page that was asked for.
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // With a backend, a hard refresh knows only that a token exists — not whether
  // it is still valid, nor what the subscription says. Waiting for the server
  // here stops a signed-in user being bounced to the login screen, and stops
  // the workspace rendering for a moment before the paywall catches up.
  if (!auth.ready) await auth.fetchMe()

  if (to.matched.some((r) => r.meta.requiresAuth) && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // A page reached by a one-time emailed token stays reachable even with a
  // session already open: someone signed in on one account may legitimately be
  // following an invitation to another, and a reset link must work when a
  // stale session is what sent them looking for it in the first place.
  const carriesToken = Boolean(to.query.token)

  if (to.matched.some((r) => r.meta.guestOnly) && auth.isAuthenticated && !carriesToken) {
    return { name: 'dashboard' }
  }

  // Keep trial state current on every navigation. The paywall itself is shown
  // over the workspace by TrialPaywall, so the user keeps sight of their work
  // rather than being redirected away from it.
  if (to.matched.some((r) => r.meta.requiresAuth)) {
    useSubscriptionStore().refresh()
  }

  return true
})

export default router
