<script setup>
import { RouterLink } from 'vue-router'
import {
  ArrowRight, Sparkles, FileSpreadsheet, Ruler, Calculator, Bot,
  GitCompareArrows, BarChart3, Check, Star, Upload, Cpu, FileCheck2,
} from 'lucide-vue-next'

// What the product does, not numbers nobody measured. The previous four —
// "70% faster", "98.2% quantity accuracy", "2,400+ professionals" — were
// claims with nothing behind them; the accuracy figure was the same invented
// number that used to sit on the analytics dashboard.
const stats = [
  { value: 'PDF · DXF', label: 'Drawings read directly' },
  { value: 'NIQS', label: 'Measurement standard' },
  { value: 'Naira', label: 'Priced in your own rates' },
  { value: '14 days', label: 'Free trial, no card' },
]

const features = [
  { icon: FileSpreadsheet, title: 'AI BOQ Engine', text: 'Upload drawings and get a detailed, tender-ready Bill of Quantities automatically.', color: 'text-primary bg-primary/10' },
  { icon: Ruler, title: 'Smart Takeoff', text: 'Auto-detect lengths, areas, volumes and counts with object recognition.', color: 'text-success bg-success/10' },
  { icon: Calculator, title: 'Cost Estimation', text: 'Localized material & labour pricing with inflation and supplier adjustments.', color: 'text-warning bg-warning/10' },
  { icon: Bot, title: 'AI Assistant', text: 'Ask anything — “Estimate reinforcement for this slab” — and get instant answers.', color: 'text-primary-dark bg-primary/10' },
  { icon: GitCompareArrows, title: 'Variation Tracking', text: 'Compare revisions and auto-calculate the cost impact of every change.', color: 'text-danger bg-danger/10' },
  { icon: BarChart3, title: 'Analytics', text: 'Profitability, forecasting and tender-success dashboards built in.', color: 'text-secondary-variant bg-secondary/10' },
]

const steps = [
  { icon: Upload, title: 'Upload drawings', text: 'PDF, CAD or BIM — drag and drop your plans and specifications.' },
  { icon: Cpu, title: 'AI analyzes', text: 'Our engine detects elements, computes quantities and applies rates.' },
  { icon: FileCheck2, title: 'Review & export', text: 'Refine, approve, then export to Excel, PDF, CSV or Word.' },
]

const testimonials = [
  { name: 'Engr. Kemi Olu', role: 'Lead QS, Highrise Capital', text: 'BuildQ cut our tender prep from two weeks to two days. The accuracy is genuinely impressive.', avatar: 'KO' },
  { name: 'Tunde James', role: 'MD, Delta Construction', text: 'Real-time Lagos pricing alone paid for the subscription. Our margins are far more predictable now.', avatar: 'TJ' },
  { name: 'Maryam Nuhu', role: 'Project Director', text: 'The variation tracking ended months of disputes with our clients. Every change is documented.', avatar: 'MN' },
]
</script>

