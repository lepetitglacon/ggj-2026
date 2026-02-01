import { dangers, type DangerKey } from './dangers'
import { getCountryImageName } from './locations'

// Type pour une couche
export interface Layer {
  id: number
  type: 'normal' | 'danger'
  dangerId?: DangerKey
  hardness: number // Dureté en secondes (entre 3 et 7)
  imageUrl?: string // URL de l'image pixelée
}

// Configuration des niveaux de reconnaissance
export const recognitionLevels = {
  0: { min: 5, max: 5 }, // Tutoriel
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

// Liste des images disponibles
const normalImages = ['1', '2', '3', '4']

// Mapper les IDs de danger aux images
const getImageForDanger = (dangerId: DangerKey): string => {
  const dangerNum = parseInt(dangerId, 10)
  const imageNum = ((dangerNum - 1) % normalImages.length) + 1
  return `/img/layers-pixelated/normal/${imageNum}.png`
}

// Génère les couches pour un contrat
export const generateLayers = (
  level: RecognitionLevel,
  knownDangers: DangerKey[],
  countryName?: string
): Layer[] => {
  // Cas spécial pour le contrat TEST : générer une couche normale + tous les dangers
  if (countryName === 'TEST') {
    const layers: Layer[] = []
    const allDangers: DangerKey[] = ['1', '2', '3', '4', '5', '6']

    // Couche 0 : couche top (surface)
    layers.push({
      id: 0,
      type: 'normal',
      hardness: 3,
      imageUrl: '/img/layers-pixelated/top/top.png',
    })

    // Couche 1 : couche normale
    layers.push({
      id: 1,
      type: 'normal',
      hardness: 3,
      imageUrl: '/img/layers-pixelated/normal/1.png',
    })

    // Couches 2-7 : chaque danger
    allDangers.forEach((dangerId, index) => {
      const dangerImageUrl = getImageForDanger(dangerId)
      layers.push({
        id: index + 2,
        type: 'danger',
        dangerId: dangerId,
        hardness: 3,
        imageUrl: dangerImageUrl,
      })
    })

    return layers
  }

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
    // Dureté aléatoire entre 3 et 7 secondes
    const hardness = Math.random() * 4 + 3

    // Première couche (index 0) est toujours une couche top (surface)
    let imageUrl: string
    if (i === 0) {
      // Utiliser l'image du pays si disponible, sinon l'image par défaut
      if (countryName) {
        const imageName = getCountryImageName(countryName) || 'top'
        imageUrl = `/img/layers/top/${imageName}.jpg`
      } else {
        imageUrl = `/img/layers-pixelated/top/top.png`
      }
    } else {
      const normalImage = normalImages[Math.floor(Math.random() * normalImages.length)]
      imageUrl = `/img/layers-pixelated/normal/${normalImage}.png`
    }

    if (random < normalChance) {
      // Couche normale
      layers.push({
        id: i,
        type: 'normal',
        hardness,
        imageUrl,
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

      // Utiliser l'image associée au danger
      const dangerImageUrl = getImageForDanger(selectedDangerId)

      layers.push({
        id: i,
        type: 'danger',
        dangerId: selectedDangerId,
        hardness,
        imageUrl: dangerImageUrl,
      })
    }
  }

  return layers
}
