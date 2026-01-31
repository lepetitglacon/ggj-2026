import Phaser from 'phaser'
import { useEngineStore } from '../store/engine'
import { useGameStore } from '../store/game.store'
import { useInventoryStore } from '../store/inventory.store'
import { getDangerById } from '../data/dangers'
import type { Layer } from '../data/layers'
import type { Mask } from '../data/masks'
import { createMask } from '../data/masks'

export class GameState extends Phaser.Scene {
  private gameStore = useGameStore()
  private engineStore = useEngineStore()
  private inventoryStore = useInventoryStore()

  // Éléments du jeu
  private driller!: Phaser.GameObjects.Rectangle
  private drillerText!: Phaser.GameObjects.Text
  private currentLayerRect!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private layerText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text

  // Slots et masques
  private slots: Phaser.GameObjects.Rectangle[] = []
  private slotTexts: Phaser.GameObjects.Text[] = []
  private slotMasks: Map<number, string> = new Map()
  private maskObjects: Map<
    string,
    { rect: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }
  > = new Map()
  private masks: Mask[] = []
  private inventorySlots: Map<string, { x: number; y: number }> = new Map() // Slots d'inventaire pour chaque masque

  // Layer suivant et masque de transparence
  private nextLayerBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private maskTexture!: Phaser.GameObjects.RenderTexture
  private noiseGraphics!: Phaser.GameObjects.Graphics
  private lastNoiseStep: number = 0

  // État du forage
  private currentLayerIndex: number = -1
  private drillingProgress: number = 0
  private currentLayer: Layer | null = null
  private lives: number = 3

  constructor() {
    super({ key: 'game' })
  }

  preload() {
    // Précharger toutes les images de couches
    const normalImages = ['1', '2', '3', '4']

    this.load.image('layer-top-top', 'img/layers-pixelated/top/top.png')

    normalImages.forEach((img) => {
      this.load.image(`layer-normal-${img}`, `img/layers-pixelated/normal/${img}.png`)
    })
  }

  init() {
    this.engineStore.changeState('game')
    this.currentLayerIndex = -1
    this.drillingProgress = 0
    this.lives = 3
  }

