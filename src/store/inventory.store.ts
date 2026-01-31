import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useEngineStore } from './engine'
import type { DangerKey } from '../data/dangers'

// Configuration des masques disponibles à l'achat
export const maskTypesConfig = {
  '1': { name: 'Masque Toxique', cost: 0 }, // Gratuit au départ
  '2': { name: 'Masque Explosion', cost: 500 },
  '3': { name: 'Masque Radiation', cost: 700 },
  '4': { name: 'Masque Acide', cost: 600 },
  '5': { name: 'Masque Flammable', cost: 800 },
  '6': { name: 'Masque Bio-hazard', cost: 0 }, // Gratuit au départ
} as const

export type MaskTypeKey = keyof typeof maskTypesConfig

// Configuration du radar
export const radarConfig = {
  1: {
    visibleLayers: 1, // Radar de base (donné au départ)
    cost: 0,
    name: 'Radar Basique',
  },
  2: {
    visibleLayers: 5,
    cost: 500,
    name: 'Radar Amélioré',
  },
  3: {
    visibleLayers: 20,
    cost: 2000,
    name: 'Radar Avancé',
  },
  4: {
    visibleLayers: 50,
    cost: 5000,
    name: 'Radar Expert',
  },
  5: {
    visibleLayers: Infinity, // Voir toutes les couches
    cost: 10000,
    name: 'Radar Ultime',
  },
} as const

export type RadarLevel = keyof typeof radarConfig

// Configuration de la drill
export const drillConfig = {
  1: {
    speed: 1, // Vitesse de base
    cost: 0,
    name: 'Drill Basique',
  },
  2: {
    speed: 1.5,
    cost: 1000,
    name: 'Drill Rapide',
  },
  3: {
    speed: 2,
    cost: 3000,
    name: 'Drill Turbo',
  },
  4: {
    speed: 3,
    cost: 7000,
    name: 'Drill Ultra',
  },
} as const

export type DrillLevel = keyof typeof drillConfig

// Configuration du masque
export const maskConfig = {
  1: {
    slots: 1, // 1 slot de base
    cost: 0,
    name: 'Masque Basique',
  },
  2: {
    slots: 2,
    cost: 800,
    name: 'Masque Amélioré',
  },
  3: {
    slots: 3,
    cost: 2500,
    name: 'Masque Avancé',
  },
  4: {
    slots: 4,
    cost: 6000,
    name: 'Masque Expert',
  },
} as const

export type MaskLevel = keyof typeof maskConfig

