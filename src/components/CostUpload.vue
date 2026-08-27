<script setup>
import { ref } from 'vue'
import { UploadCloud, Loader2, FileSpreadsheet, Download } from 'lucide-vue-next'
import { useCostsStore, parseCostCsv } from '@/stores/costs'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'

const costs = useCostsStore()
const { toast } = useToast()

const input = ref(null)
const dragging = ref(false)
const busy = ref(false)
let dragDepth = 0

function browse() {
  input.value?.click()
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || [])
  if (!files.length) return
  busy.value = true

  for (const file of files) {
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
      toast(`${file.name}: upload a CSV export of your priced schedule`, 'warning')
      continue
    }
    const text = await file.text()
    const { rows, errors } = parseCostCsv(text)

    // Surface only the first couple of row problems; a bad file can produce many.
    errors.slice(0, 2).forEach((e) => toast(e, 'warning'))
    if (errors.length > 2) toast(`…and ${errors.length - 2} more rows skipped`, 'warning')

    if (rows.length) {
      const n = costs.importRows(rows, file.name)
      toast(`${n} cost line${n > 1 ? 's' : ''} imported from ${file.name}`)
    }
  }

  busy.value = false
}

async function onPicked(e) {
  await handleFiles(e.target.files)
  e.target.value = ''
}

function onDragEnter() { dragDepth++; dragging.value = true }
function onDragLeave() { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dragging.value = false }
async function onDrop(e) {
  dragDepth = 0
  dragging.value = false
  await handleFiles(e.dataTransfer?.files)
}

// A template removes the guesswork about what the file should look like.
function downloadTemplate() {
  downloadMock(
    'BuildQ-cost-template.csv',
    [
      'Item,Section,Unit,Qty,Rate',
      'Reinforced concrete (1:2:4) in foundation bases,Substructure,m3,142,78000',
      '225mm sandcrete block wall,Superstructure,m2,1860,6800',
      'Aluminium roofing sheet 0.55mm,Roofing,m2,410,9200',
      'Flush doors with hardwood frame,Doors & Windows,no,28,65000',
    ].join('\n')
  )
  toast('Template downloaded — fill it in and upload')
}

defineExpose({ browse })
</script>

<template>
  <div>
    <div
      class="relative rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors"
      :class="dragging ? 'border-primary bg-primary/5' : 'border-brand-border bg-brand-bg hover:border-primary/50'"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input ref="input" type="file" accept=".csv,.txt,.tsv" multiple class="hidden" @change="onPicked" />

      <div class="flex flex-col items-center gap-3">
        <div class="grid h-12 w-12 place-items-center rounded-xl text-primary transition-colors"
          :class="dragging ? 'bg-primary/15' : 'bg-white shadow-card'">
          <component :is="busy ? Loader2 : UploadCloud" class="h-5 w-5" :class="busy && 'animate-spin'" />
        </div>
        <div>
          <p class="font-semibold text-secondary">
            {{ busy ? 'Reading your costs…' : dragging ? 'Release to import' : 'Upload your own cost data' }}
          </p>
          <p class="mt-1 text-xs text-brand-muted">
            CSV with item, unit, quantity and rate columns — a supplier quote, priced BOQ or internal rate schedule
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <button type="button" class="btn-outline btn-sm" :disabled="busy" @click="browse">
            <FileSpreadsheet class="h-4 w-4" /> Choose CSV
          </button>
          <button type="button" class="btn-ghost btn-sm" @click="downloadTemplate">
            <Download class="h-4 w-4" /> Template
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
