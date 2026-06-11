<script setup>
import { RouterLink } from 'vue-router'
import {
  FileSpreadsheet, Ruler, Calculator, Bot, GitCompareArrows, BarChart3,
  ScanText, Users, ShieldCheck, ArrowRight, Check,
} from 'lucide-vue-next'

const groups = [
  {
    icon: FileSpreadsheet, title: 'AI BOQ Engine',
    text: 'Generate a detailed, tender-ready Bill of Quantities from uploaded drawings and specifications.',
    points: ['Detects walls, slabs, beams, columns, doors & roofing', 'Calculates quantities automatically', 'Export to Excel, PDF, CSV & Word', 'Full revision history & approval workflows'],
  },
  {
    icon: Ruler, title: 'Smart Quantity Takeoff',
    text: 'Extract measurements directly from plans with auto-scale and object recognition.',
    points: ['Linear, area, volume & count detection', 'Auto-scale recognition', 'Duplicate & missing-item detection', 'Reusable takeoff templates'],
  },
  {
    icon: Calculator, title: 'AI Cost Estimation',
    text: 'Price projects with localized material, labour and equipment rates.',
    points: ['Regional & multi-currency pricing', 'Inflation & supplier adjustments', 'Historical pricing trends', 'Custom pricing libraries'],
  },
  {
    icon: ScanText, title: 'Document Intelligence',
    text: 'OCR and AI interpret your drawings, specs and technical documents.',
    points: ['OCR text extraction', 'Drawing-vs-spec inconsistency checks', 'Missing dimension flags', 'Technical document summaries'],
  },
  {
    icon: GitCompareArrows, title: 'Variation Management',
    text: 'Track every change and auto-calculate its cost impact.',
    points: ['Revision comparison', 'Automated cost impact analysis', 'Client variation reports', 'Complete audit logs'],
  },
  {
    icon: Bot, title: 'AI Construction Assistant',
    text: 'A conversational expert for estimating, costing and compliance.',
    points: ['Natural-language BOQ assistance', 'Cost-saving recommendations', 'Code compliance suggestions', 'Document-aware answers'],
  },
  {
    icon: BarChart3, title: 'Reporting & Analytics',
    text: 'Business intelligence for profitability and forecasting.',
    points: ['Cost & profitability analytics', 'Tender success tracking', 'Resource utilization', 'Custom dashboards & exports'],
  },
  {
    icon: Users, title: 'Team Collaboration',
    text: 'Work together across projects with role-based access.',
    points: ['Unlimited projects (by plan)', 'Role-based permissions', 'Task assignment & approvals', 'Centralized file management'],
  },
  {
    icon: ShieldCheck, title: 'Security & Compliance',
    text: 'Enterprise-grade protection aligned to industry standards.',
    points: ['End-to-end encryption', 'Multi-factor authentication', 'RICS & NIQS standards', 'GDPR-compliant audit logs'],
  },
]
</script>

<template>
  <section class="bg-navy-gradient py-20">
    <div class="section relative text-center">
      <div class="absolute inset-0 bg-hero-glow"></div>
      <div class="relative mx-auto max-w-2xl">
        <span class="badge bg-white/10 text-primary-light">Platform features</span>
        <h1 class="mt-4 font-display text-4xl font-extrabold text-white sm:text-5xl">Everything a modern QS team needs</h1>
        <p class="mt-4 text-white/60">Nine powerful modules working together — from AI takeoff to predictive analytics.</p>
      </div>
    </div>
  </section>

  <section class="bg-brand-bg py-20">
    <div class="section grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="g in groups" :key="g.title" class="card p-6">
        <div class="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <component :is="g.icon" class="h-6 w-6" />
        </div>
        <h3 class="mt-5 font-display text-lg font-bold text-secondary">{{ g.title }}</h3>
        <p class="mt-2 text-sm text-brand-muted">{{ g.text }}</p>
        <ul class="mt-4 space-y-2">
          <li v-for="p in g.points" :key="p" class="flex items-start gap-2 text-sm text-secondary">
            <Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ p }}
          </li>
        </ul>
      </div>
    </div>

    <div class="section mt-14 text-center">
      <RouterLink to="/auth/signup" class="btn-primary btn-lg">Try it free <ArrowRight class="h-5 w-5" /></RouterLink>
    </div>
  </section>
</template>
