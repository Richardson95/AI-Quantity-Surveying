<script setup>
import { computed } from 'vue'
import { FolderOpen } from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'

// The BOQ, takeoff, estimation and variations screens are all scoped to one
// project. Until now the only way to change which one was to open its detail
// page, so landing on any of those screens directly stranded you on whichever
// project happened to come back first. Each of those views already watches
// `currentProjectId` and reloads, so switching here is all that was missing.
const store = useProjectsStore()

const projects = computed(() => store.projects)

function change(event) {
  const id = event.target.value
  if (id) store.selectProject(id)
}
</script>

<template>
  <div v-if="projects.length > 1" class="flex items-center gap-2">
    <FolderOpen class="h-4 w-4 shrink-0 text-brand-light" />
    <select
      :value="store.currentProjectId"
      class="min-w-[12rem] max-w-[18rem] rounded-lg border border-brand-border bg-white px-3 py-2 text-sm font-medium text-secondary focus:border-primary focus:outline-none"
      aria-label="Switch project"
      @change="change"
    >
      <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
  </div>

  <!-- One project needs no chooser; none at all needs an explanation. -->
  <RouterLink
    v-else-if="!projects.length && store.loaded"
    to="/app/projects"
    class="text-sm font-medium text-primary hover:underline"
  >
    Create a project first
  </RouterLink>
</template>