export const useInventoryStore = defineStore('inventory', () => {
  // Inventaire de départ
  const radarLevel = ref<RadarLevel>(1) // Radar basique (1 bloc)
  const drillLevel = ref<DrillLevel>(1) // Drill basique
  const maskLevel = ref<MaskLevel>(1) // Masque à 1 slot
  const ownedMasks = ref<DangerKey[]>(['1', '6']) // Débute avec Toxique (1) et Bio-hazard (6)
  const revealedLayers = ref<Map<number, Set<number>>>(new Map()) // contractId -> Set de indices de couches découvertes

  const visibleLayersCount = computed(() => {
    return radarConfig[radarLevel.value].visibleLayers
  })

  const drillSpeed = computed(() => {
    return drillConfig[drillLevel.value].speed
  })

  const maskSlots = computed(() => {
    return maskConfig[maskLevel.value].slots
  })

  // Achats
  const buyRadar = (level: RadarLevel): boolean => {
    const engineStore = useEngineStore()
    const cost = radarConfig[level].cost

    if (radarLevel.value >= level) {
      return false // Déjà possédé ou niveau supérieur
    }

    if (engineStore.removeOil(cost)) {
      radarLevel.value = level
      return true
    }

    return false
  }

  const buyDrill = (level: DrillLevel): boolean => {
    const engineStore = useEngineStore()
    const cost = drillConfig[level].cost

    if (drillLevel.value >= level) {
      return false
    }

    if (engineStore.removeOil(cost)) {
      drillLevel.value = level
      return true
    }

    return false
  }

  const buyMaskUpgrade = (level: MaskLevel): boolean => {
    const engineStore = useEngineStore()
    const cost = maskConfig[level].cost

    if (maskLevel.value >= level) {
      return false
    }

    if (engineStore.removeOil(cost)) {
      maskLevel.value = level
      return true
    }

    return false
  }

  const buyMaskType = (maskId: MaskTypeKey): boolean => {
    const engineStore = useEngineStore()
    const cost = maskTypesConfig[maskId].cost

    if (ownedMasks.value.includes(maskId)) {
      return false // Déjà possédé
    }

    if (engineStore.removeOil(cost)) {
      ownedMasks.value.push(maskId)
      return true
    }

    return false
  }

  // Vérifications
  const canBuyRadar = (level: RadarLevel): boolean => {
    const engineStore = useEngineStore()
    if (radarLevel.value >= level) return false
    return engineStore.oil >= radarConfig[level].cost
  }

  const canBuyDrill = (level: DrillLevel): boolean => {
    const engineStore = useEngineStore()
    if (drillLevel.value >= level) return false
    return engineStore.oil >= drillConfig[level].cost
  }

  const canBuyMaskUpgrade = (level: MaskLevel): boolean => {
    const engineStore = useEngineStore()
    if (maskLevel.value >= level) return false
    return engineStore.oil >= maskConfig[level].cost
  }

  const canBuyMaskType = (maskId: MaskTypeKey): boolean => {
    const engineStore = useEngineStore()
    if (ownedMasks.value.includes(maskId)) return false
    return engineStore.oil >= maskTypesConfig[maskId].cost
  }

  // Calculer le coût pour révéler une couche (linéaire jusqu'à 10, puis logarithmique)
  const calculateRevealCost = (layerIndex: number): number => {
    if (layerIndex < 10) {
      // Linéaire: 100, 200, 300, ..., 1000
      return (layerIndex + 1) * 100
    } else {
      // Logarithmique: 100 * log(layerIndex + 1)
      return Math.floor(100 * Math.log(layerIndex + 1))
    }
  }

  const revealLayer = (contractId: number, layerIndex: number): boolean => {
    const engineStore = useEngineStore()
    const cost = calculateRevealCost(layerIndex)

    // Vérifier si on a déjà révélé cette couche
    if (!revealedLayers.value.has(contractId)) {
      revealedLayers.value.set(contractId, new Set())
    }

    if (revealedLayers.value.get(contractId)!.has(layerIndex)) {
      return false // Déjà révélée
    }

    if (engineStore.removeOil(cost)) {
      revealedLayers.value.get(contractId)!.add(layerIndex)
      return true
    }

    return false
  }

  const isLayerRevealed = (contractId: number, layerIndex: number): boolean => {
    return revealedLayers.value.get(contractId)?.has(layerIndex) ?? false
  }

  const canRevealLayer = (contractId: number, layerIndex: number): boolean => {
    const engineStore = useEngineStore()
    if (isLayerRevealed(contractId, layerIndex)) return false
    return engineStore.oil >= calculateRevealCost(layerIndex)
  }

  const isMaskOwned = (maskId: DangerKey): boolean => {
    return ownedMasks.value.includes(maskId)
  }

  return {
    radarLevel,
    drillLevel,
    maskLevel,
    ownedMasks,
    revealedLayers,
    visibleLayersCount,
    drillSpeed,
    maskSlots,
    buyRadar,
    buyDrill,
    buyMaskUpgrade,
    buyMaskType,
    revealLayer,
    canBuyRadar,
    canBuyDrill,
    canBuyMaskUpgrade,
    canBuyMaskType,
    canRevealLayer,
    isMaskOwned,
    isLayerRevealed,
    calculateRevealCost,
  }
})
