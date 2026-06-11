<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import '@/components/charts/registerCharts.js'

const props = defineProps({
  labels: { type: Array, required: true },
  data: { type: Array, required: true },
  colors: { type: Array, default: () => ['#1CA5F6', '#0D8FD9', '#2DC875', '#FFA726', '#6DCBFB', '#E63946'] },
  height: { type: Number, default: 220 },
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    data: props.data,
    backgroundColor: props.colors,
    borderWidth: 0,
    hoverOffset: 6,
  }],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 12 } } },
    tooltip: { backgroundColor: '#1B2540', padding: 12, cornerRadius: 12 },
  },
}
</script>

<template>
  <div :style="{ height: height + 'px' }">
    <Doughnut :data="chartData" :options="options" />
  </div>
</template>
