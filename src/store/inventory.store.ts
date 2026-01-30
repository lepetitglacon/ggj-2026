import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game.store'
import type { RecognitionLevel } from '../data/layers'

// Configuration du radar
export const radarConfig = {
  1: {
    visibleLayers: 5, // Voir les 5 premières couches (niveau reconnaissance 1: 5-20 couches)
    cost: 500,
    name: 'Radar Basique',
  },
  2: {
    visibleLayers: 20, // Voir les 20 premières couches (niveau reconnaissance 2: 20-50 couches)
    cost: 2000,
    name: 'Radar Avancé',
  },
  3: {
    visibleLayers: 50, // Voir les 50 premières couches (niveau reconnaissance 3: 50-100 couches)
    cost: 5000,
    name: 'Radar Expert',
  },
} as const

export type RadarLevel = keyof typeof radarConfig

export interface InventoryItem {
  id: string
  name: string
  type: 'radar' | 'tool'
  level?: RadarLevel
}

export const useInventoryStore = defineStore('inventory', () => {
  const radarLevel = ref<RadarLevel | null>(null) // Niveau du radar possédé (null = pas de radar)

  const visibleLayersCount = computed(() => {
    if (!radarLevel.value) return 0
    return radarConfig[radarLevel.value].visibleLayers
  })

  const buyRadar = (level: RadarLevel): boolean => {
    const gameStore = useGameStore()
    const cost = radarConfig[level].cost

    // Vérifier si on peut acheter
    if (radarLevel.value && radarLevel.value >= level) {
      // Déjà possédé ou niveau supérieur
      return false
    }

    if (gameStore.removeOil(cost)) {
      radarLevel.value = level
      return true
    }

    return false
  }

  const canBuyRadar = (level: RadarLevel): boolean => {
    const gameStore = useGameStore()
    const cost = radarConfig[level].cost

    // Ne peut pas acheter si on a déjà ce niveau ou supérieur
    if (radarLevel.value && radarLevel.value >= level) {
      return false
    }

    return gameStore.oil >= cost
  }

  return {
    radarLevel,
    visibleLayersCount,
    buyRadar,
    canBuyRadar,
  }
})
