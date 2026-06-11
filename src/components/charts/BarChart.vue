<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import '@/components/charts/registerCharts.js'

const props = defineProps({
  labels: { type: Array, required: true },
  data: { type: Array, required: true },
  color: { type: String, default: '#1CA5F6' },
  height: { type: Number, default: 260 },
  horizontal: { type: Boolean, default: false },
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    data: props.data,
    backgroundColor: props.color,
    hoverBackgroundColor: '#0D8FD9',
    borderRadius: 8,
    borderSkipped: false,
    maxBarThickness: 40,
  }],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: props.horizontal ? 'y' : 'x',
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#1B2540', padding: 12, cornerRadius: 12 },
  },
  scales: {
    x: { grid: { display: props.horizontal, color: '#EEF2FA' }, border: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { display: !props.horizontal, color: '#EEF2FA' }, border: { display: false }, ticks: { font: { size: 11 } } },
  },
}))
</script>

<template>
  <div :style="{ height: height + 'px' }">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
