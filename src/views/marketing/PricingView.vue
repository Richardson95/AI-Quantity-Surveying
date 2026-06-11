<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Sparkles, ArrowRight } from 'lucide-vue-next'

const annual = ref(true)

const plans = [
  {
    name: 'Free Trial', desc: 'Explore the platform', monthly: 0, annualPrice: 0,
    cta: 'Start free', highlight: false,
    features: ['2 projects', 'Basic BOQ generation', '50 AI requests / mo', '500 MB storage', 'Excel & PDF export'],
  },
  {
    name: 'Starter', desc: 'Freelance surveyors', monthly: 18000, annualPrice: 15000,
    cta: 'Choose Starter', highlight: false,
    features: ['5 active projects', 'Standard BOQ engine', '500 AI requests / mo', 'Basic reporting', 'Email support'],
  },
  {
    name: 'Professional', desc: 'Construction companies', monthly: 65000, annualPrice: 54000,
    cta: 'Choose Professional', highlight: true,
    features: ['Unlimited projects', 'Advanced AI estimation', '2,000 AI requests / mo', 'Team collaboration', 'Custom templates', 'Analytics dashboard', 'Priority support'],
  },
  {
    name: 'Enterprise', desc: 'Large firms & government', monthly: null, annualPrice: null,
    cta: 'Contact sales', highlight: false,
    features: ['Multi-organization support', 'API access & ERP integration', 'Unlimited AI requests', 'Dedicated infrastructure', 'Custom AI training', 'Advanced security & SSO', 'Dedicated success manager'],
  },
]

function price(p) {
  if (p.monthly === null) return 'Custom'
  const v = annual.value ? p.annualPrice : p.monthly
  return v === 0 ? '₦0' : '₦' + v.toLocaleString('en-NG')
}
</script>

<template>
  <section class="bg-brand-bg py-20">
    <div class="section text-center">
      <span class="badge bg-primary/10 text-primary-dark">Pricing</span>
      <h1 class="mt-4 font-display text-4xl font-extrabold text-secondary sm:text-5xl">Simple, transparent plans</h1>
      <p class="mx-auto mt-4 max-w-xl text-brand-muted">Choose the plan that fits your team. Upgrade, downgrade or cancel anytime.</p>

      <!-- Toggle -->
      <div class="mt-8 inline-flex items-center gap-3 rounded-full border border-brand-border bg-white p-1.5">
        <button :class="!annual ? 'bg-secondary text-white' : 'text-brand-muted'" class="rounded-full px-5 py-2 text-sm font-semibold transition-colors" @click="annual = false">Monthly</button>
        <button :class="annual ? 'bg-secondary text-white' : 'text-brand-muted'" class="rounded-full px-5 py-2 text-sm font-semibold transition-colors" @click="annual = true">
          Annual <span class="text-success">−16%</span>
        </button>
      </div>
    </div>

    <div class="section mt-14 grid gap-6 lg:grid-cols-4">
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
