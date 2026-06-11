<script setup>
import { TrendingUp, TrendingDown } from 'lucide-vue-next'

defineProps({
  label: String,
  value: String,
  delta: String,
  trend: { type: String, default: 'up' }, // up | down | neutral
  icon: [Object, Function],
  iconClass: { type: String, default: 'bg-primary/10 text-primary' },
})
</script>

<template>
  <div class="card p-5 transition-all hover:shadow-card-hover">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-brand-muted">{{ label }}</p>
        <p class="mt-2 font-display text-2xl font-bold text-secondary">{{ value }}</p>
      </div>
      <div v-if="icon" :class="iconClass" class="grid h-11 w-11 place-items-center rounded-xl">
        <component :is="icon" class="h-5 w-5" />
      </div>
    </div>
    <div v-if="delta" class="mt-3 flex items-center gap-1.5 text-sm">
      <span class="inline-flex items-center gap-1 font-semibold" :class="trend === 'down' ? 'text-danger' : 'text-success'">
        <component :is="trend === 'down' ? TrendingDown : TrendingUp" class="h-4 w-4" />
        {{ delta }}
      </span>
      <span class="text-brand-light">vs last month</span>
    </div>
  </div>
</template>
