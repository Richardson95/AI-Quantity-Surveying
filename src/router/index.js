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
      { path: 'reset', name: 'reset', component: () => import('@/views/auth/ResetView.vue') },
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
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

// Keep signed-out users out of the workspace, and signed-in users out of the
// auth screens. `redirect` lets us return to the page that was asked for.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.matched.some((r) => r.meta.requiresAuth) && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.matched.some((r) => r.meta.guestOnly) && auth.isAuthenticated) {
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
