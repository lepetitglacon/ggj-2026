import Phaser from 'phaser'

// Simple event emitter compatible avec le navigateur
class SimpleEventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map()

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args))
    }
  }

  off(event: string, callback: (...args: any[]) => void): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }
}

// Event emitter global pour les sons
export const soundEmitter = new SimpleEventEmitter()

// Liste des sons disponibles avec leurs clés et chemins
export const SOUNDS = {
  drill: 'sounds/drill.mp3',
  'drill-bg': 'sounds/drill-bg.mp3',
  'drill-bg-2': 'sounds/dril-bg-2.mp3',
  'mask-breathing': 'sounds/mask-breathing.mp3',
  'putting-mask-on': 'sounds/putting-mask-on.mp3',
  'putting-mask-on-2': 'sounds/putting-mask-on-2.mp3',
  clic: 'sounds/clic.mp3',
  switch: 'sounds/switch.mp3',
  chat: 'sounds/chat.mp3',
  'damage-hit': 'sounds/damage-hit.mp3',
  radar: 'sounds/radar.mp3',
  'radar-ok': 'sounds/radar-ok.mp3',
  'rock-crack': 'sounds/rock-crack.mp3',
  fire: 'sounds/malus/fire.mp3',
  radiation: 'sounds/malus/radiation.mp3',
  explosion: 'sounds/malus/explosion.mp3',
  acid: 'sounds/malus/acid.mp3',
  'short-gaz-leak': 'sounds/malus/short-gaz-leak.mp3',
} as const

export type SoundKey = keyof typeof SOUNDS

let gameInstance: Phaser.Game | null = null
let soundsLoaded = false

// Initialiser le listener avec l'instance du jeu Phaser
export function initSoundListener(game: Phaser.Game) {
  gameInstance = game

  // Écouter l'event 'sound' pour jouer un son par sa clé
  soundEmitter.on('sound', (key: SoundKey, options?: Phaser.Types.Sound.SoundConfig) => {
    playSound(key, options)
  })

  // Écouter l'event 'sound-key' pour jouer un son par sa clé (alias)
  soundEmitter.on('sound-key', (key: SoundKey, options?: Phaser.Types.Sound.SoundConfig) => {
    playSound(key, options)
  })
}

// Précharger tous les sons dans une scène Phaser
export function preloadSounds(scene: Phaser.Scene) {
  if (soundsLoaded) return

  Object.entries(SOUNDS).forEach(([key, path]) => {
    scene.load.audio(key, path)
  })

  soundsLoaded = true
}

// Jouer un son
export function playSound(key: SoundKey, options?: Phaser.Types.Sound.SoundConfig) {
  if (!gameInstance) {
    console.warn('Sound listener not initialized. Call initSoundListener first.')
    return
  }

  const activeScene = gameInstance.scene.getScenes(true)[0]
  if (!activeScene) {
    console.warn('No active scene to play sound.')
    return
  }

  try {
    console.log(`[SOUND] Playing: ${key}`, options)
    activeScene.sound.play(key, options)
  } catch (error) {
    console.warn(`Failed to play sound: ${key}`, error)
  }
}

// Arrêter un son
export function stopSound(key: SoundKey) {
  if (!gameInstance) {
    return
  }

  const activeScene = gameInstance.scene.getScenes(true)[0]
  if (!activeScene) {
    return
  }

  try {
    const sound = activeScene.sound.get(key)
    if (sound && sound.isPlaying) {
      sound.stop()
    }
  } catch (error) {
    console.warn(`Failed to stop sound: ${key}`, error)
  }
}

// Fonction utilitaire pour émettre un son depuis n'importe où
export function emitSound(key: SoundKey, options?: Phaser.Types.Sound.SoundConfig) {
  soundEmitter.emit('sound', key, options)
}
