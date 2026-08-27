<script setup>
import { ref, nextTick } from 'vue'
import { Sparkles, Send, Paperclip, FileSpreadsheet, Calculator, Lightbulb, ShieldCheck, User } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const { toast } = useToast()
const auth = useAuthStore()
const firstName = auth.user.name.split(' ')[0]
const input = ref('')
const sending = ref(false)
const messagesEl = ref(null)

const messages = ref([
  {
    role: 'ai',
    text: `Hi ${firstName} 👋 I'm your AI Construction Assistant. I can help you generate BOQs, estimate quantities, compare market rates and suggest cost savings. What would you like to work on?`,
  },
])

const prompts = [
  { icon: FileSpreadsheet, text: 'Generate a BOQ for a 4-bedroom duplex' },
  { icon: Calculator, text: 'Estimate total reinforcement quantity' },
  { icon: Lightbulb, text: 'Suggest cost-saving alternatives' },
  { icon: ShieldCheck, text: 'Compare cost with Lagos market rates' },
]

const cannedReply = (q) => {
  if (/reinforcement|steel/i.test(q))
    return "For a typical 4-bedroom duplex (≈340 m² built-up), expect roughly **18–22 tonnes** of reinforcement at an average ratio of 105 kg/m³ of concrete. At current Lagos rates (₦980,000/tonne) that's approximately **₦19.6M**. Want me to break it down by element (foundation, columns, slabs)?"
  if (/boq|duplex/i.test(q))
    return "I can generate that. Based on a standard 4-bedroom duplex I'd produce sections for Substructure, Superstructure, Roofing, Finishes and Services — about 120 line items totalling **≈₦185M** at Lagos rates. Upload your floor plans and I'll extract exact quantities, or I can start from a template. Which would you prefer?"
  if (/cost-saving|alternative|saving/i.test(q))
    return "Three high-impact options for this project: 1) Switch suspended slab to **ribbed/clay-pot** — saves ≈₦3.2M in concrete & steel. 2) Use **locally-sourced granite** instead of imported — saves ≈₦1.8M. 3) Standardise window sizes to reduce aluminium wastage — saves ≈₦600K. Net potential saving: **₦5.6M (~3%)**."
  if (/market|rate|lagos|compare/i.test(q))
    return "Your current estimate of **₦185.2M** is **4.2% below** the Lagos regional benchmark of ₦193.4M for comparable duplexes — a competitive tender position. The main variance is in finishes, where you're 9% under market. Shall I generate a benchmark comparison report?"
  return "Good question. I'd analyse your uploaded drawings and specifications to give a precise answer. In the meantime, I can outline the methodology, applicable RICS/NIQS measurement rules, and a ballpark figure. Would you like me to proceed?"
}

async function scrollDown() {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || sending.value) return
  messages.value.push({ role: 'user', text: q })
  input.value = ''
  sending.value = true
  scrollDown()
  setTimeout(() => {
    messages.value.push({ role: 'ai', text: cannedReply(q) })
    sending.value = false
    scrollDown()
  }, 1100)
}

// Anything a user types reaches v-html, so escape first and only then allow
// our own **bold** markup through.
function escapeHtml(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Attaching opens a real picker and puts the file into the conversation.
const attachInput = ref(null)
function attachFile() {
  attachInput.value?.click()
}
function onAttach(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const size = file.size < 1024 * 1024
    ? (file.size / 1024).toFixed(0) + ' KB'
    : (file.size / 1024 / 1024).toFixed(1) + ' MB'
  send(`Attached **${file.name}** (${size}) — please review it.`)
}

function render(t) {
  return escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong class="text-secondary">$1</strong>')
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col">
    <!-- Header -->
    <div class="mb-4 flex items-center gap-3">
      <div class="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-card"><Sparkles class="h-5 w-5" /></div>
      <div>
        <h2 class="font-display text-xl font-bold text-secondary">AI Construction Assistant</h2>
        <p class="flex items-center gap-1.5 text-sm text-brand-muted">
          <span class="h-2 w-2 rounded-full bg-success"></span> Online · powered by BuildQ AI
        </p>
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="card flex-1 space-y-5 overflow-y-auto p-5">
      <div v-for="(m, i) in messages" :key="i" class="flex gap-3" :class="m.role === 'user' ? 'flex-row-reverse' : ''">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
          :class="m.role === 'ai' ? 'bg-brand-gradient' : 'bg-secondary'">
          <component :is="m.role === 'ai' ? Sparkles : User" class="h-4 w-4" />
        </div>
        <div class="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
          :class="m.role === 'ai' ? 'bg-brand-bg text-secondary' : 'bg-brand-gradient text-white'">
          <p v-html="render(m.text)"></p>
        </div>
      </div>

      <!-- Typing -->
      <div v-if="sending" class="flex gap-3">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white"><Sparkles class="h-4 w-4" /></div>
        <div class="flex items-center gap-1 rounded-2xl bg-brand-bg px-4 py-4">
          <span class="h-2 w-2 animate-bounce rounded-full bg-brand-light" style="animation-delay: 0ms"></span>
          <span class="h-2 w-2 animate-bounce rounded-full bg-brand-light" style="animation-delay: 150ms"></span>
          <span class="h-2 w-2 animate-bounce rounded-full bg-brand-light" style="animation-delay: 300ms"></span>
        </div>
      </div>
    </div>

    <!-- Suggested prompts -->
    <div v-if="messages.length <= 1" class="mt-4 grid gap-2 sm:grid-cols-2">
      <button v-for="p in prompts" :key="p.text" @click="send(p.text)"
        class="flex items-center gap-3 rounded-xl border border-brand-border bg-white p-3 text-left text-sm font-medium text-secondary transition-all hover:border-primary/40 hover:shadow-card">
        <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><component :is="p.icon" class="h-4 w-4" /></div>
        {{ p.text }}
      </button>
    </div>

    <!-- Input -->
    <div class="mt-4 flex items-end gap-2 rounded-2xl border border-brand-border bg-white p-2 shadow-card focus-within:border-primary">
      <input ref="attachInput" type="file" class="hidden" @change="onAttach" />
      <button class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-brand-light hover:bg-brand-border-light hover:text-primary" title="Attach a file" @click="attachFile"><Paperclip class="h-5 w-5" /></button>
      <textarea v-model="input" rows="1" @keydown.enter.exact.prevent="send()"
        class="flex-1 resize-none bg-transparent py-2.5 text-sm text-secondary placeholder:text-brand-light focus:outline-none"
        placeholder="Ask anything about quantities, costs or specifications…"></textarea>
      <button @click="send()" :disabled="!input.trim() || sending" class="btn-primary grid h-10 w-10 shrink-0 place-items-center !p-0"><Send class="h-4 w-4" /></button>
    </div>
  </div>
</template>
