<script setup>
import { RouterLink } from 'vue-router'
import { Home, ArrowLeft } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-brand-bg px-5">
    <div class="text-center">
      <RouterLink to="/" class="inline-block"><BrandLogo size="lg" /></RouterLink>
      <p class="mt-10 font-display text-[8rem] font-extrabold leading-none text-gradient">404</p>
      <h1 class="mt-2 font-display text-2xl font-bold text-secondary">Page not found</h1>
      <p class="mx-auto mt-3 max-w-sm text-brand-muted">The page you're looking for doesn't exist or has been moved.</p>
      <div class="mt-8 flex justify-center gap-3">
        <RouterLink to="/" class="btn-outline btn-md"><ArrowLeft class="h-4 w-4" /> Go back</RouterLink>
        <RouterLink to="/app/dashboard" class="btn-primary btn-md"><Home class="h-4 w-4" /> Dashboard</RouterLink>
      </div>
    </div>
  </div>
</template>
