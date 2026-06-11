import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: {
      name: 'Dammie Adetunji',
      email: 'adetunjidammie2@gmail.com',
      role: 'Quantity Surveyor',
      company: 'Adetunji & Associates',
      avatar: 'DA',
      plan: 'Professional',
    },
    isAuthenticated: true,
  }),
  actions: {
    login(email) {
      this.isAuthenticated = true
      if (email) this.user.email = email
    },
    logout() {
      this.isAuthenticated = false
    },
  },
})
