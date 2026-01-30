import { defineStore } from 'pinia'
import { ref } from 'vue'
import type Phaser from 'phaser'

export type EngineState = 'menu' | 'contract' | 'game'

export const useEngineStore = defineStore('engine', () => {
  const state = ref<EngineState>('menu')
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

  return {
    state,
    changeState,
    setGameInstance,
  }
})
