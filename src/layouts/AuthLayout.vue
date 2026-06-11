<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { ShieldCheck, Zap, BarChart3 } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'

const highlights = [
  { icon: Zap, title: 'BOQ in under 5 minutes', text: 'AI extracts quantities from your drawings automatically.' },
  { icon: BarChart3, title: 'Real-time pricing', text: 'Localized material & labour rates for accurate estimates.' },
  { icon: ShieldCheck, title: 'Enterprise security', text: 'Role-based access, audit logs, and end-to-end encryption.' },
]
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <!-- Brand panel -->
    <div class="relative hidden overflow-hidden bg-navy-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div class="absolute inset-0 bg-hero-glow"></div>
      <div class="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-primary/20 blur-3xl"></div>

      <RouterLink to="/" class="relative"><BrandLogo light size="lg" /></RouterLink>

      <div class="relative">
        <h2 class="font-display text-3xl font-bold leading-tight text-white">
          Revolutionize how you<br />estimate construction costs.
        </h2>
        <p class="mt-4 max-w-md text-white/60">
          Join thousands of quantity surveyors and construction firms cutting estimation time by over 70%.
        </p>

        <div class="mt-10 space-y-5">
          <div v-for="h in highlights" :key="h.title" class="flex items-start gap-4">
            <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-primary-light">
              <component :is="h.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="font-semibold text-white">{{ h.title }}</p>
              <p class="text-sm text-white/55">{{ h.text }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="relative flex items-center gap-3 text-sm text-white/50">
        <div class="flex -space-x-2">
          <div v-for="(c, i) in ['DA','KO','TJ','MN']" :key="i"
            class="grid h-8 w-8 place-items-center rounded-full border-2 border-secondary bg-primary/30 text-[11px] font-semibold text-white">
            {{ c }}
          </div>
        </div>
        Trusted by 2,400+ construction professionals
      </div>
    </div>

    <!-- Form panel -->
    <div class="flex items-center justify-center bg-brand-bg px-5 py-12">
      <div class="w-full max-w-md">
        <RouterLink to="/" class="mb-8 inline-block lg:hidden"><BrandLogo /></RouterLink>
        <RouterView />
      </div>
    </div>
  </div>
</template>
