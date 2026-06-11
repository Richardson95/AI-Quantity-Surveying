<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Mail, ArrowLeft, Check } from 'lucide-vue-next'

const email = ref('')
const sent = ref(false)
</script>

<template>
  <div>
    <RouterLink to="/auth/login" class="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-secondary">
      <ArrowLeft class="h-4 w-4" /> Back to sign in
    </RouterLink>

    <div v-if="!sent">
      <h1 class="font-display text-2xl font-bold text-secondary">Reset your password</h1>
      <p class="mt-1.5 text-sm text-brand-muted">Enter your email and we'll send you a link to reset it.</p>

      <form class="mt-8 space-y-5" @submit.prevent="sent = true">
        <div>
          <label class="label">Email address</label>
          <div class="relative">
            <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="email" type="email" class="input pl-10" placeholder="you@company.com" required />
          </div>
        </div>
        <button type="submit" class="btn-primary btn-md w-full">Send reset link</button>
      </form>
    </div>

    <div v-else class="text-center">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
        <Check class="h-8 w-8" />
      </div>
      <h1 class="mt-5 font-display text-2xl font-bold text-secondary">Check your inbox</h1>
      <p class="mt-2 text-sm text-brand-muted">
        We've sent a password reset link to <span class="font-semibold text-secondary">{{ email }}</span>.
      </p>
      <RouterLink to="/auth/login" class="btn-outline btn-md mt-8 w-full">Back to sign in</RouterLink>
    </div>
  </div>
</template>
