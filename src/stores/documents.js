import { defineStore } from 'pinia'

export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    items: [],
    selectedId: null
  }),
  getters: {
    count: (state) => state.items.length,
    selected: (state) =>
      state.items.find((item) => item.id === state.selectedId) || null
  },
  actions: {
    add(doc) {
      this.items.push(doc)
    },
    remove(id) {
      this.items = this.items.filter((item) => item.id !== id)
      if (this.selectedId === id) {
        this.selectedId = null
      }
    },
    select(id) {
      this.selectedId = id
    },
    reset() {
      this.items = []
      this.selectedId = null
    }
  }
})
