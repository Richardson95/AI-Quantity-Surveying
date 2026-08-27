<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { ArrowRight, Check, CircleDot } from 'lucide-vue-next'
import { pages } from '@/content/pages'

const route = useRoute()

// The route's meta names which entry of the content map to render, so every
// footer link lands on a real URL with real content instead of "#".
const page = computed(() => pages[route.meta.page] || pages.about)

const stateColor = {
  Operational: 'bg-success/10 text-success',
  Degraded: 'bg-warning/10 text-warning',
  Down: 'bg-danger/10 text-danger',
}

const tagColor = {
  Engineering: 'bg-primary/10 text-primary-dark',
  Product: 'bg-success/10 text-success',
  Operations: 'bg-warning/10 text-warning',
  Practice: 'bg-primary/10 text-primary-dark',
  Data: 'bg-secondary/10 text-secondary-variant',
  Standards: 'bg-warning/10 text-warning',
  Degraded: 'bg-warning/10 text-warning',
  Minor: 'bg-brand-border text-brand-muted',
}
</script>

<template>
  <section class="bg-navy-gradient py-16 sm:py-20">
    <div class="section relative text-center">
      <div class="absolute inset-0 bg-hero-glow"></div>
      <div class="relative mx-auto max-w-2xl">
        <span class="badge bg-white/10 text-primary-light">{{ page.kicker }}</span>
        <h1 class="mt-4 font-display text-4xl font-extrabold text-white sm:text-5xl">{{ page.title }}</h1>
        <p class="mt-4 text-white/60">{{ page.intro }}</p>
      </div>
    </div>
  </section>

  <section class="bg-brand-bg py-16 sm:py-20">
    <div class="section max-w-4xl space-y-12">
      <div v-for="(block, bi) in page.blocks" :key="bi">
        <h2 class="font-display text-xl font-bold text-secondary sm:text-2xl">{{ block.heading }}</h2>

        <!-- Prose -->
        <p v-if="block.type === 'text'" class="mt-4 leading-relaxed text-brand-muted">{{ block.body }}</p>

        <!-- Checklist -->
        <ul v-else-if="block.type === 'bullets'" class="mt-5 space-y-3">
          <li v-for="item in block.items" :key="item" class="flex items-start gap-3 text-secondary">
            <Check class="mt-1 h-4 w-4 shrink-0 text-success" />
            <span>{{ item }}</span>
          </li>
        </ul>

        <!-- Card grid -->
        <div v-else-if="block.type === 'cards'" class="mt-5 grid gap-4 sm:grid-cols-2">
          <div v-for="item in block.items" :key="item.title" class="card p-5">
            <h3 class="font-display font-bold text-secondary">{{ item.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-brand-muted">{{ item.body }}</p>
          </div>
        </div>

        <!-- Row list: roles, posts, incidents -->
        <div v-else-if="block.type === 'rows'" class="mt-5 space-y-3">
          <article v-for="item in block.items" :key="item.title" class="card p-5 transition-shadow hover:shadow-card-hover">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-display font-bold text-secondary">{{ item.title }}</h3>
              <span v-if="item.tag" class="badge" :class="tagColor[item.tag] || 'bg-brand-border text-brand-muted'">{{ item.tag }}</span>
            </div>
            <p v-if="item.meta" class="mt-1 text-xs font-medium uppercase tracking-wide text-brand-light">{{ item.meta }}</p>
            <p class="mt-2.5 text-sm leading-relaxed text-brand-muted">{{ item.body }}</p>
          </article>
        </div>

        <!-- Service status -->
        <div v-else-if="block.type === 'status'" class="card mt-5 divide-y divide-brand-border-light overflow-hidden">
          <div v-for="item in block.items" :key="item.name" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <span class="flex min-w-0 items-center gap-2.5">
              <CircleDot class="h-4 w-4 shrink-0" :class="item.state === 'Operational' ? 'text-success' : 'text-warning'" />
              <span class="truncate font-medium text-secondary">{{ item.name }}</span>
            </span>
            <span class="badge shrink-0" :class="stateColor[item.state]">{{ item.state }}</span>
          </div>
        </div>
      </div>

      <div v-if="page.cta" class="border-t border-brand-border-light pt-10 text-center">
        <RouterLink :to="page.cta.to" class="btn-primary btn-lg">
          {{ page.cta.label }} <ArrowRight class="h-5 w-5" />
        </RouterLink>
      </div>
    </div>
  </section>
</template>
