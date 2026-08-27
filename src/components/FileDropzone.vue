<script setup>
import { ref, computed } from 'vue'
import { UploadCloud, Loader2 } from 'lucide-vue-next'
import { useDocumentsStore, ACCEPTED_TYPES, MAX_FILE_MB } from '@/stores/documents'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  // Project id the files belong to, or 'library' for unattached files.
  scope: { type: String, default: 'library' },
  accept: { type: String, default: ACCEPTED_TYPES },
  multiple: { type: Boolean, default: true },
  label: { type: String, default: 'Drop drawings or plans here' },
  hint: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['uploaded'])

const docs = useDocumentsStore()
const { toast } = useToast()

const input = ref(null)
const dragging = ref(false)
const busy = ref(false)
// Nested dragenter/dragleave events fire constantly; count them so the
// highlight doesn't flicker as the pointer crosses child elements.
let dragDepth = 0

const hintText = computed(
  () => props.hint || `PDF, DWG, DXF, RVT, IFC, images and spreadsheets · up to ${MAX_FILE_MB} MB each`
)

function browse() {
  input.value?.click()
}

async function handleFiles(fileList) {
  if (!fileList || !fileList.length) return
  busy.value = true
  const { added, errors } = await docs.addFiles(fileList, { scope: props.scope })
  busy.value = false

  errors.forEach((e) => toast(e, 'warning'))
  if (added.length) {
    toast(
      added.length === 1
        ? `${added[0].name} uploaded — analyzing`
        : `${added.length} files uploaded — analyzing`
    )
    emit('uploaded', added)
  }
}

async function onPicked(e) {
  const files = e.target.files
  await handleFiles(files)
  e.target.value = ''
}

function onDragEnter() {
  dragDepth++
  dragging.value = true
}
function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}
// Lets a parent toolbar button open the picker for this same dropzone.
defineExpose({ browse })

async function onDrop(e) {
  dragDepth = 0
  dragging.value = false
  await handleFiles(e.dataTransfer?.files)
}
</script>

<template>
  <div
    class="relative rounded-2xl border-2 border-dashed text-center transition-colors"
    :class="[
      dragging ? 'border-primary bg-primary/5' : 'border-brand-border bg-brand-bg hover:border-primary/50',
      compact ? 'px-4 py-5' : 'px-6 py-10',
    ]"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <input
      ref="input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      class="hidden"
      @change="onPicked"
    />

    <div class="flex flex-col items-center gap-3">
      <div
        class="grid place-items-center rounded-xl text-primary transition-colors"
        :class="[dragging ? 'bg-primary/15' : 'bg-white shadow-card', compact ? 'h-10 w-10' : 'h-14 w-14']"
      >
        <component :is="busy ? Loader2 : UploadCloud" :class="[compact ? 'h-5 w-5' : 'h-6 w-6', busy && 'animate-spin']" />
      </div>

      <div>
        <p class="font-semibold text-secondary" :class="compact ? 'text-sm' : ''">
          {{ busy ? 'Reading files…' : dragging ? 'Release to upload' : label }}
        </p>
        <p class="mt-1 text-xs text-brand-muted">{{ hintText }}</p>
      </div>

      <button type="button" class="btn-outline" :class="compact ? 'btn-sm' : 'btn-md'" :disabled="busy" @click="browse">
        Browse files
      </button>
    </div>
  </div>
</template>
