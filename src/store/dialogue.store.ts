import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDialogueStore = defineStore('dialogue', () => {
  const hasSeenFirstContractDialogue = ref(false)
  const hasSeenSecondContractDialogue = ref(false)
  const hasSeenTutoCompleteDialogue = ref(false)

  return {
    hasSeenFirstContractDialogue,
    hasSeenSecondContractDialogue,
    hasSeenTutoCompleteDialogue,
  }
})
