import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type Phaser from 'phaser'
import type { RecognitionLevel } from '../data/layers'
import { locations } from '../data/locations'

export type EngineState = 'menu' | 'contract' | 'game'

export const useEngineStore = defineStore('engine', () => {
  const state = ref<EngineState>('menu')
  const oil = ref(10000) // Pétrole du joueur (persistant) - 10000 pour tester
  const recognitionLevel = ref(0) // Notoriété/niveau de reconnaissance (0 = tutoriel)

  // Pays complétés (par nom)
  const completedCountries = ref<Set<string>>(new Set())

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

  // Calculer le niveau maximum débloqué basé sur les pays complétés
  const unlockedLevel = computed(() => {
    // Niveau 0 toujours débloqué
    // Pour débloquer niveau N+1, il faut avoir complété tous les pays du niveau N
    for (let level = 0; level <= 3; level++) {
      const countriesAtLevel = locations.filter((loc) => loc.recognitionLevel === level)
      const allCompleted = countriesAtLevel.every((loc) => completedCountries.value.has(loc.name))

      if (!allCompleted) {
        return level
      }
    }
    return 3 // Tous les niveaux débloqués
  })

  // Vérifier si un pays est débloqué
  const isCountryUnlocked = (countryName: string): boolean => {
    const location = locations.find((loc) => loc.name === countryName)
    if (!location) return false
    return location.recognitionLevel <= unlockedLevel.value
  }

  // Vérifier si un pays est complété
  const isCountryCompleted = (countryName: string): boolean => {
    return completedCountries.value.has(countryName)
  }

  // Marquer un pays comme complété
  const completeCountry = (countryName: string) => {
    completedCountries.value.add(countryName)
  }

  return {
    state,
    oil,
    recognitionLevel,
    completedCountries,
    unlockedLevel,
    changeState,
    setGameInstance,
    addOil,
    removeOil,
    addRecognition,
    removeRecognition,
    getRecognitionTier,
    isCountryUnlocked,
    isCountryCompleted,
    completeCountry,
  }
})
