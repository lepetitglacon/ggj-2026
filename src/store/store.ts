import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStoreStore = defineStore('store', () => {
  const isOpen = ref(false)

  const openStore = () => {
    isOpen.value = true
  }

  const closeStore = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    openStore,
    closeStore,
  }
})