  create() {
    this.cameras.main.setBackgroundColor('#87CEEB')

    // Bouton retour
    const backButton = this.add.rectangle(50, 30, 80, 35, 0xcc0000)
    backButton.setInteractive({ useHandCursor: true })
    const backText = this.add.text(50, 30, '← Retour', {
      fontSize: '14px',
      color: '#ffffff',
    })
    backText.setOrigin(0.5, 0.5)
    backButton.on('pointerdown', () => {
      this.scene.start('contract')
    })

    // Affichage des vies
    this.livesText = this.add.text(750, 30, `❤️ Vies: ${this.lives}`, {
      fontSize: '18px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    })
    this.livesText.setOrigin(1, 0.5)

    // Afficher les couches (actuelle et suivante)
    this.displayLayers()

    // Créer le driller au centre
    this.driller = this.add.rectangle(400, 300, 60, 100, 0x333333)
    this.driller.setDepth(5)
    this.drillerText = this.add.text(400, 300, '⚙️\nDRILL', {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
    })
    this.drillerText.setOrigin(0.5, 0.5)
    this.drillerText.setDepth(5)

    this.layerText = this.add.text(400, 420, this.getLayerDescription(), {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    })
    this.layerText.setOrigin(0.5, 0.5)
    this.layerText.setDepth(15)

    // Créer les slots et masques
    this.createSlotsAndMasks()

    // Zone d'inventaire (fond noir)
    const inventoryBg = this.add.rectangle(400, 520, 800, 80, 0x000000, 0.8)
    inventoryBg.setDepth(9)

    const inventoryLabel = this.add.text(20, 520, 'INVENTAIRE', {
      fontSize: '12px',
      color: '#888888',
      fontStyle: 'bold',
    })
    inventoryLabel.setDepth(11)
  }

  update(_time: number, delta: number) {
    // Minage automatique
    if (this.currentLayer) {
      const drillSpeed = this.inventoryStore.drillSpeed
      const progressIncrement = (delta / 1000 / this.currentLayer.hardness) * drillSpeed

      this.drillingProgress += progressIncrement

      // Animation de tremblement
      this.shakeEffect()

      // Ajouter du bruit tous les 10%
      const currentStep = Math.floor(this.drillingProgress * 10)
      if (currentStep > this.lastNoiseStep && currentStep <= 10) {
        this.addNoiseToMask(currentStep)
        this.lastNoiseStep = currentStep
      }

      // Si la couche est cassée, passer à la suivante
      if (this.drillingProgress >= 1) {
        this.breakLayer()
      }
    }
  }

  // Fonction de bruit simple (pseudo-random avec seed)
  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  // Ajouter du bruit au masque (appelé tous les 10%)
  private addNoiseToMask(step: number) {
    if (!this.maskTexture || !this.noiseGraphics) return

    this.noiseGraphics.clear()

    // Centre de l'écran (là où est le drill)
    const centerX = 400
    const centerY = 300

    // Plus le step est élevé, plus on ajoute de trous
    const numHoles = step * 50
    const maxRadius = 5 + step * 3

    for (let i = 0; i < numHoles; i++) {
      const seed = step * 10000 + i

      const angle = this.seededRandom(seed) * Math.PI * 2
      const distanceFactor = this.seededRandom(seed + 1)

      const maxDistance = 50 + step * 35

      // Distribution concentrée au centre
      const distance = Math.pow(distanceFactor, 2) * maxDistance

      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance

      const radius = 2 + this.seededRandom(seed + 2) * maxRadius

      // Trou principal (opaque)
      this.noiseGraphics.fillStyle(0xffffff, 1)
      this.noiseGraphics.fillCircle(x, y, radius)

      // Halo de blur autour du trou (semi-transparent)
      const haloRadius = radius * 1.5
      this.noiseGraphics.fillStyle(0xffffff, 0.5)
      this.noiseGraphics.fillCircle(x, y, haloRadius)

      // Halo moyen (assombri)
      const midBlurRadius = radius * 2
      this.noiseGraphics.fillStyle(0xffffff, 0.25)
      this.noiseGraphics.fillCircle(x, y, midBlurRadius)

      // Halo plus éloigné (très transparent)
      const blurRadius = radius * 2.5
      this.noiseGraphics.fillStyle(0xffffff, 0.2)
      this.noiseGraphics.fillCircle(x, y, blurRadius)
    }

    // Effacer ces trous du masque
    this.maskTexture.erase(this.noiseGraphics, 0, 0)
  }

  private createSlotsAndMasks() {
    const contract = this.gameStore.contract
    if (!contract) return

    const slotCount = this.inventoryStore.maskSlots
    const slotSize = 60
    const slotSpacing = 80
    const startX = 400 - ((slotCount - 1) * slotSpacing) / 2
    const slotY = 480 // En bas de l'écran

    // Créer les slots en bas
    for (let i = 0; i < slotCount; i++) {
      const x = startX + i * slotSpacing
      const slot = this.add.rectangle(x, slotY, slotSize, slotSize, 0x666666, 0.8)
      slot.setStrokeStyle(3, 0xffffff)
      slot.setDepth(10)
      this.slots.push(slot)

      const slotText = this.add.text(x, slotY, `${i + 1}`, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      slotText.setOrigin(0.5, 0.5)
      slotText.setDepth(11)
      this.slotTexts.push(slotText)
    }

    // Créer les masques seulement pour ceux qu'on possède ET qui sont dans les dangers du contrat
    const maskSpacing = 80
    const maskStartY = 560

    // Filtrer les masques possédés qui correspondent aux dangers du contrat
    const ownedMasksForContract = contract.knownDangers.filter((dangerId) =>
      this.inventoryStore.isMaskOwned(dangerId)
    )

    // Centrer les masques en fonction du nombre
    const maskCount = ownedMasksForContract.length
    const totalWidth = (maskCount - 1) * maskSpacing
    const maskStartX = 400 - totalWidth / 2

    ownedMasksForContract.forEach((dangerId, index) => {
      const danger = getDangerById(dangerId)
      if (!danger) return

      const maskId = `mask-${index}`
      const inventoryX = maskStartX + index * maskSpacing
      const inventoryY = maskStartY

      // Créer le slot d'inventaire visuel
      const inventorySlot = this.add.rectangle(inventoryX, inventoryY, 65, 65, 0x333333, 0.6)
      inventorySlot.setStrokeStyle(2, 0x666666)
      inventorySlot.setDepth(9)

      // Stocker la position du slot d'inventaire
      this.inventorySlots.set(maskId, { x: inventoryX, y: inventoryY })

      const mask = createMask(maskId, dangerId, danger.color)
      mask.x = inventoryX
      mask.y = inventoryY
      this.masks.push(mask)

      // Créer l'objet visuel
      const maskRect = this.add.rectangle(mask.x, mask.y, 55, 55, danger.color)
      maskRect.setStrokeStyle(3, 0xffffff)
      maskRect.setInteractive({ draggable: true, useHandCursor: true })
      maskRect.setDepth(10)

      const maskText = this.add.text(mask.x, mask.y, danger.label[0], {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      maskText.setOrigin(0.5, 0.5)
      maskText.setDepth(11)

      this.maskObjects.set(mask.id, { rect: maskRect, text: maskText })

      // Drag & Drop
      this.setupMaskDragDrop(mask, maskRect, maskText)
    })
  }

  private setupMaskDragDrop(
    mask: Mask,
    rect: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text
  ) {
    const getOriginalPosition = () => {
      const slot = this.inventorySlots.get(mask.id)
      if (slot) {
        return { x: slot.x, y: slot.y }
      }
      return { x: 400, y: 560 }
    }

    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        if (gameObject === rect) {
          rect.x = dragX
          rect.y = dragY
          text.x = dragX
          text.y = dragY
        }
      }
    )

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject === rect) {
        let placed = false

        for (let i = 0; i < this.slots.length; i++) {
          const slot = this.slots[i]

          // Utiliser les bounding boxes pour détecter le chevauchement
          const maskBounds = rect.getBounds()
          const slotBounds = slot.getBounds()
          const isOverlapping = Phaser.Geom.Rectangle.Overlaps(maskBounds, slotBounds)

          if (isOverlapping) {
            // Vérifier si ce slot contient déjà un masque
            const existingMaskId = this.slotMasks.get(i)
            if (existingMaskId && existingMaskId !== mask.id) {
              // Retourner l'ancien masque à son slot d'inventaire propre
              const existingMask = this.masks.find((m) => m.id === existingMaskId)
              const existingMaskObj = this.maskObjects.get(existingMaskId)

              if (existingMask && existingMaskObj) {
                const existingInventoryPos = this.inventorySlots.get(existingMaskId) || { x: 400, y: 560 }
                existingMaskObj.rect.x = existingInventoryPos.x
                existingMaskObj.rect.y = existingInventoryPos.y
                existingMaskObj.text.x = existingInventoryPos.x
                existingMaskObj.text.y = existingInventoryPos.y
                existingMask.isPlaced = false
                existingMask.slotIndex = undefined
                existingMask.x = existingInventoryPos.x
                existingMask.y = existingInventoryPos.y
              }
            }

            // Retirer ce masque de son ancien slot s'il y en avait un
            if (mask.isPlaced && mask.slotIndex !== undefined) {
              this.slotMasks.delete(mask.slotIndex)
              this.slots[mask.slotIndex].setFillStyle(0x666666, 0.8)
              this.slotTexts[mask.slotIndex].setText(`${mask.slotIndex + 1}`)
            }

            // Placer le masque sur le nouveau slot
            rect.x = slot.x
            rect.y = slot.y
            text.x = slot.x
            text.y = slot.y
            mask.isPlaced = true
            mask.slotIndex = i
            mask.x = rect.x
            mask.y = rect.y

            // Mettre à jour le mapping slot -> masque
            this.slotMasks.set(i, mask.id)
            slot.setFillStyle(0x00ff00, 0.5)
            this.slotTexts[i].setText('')

            placed = true
            break
          }
        }

        // Si pas placé sur un slot de forage, retourner au slot d'inventaire
        if (!placed) {
          if (mask.isPlaced && mask.slotIndex !== undefined) {
            this.slotMasks.delete(mask.slotIndex)
            this.slots[mask.slotIndex].setFillStyle(0x666666, 0.8)
            this.slotTexts[mask.slotIndex].setText(`${mask.slotIndex + 1}`)
          }

          // Retourner au slot d'inventaire du masque
          const inventoryPos = getOriginalPosition()
          rect.x = inventoryPos.x
          rect.y = inventoryPos.y
          text.x = inventoryPos.x
          text.y = inventoryPos.y
          mask.isPlaced = false
          mask.slotIndex = undefined
          mask.x = inventoryPos.x
          mask.y = inventoryPos.y
        }
      }
    })
  }

