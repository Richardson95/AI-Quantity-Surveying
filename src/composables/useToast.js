import { reactive } from 'vue'

// Global, app-wide toast queue (mock feedback for actions without a backend yet)
const state = reactive({ toasts: [] })
let nextId = 0

export function useToast() {
  function toast(message, type = 'success') {
    const id = ++nextId
    state.toasts.push({ id, message, type })
    setTimeout(() => dismiss(id), 3200)
    return id
  }
  function dismiss(id) {
    const i = state.toasts.findIndex((t) => t.id === id)
    if (i !== -1) state.toasts.splice(i, 1)
  }
  return { toasts: state.toasts, toast, dismiss }
}
