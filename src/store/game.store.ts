import { defineStore } from 'pinia'
import { type Ref, ref, computed } from 'vue'
import type { Contract } from './contracts.ts'
import type { RecognitionLevel } from '../data/layers'

export const useGameStore = defineStore('game', () => {
  const contract: Ref<Contract | undefined> = ref(undefined)
  const oil = ref(0) // Pétrole du joueur
  const recognitionLevel: Ref<RecognitionLevel> = ref(1) // Niveau de reconnaissance (1, 2, ou 3)

  const setContract = (newContract: Contract) => {
    contract.value = newContract
  }

  const addOil = (amount: number) => {
    oil.value += amount
  }

  const removeOil = (amount: number): boolean => {
    if (oil.value >= amount) {
      oil.value -= amount
      return true
    }
    return false
  }

  const upgradeRecognitionLevel = () => {
    if (recognitionLevel.value < 3) {
      recognitionLevel.value = (recognitionLevel.value + 1) as RecognitionLevel
    }
  }

  return {
    contract,
    oil,
    recognitionLevel,
    setContract,
    addOil,
    removeOil,
    upgradeRecognitionLevel,
  }
})
