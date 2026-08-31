<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { Sparkles, Send, Paperclip, FileSpreadsheet, Calculator, Lightbulb, ShieldCheck, User, History, Trash2, X, AlertTriangle } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useAssistantStore } from '@/stores/assistant'
import { useProjectsStore } from '@/stores/projects'
import { useBillingStore } from '@/stores/billing'
import { timeAgo } from '@/utils/format'

const { toast } = useToast()
const auth = useAuthStore()
const store = useAssistantStore()
const projects = useProjectsStore()
const billing = useBillingStore()

const firstName = auth.user.name.split(' ')[0]
const input = ref('')
const messagesEl = ref(null)

const messages = computed(() => store.messages)
const sending = computed(() => store.sending)

// The assistant answers about ONE project — it is handed that project's bill,
// takeoff, drawings and rate library, and told to answer from them.
const projectId = computed(() => projects.currentProjectId)

onMounted(async () => {
  store.greet(firstName)
  await Promise.all([store.checkStatus(), projects.ensureProject(), billing.fetchUsage()])
  store.fetchThreads()
  scrollDown()
})

// Every reply is a paid model call counted against the plan's allowance. Say so
// before the send button stops working, not after.
const creditsLeft = computed(() => billing.creditsLeft)
const outOfCredits = computed(() => billing.creditsExhausted)

// --- Past conversations ------------------------------------------------------
// Threads are stored server-side and were being listed but never shown, so a
// conversation you had yesterday was unreachable.
const historyOpen = ref(false)

async function openHistory() {
  historyOpen.value = true
  await store.fetchThreads()
}

async function openThread(t) {
  await store.openThread(t.id)
  historyOpen.value = false
  scrollDown()
}

async function removeThread(t) {
  await store.deleteThread(t.id)
  if (!store.messages.length) store.greet(firstName)
}

const prompts = [
  { icon: FileSpreadsheet, text: 'Generate a BOQ for a 4-bedroom duplex' },
  { icon: Calculator, text: 'Estimate total reinforcement quantity' },
  { icon: Lightbulb, text: 'Suggest cost-saving alternatives' },
  { icon: ShieldCheck, text: 'Compare cost with Lagos market rates' },
]

async function scrollDown() {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

async function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || store.sending) return
  input.value = ''
  // The reply streams in, so scroll on every chunk rather than once at the end.
  await store.send(q, { projectId: projectId.value, onChunk: scrollDown })
  if (store.error) toast(store.error, 'warning')
}

function newConversation() {
  store.newThread()
  store.greet(firstName)
  scrollDown()
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
      <div class="min-w-0 flex-1">
        <h2 class="font-display text-xl font-bold text-secondary">AI Construction Assistant</h2>
        <!-- Say plainly whether a real model is answering. A canned reply
             dressed as "Online" is the kind of thing that ends up in a tender. -->
        <p class="flex items-center gap-1.5 text-sm text-brand-muted">
          <span class="h-2 w-2 shrink-0 rounded-full" :class="store.available ? 'bg-success' : 'bg-warning'"></span>
          <span class="truncate">
            <template v-if="store.available">
              Grounded in
              <template v-if="projects.current">{{ projects.current.name }}</template>
              <template v-else>your workspace data</template>
            </template>
            <template v-else-if="!store.statusChecked">Checking the engine…</template>
            <template v-else>The AI engine is not configured — no answers available</template>
          </span>
        </p>
      </div>
      <button class="btn-ghost btn-sm shrink-0" title="Past conversations" @click="openHistory">
        <History class="h-4 w-4" />
      </button>
      <button v-if="messages.length > 1" class="btn-ghost btn-sm shrink-0" @click="newConversation">
        New chat
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="card flex-1 space-y-5 overflow-y-auto p-5">
      <!-- An assistant bubble exists from the moment the request goes out; it
           only appears once there is something in it. -->
      <div v-for="(m, i) in messages" :key="i" v-show="m.role !== 'ai' || m.text" class="flex gap-3" :class="m.role === 'user' ? 'flex-row-reverse' : ''">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
          :class="m.role === 'ai' ? 'bg-brand-gradient' : 'bg-secondary'">
          <component :is="m.role === 'ai' ? Sparkles : User" class="h-4 w-4" />
        </div>
        <div class="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
          :class="m.role === 'ai' ? 'bg-brand-bg text-secondary' : 'bg-brand-gradient text-white'">
          <p v-html="render(m.text)"></p>
        </div>
      </div>

      <!-- Typing. Once text starts arriving the bubble itself is the feedback,
           so the dots only show while we are still waiting for the first token. -->
      <div v-if="sending && !store.streaming" class="flex gap-3">
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

    <p v-if="outOfCredits" class="mt-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-brand-muted">
      <AlertTriangle class="h-4 w-4 shrink-0 text-warning" />
      Your plan's AI credits are used up for this period. Upgrade on the billing page to keep asking.
    </p>
    <p v-else-if="creditsLeft !== null && creditsLeft <= 10" class="mt-4 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-brand-muted">
      {{ creditsLeft }} AI credit{{ creditsLeft === 1 ? '' : 's' }} left this period.
    </p>

    <!-- Input -->
    <div class="mt-4 flex items-end gap-2 rounded-2xl border border-brand-border bg-white p-2 shadow-card focus-within:border-primary">
      <input ref="attachInput" type="file" class="hidden" @change="onAttach" />
      <button class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-brand-light hover:bg-brand-border-light hover:text-primary" title="Attach a file" @click="attachFile"><Paperclip class="h-5 w-5" /></button>
      <textarea v-model="input" rows="1" @keydown.enter.exact.prevent="send()"
        class="flex-1 resize-none bg-transparent py-2.5 text-sm text-secondary placeholder:text-brand-light focus:outline-none"
        placeholder="Ask anything about quantities, costs or specifications…"></textarea>
      <button @click="send()" :disabled="!input.trim() || sending || outOfCredits" class="btn-primary grid h-10 w-10 shrink-0 place-items-center !p-0"><Send class="h-4 w-4" /></button>
    </div>

    <!-- Past conversations -->
    <transition name="page">
      <div v-if="historyOpen" class="fixed inset-0 z-[60] flex justify-end bg-secondary/40 backdrop-blur-sm" @click.self="historyOpen = false">
        <div class="flex h-full w-full max-w-sm flex-col bg-white shadow-card-hover">
          <div class="flex items-center justify-between border-b border-brand-border-light px-5 py-4">
            <h3 class="font-display font-bold text-secondary">Past conversations</h3>
            <button class="btn btn-ghost btn-sm" @click="historyOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <div class="flex-1 space-y-2 overflow-y-auto p-4">
            <p v-if="!store.threads.length" class="rounded-xl border border-dashed border-brand-border-light px-4 py-10 text-center text-sm text-brand-muted">
              Nothing yet. Conversations are saved as you have them.
            </p>
            <div v-for="t in store.threads" :key="t.id"
              class="group flex items-start gap-3 rounded-xl border p-3 transition-colors"
              :class="t.id === store.threadId ? 'border-primary bg-primary/5' : 'border-brand-border-light hover:border-primary/30 hover:bg-brand-bg'">
              <button class="min-w-0 flex-1 text-left" @click="openThread(t)">
                <p class="truncate text-sm font-semibold text-secondary">{{ t.title || 'Untitled conversation' }}</p>
                <p class="mt-0.5 text-xs text-brand-light">
                  {{ t.messages }} message{{ t.messages === 1 ? '' : 's' }} · {{ timeAgo(t.updatedAt) }}
                </p>
              </button>
              <button class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-light opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                title="Delete conversation" @click.stop="removeThread(t)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>
