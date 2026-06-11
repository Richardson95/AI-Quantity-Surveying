<script setup>
defineProps({
  light: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // sm | md | lg
})
const sizes = {
  sm: { box: 'h-7 w-7', text: 'text-base' },
  md: { box: 'h-9 w-9', text: 'text-lg' },
  lg: { box: 'h-11 w-11', text: 'text-2xl' },
}
</script>

<template>
  <div class="flex items-center gap-2.5 select-none">
    <div
      :class="sizes[size].box"
      class="relative grid place-items-center rounded-xl bg-brand-gradient shadow-card"
    >
      <svg viewBox="0 0 24 24" fill="none" class="h-3/5 w-3/5 text-white">
        <path d="M4 19V7l8-4 8 4v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9 19v-6h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="12" cy="9" r="1.4" fill="currentColor" />
      </svg>
    </div>
    <span :class="[sizes[size].text, light ? 'text-white' : 'text-secondary']" class="font-display font-extrabold tracking-tight">
      BuildQ<span class="text-primary">AI</span>
    </span>
  </div>
</template>
