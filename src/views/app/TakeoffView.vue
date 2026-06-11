<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Ruler, Square, Box, Hash, MousePointer2, ZoomIn, ZoomOut, Layers, Sparkles, Plus } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { toast } = useToast()
const zoom = ref(100)
const activeTool = ref('area')
const tools = [
  { id: 'select', name: 'Select', icon: MousePointer2 },
  { id: 'linear', name: 'Linear', icon: Ruler },
  { id: 'area', name: 'Area', icon: Square },
  { id: 'volume', name: 'Volume', icon: Box },
  { id: 'count', name: 'Count', icon: Hash },
]

const measurements = ref([
  { name: 'Ground floor slab', type: 'Area', value: '186.4 m²', color: '#1CA5F6', auto: true },
  { name: 'External wall run', type: 'Linear', value: '68.2 m', color: '#2DC875', auto: true },
  { name: 'Foundation concrete', type: 'Volume', value: '42.1 m³', color: '#FFA726', auto: false },
  { name: 'Window openings', type: 'Count', value: '14 no', color: '#E63946', auto: true },
  { name: 'Internal partitions', type: 'Linear', value: '94.6 m', color: '#6DCBFB', auto: true },
])
const typeColor = { Area: 'bg-primary/10 text-primary-dark', Linear: 'bg-success/10 text-success', Volume: 'bg-warning/10 text-warning', Count: 'bg-danger/10 text-danger' }

function zoomIn() { zoom.value = Math.min(400, zoom.value + 25) }
function zoomOut() { zoom.value = Math.max(25, zoom.value - 25) }
function autoDetect() { toast('AI is detecting all measurable quantities…', 'info') }
function addMeasurement() {
  measurements.value.push({ name: 'New measurement', type: 'Area', value: '0.0 m²', color: '#1CA5F6', auto: false })
  toast('Measurement added')
}
function syncToBoq() {
  toast('Measurements synced to BOQ')
  router.push('/app/boq')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Quantity Takeoff</h2>
        <p class="mt-1 text-brand-muted">Digital measurement from Ground Floor Plan.pdf</p>
      </div>
      <button class="btn-primary btn-md self-start" @click="autoDetect"><Sparkles class="h-4 w-4" /> Auto-detect all</button>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Canvas -->
      <div class="card overflow-hidden lg:col-span-2">
        <div class="flex items-center justify-between border-b border-brand-border-light px-4 py-3">
          <div class="flex items-center gap-1 rounded-xl bg-brand-bg p-1">
            <button v-for="t in tools" :key="t.id" @click="activeTool = t.id"
              class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="activeTool === t.id ? 'bg-white text-primary shadow-sm' : 'text-brand-muted hover:text-secondary'">
              <component :is="t.icon" class="h-4 w-4" /> <span class="hidden sm:inline">{{ t.name }}</span>
            </button>
          </div>
          <div class="flex items-center gap-1">
            <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-muted hover:bg-brand-border-light" @click="zoomOut"><ZoomOut class="h-4 w-4" /></button>
            <span class="w-10 text-center text-xs font-medium text-brand-muted">{{ zoom }}%</span>
            <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-muted hover:bg-brand-border-light" @click="zoomIn"><ZoomIn class="h-4 w-4" /></button>
          </div>
        </div>
        <div class="relative aspect-[4/3] bg-secondary">
          <svg viewBox="0 0 400 300" class="h-full w-full">
            <defs>
              <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2D3D63" stroke-width="0.5" />
              </pattern>
            </defs>
            <rect width="400" height="300" fill="#1B2540" />
            <rect width="400" height="300" fill="url(#grid2)" />
            <!-- measured area -->
            <rect x="60" y="50" width="280" height="200" fill="#1CA5F6" fill-opacity="0.12" stroke="#1CA5F6" stroke-width="1.5" />
            <rect x="80" y="70" width="100" height="60" fill="#2DC875" fill-opacity="0.12" stroke="#2DC875" stroke-width="1.5" stroke-dasharray="4 2" />
            <circle v-for="(p, i) in [[230,80],[290,80],[230,160],[290,160]]" :key="i" :cx="p[0]" :cy="p[1]" r="4" fill="#E63946" />
            <text x="180" y="155" fill="#6DCBFB" font-size="9" text-anchor="middle">186.4 m²</text>
            <text x="100" y="105" fill="#2DC875" font-size="8">Wet area</text>
          </svg>
          <div class="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white backdrop-blur">
            <Ruler class="h-3.5 w-3.5 text-primary-light" /> Scale 1:100 · auto-detected
          </div>
        </div>
      </div>

      <!-- Measurements list -->
      <div class="card flex flex-col">
        <div class="flex items-center justify-between border-b border-brand-border-light p-5">
          <h3 class="flex items-center gap-2 font-display font-bold text-secondary"><Layers class="h-4 w-4 text-primary" /> Measurements</h3>
          <button class="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20" @click="addMeasurement"><Plus class="h-4 w-4" /></button>
        </div>
        <div class="flex-1 space-y-2 p-4">
          <div v-for="m in measurements" :key="m.name" class="rounded-xl border border-brand-border-light p-3 transition-colors hover:border-primary/30">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full" :style="{ background: m.color }"></span>
              <p class="flex-1 text-sm font-semibold text-secondary">{{ m.name }}</p>
              <span v-if="m.auto" class="badge bg-primary/10 text-[10px] text-primary-dark">AI</span>
            </div>
            <div class="mt-2 flex items-center justify-between">
              <span class="chip" :class="typeColor[m.type]">{{ m.type }}</span>
              <span class="font-bold text-secondary">{{ m.value }}</span>
            </div>
          </div>
        </div>
        <div class="border-t border-brand-border-light p-4">
          <button class="btn-primary btn-md w-full" @click="syncToBoq">Sync to BOQ</button>
        </div>
      </div>
    </div>
  </div>
</template>
