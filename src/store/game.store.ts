import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import type { Contract } from './contracts.ts'

export const useGameStore = defineStore('game', () => {
  const contract: Ref<Contract | undefined> = ref(undefined)

  const setContract = (newContract: Contract) => {
    contract.value = newContract
  }

  const clearContract = () => {
    contract.value = undefined
  }

  return {
    contract,
    setContract,
    clearContract,
  }
})
