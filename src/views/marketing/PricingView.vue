<script setup>
import { API_BASE } from '@/services/api'
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Sparkles, ArrowRight } from 'lucide-vue-next'

// Prices come from the server's public service index, so the page cannot
// advertise a figure the checkout does not charge. It used to hardcode
// ₦65,000/month for Professional while the server billed ₦54,000.
const plans = ref([])
const loading = ref(true)

// Copy only — never a price, a seat count or an allowance.
const COPY = {
  Starter: { desc: 'Freelance surveyors', cta: 'Choose Starter', highlight: false },
  Professional: { desc: 'Construction companies', cta: 'Choose Professional', highlight: true },
  Enterprise: { desc: 'Large firms & government', cta: 'Contact sales', highlight: false },
}

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/`)
    const data = await res.json()
    plans.value = (data.plans || []).map((p) => ({
      name: p.name,
      monthly: p.monthlyNaira,
      seats: p.seats,
      credits: p.aiCredits,
      storage: p.storageGb,
      // Built from the allowances the server actually enforces, so a feature
      // list cannot promise something the plan does not grant.
      features: [
        p.seats === null ? 'Unlimited team seats' : `${p.seats} team seat${p.seats === 1 ? '' : 's'}`,
        p.aiCredits === null ? 'Unlimited AI credits' : `${p.aiCredits.toLocaleString('en-NG')} AI credits / month`,
        `${p.storageGb} GB document storage`,
        'Drawing analysis, BOQ generation and the AI assistant',
        'CSV export',
      ],
      ...(COPY[p.name] || { desc: '', cta: 'Get started', highlight: false }),
    }))
  } catch {
    plans.value = []
  } finally {
    loading.value = false
  }
})

function price(p) {
  if (p.monthly === null) return 'Custom'
  return p.monthly === 0 ? '₦0' : '₦' + p.monthly.toLocaleString('en-NG')
}
</script>

<template>
  <section class="bg-brand-bg py-20">
    <div class="section text-center">
      <span class="badge bg-primary/10 text-primary-dark">Pricing</span>
      <h1 class="mt-4 font-display text-4xl font-extrabold text-secondary sm:text-5xl">Simple, transparent plans</h1>
      <p class="mx-auto mt-4 max-w-xl text-brand-muted">Choose the plan that fits your team. Upgrade, downgrade or cancel anytime.</p>

      <p class="mt-3 text-sm text-brand-light">Billed monthly. Every plan starts with a 14-day free trial, no card required.</p>
    </div>

    <p v-if="loading" class="section mt-14 text-center text-sm text-brand-muted">Loading plans…</p>
    <p v-else-if="!plans.length" class="section mt-14 text-center text-sm text-brand-muted">
      Plans are unavailable right now. Please try again shortly.
    </p>

    <div v-else class="section mt-14 grid gap-6" :class="plans.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'">
      <div v-for="p in plans" :key="p.name"
        class="card relative flex flex-col p-6"
        :class="p.highlight ? 'ring-2 ring-primary shadow-card-hover lg:-mt-3 lg:mb-3' : ''">
        <span v-if="p.highlight" class="badge absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gradient text-white">
          <Sparkles class="h-3 w-3" /> Most popular
        </span>
        <h3 class="font-display text-lg font-bold text-secondary">{{ p.name }}</h3>
        <p class="text-sm text-brand-muted">{{ p.desc }}</p>
        <div class="mt-5 flex items-end gap-1">
          <span class="font-display text-4xl font-extrabold text-secondary">{{ price(p) }}</span>
          <span v-if="p.monthly !== null && p.monthly !== 0" class="mb-1 text-sm text-brand-muted">/mo</span>
        </div>
        <RouterLink :to="p.name === 'Enterprise' ? '/contact' : '/auth/signup'"
          :class="p.highlight ? 'btn-primary' : 'btn-outline'" class="btn-md mt-6">
          {{ p.cta }}
        </RouterLink>
        <ul class="mt-6 space-y-3 border-t border-brand-border-light pt-6">
          <li v-for="f in p.features" :key="f" class="flex items-start gap-2.5 text-sm text-secondary">
            <Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ f }}
          </li>
        </ul>
      </div>
    </div>

    <!-- FAQ -->
    <div class="section mt-20">
      <h2 class="text-center font-display text-2xl font-bold text-secondary">Frequently asked questions</h2>
      <div class="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
        <div v-for="f in [
          { q: 'Can I change plans later?', a: 'Yes — upgrade or downgrade anytime. Changes are prorated automatically.' },
          { q: 'Do you support local pricing?', a: 'Absolutely. We maintain regional material and labour rate databases, including Nigerian markets.' },
          { q: 'Is there a free trial?', a: 'Every plan starts with a 14-day free trial. No credit card required.' },
          { q: 'What file types can I upload?', a: 'PDF drawings on all plans; CAD and BIM/Revit files on Professional and Enterprise.' },
        ]" :key="f.q" class="card p-5">
          <p class="font-semibold text-secondary">{{ f.q }}</p>
          <p class="mt-2 text-sm text-brand-muted">{{ f.a }}</p>
        </div>
      </div>
      <div class="mt-12 text-center">
        <RouterLink to="/auth/signup" class="btn-primary btn-lg">Get started free <ArrowRight class="h-5 w-5" /></RouterLink>
      </div>
    </div>
  </section>
</template>
