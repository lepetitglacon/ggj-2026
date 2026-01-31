import { defineStore } from 'pinia'
import { ref } from 'vue'
import type Phaser from 'phaser'
import type { RecognitionLevel } from '../data/layers'

export type EngineState = 'menu' | 'contract' | 'game'

export const useEngineStore = defineStore('engine', () => {
  const state = ref<EngineState>('menu')
  const oil = ref(10000) // Pétrole du joueur (persistant) - 10000 pour tester
  const recognitionLevel = ref(0) // Notoriété/niveau de reconnaissance (0 = tutoriel)

  let gameInstance: Phaser.Game | null = null
  let isUpdatingFromPhaser = false

  // Enregistrer l'instance du jeu Phaser
  const setGameInstance = (game: Phaser.Game) => {
    gameInstance = game
  }

  // Changer l'état (appelé depuis Vue)
  const changeState = (newState: EngineState) => {
    if (state.value === newState) return
    state.value = newState
    if (!isUpdatingFromPhaser && gameInstance) {
      const currentScene = gameInstance.scene.getScenes(true)[0]
      if (currentScene && currentScene.scene.key !== newState) {
        currentScene.scene.start(newState)
      }
    }
  }

  // Gestion du pétrole
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

  // Gestion de la notoriété/reconnaissance
  const addRecognition = (amount: number) => {
    recognitionLevel.value += amount
  }

  const removeRecognition = (amount: number) => {
    recognitionLevel.value = Math.max(recognitionLevel.value - amount, 0)
  }

  // Obtenir le tier de reconnaissance pour la génération de couches (0, 1, 2 ou 3)
  const getRecognitionTier = (): RecognitionLevel => {
    if (recognitionLevel.value === 0) return 0 // Tutoriel
    if (recognitionLevel.value < 20) return 1
    if (recognitionLevel.value < 50) return 2
    return 3
  }

  return {
    state,
    oil,
    recognitionLevel,
    changeState,
    setGameInstance,
    addOil,
    removeOil,
    addRecognition,
    removeRecognition,
    getRecognitionTier,
  }
})