  private displayLayers() {
    if (this.currentLayerRect) this.currentLayerRect.destroy()
    if (this.nextLayerBg) this.nextLayerBg.destroy()
    if (this.maskTexture) this.maskTexture.destroy()
    if (this.noiseGraphics) this.noiseGraphics.destroy()

    const contract = this.gameStore.contract
    if (!contract) return

    // Reset le step de bruit
    this.lastNoiseStep = 0

    // Déterminer le layer suivant pour l'afficher en dessous
    const nextIndex = this.currentLayerIndex + 1

    if (nextIndex < contract.layers.length) {
      const nextLayer = contract.layers[nextIndex]
      const nextImageKey = this.getLayerImageKey(nextLayer)
      const nextImage = this.add.image(400, 300, nextImageKey)
      nextImage.setOrigin(0.5, 0.5)
      nextImage.setDisplaySize(800, 600)
      nextImage.setDepth(-2)

      // Appliquer un filtre de couleur si c'est une couche de danger
      if (nextLayer.type === 'danger' && nextLayer.dangerId) {
        const danger = getDangerById(nextLayer.dangerId)
        if (danger) {
          nextImage.setTint(danger.color)
        }
      }

      this.nextLayerBg = nextImage
    } else {
      // Fallback si pas de couche suivante
      const fallbackRect = this.add.rectangle(0, 0, 800, 600, 0x8b4513)
      fallbackRect.setOrigin(0, 0)
      fallbackRect.setDepth(-2)
      this.nextLayerBg = fallbackRect
    }

    // Couche actuelle
    if (this.currentLayerIndex === -1) {
      const rect = this.add.rectangle(0, 0, 800, 600, 0x8b4513)
      rect.setOrigin(0, 0)
      rect.setDepth(-1)
      this.currentLayerRect = rect
      this.currentLayer = { id: -1, type: 'normal', hardness: 3 }
    } else if (this.currentLayerIndex < contract.layers.length) {
      const layer = contract.layers[this.currentLayerIndex]
      this.currentLayer = layer
      const imageKey = this.getLayerImageKey(layer)
      const image = this.add.image(400, 300, imageKey)
      image.setOrigin(0.5, 0.5)
      image.setDisplaySize(800, 600)
      image.setDepth(-1)

      // Appliquer un filtre de couleur si c'est une couche de danger
      if (layer.type === 'danger' && layer.dangerId) {
        const danger = getDangerById(layer.dangerId)
        if (danger) {
          image.setTint(danger.color)
        }
      }

      this.currentLayerRect = image
    }

    // Créer le RenderTexture pour le masque (même position et taille)
    this.maskTexture = this.add.renderTexture(0, 0, 800, 600)
    this.maskTexture.setOrigin(0, 0)
    this.maskTexture.fill(0xffffff, 1)
    this.maskTexture.setVisible(false)

    // Graphics pour dessiner les trous de bruit (invisible, sert juste pour erase)
    this.noiseGraphics = this.add.graphics()
    this.noiseGraphics.setVisible(false)

    // Appliquer le masque bitmap à la couche actuelle
    const mask = new Phaser.Display.Masks.BitmapMask(this, this.maskTexture)
    if (this.currentLayerRect instanceof Phaser.GameObjects.Rectangle ||
        this.currentLayerRect instanceof Phaser.GameObjects.Image) {
      this.currentLayerRect.setMask(mask)
    }
  }