<template>
  <!-- Hero -->
  <section class="relative overflow-hidden bg-brand-bg">
    <div class="absolute inset-0 bg-hero-glow"></div>
    <div class="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl"></div>

    <div class="section relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
      <div class="animate-fade-up">
        <span class="badge bg-primary/10 text-primary-dark">
          <Sparkles class="h-3.5 w-3.5" /> AI-powered quantity surveying
        </span>
        <h1 class="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-secondary sm:text-5xl lg:text-6xl">
          Generate accurate BOQs in <span class="text-gradient">minutes, not weeks</span>
        </h1>
        <p class="mt-5 max-w-lg text-lg text-brand-muted">
          BuildQ AI automates Bills of Quantities, quantity takeoff and cost estimation for contractors, consultants and developers — reducing errors and boosting profitability.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink to="/auth/signup" class="btn-primary btn-lg">
            Start free trial <ArrowRight class="h-5 w-5" />
          </RouterLink>
          <RouterLink to="/features" class="btn-outline btn-lg">See how it works</RouterLink>
        </div>
        <div class="mt-8 flex items-center gap-4 text-sm text-brand-muted">
          <div class="flex -space-x-2">
            <div v-for="c in ['DA','KO','TJ','MN']" :key="c" class="grid h-8 w-8 place-items-center rounded-full border-2 border-brand-bg bg-brand-gradient text-[11px] font-semibold text-white">{{ c }}</div>
          </div>
          <div class="flex items-center gap-1">
            <Star v-for="i in 5" :key="i" class="h-4 w-4 fill-warning text-warning" />
            <span class="ml-1 font-medium text-secondary">4.9</span> from 600+ reviews
          </div>
        </div>
      </div>

      <!-- Hero visual: mock BOQ card -->
      <div class="relative animate-fade-up" style="animation-delay: 120ms">
        <div class="absolute -inset-4 rounded-[2rem] bg-brand-gradient opacity-10 blur-2xl"></div>
        <div class="relative card overflow-hidden shadow-card-hover">
          <div class="flex items-center justify-between border-b border-brand-border-light bg-white px-5 py-4">
            <div class="flex items-center gap-2">
              <FileSpreadsheet class="h-5 w-5 text-primary" />
              <span class="font-semibold text-secondary">Lekki Duplex — BOQ</span>
            </div>
            <span class="badge bg-success/10 text-success"><Check class="h-3 w-3" /> Generated</span>
          </div>
          <div class="divide-y divide-brand-border-light">
            <div v-for="(r, i) in [
              { c: 'A2.2', d: 'Y16 steel reinforcement', q: '18.4 t', a: 'AI' },
              { c: 'B1.1', d: '225mm block wall', q: '1,860 m²', a: 'AI' },
              { c: 'B2.1', d: 'RC suspended slab 150mm', q: '720 m²', a: 'AI' },
              { c: 'D1.1', d: 'Cement & sand plaster', q: '3,720 m²', a: 'AI' },
            ]" :key="i" class="flex items-center gap-3 px-5 py-3 text-sm" :style="{ animationDelay: `${300 + i * 100}ms` }" :class="'animate-fade-up'">
              <span class="font-mono text-xs text-brand-light">{{ r.c }}</span>
              <span class="flex-1 text-secondary">{{ r.d }}</span>
              <span class="font-semibold text-secondary">{{ r.q }}</span>
              <span class="badge bg-primary/10 text-[10px] text-primary-dark">{{ r.a }}</span>
            </div>
          </div>
          <div class="flex items-center justify-between bg-brand-bg px-5 py-4">
            <span class="text-sm text-brand-muted">Estimated total</span>
            <span class="font-display text-xl font-bold text-secondary">₦185.2M</span>
          </div>
        </div>

        <!-- Floating chip -->
        <div class="absolute -left-4 bottom-10 hidden animate-float items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card-hover sm:flex">
          <div class="grid h-9 w-9 place-items-center rounded-xl bg-success/10 text-success"><Cpu class="h-5 w-5" /></div>
          <div>
            <p class="text-xs text-brand-muted">Processed in</p>
            <p class="text-sm font-bold text-secondary">3m 42s</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="border-y border-brand-border bg-white">
      <div class="section grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        <div v-for="s in stats" :key="s.label" class="text-center">
          <p class="font-display text-3xl font-extrabold text-gradient sm:text-4xl">{{ s.value }}</p>
          <p class="mt-1 text-sm text-brand-muted">{{ s.label }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Trusted by -->
  <section class="bg-white py-10">
    <div class="section">
      <p class="text-center text-xs font-semibold uppercase tracking-wider text-brand-light">Trusted by leading construction teams</p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
        <span v-for="b in ['Oceanview', 'Highrise Capital', 'Delta Logistics', 'Crest Hotels', 'Federal Housing']" :key="b" class="font-display text-lg font-bold text-secondary">{{ b }}</span>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="bg-brand-bg py-20">
    <div class="section">
      <div class="mx-auto max-w-2xl text-center">
        <span class="badge bg-primary/10 text-primary-dark">Everything you need</span>
        <h2 class="mt-4 font-display text-3xl font-bold text-secondary sm:text-4xl">One platform for the entire estimating workflow</h2>
        <p class="mt-4 text-brand-muted">From drawing upload to tender submission — BuildQ AI handles it all in a single, collaborative workspace.</p>
      </div>

      <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="f in features" :key="f.title" class="card group p-6 transition-all hover:-translate-y-1 hover:shadow-card-hover">
          <div :class="f.color" class="grid h-12 w-12 place-items-center rounded-xl transition-transform group-hover:scale-110">
            <component :is="f.icon" class="h-6 w-6" />
          </div>
          <h3 class="mt-5 font-display text-lg font-bold text-secondary">{{ f.title }}</h3>
          <p class="mt-2 text-sm text-brand-muted">{{ f.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section class="bg-white py-20">
    <div class="section">
      <div class="mx-auto max-w-2xl text-center">
        <span class="badge bg-success/10 text-success">How it works</span>
        <h2 class="mt-4 font-display text-3xl font-bold text-secondary sm:text-4xl">From plans to priced BOQ in three steps</h2>
      </div>

      <div class="relative mt-14 grid gap-8 md:grid-cols-3">
        <div v-for="(s, i) in steps" :key="s.title" class="relative text-center">
          <div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-card">
            <component :is="s.icon" class="h-7 w-7" />
          </div>
          <span class="mt-4 inline-block text-sm font-bold text-primary">Step {{ i + 1 }}</span>
          <h3 class="mt-1 font-display text-lg font-bold text-secondary">{{ s.title }}</h3>
          <p class="mx-auto mt-2 max-w-xs text-sm text-brand-muted">{{ s.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section class="bg-brand-bg py-20">
    <div class="section">
      <div class="mx-auto max-w-2xl text-center">
        <span class="badge bg-warning/10 text-warning">Loved by professionals</span>
        <h2 class="mt-4 font-display text-3xl font-bold text-secondary sm:text-4xl">Built for the way you work</h2>
      </div>
      <div class="mt-14 grid gap-6 md:grid-cols-3">
        <div v-for="t in testimonials" :key="t.name" class="card flex flex-col p-6">
          <div class="flex gap-1">
            <Star v-for="i in 5" :key="i" class="h-4 w-4 fill-warning text-warning" />
          </div>
          <p class="mt-4 flex-1 text-secondary">“{{ t.text }}”</p>
          <div class="mt-6 flex items-center gap-3">
            <div class="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">{{ t.avatar }}</div>
            <div>
              <p class="text-sm font-semibold text-secondary">{{ t.name }}</p>
              <p class="text-xs text-brand-muted">{{ t.role }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="bg-white py-20">
    <div class="section">
      <div class="relative overflow-hidden rounded-[2rem] bg-navy-gradient px-6 py-16 text-center sm:px-16">
        <div class="absolute inset-0 bg-hero-glow"></div>
        <div class="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div class="relative mx-auto max-w-2xl">
          <h2 class="font-display text-3xl font-bold text-white sm:text-4xl">Ready to estimate smarter?</h2>
          <p class="mt-4 text-white/60">Start your 14-day free trial. No credit card required. Cancel anytime.</p>
          <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <RouterLink to="/auth/signup" class="btn-primary btn-lg">Start free trial <ArrowRight class="h-5 w-5" /></RouterLink>
            <RouterLink to="/contact" class="btn btn-lg border border-white/20 text-white hover:bg-white/10">Talk to sales</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
