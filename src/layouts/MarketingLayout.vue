<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { Menu, X, ArrowRight } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'

const open = ref(false)
const nav = [
  { name: 'Features', to: '/features' },
  { name: 'Pricing', to: '/pricing' },
  { name: 'Contact', to: '/contact' },
]
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 border-b border-brand-border-light glass">
      <nav class="section flex h-16 items-center justify-between">
        <RouterLink to="/"><BrandLogo /></RouterLink>

        <div class="hidden items-center gap-8 md:flex">
          <RouterLink
            v-for="item in nav"
            :key="item.name"
            :to="item.to"
            class="text-sm font-medium text-brand-muted transition-colors hover:text-secondary"
            active-class="text-primary"
          >
            {{ item.name }}
          </RouterLink>
        </div>

        <div class="hidden items-center gap-3 md:flex">
          <RouterLink to="/auth/login" class="btn btn-ghost btn-md">Sign in</RouterLink>
          <RouterLink to="/auth/signup" class="btn-primary btn-md">
            Start free trial <ArrowRight class="h-4 w-4" />
          </RouterLink>
        </div>

        <button class="btn btn-ghost btn-sm md:hidden" @click="open = !open" aria-label="Menu">
          <component :is="open ? X : Menu" class="h-5 w-5" />
        </button>
      </nav>

      <!-- Mobile menu -->
      <transition name="page">
        <div v-if="open" class="border-t border-brand-border-light bg-white px-5 py-4 md:hidden">
          <div class="flex flex-col gap-1">
            <RouterLink
              v-for="item in nav"
              :key="item.name"
              :to="item.to"
              class="rounded-xl px-3 py-2.5 text-sm font-medium text-brand-muted hover:bg-brand-border-light"
              @click="open = false"
            >
              {{ item.name }}
            </RouterLink>
            <div class="mt-3 flex flex-col gap-2">
              <RouterLink to="/auth/login" class="btn btn-outline btn-md" @click="open = false">Sign in</RouterLink>
              <RouterLink to="/auth/signup" class="btn-primary btn-md" @click="open = false">Start free trial</RouterLink>
            </div>
          </div>
        </div>
      </transition>
    </header>

    <main>
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t border-brand-border-light bg-secondary text-white">
      <div class="section grid grid-cols-2 gap-8 py-14 md:grid-cols-5">
        <div class="col-span-2">
          <BrandLogo light />
          <p class="mt-4 max-w-xs text-sm text-white/60">
            The AI operating system for construction cost intelligence. Generate BOQs, automate takeoff, and price projects in minutes.
          </p>
        </div>
        <div v-for="col in [
          { h: 'Product', links: ['BOQ Engine', 'Quantity Takeoff', 'Cost Estimation', 'AI Assistant'] },
          { h: 'Company', links: ['About', 'Careers', 'Blog', 'Press'] },
          { h: 'Resources', links: ['Docs', 'API', 'Support', 'Status'] },
        ]" :key="col.h">
          <h4 class="text-sm font-semibold text-white">{{ col.h }}</h4>
          <ul class="mt-4 space-y-2.5">
            <li v-for="l in col.links" :key="l">
              <a href="#" class="text-sm text-white/60 transition-colors hover:text-primary-light">{{ l }}</a>
            </li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="section flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
          <p class="text-xs text-white/50">© 2026 BuildQ AI. All rights reserved.</p>
          <div class="flex gap-5 text-xs text-white/50">
            <a href="#" class="hover:text-white">Privacy</a>
            <a href="#" class="hover:text-white">Terms</a>
            <a href="#" class="hover:text-white">RICS · NIQS Compliant</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
