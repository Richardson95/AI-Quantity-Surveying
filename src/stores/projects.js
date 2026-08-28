import { defineStore } from 'pinia'
import { normalizeUnit } from '@/utils/units'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [
      {
        id: 'PRJ-1042',
        name: 'Lekki 4-Bedroom Duplex',
        client: 'Oceanview Developments',
        location: 'Lekki, Lagos',
        type: 'Residential',
        status: 'In Progress',
        progress: 68,
        budget: 185000000,
        spent: 121300000,
        currency: '₦',
        updated: '2 hours ago',
        team: ['DA', 'KO', 'TJ'],
        cover: 'from-primary to-primary-dark',
      },
      {
        id: 'PRJ-1039',
        name: 'Ikoyi Commercial Tower',
        client: 'Highrise Capital',
        location: 'Ikoyi, Lagos',
        type: 'Commercial',
        status: 'Tender',
        progress: 34,
        budget: 4200000000,
        spent: 980000000,
        currency: '₦',
        updated: 'Yesterday',
        team: ['DA', 'MN'],
        cover: 'from-secondary to-secondary-variant',
      },
      {
        id: 'PRJ-1031',
        name: 'Abuja Estate — Phase 2',
        client: 'Federal Housing Co.',
        location: 'Gwarinpa, Abuja',
        type: 'Residential',
        status: 'In Progress',
        progress: 81,
        budget: 2750000000,
        spent: 2210000000,
        currency: '₦',
        updated: '3 days ago',
        team: ['KO', 'TJ', 'MN', 'DA'],
        cover: 'from-success to-primary',
      },
      {
        id: 'PRJ-1024',
        name: 'Port Harcourt Warehouse',
        client: 'Delta Logistics',
        location: 'Trans-Amadi, PH',
        type: 'Industrial',
        status: 'Completed',
        progress: 100,
        budget: 620000000,
        spent: 598000000,
        currency: '₦',
        updated: '1 week ago',
        team: ['DA', 'KO'],
        cover: 'from-warning to-danger',
      },
      {
        id: 'PRJ-1018',
        name: 'Victoria Island Renovation',
        client: 'Crest Hotels',
        location: 'VI, Lagos',
        type: 'Renovation',
        status: 'On Hold',
        progress: 45,
        budget: 340000000,
        spent: 150000000,
        currency: '₦',
        updated: '2 weeks ago',
        team: ['TJ'],
        cover: 'from-primary-light to-primary',
      },
    ],
    boqItems: [
      { id: 1, code: 'A1.1', desc: 'Site clearance and excavation to reduce levels', unit: 'm³', qty: 1240, rate: 3500, section: 'Substructure', confidence: 96 },
      { id: 2, code: 'A1.2', desc: 'Plain in-situ concrete (1:3:6) in blinding', unit: 'm³', qty: 86, rate: 52000, section: 'Substructure', confidence: 94 },
      { id: 3, code: 'A2.1', desc: 'Reinforced concrete (1:2:4) in foundation bases', unit: 'm³', qty: 142, rate: 78000, section: 'Substructure', confidence: 92 },
      { id: 4, code: 'A2.2', desc: 'High-yield steel reinforcement Y16 bars', unit: 'tonne', qty: 18.4, rate: 980000, section: 'Substructure', confidence: 89 },
      { id: 5, code: 'B1.1', desc: '225mm sandcrete block wall in cement mortar', unit: 'm²', qty: 1860, rate: 6800, section: 'Superstructure', confidence: 95 },
      { id: 6, code: 'B1.2', desc: 'Reinforced concrete columns (1:2:4)', unit: 'm³', qty: 64, rate: 82000, section: 'Superstructure', confidence: 91 },
      { id: 7, code: 'B2.1', desc: 'Reinforced concrete suspended slab 150mm', unit: 'm²', qty: 720, rate: 24500, section: 'Superstructure', confidence: 93 },
      { id: 8, code: 'C1.1', desc: 'Aluminium roofing sheet 0.55mm on timber', unit: 'm²', qty: 410, rate: 9200, section: 'Roofing', confidence: 88 },
      { id: 9, code: 'D1.1', desc: '12mm cement & sand plaster to walls', unit: 'm²', qty: 3720, rate: 2400, section: 'Finishes', confidence: 97 },
      { id: 10, code: 'D2.1', desc: 'Vitrified floor tiles 600x600mm', unit: 'm²', qty: 540, rate: 11500, section: 'Finishes', confidence: 90 },
      { id: 11, code: 'E1.1', desc: 'Flush doors with hardwood frame', unit: 'no', qty: 28, rate: 65000, section: 'Doors & Windows', confidence: 99 },
      { id: 12, code: 'E2.1', desc: 'Aluminium sliding windows with glazing', unit: 'm²', qty: 96, rate: 38000, section: 'Doors & Windows', confidence: 92 },
    ],
    // Which drawings the current BOQ was generated from, and when.
    boqSources: [],
    boqGeneratedAt: null,
    activity: [
      { id: 1, user: 'KO', action: 'updated quantities for', target: 'Substructure BOQ', time: '12 min ago', type: 'edit' },
      { id: 2, user: 'AI', action: 'generated BOQ from', target: 'Ground Floor Plan.pdf', time: '1 hour ago', type: 'ai' },
      { id: 3, user: 'TJ', action: 'approved variation', target: 'VO-014', time: '3 hours ago', type: 'approve' },
      { id: 4, user: 'DA', action: 'uploaded', target: 'Structural Drawings Rev C', time: 'Yesterday', type: 'upload' },
      { id: 5, user: 'MN', action: 'commented on', target: 'Roofing estimate', time: 'Yesterday', type: 'comment' },
    ],
  }),
  getters: {
    activeCount: (s) => s.projects.filter((p) => p.status === 'In Progress').length,
    totalBudget: (s) => s.projects.reduce((a, p) => a + p.budget, 0),
    boqTotal: (s) => s.boqItems.reduce((a, i) => a + i.qty * i.rate, 0),
  },
  actions: {
    addProject(data = {}) {
      const id = data.id || 'PRJ-' + Math.floor(1000 + Math.random() * 9000)
      const project = {
        id,
        name: data.name || 'Untitled Project',
        client: data.client || 'Unassigned client',
        location: data.location || 'Lagos, Nigeria',
        type: data.type || 'Residential',
        status: 'In Progress',
        progress: 0,
        budget: data.budget || 0,
        spent: 0,
        currency: '₦',
        updated: 'Just now',
        team: ['DA'],
        cover: 'from-primary to-primary-dark',
      }
      this.projects.unshift(project)
      return project
    },
    // Replace the whole BOQ with items derived from the uploaded drawings.
    replaceBoqItems(items) {
      this.boqItems = items.map((i, n) => ({ ...i, id: n + 1 }))
      this.boqSources = items.length ? [...new Set(items.flatMap((i) => i.sources || []))] : []
      this.boqGeneratedAt = items.length ? new Date().toISOString() : null
    },

    addBoqItem(section = 'Substructure') {
      const id = this.boqItems.reduce((max, i) => Math.max(max, i.id || 0), 0) + 1
      // Codes are unique per section so the new row sorts and reads sensibly.
      const prefix = (section.match(/[A-Z]/) || ['N'])[0]
      const seq = this.boqItems.filter((i) => i.section === section).length + 1
      const item = {
        id,
        code: `${prefix}${seq}.0`,
        desc: 'New item — edit description',
        unit: 'no',
        qty: 1,
        rate: 0,
        section,
        confidence: 100,
      }
      this.boqItems.push(item)
      return item
    },
    updateBoqItem(id, patch = {}) {
      const item = this.boqItems.find((i) => i.id === id)
      if (!item) return
      if (patch.qty != null) patch.qty = Math.max(0, Number(patch.qty) || 0)
      if (patch.rate != null) patch.rate = Math.max(0, Number(patch.rate) || 0)
      // "m2", "SQM" and "nr" all mean something specific — store them as one.
      if (patch.unit != null) patch.unit = normalizeUnit(patch.unit)
      Object.assign(item, patch)
    },
    removeBoqItem(item) {
      const i = this.boqItems.findIndex((x) => x.id === item.id)
      if (i !== -1) this.boqItems.splice(i, 1)
    },
  },
})
