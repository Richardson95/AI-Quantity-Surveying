import { createRouter, createWebHistory } from 'vue-router'

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
    ],
  },

  // ---------- Auth ----------
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
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

export default router
