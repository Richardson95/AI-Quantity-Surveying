<script setup>
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const meta = {
  success: { icon: CheckCircle2, cls: 'text-success' },
  info: { icon: Info, cls: 'text-primary' },
  warning: { icon: AlertTriangle, cls: 'text-warning' },
}
</script>

<template>
  <div class="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2">
    <transition-group name="page">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 rounded-xl border border-brand-border-light bg-white px-4 py-3 shadow-card-hover"
      >
        <component :is="(meta[t.type] || meta.success).icon" class="h-5 w-5 shrink-0" :class="(meta[t.type] || meta.success).cls" />
        <p class="flex-1 text-sm font-medium text-secondary">{{ t.message }}</p>
        <button class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-secondary" @click="dismiss(t.id)">
          <X class="h-4 w-4" />
        </button>
      </div>
    </transition-group>
  </div>
</template>
