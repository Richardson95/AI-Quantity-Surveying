<script setup>
import { ref } from 'vue'
import { Mail, Phone, MapPin, Send, Check } from 'lucide-vue-next'

const sent = ref(false)
const form = ref({ name: '', email: '', company: '', message: '' })

// There is no contact endpoint, so this opens the visitor's mail client with
// the message already written rather than pretending to have sent it. It used
// to flip a flag and say "we'll get back to you", which was untrue.
const CONTACT_EMAIL = 'hello@brgprime.com'

function submit() {
  const subject = `BuildQ enquiry from ${form.value.name || 'a visitor'}`
  const body = [
    `Name: ${form.value.name}`,
    `Email: ${form.value.email}`,
    form.value.company ? `Company: ${form.value.company}` : '',
    '',
    form.value.message,
  ].filter(Boolean).join('\n')

  window.location.href =
    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  sent.value = true
}
</script>

<template>
  <section class="bg-brand-bg py-20">
    <div class="section grid gap-12 lg:grid-cols-2">
      <!-- Info -->
      <div>
        <span class="badge bg-primary/10 text-primary-dark">Get in touch</span>
        <h1 class="mt-4 font-display text-4xl font-extrabold text-secondary sm:text-5xl">Let's talk about your projects</h1>
        <p class="mt-4 max-w-md text-brand-muted">
          Whether you're a freelance surveyor or a large firm, our team is here to help you get the most out of BuildQ AI.
        </p>

        <div class="mt-10 space-y-5">
          <div v-for="c in [
            { icon: Mail, label: 'Email', value: 'hello@buildq.ai' },
            { icon: Phone, label: 'Phone', value: '+234 801 234 5678' },
            { icon: MapPin, label: 'Office', value: 'Victoria Island, Lagos, Nigeria' },
          ]" :key="c.label" class="flex items-center gap-4">
            <div class="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <component :is="c.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-brand-light">{{ c.label }}</p>
              <p class="font-semibold text-secondary">{{ c.value }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="card p-8">
        <div v-if="sent" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
            <Check class="h-8 w-8" />
          </div>
          <h3 class="mt-5 font-display text-xl font-bold text-secondary">Your email is ready to send</h3>
          <p class="mt-2 max-w-sm text-sm text-brand-muted">
            We've opened your mail app with the message filled in — send it and we'll reply within one business day.
            If nothing opened, write to
            <a :href="`mailto:${CONTACT_EMAIL}`" class="font-semibold text-primary hover:underline">{{ CONTACT_EMAIL }}</a>.
          </p>
        </div>

        <form v-else class="space-y-5" @submit.prevent="submit">
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label class="label">Full name</label>
              <input v-model="form.name" class="input" placeholder="Dammie Adetunji" required />
            </div>
            <div>
              <label class="label">Work email</label>
              <input v-model="form.email" type="email" class="input" placeholder="you@company.com" required />
            </div>
          </div>
          <div>
            <label class="label">Company</label>
            <input v-model="form.company" class="input" placeholder="Your company" />
          </div>
          <div>
            <label class="label">How can we help?</label>
            <textarea v-model="form.message" rows="4" class="input resize-none" placeholder="Tell us about your projects…" required></textarea>
          </div>
          <button type="submit" class="btn-primary btn-md w-full">
            Send message <Send class="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
