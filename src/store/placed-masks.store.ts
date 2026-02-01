import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

export const usePlacedMasksStore = defineStore('placedMasks', () => {
  // Map de slot index -> mask id
  const slotMasks: Ref<Map<number, string>> = ref(new Map())

  const setMaskInSlot = (slotIndex: number, maskId: string) => {
    slotMasks.value.set(slotIndex, maskId)
  }

  const removeMaskFromSlot = (slotIndex: number) => {
    slotMasks.value.delete(slotIndex)
  }

  const getMaskInSlot = (slotIndex: number): string | undefined => {
    return slotMasks.value.get(slotIndex)
  }

  const getMaskSlot = (maskId: string): number | undefined => {
    for (const [slotIndex, id] of slotMasks.value.entries()) {
      if (id === maskId) {
        return slotIndex
      }
    }
    return undefined
  }

  const clearAllMasks = () => {
    slotMasks.value.clear()
  }

  return {
    slotMasks,
    setMaskInSlot,
    removeMaskFromSlot,
    getMaskInSlot,
    getMaskSlot,
    clearAllMasks,
  }
})
