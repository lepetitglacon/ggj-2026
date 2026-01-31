import Phaser from 'phaser'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { MenuState } from './states/MenuState.ts'
import { ContractState } from './states/ContractState.ts'
import GameState from './states/GameState'
import { useEngineStore } from './store/engine'

class Game extends Phaser.Game {
  constructor() {
    super({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      scene: [MenuState, ContractState, GameState],
    })
  }
}

window.onload = () => {
  // Initialize Vue with Pinia
  const pinia = createPinia()
  const app = createApp(App)
  app.use(pinia)
  app.mount('#vue-app')

  // Initialize Phaser
  const game = new Game()

  // Connecter le store Pinia avec l'instance Phaser
  const engineStore = useEngineStore()
  engineStore.setGameInstance(game)
}
