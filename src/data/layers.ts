import { dangers, type DangerKey } from './dangers'

// Type pour une couche
export interface Layer {
  id: number
  type: 'normal' | 'danger'
  dangerId?: DangerKey
}

// Configuration des niveaux de reconnaissance
export const recognitionLevels = {
  1: { min: 5, max: 20 },
  2: { min: 20, max: 50 },
  3: { min: 50, max: 100 },
} as const

export type RecognitionLevel = keyof typeof recognitionLevels

// Génère un nombre aléatoire de couches basé sur le niveau de reconnaissance
export const getLayerCount = (level: RecognitionLevel): number => {
  const { min, max } = recognitionLevels[level]
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Génère les couches pour un contrat
export const generateLayers = (level: RecognitionLevel, knownDangers: DangerKey[]): Layer[] => {
  const layerCount = getLayerCount(level)
  const layers: Layer[] = []

  // Calculer la somme des ratios des dangers connus
  const totalDangerRatio = knownDangers.reduce((sum, dangerId) => {
    const danger = dangers.find((d) => d.id === dangerId)
    return sum + (danger?.ratio || 0)
  }, 0)

  // 40% de couches normales, 60% répartis selon les ratios
  const normalChance = 0.4

  for (let i = 0; i < layerCount; i++) {
    const random = Math.random()

    if (random < normalChance) {
      // Couche normale
      layers.push({
        id: i,
        type: 'normal',
      })
    } else {
      // Couche de danger - sélection basée sur les ratios
      const dangerRandom = Math.random() * totalDangerRatio
      let cumulative = 0

      let selectedDangerId = knownDangers[0] // Fallback

      for (const dangerId of knownDangers) {
        const danger = dangers.find((d) => d.id === dangerId)
        if (!danger) continue

        cumulative += danger.ratio
        if (dangerRandom <= cumulative) {
          selectedDangerId = dangerId
          break
        }
      }

      layers.push({
        id: i,
        type: 'danger',
        dangerId: selectedDangerId,
      })
    }
  }

  return layers
}
