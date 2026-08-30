import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'

// ---------------------------------------------------------------------------
// The AI assistant.
// ---------------------------------------------------------------------------
// Replaces the regex keyword match against five canned paragraphs. The server
// hands the model this project's actual bill, takeoff, drawings and rate
// library and tells it to answer from that data — it is not asked to recall
// Nigerian construction prices from training, because a number it invented
// could end up in a tender.
//
// Replies stream. `send()` appends an empty assistant message and fills it in
// as deltas arrive, so the screen shows text as it is written.
//
// When the engine is not configured the screen says so — there are no canned
// replies standing in for an answer.
// ---------------------------------------------------------------------------

export const useAssistantStore = defineStore('assistant', {
  state: () => ({
    // { role: 'user' | 'ai', text }
    messages: [],
    threads: [],
    threadId: null,
    sending: false,
    // Whether a real model is reachable.
    available: false,
    model: null,
    error: null,
    statusChecked: false,
  }),

  getters: {
    /**
     * True once text has started arriving. The empty assistant bubble is pushed
     * as soon as the request goes out, so "has a bubble" is not the same as
     * "is writing" — the typing dots key off this being false.
     */
    streaming: (s) => {
      if (!s.sending) return false
      const last = s.messages[s.messages.length - 1]
      return last?.role === 'ai' && Boolean(last.text)
    },
  },

  actions: {
    /** Says honestly whether the engine is configured, before anyone types. */
    async checkStatus() {
      try {
        const data = await api.get('/assistant/status')
        this.available = Boolean(data.available)
        this.model = data.model || null
      } catch {
        this.available = false
      } finally {
        this.statusChecked = true
      }
      return { available: this.available, model: this.model }
    },

    greet(firstName) {
      if (this.messages.length) return
      this.messages.push({
        role: 'ai',
        text: `Hi ${firstName} 👋 I'm your AI Construction Assistant. I can help you generate BOQs, estimate quantities, compare market rates and suggest cost savings. What would you like to work on?`,
      })
    },

    async fetchThreads() {
      try {
        const data = await api.get('/assistant/threads')
        this.threads = data.threads || []
      } catch {
        this.threads = []
      }
      return this.threads
    },

    async openThread(threadId) {
      try {
        const data = await api.get('/assistant/threads/' + threadId)
        this.threadId = data.id
        this.messages = (data.messages || []).map((m) => ({
          role: m.role === 'assistant' ? 'ai' : 'user',
          text: m.content,
        }))
        return data
      } catch {
        return null
      }
    },

    async deleteThread(threadId) {
      try {
        await api.del('/assistant/threads/' + threadId)
      } catch {
        /* already gone */
      }
      this.threads = this.threads.filter((t) => t.id !== threadId)
      if (this.threadId === threadId) this.newThread()
    },

    newThread() {
      this.threadId = null
      this.messages = []
      this.error = null
    },

    /**
     * Send one message. Streams the reply into the last assistant bubble.
     * `onChunk` lets the view scroll as text arrives.
     */
    async send(text, { projectId = null, onChunk } = {}) {
      const question = String(text || '').trim()
      if (!question || this.sending) return null

      this.messages.push({ role: 'user', text: question })
      this.sending = true
      this.error = null

      // The bubble is created empty and filled as deltas arrive.
      const reply = { role: 'ai', text: '' }
      this.messages.push(reply)

      try {
        await api.sse(
          '/assistant/chat',
          { message: question, threadId: this.threadId, projectId, stream: true },
          (event) => {
            if (event.type === 'start') {
              this.threadId = event.threadId
            } else if (event.type === 'delta') {
              reply.text += event.text
              onChunk?.()
            } else if (event.type === 'error') {
              this.error = event.message
            } else if (event.type === 'done') {
              this.threadId = event.threadId || this.threadId
            }
          }
        )

        // A stream that produced nothing is a failure, not an empty answer.
        if (!reply.text) {
          reply.text = this.error || 'The assistant did not return an answer. Please try again.'
        }
        await this.fetchThreads()
        return reply
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'The assistant is unavailable right now.'
        this.error = message
        reply.text = message
        return reply
      } finally {
        this.sending = false
        onChunk?.()
      }
    },
  },
})