  private getLayerImageKey(layer: Layer): string {
    if (!layer.imageUrl) {
      return 'default' // Fallback, mais ne devrait pas arriver ici
    }
    // Extraire l'image et le type du chemin (ex: /img/layers-pixelated/top/top.png)
    const parts = layer.imageUrl.split('/')
    const imageName = parts[parts.length - 1].replace('.png', '')
    const layerType = parts[parts.length - 2]
    return `layer-${layerType}-${imageName}`
  }


  private getLayerLabel(layer: Layer): string {
    if (layer.type === 'normal') return 'Normal'
    if (layer.dangerId) {
      const danger = getDangerById(layer.dangerId)
      return danger?.label || 'Danger'
    }
    return 'Inconnu'
  }

  private getLayerDescription(): string {
    if (this.currentLayerIndex === -1) return 'Surface - Stage 0'
    const contract = this.gameStore.contract
    if (!contract) return ''
    const layer = contract.layers[this.currentLayerIndex]
    return `Couche ${this.currentLayerIndex + 1} - ${this.getLayerLabel(layer)}`
  }

  private shakeEffect() {
    const shakeAmount = 2
    this.driller.x = 400 + Phaser.Math.Between(-shakeAmount, shakeAmount)
    this.driller.y = 300 + Phaser.Math.Between(-shakeAmount, shakeAmount)
    this.drillerText.x = this.driller.x
    this.drillerText.y = this.driller.y
  }

