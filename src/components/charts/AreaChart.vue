<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import '@/components/charts/registerCharts.js'

const props = defineProps({
  labels: { type: Array, required: true },
  datasets: { type: Array, required: true }, // [{ label, data, color }]
  height: { type: Number, default: 260 },
  currency: { type: Boolean, default: false },
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((d) => ({
    label: d.label,
    data: d.data,
    borderColor: d.color,
    backgroundColor: (ctx) => {
      const { ctx: c, chartArea } = ctx.chart
      if (!chartArea) return d.color + '20'
      const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
      g.addColorStop(0, d.color + '40')
      g.addColorStop(1, d.color + '00')
      return g
    },
    fill: true,
    tension: 0.4,
    borderWidth: 2.5,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: d.color,
    pointHoverBorderColor: '#fff',
    pointHoverBorderWidth: 2,
  })),
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: props.datasets.length > 1, position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
    tooltip: {
      backgroundColor: '#1B2540',
      padding: 12,
      cornerRadius: 12,
      titleColor: '#fff',
      bodyColor: '#DDE3F0',
      callbacks: props.currency ? { label: (c) => ` ${c.dataset.label}: ₦${c.parsed.y.toLocaleString()}` } : {},
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#EEF2FA' }, border: { display: false }, ticks: { font: { size: 11 }, callback: (v) => (props.currency ? '₦' + v / 1_000_000 + 'M' : v) } },
  },
}))
</script>

<template>
  <div :style="{ height: height + 'px' }">
    <Line :data="chartData" :options="options" />
  </div>
</template>
