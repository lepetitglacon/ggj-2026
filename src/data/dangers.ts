// Type pour un danger individuel
export interface Danger {
  id: string
  label: string
  icon: string
  malus: string
  ratio: number
  color: number // Couleur hexadécimale pour Phaser (ex: 0xff0000 pour rouge)
}

export const dangers = [
  {
    id: '1',
    label: 'Toxique',
    icon: '/img/dangers/1.png',
    // Plomb, mercure, cadmium, arsenic
    malus: 'Fait un effet renversement de couleur sur la prochaines couches',
    ratio: 0.1,
    color: 0x9933ff, // Violet pour toxique
  },
  {
    id: '2',
    label: 'Explosion',
    icon: '/img/dangers/2.png',
    // gaz proche régions volcanique / dynamite laissé par des humains
    malus: "Fait pété l'UI, tous les masques sont éclatés sur tout l'écran de manière aléatoire",
    ratio: 0.1,
    color: 0xff6600, // Orange pour explosion
  },
  {
    id: '3',
    label: 'Radiation',
    icon: '/img/dangers/3.png',
    // Causé par des déchets toxiques laissé par les humains, ou gaz causé par des éléments naturels uranium
    malus: 'Irradie les autres masques et leurs retire leurs couleurs et les rends blancs',
    ratio: 0.1,
    color: 0x00ff00, // Vert pour radiation
  },
  {
    id: '4',
    label: 'Acide',
    icon: '/img/dangers/4.png',
    // régions volcaniques autour du Flammable
    malus:
      'La drill devient acide et peut casser instantanément une couche sur les 2 couches suivantes',
    ratio: 0.1,
    color: 0xccff00, // Jaune-vert pour acide
  },
  {
    id: '5',
    label: 'Flammable',
    icon: '/img/dangers/5.png',
    // gaz ou lave
    malus: 'Brule tous les masques et les rends calcinés (tout noir)',
    ratio: 0.1,
    color: 0xff0000, // Rouge pour flamme
  },
  {
    id: '6',
    label: 'Bio-hazard',
    icon: '/img/dangers/6.png',
    // fait par de l'eau stagnante ou des animaux / dechets humain
    malus:
      'Masques contaminés deviennent inutilisables pendant un certain temps, ajoutant du chaos dans le drag & drop',
    ratio: 0.1,
    color: 0x00ffff, // Cyan pour bio-hazard
  },
] as Danger[]

// Type pour les clés de dangers ('1', '2', '3', etc.)
export type DangerKey = (typeof dangers)[number]['id']

// Fonction helper pour récupérer un danger par son ID
export const getDangerById = (id: DangerKey): Danger | undefined => {
  return dangers.find((danger) => danger.id === id)
}

// Dangers disponibles par niveau de reconnaissance
export const dangersByRecognitionLevel = {
  0: ['1', '6'], // Toxique, Bio-hazard
  1: ['1', '6'], // Toxique, Bio-hazard
  2: ['1', '6', '2', '5'], // Toxique, Bio-hazard, Explosion, Flammable
  3: ['1', '6', '2', '5', '3', '4'], // Tous: Toxique, Bio-hazard, Explosion, Flammable, Radiation, Acide
} as const

export type RecognitionLevelKey = keyof typeof dangersByRecognitionLevel