  private breakLayer() {
    // Vérifier si on entre dans une zone de danger
    const contract = this.gameStore.contract
    if (!contract) return

    const nextIndex = this.currentLayerIndex + 1
    if (nextIndex < contract.layers.length) {
      const nextLayer = contract.layers[nextIndex]

      if (nextLayer.type === 'danger' && nextLayer.dangerId) {
        // Vérifier si le bon masque est placé
        const hasCorrectMask = this.masks.some(
          (mask) => mask.isPlaced && mask.dangerId === nextLayer.dangerId
        )

        if (!hasCorrectMask) {
          // Pas de masque ou mauvais masque -> perte de vie
          this.takeDamage()
        }
      }
    }

    // Gagner du pétrole pour la couche cassée
    this.gainOilForLayer(this.currentLayerIndex)

    // Passer à la couche suivante
    this.drillingProgress = 0
    this.lastNoiseStep = 0
    this.driller.x = 400
    this.driller.y = 300
    this.drillerText.x = 400
    this.drillerText.y = 300

    this.currentLayerIndex++

    if (this.currentLayerIndex >= contract.layers.length) {
      this.completeContract()
    } else {
      this.resetMasksInSlots()
      this.displayLayers()
      this.layerText.setText(this.getLayerDescription())
      this.cameras.main.flash(200, 255, 255, 255)
    }
  }

  private resetMasksInSlots() {
    // Remettre tous les masques à leur position d'inventaire
    this.masks.forEach((mask) => {
      if (mask.isPlaced && mask.slotIndex !== undefined) {
        const maskObj = this.maskObjects.get(mask.id)
        const slotIndex = mask.slotIndex
        const slot = this.slots[slotIndex]

        if (maskObj && slot && this.slotTexts[slotIndex]) {
          // Retourner le masque à son inventaire
          const inventoryPos = this.inventorySlots.get(mask.id) || { x: 400, y: 560 }
          maskObj.rect.x = inventoryPos.x
          maskObj.rect.y = inventoryPos.y
          maskObj.text.x = inventoryPos.x
          maskObj.text.y = inventoryPos.y

          // Réinitialiser le slot
          slot.setFillStyle(0x666666, 0.8)
          this.slotTexts[slotIndex].setText(`${slotIndex + 1}`)

          // Supprimer du mapping slot -> masque
          this.slotMasks.delete(slotIndex)
        }

        // Réinitialiser l'état du masque
        mask.isPlaced = false
        mask.slotIndex = undefined
        const inventoryPos = this.inventorySlots.get(mask.id) || { x: 400, y: 560 }
        mask.x = inventoryPos.x
        mask.y = inventoryPos.y
      }
    })
  }

  private gainOilForLayer(layerIndex: number) {
    const contract = this.gameStore.contract
    if (!contract || layerIndex < 0 || layerIndex >= contract.layers.length) return

    const layer = contract.layers[layerIndex]

    // Calculer le gain en fonction de la profondeur et du type de couche
    let baseGain = 50 * (layerIndex + 1) // Augmente avec la profondeur
    if (layer.type === 'danger') {
      baseGain *= 2 // Les couches de danger rapportent 2x plus
    }

    this.engineStore.addOil(baseGain)

    // Afficher les particules de pétrole avec le montant
    this.showOilParticles(baseGain)
  }

  private showOilParticles(amount: number) {
    const text = this.add.text(400, 300, `+${amount} 🛢️`, {
      fontSize: '28px',
      color: '#ffff00',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    })
    text.setOrigin(0.5, 0.5)
    text.setDepth(20)

    // Animation de montée + fade
    this.tweens.add({
      targets: text,
      y: 150,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy()
      },
    })
  }

  private takeDamage() {
    this.lives--
    this.livesText.setText(`❤️ Vies: ${this.lives}`)
    this.cameras.main.shake(300, 0.01)

    if (this.lives <= 0) {
      this.failContract()
    }
  }

  private failContract() {
    // Perte de reconnaissance
    this.engineStore.removeRecognition(20)

    const failText = this.add.text(400, 300, 'Contrat échoué !\n-20 reconnaissance', {
      fontSize: '32px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center',
    })
    failText.setOrigin(0.5, 0.5)
    failText.setDepth(25)

    this.time.delayedCall(3000, () => {
      this.scene.start('contract')
    })
  }

  private completeContract() {
    const contract = this.gameStore.contract
    if (contract) {
      this.engineStore.addOil(contract.oil)
      this.engineStore.addRecognition(10)

      const successText = this.add.text(
        400,
        300,
        `Contrat terminé !\n+${contract.oil} barils\n+10 reconnaissance`,
        {
          fontSize: '32px',
          color: '#00ff00',
          backgroundColor: '#000000',
          padding: { x: 20, y: 10 },
          align: 'center',
        }
      )
      successText.setOrigin(0.5, 0.5)
      successText.setDepth(25)

      this.time.delayedCall(3000, () => {
        this.scene.start('contract')
      })
    }
  }
}
