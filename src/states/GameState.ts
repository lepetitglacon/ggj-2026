import Phaser from 'phaser'
import { useEngineStore } from '../store/engine'
import { useGameStore } from '../store/game.store'
import { useInventoryStore } from '../store/inventory.store'
import { usePlacedMasksStore } from '../store/placed-masks.store'
import { getDangerById } from '../data/dangers'
import type { Layer } from '../data/layers'
import type { Mask } from '../data/masks'
import { createMask } from '../data/masks'
import type { LayerBreakAnimation } from './LayerBreakAnimation'
import { CrackAnimation } from './LayerBreakAnimation'
import { preloadSounds, emitSound } from '../listeners/sound.listener'
import { InvertPipeline } from '../utils/InvertPipeline'

type ParticleEmitter = Phaser.GameObjects.Particles.ParticleEmitter // Animation par défaut

class GameState extends Phaser.Scene {
  private gameStore = useGameStore()
  private engineStore = useEngineStore()
  private inventoryStore = useInventoryStore()
  private placedMasksStore = usePlacedMasksStore()

  // Positions globales
  private readonly DRILL_X = 400
  private readonly DRILL_Y = 450 // Relevé de 70 pixels
  private readonly MASK_CENTER_Y = 350 // Centre du masque de cassage (baissé)

  // Animation strategy pour le cassage de couche
  private layerBreakAnimation: LayerBreakAnimation = new CrackAnimation(600)

  // Éléments du jeu
  private driller!: Phaser.GameObjects.Image
  private drillerDude!: Phaser.GameObjects.Image
  private drillerDudeHands!: Phaser.GameObjects.Image
  private drillerMask!: Phaser.GameObjects.Image | null // Masque sur la tête du driller
  private drillerText!: Phaser.GameObjects.Text
  private currentLayerRect!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private layerText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text

  // Slots et masques
  private slots: Phaser.GameObjects.Rectangle[] = []
  private slotTexts: Phaser.GameObjects.Text[] = []
  private maskObjects: Map<string, { image: Phaser.GameObjects.Image }> = new Map()
  private masks: Mask[] = []
  private inventorySlots: Map<string, { x: number; y: number }> = new Map() // Slots d'inventaire pour chaque masque (position actuelle)
  private inventorySlotObjects: Map<string, Phaser.GameObjects.Rectangle> = new Map() // Objets visuels des slots
  private initialInventoryCoords: Map<string, { x: number; y: number }> = new Map() // Positions d'origine des slots
  private draggingSlot: Phaser.GameObjects.Rectangle | null = null

  // États des malus
  private acidLayersRemaining: number = 0
  private radiationLockedLayers: number = 0
  private irradiatedMaskId: string | null = null
  private acidDrillerAura: Phaser.GameObjects.Image | null = null

  // Layer suivant et masque de transparence
  private nextLayerBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private maskTexture!: Phaser.GameObjects.RenderTexture
  private noiseGraphics!: Phaser.GameObjects.Graphics
  private lastNoiseStep: number = 0

  // Particules et effets
  private oilParticles!: any
  private dirtParticles!: any
  private dirtBackParticles!: any
  private dirtParticles2!: any
  private dirtBackParticles2!: any
  private toxicClouds: Array<{
    image: Phaser.GameObjects.RenderTexture
    x: number
    y: number
    radius: number
  }> = [] // Nuages de gaz toxique

  // État du forage
  private currentLayerIndex: number = -1
  private drillingProgress: number = 0
  private currentLayer: Layer | null = null
  private lives: number = 3
  private emitter?: ParticleEmitter

  // Malus actifs
  private activeMalus: Set<string> = new Set() // Set des IDs de dangers qui ont été déclenchés
  private acidLayersRemaining: number = 0 // Nombre de couches restantes avec effet acide
  private isTestMode: boolean = false // Mode test sans forage automatique
  private nextLayerButton?: Phaser.GameObjects.Text // Bouton pour passer à la couche suivante en mode test

  // Sons de forage
  private drillBaseSound?: Phaser.Sound.BaseSound
  private drillBgSound?: Phaser.Sound.BaseSound
  private drillBg2Sound?: Phaser.Sound.BaseSound

  constructor() {
    super({ key: 'game' })
  }

  preload() {
    // Enregistrer le pipeline d'inversion pour les nuages toxiques
    const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer
    if (!renderer.pipelines.get('Invert')) {
      renderer.pipelines.addPostPipeline('Invert', InvertPipeline)
    }

    // Précharger l'image du drill
    this.load.image('drill-pixelated', 'img/drill/drill_pixelated.png')
    this.load.image('driller-reduced', 'img/driller/driller.reduced.png')
    this.load.image('driller-reduced-hands', 'img/driller/driller.reduced.hands.png')
    this.load.image('oil-particle', 'img/particles/oil.png')
    this.load.image('dirt-particle', 'img/particles/dirt.png')
    preloadSounds(this)

    // Précharger les images de masques
    // Pour chaque danger, charger mask-{label}.png et mask-driller-{label}.png
    const maskTypes = [
      { id: '1', name: 'toxique' },
      { id: '2', name: 'explosion' },
      { id: '3', name: 'radiation' },
      { id: '4', name: 'acide' },
      { id: '5', name: 'flammable' },
      { id: '6', name: 'biohazard' },
    ]

    maskTypes.forEach((maskType) => {
      // Masque dans l'inventaire
      this.load.image(`mask-${maskType.id}`, `img/masks/icon/mask-${maskType.name}.png`)
      // Masque sur le driller
      this.load.image(
        `mask-driller-${maskType.id}`,
        `img/masks/driller/mask-driller-${maskType.name}.png`
      )
    })

    // Charger uniquement l'image du pays du contrat actuel
    const contract = this.gameStore.contract
    if (contract) {
      // Mappage des noms de pays à leurs images
      const countryImageMap: Record<string, string> = {
        Angola: 'angola',
        Nigeria: 'nigeria',
        Libye: 'top',
        Algérie: 'top',
        Norvège: 'norvège',
        'Royaume-Uni': 'UK',
        Canada: 'top',
        Chine: 'top',
        Brésil: 'top',
        Mexique: 'mexique',
        Kazakhstan: 'top',
        Venezuela: 'top',
        'États-Unis': 'US',
        Qatar: 'top',
        Russie: 'top',
      }

      // Obtenir le nom du pays et son image associée
      const countryName = contract.title
      const imageName = countryImageMap[countryName] || 'top'

      // Charger uniquement cette image
      if (imageName === 'nigeria') {
        this.load.image(`layer-top-${imageName}`, `img/layers/top/${imageName}.jpeg`)
      } else {
        this.load.image(`layer-top-${imageName}`, `img/layers/top/${imageName}.jpg`)
      }
    }

    // Précharger les images pixelisées pour les couches normales et dangers
    const normalImages = ['1', '2', '3', '4']
    this.load.image('layer-top-top', 'img/layers-pixelated/top/top.png')
    normalImages.forEach((img) => {
      this.load.image(`layer-normal-${img}`, `img/layers-pixelated/normal/${img}.png`)
    })
  }

  init() {
    this.engineStore.changeState('game')
    this.currentLayerIndex = 0
    this.drillingProgress = 0
    this.toxicClouds = []
    this.activeMalus.clear()
    this.acidLayersRemaining = 0

    // Vérifier si c'est le contrat TEST
    const contract = this.gameStore.contract
    this.isTestMode = contract?.title === 'TEST'

    // 10 vies pour le mode test, 3 sinon
    this.lives = this.isTestMode ? 10 : 3
  }

  create() {
    this.cameras.main.setBackgroundColor('#87CEEB')

    // === COUCHES (fond) ===
    this.displayLayers()

    // === DRILL ET PARTICULES (bas) ===
    // Créer le driller réduit en arrière-plan
    this.drillerDude = this.add.image(this.DRILL_X, this.DRILL_Y, 'driller-reduced')
    this.drillerDude.setOrigin(0.5, 0.5)
    this.drillerDude.setDepth(4)
    this.drillerDude.setScale(0.7, 0.7)
    this.drillerDude.setPosition(this.DRILL_X, this.DRILL_Y - 80)
    // Créer le driller réduit en arrière-plan
    this.drillerDudeHands = this.add.image(this.DRILL_X, this.DRILL_Y, 'driller-reduced-hands')
    this.drillerDudeHands.setOrigin(0.5, 0.5)
    this.drillerDudeHands.setDepth(4)
    this.drillerDudeHands.setScale(0.7, 0.7)
    this.drillerDudeHands.setPosition(this.DRILL_X, this.DRILL_Y - 80)

    // Créer le driller en bas
    this.driller = this.add.image(this.DRILL_X, this.DRILL_Y, 'drill-pixelated')
    this.driller.setOrigin(0.5, 0.5)
    this.driller.setDepth(5)

    this.drillerText = this.add.text(this.DRILL_X, this.DRILL_Y, '', {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
    })
    this.drillerText.setOrigin(0.5, 0.5)
    this.drillerText.setDepth(5)
    this.drillerText.setVisible(false)

    // Créer les particules de terre
    this.createOilParticles()

    // Créer les slots et masques (en bas)
    this.createSlotsAndMasks()

    // Affichage des vies
    this.livesText = this.add.text(750, 30, `❤️ Vies: ${this.lives}`, {
      fontSize: '18px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    })
    this.livesText.setOrigin(1, 0.5)
    this.livesText.setDepth(31)

    // Zone d'inventaire (fond noir - tout en haut)
    const inventoryBg = this.add.rectangle(this.DRILL_X, 40, 800, 80, 0x000000, 0.5)
    inventoryBg.setDepth(28)

    const inventoryLabel = this.add.text(20, 10, 'INVENTAIRE', {
      fontSize: '12px',
      color: '#888888',
      fontStyle: 'bold',
    })
    inventoryLabel.setDepth(29)

    // Démarrer les sons de forage
    this.startDrillingSounds()

    // Créer le bouton de test si en mode TEST
    if (this.isTestMode) {
      this.createTestModeButton()

      // Afficher un message indiquant qu'on est en mode test
      const testModeText = this.add.text(
        400,
        100,
        '🧪 MODE TEST - Cliquez pour passer à la couche suivante',
        {
          fontSize: '16px',
          color: '#ffff00',
          backgroundColor: '#000000',
          padding: { x: 15, y: 8 },
          align: 'center',
        }
      )
      testModeText.setOrigin(0.5, 0.5)
      testModeText.setDepth(50)
    }
  }

  private startDrillingSounds() {
    // Les 3 sons de forage jouent en boucle infinie simultanément

    // Son de base (drill) - démarre immédiatement
    this.drillBaseSound = this.sound.add('drill', { loop: true, volume: 0.3 })
    this.drillBaseSound.play({ loop: true })

    // Son d'ambiance 1 (drill-bg) - démarre après un délai aléatoire
    const delay1 = Phaser.Math.Between(0, 3000)
    this.time.delayedCall(delay1, () => {
      this.drillBgSound = this.sound.add('drill-bg', { loop: true, volume: 0.2 })
      this.drillBgSound.play({ loop: true })
    })

    // Son d'ambiance 2 (drill-bg-2) - démarre après un délai aléatoire différent
    const delay2 = Phaser.Math.Between(1000, 5000)
    this.time.delayedCall(delay2, () => {
      this.drillBg2Sound = this.sound.add('drill-bg-2', { loop: true, volume: 0.2 })
      this.drillBg2Sound.play({ loop: true })
    })
  }

  private createTestModeButton() {
    const contract = this.gameStore.contract
    if (!contract) return

    // Créer un bouton au centre-bas de l'écran
    this.nextLayerButton = this.add.text(400, 550, '▶ COUCHE SUIVANTE (TEST)', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#ff6600',
      padding: { x: 20, y: 10 },
      align: 'center',
    })
    this.nextLayerButton.setOrigin(0.5, 0.5)
    this.nextLayerButton.setDepth(50)
    this.nextLayerButton.setInteractive({ useHandCursor: true })

    // Effet de survol
    this.nextLayerButton.on('pointerover', () => {
      this.nextLayerButton?.setBackgroundColor('#ff8833')
    })

    this.nextLayerButton.on('pointerout', () => {
      this.nextLayerButton?.setBackgroundColor('#ff6600')
    })

    // Clic sur le bouton
    this.nextLayerButton.on('pointerdown', () => {
      emitSound('clic')
      this.breakLayer()

      // Mettre à jour le texte du bouton avec le numéro de couche
      const currentIndex = this.currentLayerIndex
      if (currentIndex < contract.layers.length) {
        const layer = contract.layers[currentIndex]
        const layerType = layer.type === 'danger' ? `DANGER: ${layer.dangerId}` : 'NORMALE'
        this.nextLayerButton?.setText(
          `▶ COUCHE SUIVANTE (${currentIndex + 1}/${contract.layers.length}) - ${layerType}`
        )
      }
    })

    // Initialiser le texte du bouton
    const layer = contract.layers[this.currentLayerIndex]
    const layerType = layer.type === 'danger' ? `DANGER: ${layer.dangerId}` : 'NORMALE'
    this.nextLayerButton.setText(
      `▶ COUCHE SUIVANTE (${this.currentLayerIndex + 1}/${contract.layers.length}) - ${layerType}`
    )
  }

  update(_time: number, delta: number) {
    // Mettre à jour les uniforms du shader de nuages
    if (this.toxicClouds.length > 0) {
      const pipeline = this.cameras.main.getPostPipeline('Invert') as InvertPipeline
      if (pipeline) {
        const cloudData = this.toxicClouds.map((c) => ({
          x: c.image.x,
          y: c.image.y,
          radius: c.radius,
        }))
        pipeline.setClouds(cloudData)
      }
    }

    // Minage automatique
    if (this.currentLayer) {
      let drillSpeed = this.inventoryStore.drillSpeed

      // Si l'effet acide est actif, le forage est 10x plus rapide
      if (this.acidLayersRemaining > 0) {
        drillSpeed *= 10
      }

      // En mode test, arrêter le forage une fois la couche terminée
      if (this.isTestMode && this.drillingProgress >= 1) {
        // Ne rien faire, attendre que le joueur clique sur le bouton
        return
      }

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

      this?.dirtParticles?.emitParticleAt?.(
        this.driller.x,
        this.driller.y + this.driller.height / 2,
        4
      )

      this?.dirtBackParticles?.emitParticleAt?.(
        this.driller.x,
        this.driller.y + this.driller.height / 2,
        4
      )

      // Particules supplémentaires si vitesse augmentée
      if (drillSpeed > 1) {
        const extraParticles = Math.floor((drillSpeed - 1) * 4)
        this?.dirtParticles2?.emitParticleAt?.(
          this.driller.x,
          this.driller.y + this.driller.height / 2,
          extraParticles
        )
        this?.dirtBackParticles2?.emitParticleAt?.(
          this.driller.x,
          this.driller.y + this.driller.height / 2,
          extraParticles
        )
      }

      // Si la couche est cassée, passer à la suivante
      if (this.drillingProgress >= 0.9) {
        this?.oilParticles?.emitParticleAt?.(
          this.driller.x,
          this.driller.y + this.driller.height / 2,
          16
        )
      }

      // En mode normal, passer automatiquement à la couche suivante
      if (this.drillingProgress >= 1 && !this.isTestMode) {
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
    const centerX = this.DRILL_X
    const centerY = this.MASK_CENTER_Y + 150

    // Créer des couloirs de minage avec des traits
    const numTunnels = 2 + step
    const traitWidth = 12 + step * 2 // Plus large

    for (let t = 0; t < numTunnels; t++) {
      const seed = step * 10000 + t * 1000

      // Direction de chaque couloir - limité vers le bas (0 à π seulement)
      const baseAngle = (t / numTunnels) * Math.PI // 0 à π au lieu de 0 à 2π
      const angleVariation = (this.seededRandom(seed) - 0.5) * Math.PI * 0.4
      const angle = baseAngle + angleVariation

      // Nombre de segments dans ce couloir - augmenté pour plus de continuité
      const numSegments = 16 + step * 4
      const maxDepth = 40 + step * 25

      for (let seg = 0; seg < numSegments; seg++) {
        const segSeed = seed + seg * 100

        // Position le long du couloir
        const segProgress = seg / numSegments
        const depth = segProgress * maxDepth

        // Ajouter du waviness au couloir
        const waveAmount = 15 + step * 3
        const waveVariation =
          Math.sin(seg * 0.5) * waveAmount + (this.seededRandom(segSeed) - 0.5) * waveAmount

        const x = centerX + Math.cos(angle) * depth + Math.cos(angle + Math.PI / 2) * waveVariation
        const y = centerY + Math.sin(angle) * depth + Math.sin(angle + Math.PI / 2) * waveVariation

        // Effet de parallaxe 3D: les traits plus loin sont plus petits et plus transparents
        const depthFactor = 1 - segProgress * 0.5
        const width = traitWidth * depthFactor
        const parallaxScale = 1 - segProgress * 0.3 // Réduit de 30% au maximum

        // Effet de perspective 3D: réduire la taille vers le haut (y diminue = remonte à l'écran)
        const perspectiveY = (y - centerY) / 300 // Normaliser par rapport au centre (-1 to 1)
        const perspectiveFactor = Math.max(0.5, 1 + perspectiveY * 0.5) // 50% en haut, 150% en bas

        const finalWidth = width * perspectiveFactor
        const finalScale = parallaxScale * perspectiveFactor

        // Tracer des ellipses écrasées pour une ligne plus épaisse et continue
        this.noiseGraphics.fillStyle(0xffffff, finalScale)
        const radiusX = (finalWidth / 2) * finalScale
        const radiusY = (finalWidth / 4) * finalScale // Écrasé verticalement
        this.noiseGraphics.fillEllipse(x, y, radiusX * 2, radiusY * 2)

        // Ajouter des ellipses décalées pour plus d'épaisseur
        const offsetDist = (finalWidth / 3) * finalScale
        for (let offset = 0; offset < 2; offset++) {
          const offsetAngle = angle + Math.PI / 2 + (offset === 0 ? 0 : Math.PI)
          const offsetX = x + Math.cos(offsetAngle) * offsetDist * 0.7
          const offsetY = y + Math.sin(offsetAngle) * offsetDist * 0.7
          const offsetRadiusX = (finalWidth / 2.5) * finalScale
          const offsetRadiusY = (finalWidth / 5) * finalScale
          this.noiseGraphics.fillEllipse(offsetX, offsetY, offsetRadiusX * 2, offsetRadiusY * 2)
        }

        // Halo semi-transparent avec effet de profondeur
        const haloWidth = finalWidth * 1.3
        const haloRadiusX = (haloWidth / 2) * finalScale
        const haloRadiusY = (haloWidth / 4) * finalScale
        this.noiseGraphics.fillStyle(0xffffff, 0.4 * finalScale)
        this.noiseGraphics.fillEllipse(x, y, haloRadiusX * 2, haloRadiusY * 2)
      }
    }

    // Effacer ces trous du masque
    this.maskTexture.erase(this.noiseGraphics, 0, 0)
  }

  private createSlotsAndMasks() {
    const contract = this.gameStore.contract
    if (!contract) return

    const slotCount = this.inventoryStore.maskSlots
    const slotSize = 80
    const slotSpacing = 80
    const startX = this.DRILL_X - ((slotCount - 1) * slotSpacing) / 2
    const slotY = 240 // Au-dessus du drill

    // Créer les slots en bas
    for (let i = 0; i < slotCount; i++) {
      const x = startX + i * slotSpacing
      const slot = this.add.rectangle(x, slotY, slotSize, slotSize, 0x00ff00, 0.01)
      // slot.setStrokeStyle(3, 0xffffff)
      slot.setDepth(20)
      slot.setInteractive({ draggable: true, useHandCursor: true })
      this.slots.push(slot)

      const slotText = this.add.text(x, slotY, `${i + 1}`, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      slotText.setOrigin(0.5, 0.5)
      slotText.setDepth(21)
      this.slotTexts.push(slotText)
    }

    // Configurer le drag & drop pour les slots du centre
    this.setupSlotDragDrop()

    // Créer les masques seulement pour ceux qu'on possède ET qui sont dans les dangers du contrat
    const maskSpacing = 80
    const maskStartY = 40

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
      const inventorySlot = this.add.rectangle(inventoryX, inventoryY, 65, 65, 0x00ff00, 0.01)
      inventorySlot.setStrokeStyle(2, 0x00ff00)
      inventorySlot.setDepth(29)
      inventorySlot.setName(maskId) // ID pour retrouver le slot lors du drag

      // Stocker la position du slot d'inventaire
      this.inventorySlots.set(maskId, { x: inventoryX, y: inventoryY })
      this.inventorySlotObjects.set(maskId, inventorySlot)
      this.initialInventoryCoords.set(maskId, { x: inventoryX, y: inventoryY })

      const mask = createMask(maskId, dangerId, danger.color)
      mask.x = inventoryX
      mask.y = inventoryY
      this.masks.push(mask)

      // Créer l'objet visuel (image du masque)
      const maskImage = this.add.image(mask.x, mask.y, `mask-${dangerId}`)
      maskImage.setOrigin(0.5, 0.5)
      maskImage.setDisplaySize(55, 55)
      maskImage.setInteractive({ draggable: true, useHandCursor: true })
      maskImage.setDepth(30)

      this.maskObjects.set(mask.id, { image: maskImage })
    })

    // Configurer le drag & drop pour les masques de l'inventaire
    this.setupInventoryMaskDragDrop()

    // Configurer le drag & drop pour les slots eux-mêmes (réparation post-explosion)
    this.setupInventorySlotDragDrop()
  }

  private setupInventorySlotDragDrop() {
    this.input.on(
      'drag',
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        // Vérifier si c'est un slot d'inventaire
        if (
          gameObject instanceof Phaser.GameObjects.Rectangle &&
          gameObject.name &&
          gameObject.name.startsWith('mask-')
        ) {
          const maskId = gameObject.name

          // Déplacer le slot
          gameObject.x = dragX
          gameObject.y = dragY

          // Si un masque est présent (non placé), le déplacer avec le slot
          const mask = this.masks.find((m) => m.id === maskId)
          if (mask && !mask.isPlaced) {
            const maskObj = this.maskObjects.get(maskId)
            if (maskObj) {
              maskObj.image.x = dragX
              maskObj.image.y = dragY
              // Mettre à jour la position logique
              mask.x = dragX
              mask.y = dragY
            }
          }

          // Mettre à jour la position connue du slot (pour le drop des masques)
          const currentPos = this.inventorySlots.get(maskId)
          if (currentPos) {
            currentPos.x = dragX
            currentPos.y = dragY
          }
        }
      }
    )

    this.input.on(
      'dragend',
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (
          gameObject instanceof Phaser.GameObjects.Rectangle &&
          gameObject.name &&
          gameObject.name.startsWith('mask-')
        ) {
          const maskId = gameObject.name
          const initialPos = this.initialInventoryCoords.get(maskId)

          if (initialPos) {
            // Vérifier la distance avec la position d'origine
            const dist = Phaser.Math.Distance.Between(
              gameObject.x,
              gameObject.y,
              initialPos.x,
              initialPos.y
            )

            // Si on est assez proche (< 50px), on aimante à la position d'origine
            if (dist < 50) {
              // Animation de retour à la place
              this.tweens.add({
                targets: gameObject,
                x: initialPos.x,
                y: initialPos.y,
                angle: 0, // Remettre droit
                duration: 200,
                ease: 'Back.easeOut',
              })

              // Mettre à jour la position enregistrée
              const currentPos = this.inventorySlots.get(maskId)
              if (currentPos) {
                currentPos.x = initialPos.x
                currentPos.y = initialPos.y
              }

              // Si le masque est avec, on le remet aussi
              const mask = this.masks.find((m) => m.id === maskId)
              if (mask && !mask.isPlaced) {
                const maskObj = this.maskObjects.get(maskId)
                if (maskObj) {
                  this.tweens.add({
                    targets: maskObj.image,
                    x: initialPos.x,
                    y: initialPos.y,
                    angle: 0,
                    duration: 200,
                    ease: 'Back.easeOut',
                  })
                  mask.x = initialPos.x
                  mask.y = initialPos.y
                }
              }

              emitSound('clic') // Son de confirmation

              // Verrouiller le slot une fois remis en place
              gameObject.disableInteractive()
            }
          }
        }
      }
    )
  }

  private setupSlotDragDrop() {
    let currentDraggedSlot: Phaser.GameObjects.Rectangle | null = null
    let currentDraggedImage: Phaser.GameObjects.Image | null = null
    let currentDraggedMask: Mask | null = null
    let currentSlotIndex: number = -1

    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        const slotIndex = this.slots.indexOf(gameObject as Phaser.GameObjects.Rectangle)
        if (slotIndex !== -1) {
          const maskId = this.placedMasksStore.getMaskInSlot(slotIndex)
          if (maskId) {
            const mask = this.masks.find((m) => m.id === maskId)
            const maskObj = this.maskObjects.get(maskId)
            if (mask && maskObj) {
              currentDraggedSlot = gameObject as Phaser.GameObjects.Rectangle
              currentDraggedMask = mask
              currentDraggedImage = maskObj.image
              currentSlotIndex = slotIndex
              // Afficher l'image du masque et la rendre visible
              currentDraggedImage.setAlpha(1)
              currentDraggedImage.setDepth(50)
            }
          }
        }
      }
    )

    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        if (gameObject === currentDraggedSlot && currentDraggedImage) {
          currentDraggedImage.x = dragX
          currentDraggedImage.y = dragY
        }
      }
    )

    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject === currentDraggedSlot && currentDraggedMask && currentDraggedImage) {
          let placedInInventory = false

          // Vérifier si on lâche sur un slot d'inventaire
          const inventoryPos = this.inventorySlots.get(currentDraggedMask.id)
          if (inventoryPos) {
            const distance = Phaser.Math.Distance.Between(
              currentDraggedImage.x,
              currentDraggedImage.y,
              inventoryPos.x,
              inventoryPos.y
            )
            if (distance < 50) {
              // Placer le masque dans l'inventaire
              currentDraggedImage.x = inventoryPos.x
              currentDraggedImage.y = inventoryPos.y
              currentDraggedImage.setAlpha(1)
              currentDraggedImage.setVisible(true)
              currentDraggedMask.isPlaced = false
              currentDraggedMask.slotIndex = undefined
              currentDraggedMask.x = inventoryPos.x
              currentDraggedMask.y = inventoryPos.y
              placedInInventory = true
            }
          }

          // Si on n'a pas lâché sur l'inventaire, masquer l'image à nouveau
          if (!placedInInventory) {
            currentDraggedImage.setAlpha(0)
            currentDraggedImage.setVisible(true)
          }

          // Retirer le masque du slot du centre et rendre le slot numéroté à nouveau
          if (currentSlotIndex !== -1) {
            this.placedMasksStore.removeMaskFromSlot(currentSlotIndex)
            this.slotTexts[currentSlotIndex].setVisible(true)
            // Son de retrait de masque
            emitSound('switch')
            // Toujours mettre à jour le driller quand on retire un masque
            this.updateDrillerMask(null)
          }

          currentDraggedSlot = null
          currentDraggedImage = null
          currentDraggedMask = null
          currentSlotIndex = -1
        }
      }
    )
  }

  private setupInventoryMaskDragDrop() {
    const masks = this.masks
    const maskObjects = this.maskObjects
    const inventorySlots = this.inventorySlots
    const slots = this.slots
    const slotTexts = this.slotTexts

    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        // Chercher si c'est un masque de l'inventaire
        for (const [maskId, maskObj] of maskObjects.entries()) {
          if (maskObj.image === gameObject) {
            // Vérifier si le masque est irradié et bloqué
            if (this.irradiatedMaskId === maskId && this.radiationLockedLayers > 0) {
              // Feedback visuel (limité pour ne pas spammer)
              if (this.game.getTime() % 500 < 50) {
                this.cameras.main.shake(100, 0.005)
                emitSound('clic', { rate: 0.5 })
              }
              return
            }

            maskObj.image.x = dragX
            maskObj.image.y = dragY
          }
        }
      }
    )

    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        // Chercher quel masque est en train d'être traîné
        let draggedMask: Mask | null = null
        let draggedImage: Phaser.GameObjects.Image | null = null

        for (const [maskId, maskObj] of maskObjects.entries()) {
          if (maskObj.image === gameObject) {
            draggedMask = masks.find((m) => m.id === maskId) || null
            draggedImage = maskObj.image
            break
          }
        }

        if (!draggedMask || !draggedImage) return

        let placedInSlot = false

        // Vérifier si on lâche sur un slot du centre
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i]
          const maskBounds = draggedImage.getBounds()
          const slotBounds = slot.getBounds()
          const isOverlapping = Phaser.Geom.Rectangle.Overlaps(maskBounds, slotBounds)

          if (isOverlapping) {
            // Vérifier si le slot contient déjà un masque
            const existingMaskId = this.placedMasksStore.getMaskInSlot(i)
            if (existingMaskId && existingMaskId !== draggedMask.id) {
              // Swap : retourner l'ancien masque à l'inventaire
              const existingMask = masks.find((m) => m.id === existingMaskId)
              const existingMaskObj = maskObjects.get(existingMaskId)

              if (existingMask && existingMaskObj) {
                const existingInventoryPos = inventorySlots.get(existingMaskId) || {
                  x: this.DRILL_X,
                  y: this.DRILL_Y + 110,
                }
                existingMaskObj.image.x = existingInventoryPos.x
                existingMaskObj.image.y = existingInventoryPos.y
                existingMaskObj.image.setAlpha(1)
                existingMaskObj.image.setVisible(true)
                existingMask.isPlaced = false
                existingMask.slotIndex = undefined
                existingMask.x = existingInventoryPos.x
                existingMask.y = existingInventoryPos.y
              }
            }

            // Placer le nouveau masque dans le slot
            draggedMask.isPlaced = true
            draggedMask.slotIndex = i
            draggedMask.x = slot.x
            draggedMask.y = slot.y
            this.placedMasksStore.setMaskInSlot(i, draggedMask.id)
            slotTexts[i].setVisible(false)

            // Masquer l'image du masque
            draggedImage.setAlpha(0)

            // Son de placement de masque
            emitSound('putting-mask-on')

            // Afficher le masque sur le driller
            this.updateDrillerMask(draggedMask.dangerId)

            placedInSlot = true
            break
          }
        }

        // Si pas placé sur un slot, retourner à l'inventaire
        if (!placedInSlot) {
          if (draggedMask.isPlaced && draggedMask.slotIndex !== undefined) {
            this.placedMasksStore.removeMaskFromSlot(draggedMask.slotIndex)
            slotTexts[draggedMask.slotIndex].setVisible(true)
            this.updateDrillerMask(null)
          }

          const inventoryPos = inventorySlots.get(draggedMask.id) || {
            x: this.DRILL_X,
            y: this.DRILL_Y + 110,
          }
          draggedImage.x = inventoryPos.x
          draggedImage.y = inventoryPos.y
          draggedImage.setAlpha(1)
          draggedImage.setVisible(true)
          draggedMask.isPlaced = false
          draggedMask.slotIndex = undefined
          draggedMask.x = inventoryPos.x
          draggedMask.y = inventoryPos.y
        }
      }
    )
  }

  private updateDrillerMask(dangerId: string | null = null) {
    // Détruire le masque précédent s'il existe
    if (this.drillerMask) {
      this.drillerMask.destroy()
      this.drillerMask = null
    }

    // Trouver le premier masque placé si dangerId n'est pas fourni
    let activeDangerId = dangerId
    if (!activeDangerId) {
      const firstPlacedMask = this.masks.find((m) => m.isPlaced)
      if (firstPlacedMask) {
        activeDangerId = firstPlacedMask.dangerId
      }
    }

    // Si un masque est placé, afficher l'image du masque sur le driller
    if (activeDangerId) {
      this.drillerMask = this.add.image(
        this.DRILL_X,
        this.DRILL_Y - 80,
        `mask-driller-${activeDangerId}`
      )
      this.drillerMask.setOrigin(0.5, 0.5)
      this.drillerMask.setScale(0.7, 0.7)
      this.drillerMask.setDepth(5) // Au-dessus du driller mais sous les particules
    }
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

    // Couche actuelle
    if (this.currentLayerIndex < contract.layers.length) {
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
    }

    // Créer le RenderTexture pour le masque (même position et taille)
    // Position en profondeur avec effet de parallaxe 3D
    this.maskTexture = this.add.renderTexture(0, 0, 800, 600)
    this.maskTexture.setOrigin(0, 0)
    this.maskTexture.fill(0xffffff, 1)
    this.maskTexture.setVisible(false)
    this.maskTexture.setDepth(2) // Au-dessus du layer mais sous le drill

    // Graphics pour dessiner les trous de bruit (invisible, sert juste pour erase)
    this.noiseGraphics = this.add.graphics()
    this.noiseGraphics.setVisible(false)
    this.noiseGraphics.setDepth(2)

    // Appliquer le masque bitmap à la couche actuelle
    const mask = new Phaser.Display.Masks.BitmapMask(this, this.maskTexture)
    if (
      this.currentLayerRect instanceof Phaser.GameObjects.Rectangle ||
      this.currentLayerRect instanceof Phaser.GameObjects.Image
    ) {
      this.currentLayerRect.setMask(mask)
    }
  }

  private getLayerImageKey(layer: Layer): string {
    if (!layer.imageUrl) {
      return 'default' // Fallback, mais ne devrait pas arriver ici
    }
    // Extraire l'image et le type du chemin (ex: /img/layers-pixelated/top/top.png ou /img/layers/top/angola.jpg)
    const parts = layer.imageUrl.split('/')
    const filename = parts[parts.length - 1]
    // Supprimer l'extension (.png ou .jpg)
    const imageName = filename.replace(/\.(png|jpg|jpeg)$/, '')
    const layerType = parts[parts.length - 2]
    return `layer-${layerType}-${imageName}`
  }

  private createOilParticles() {
    // Créer un système de particules pour la terre
    this.oilParticles = this.add.particles(
      0,
      0,
      // this.driller.x + this.driller.width / 2,
      // this.driller.y + this.driller.height,
      'oil-particle',
      {
        x: 0,
        y: 0,
        lifespan: { min: 300, max: 800 },
        speed: { min: 50, max: 200 },
        angle: { min: -20, max: -160 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: 6,
        frequency: -1, // émission manuelle
        blendMode: Phaser.BlendModes.NORMAL,
        tint: 0xffffff,
      }
    )
    this.oilParticles.setDepth(10)
    this.oilParticles.emitParticleAt(200, 200)
    // Créer un système de particules pour la terre
    this.dirtParticles = this.add.particles(0, 0, 'dirt-particle', {
      x: 0,
      y: 0,
      lifespan: { min: 300, max: 800 },
      speed: { min: 50, max: 200 },
      angle: { min: -20, max: -160 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.3, end: 0.1 },
      quantity: 6,
      frequency: -1, // émission manuelle
      blendMode: Phaser.BlendModes.NORMAL,
      // tint: [0x8b4513, 0xa0522d, 0x654321], // Variation de teintes de brun
    })
    this.dirtParticles.setDepth(9)
    this.dirtParticles.emitParticleAt(200, 200)
    this.dirtBackParticles = this.add.particles(0, 0, 'dirt-particle', {
      x: 0,
      y: 0,
      lifespan: { min: 300, max: 800 },
      speed: { min: 50, max: 200 },
      angle: { min: -20, max: -160 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.3, end: 0.1 },
      quantity: 6,
      frequency: -1, // émission manuelle
      blendMode: Phaser.BlendModes.NORMAL,
      // tint: [0x8b4513, 0xa0522d, 0x654321], // Variation de teintes de brun
    })
    this.dirtBackParticles.setDepth(3)
    this.dirtBackParticles.emitParticleAt(200, 200)

    // Particules supplémentaires pour augmentation de vitesse
    this.dirtParticles2 = this.add.particles(0, 0, 'dirt-particle', {
      x: 0,
      y: 0,
      lifespan: { min: 300, max: 800 },
      speed: { min: 50, max: 200 },
      angle: { min: -20, max: -160 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.3, end: 0.1 },
      quantity: 6,
      frequency: -1, // émission manuelle
      blendMode: Phaser.BlendModes.ADD,
      tint: [0x8b4513, 0xa0522d, 0x654321], // Variation de teintes de brun
    })
    this.dirtParticles2.setDepth(9)
    this.dirtParticles2.emitParticleAt(200, 200)

    this.dirtBackParticles2 = this.add.particles(0, 0, 'dirt-particle', {
      x: 0,
      y: 0,
      lifespan: { min: 300, max: 800 },
      speed: { min: 50, max: 200 },
      angle: { min: -20, max: -160 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.3, end: 0.1 },
      quantity: 6,
      frequency: -1, // émission manuelle
      blendMode: Phaser.BlendModes.ADD,
      tint: [0x8b4513, 0xa0522d, 0x654321], // Variation de teintes de brun
    })
    this.dirtBackParticles2.setDepth(3)
    this.dirtBackParticles2.emitParticleAt(200, 200)
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
    const contract = this.gameStore.contract
    if (!contract) return ''
    const layer = contract.layers[this.currentLayerIndex]
    return `Couche ${this.currentLayerIndex + 1} - ${this.getLayerLabel(layer)}`
  }

  private shakeEffect() {
    const shakeAmount = 6
    const bodyShakeAmount = 2 // Le corps tremble moins
    const handsShakeAmount = 4 // Les mains tremblent un peu plus

    this.driller.x = this.DRILL_X + Phaser.Math.Between(-shakeAmount, shakeAmount)
    this.driller.y = this.DRILL_Y + Phaser.Math.Between(-shakeAmount, shakeAmount)
    this.drillerText.x = this.driller.x
    this.drillerText.y = this.driller.y

    // Trembler le corps du driller
    this.drillerDude.x = this.DRILL_X + Phaser.Math.Between(-bodyShakeAmount, bodyShakeAmount)
    this.drillerDude.y = this.DRILL_Y - 80 + Phaser.Math.Between(-bodyShakeAmount, bodyShakeAmount)

    // Trembler les mains du driller plus
    this.drillerDudeHands.x =
      this.DRILL_X + Phaser.Math.Between(-handsShakeAmount, handsShakeAmount)
    this.drillerDudeHands.y =
      this.DRILL_Y - 80 + Phaser.Math.Between(-handsShakeAmount, handsShakeAmount)

    // Trembler le masque si présent
    if (this.drillerMask) {
      this.drillerMask.x = this.drillerDude.x
      this.drillerMask.y = this.drillerDude.y
    }
  }

  /**
   * Changer la stratégie d'animation du cassage de couche
   * Utile pour tester différents effets visuels
   */
  public setLayerBreakAnimation(animation: LayerBreakAnimation): void {
    this.layerBreakAnimation = animation
  }

  private breakLayer() {
    emitSound('rock-crack')

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

        // TOUJOURS appliquer le malus du danger, même avec le bon masque
        this.applyDangerMalus(nextLayer.dangerId)
      }
    }

    // Gagner du pétrole pour la couche cassée
    this.gainOilForLayer(this.currentLayerIndex)

    // Passer à la couche suivante
    this.drillingProgress = 0
    this.lastNoiseStep = 0
    this.driller.x = this.DRILL_X
    this.driller.y = this.DRILL_Y
    this.drillerText.x = this.DRILL_X
    this.drillerText.y = this.DRILL_Y

    // Décrémenter le compteur d'effet acide si actif
    if (this.acidLayersRemaining > 0) {
      this.acidLayersRemaining--
      if (this.acidLayersRemaining === 0) {
        // Supprimer l'aura acide
        if (this.acidDrillerAura) {
          this.acidDrillerAura.destroy()
          this.acidDrillerAura = null
        }
      }
    }

    // Décrémenter le compteur de radiation (masque bloqué)
    if (this.radiationLockedLayers > 0) {
      this.radiationLockedLayers--
      if (this.radiationLockedLayers === 0) {
        // Débloquer le masque irradié
        if (this.irradiatedMaskId) {
          const maskObj = this.maskObjects.get(this.irradiatedMaskId)
          if (maskObj) {
            maskObj.image.clearTint()

            // Petit feedback visuel sur le masque libéré
            this.tweens.add({
              targets: maskObj.image,
              scale: 1.2,
              duration: 200,
              yoyo: true,
            })
          }
          this.irradiatedMaskId = null
        }

        emitSound('radar-ok') // Son de déblocage
      }
    }

    this.currentLayerIndex++

    if (this.currentLayerIndex >= contract.layers.length) {
      this.completeContract()
    } else {
      // this.resetMasksInSlots()

      // Sauvegarder les références avant d'appeler displayLayers
      const oldCurrentLayer = this.currentLayerRect
      this.displayLayers()
      const newCurrentLayer = this.currentLayerRect

      // Appliquer l'animation du cassage
      this.layerBreakAnimation.animate(
        this,
        oldCurrentLayer as Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
        newCurrentLayer as Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
        () => {}
      )
    }
  }

  private resetMasksInSlots() {
    // Remettre tous les masques à leur position d'inventaire
    this.masks.forEach((mask) => {
      if (mask.isPlaced && mask.slotIndex !== undefined) {
        const slotIndex = mask.slotIndex
        const slot = this.slots[slotIndex]
        const maskObj = this.maskObjects.get(mask.id)

        if (slot && this.slotTexts[slotIndex]) {
          // Réinitialiser le slot
          this.slotTexts[slotIndex].setVisible(true)

          // Supprimer du mapping slot -> masque
          this.placedMasksStore.removeMaskFromSlot(slotIndex)
        }

        // Rendre visible l'image du masque
        if (maskObj) {
          maskObj.image.setAlpha(1)
        }

        // Réinitialiser l'état du masque
        mask.isPlaced = false
        mask.slotIndex = undefined
      }
    })

    // Retirer le masque du driller
    this.updateDrillerMask(null)
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
    text.setPosition(400, 500)
    text.setDepth(20)

    // Animation de montée + fade
    this.tweens.add({
      targets: text,
      y: 375,
      alpha: 0,
      duration: 750,
      ease: 'Quad.easeIn',
      onComplete: () => {
        text.destroy()
      },
    })
  }

  private takeDamage() {
    this.lives--
    this.livesText.setText(`❤️ Vies: ${this.lives}`)
    this.cameras.main.shake(300, 0.01)
    emitSound('damage-hit')

    // Tint rouge sur le personnage pendant 0.5 secondes
    const redTint = 0xff0000
    this.drillerDude.setTint(redTint)
    this.drillerDudeHands.setTint(redTint)
    if (this.drillerMask) {
      this.drillerMask.setTint(redTint)
    }

    this.time.delayedCall(500, () => {
      this.drillerDude.clearTint()
      this.drillerDudeHands.clearTint()
      if (this.drillerMask) {
        this.drillerMask.clearTint()
      }
    })

    if (this.lives <= 0) {
      this.failContract()
    }
  }

  private stopDrillingSounds() {
    this.drillBaseSound?.stop()
    this.drillBgSound?.stop()
    this.drillBg2Sound?.stop()
  }

  private failContract() {
    // Perte de reconnaissance
    this.engineStore.removeRecognition(20)

    // Arrêter les sons de forage et jouer le son d'échec
    this.stopDrillingSounds()
    emitSound('radiation')

    // Nettoyer les nuages toxiques
    this.toxicClouds.forEach((cloudData: any) => {
      cloudData.image.destroy()
    })
    this.toxicClouds = []
    this.cameras.main.removePostPipeline('Invert')

    // Détruire le bouton de test
    if (this.nextLayerButton) {
      this.nextLayerButton.destroy()
    }

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

      // Marquer le pays comme complété
      this.engineStore.completeCountry(contract.title)

      // Arrêter les sons de forage et jouer le son de succès
      this.stopDrillingSounds()
      emitSound('radar-ok')

      // Nettoyer les nuages toxiques
      this.toxicClouds.forEach((cloud) => cloud.image.destroy())
      this.toxicClouds = []
      this.cameras.main.removePostPipeline('Invert')

      // Détruire le bouton de test
      if (this.nextLayerButton) {
        this.nextLayerButton.destroy()
      }

      const successText = this.add.text(
        400,
        300,
        `Contrat terminé !\n+${contract.oil} barils\n+10 reconnaissance`,
        {
          fontSize: '32px',
          color: '#0d676c',
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

  /**
   * Applique le malus d'un danger spécifique
   */
  private applyDangerMalus(dangerId: string) {
    // Marquer ce malus comme actif
    this.activeMalus.add(dangerId)

    switch (dangerId) {
      case '1': // Toxique - Renversement de couleur sur les prochaines couches
        this.applyToxicMalus()
        break
      case '2': // Explosion - UI éclatée
        this.applyExplosionMalus()
        break
      case '3': // Radiation - Masques deviennent blancs
        this.applyRadiationMalus()
        break
      case '4': // Acide - Drill peut casser instantanément une couche
        this.applyAcidMalus()
        break
      case '5': // Flammable - Masques calcinés (noir)
        this.applyFlammableMalus()
        break
      case '6': // Bio-hazard - Masques inutilisables temporairement
        this.applyBioHazardMalus()
        break
    }
  }

  /**
   * Malus Toxique: Crée des nuages de gaz toxique qui inversent les couleurs
   */
  private applyToxicMalus() {
    console.log('🧪 MALUS TOXIQUE: Nuages toxiques!')

    // Afficher un message visuel
    const malusText = this.add.text(400, 200, '🧪 TOXIQUE: Nuages toxiques!', {
      fontSize: '24px',
      color: '#9933ff',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
      align: 'center',
    })
    malusText.setOrigin(0.5, 0.5)
    malusText.setDepth(25)

    // Faire disparaître le texte après 2 secondes
    this.tweens.add({
      targets: malusText,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        malusText.destroy()
      },
    })

    // Activer le PostFX sur la caméra
    this.cameras.main.setPostPipeline('Invert')

    // Créer plusieurs nuages de gaz toxique avec shader d'inversion
    // On crée plus de nuages (50) de tailles variées pour un effet de fumée dense
    const cloudCount = 50

    for (let i = 0; i < cloudCount; i++) {
      const x = Phaser.Math.Between(0, 800)
      const y = Phaser.Math.Between(50, 550)
      // Taille variée : beaucoup de petits, quelques gros
      const isBig = Math.random() > 0.7
      const radius = isBig ? Phaser.Math.Between(80, 120) : Phaser.Math.Between(30, 60)

      // Créer une RenderTexture pour le nuage (invisible, sert de repère)
      const rt = this.add.renderTexture(x, y, radius * 2, radius * 2)

      // Dessiner un cercle blanc dans la RenderTexture (nuage)
      const graphics = this.make.graphics({ x: 0, y: 0 })
      graphics.fillStyle(0xffffff, 1)
      graphics.fillCircle(radius, radius, radius)

      // Dessiner le cercle dans la RenderTexture
      rt.draw(graphics)
      graphics.destroy()

      rt.setOrigin(0.5, 0.5)
      rt.setPosition(x, y)
      rt.setDepth(15)
      rt.setAlpha(0.01) // Presque invisible mais interactif
      rt.setInteractive({ useHandCursor: true })

      rt.on('pointerdown', () => {
        emitSound('short-gaz-leak', { volume: 0.5 })

        // Retirer du tableau
        const index = this.toxicClouds.findIndex((c) => c.image === rt)
        if (index > -1) {
          this.toxicClouds.splice(index, 1)
        }

        // Détruire l'objet
        rt.destroy()
      })

      // Stocker les infos du nuage
      this.toxicClouds.push({
        image: rt,
        x,
        y,
        radius,
      })

      // Animer le nuage pour qu'il flotte lentement
      // Mouvements asynchrones pour un aspect organique
      this.tweens.add({
        targets: rt,
        x: x + Phaser.Math.Between(-150, 150),
        y: y + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      })

      // Pulsation de taille (via le rayon dans le shader, simulé ici par scale qui sera ignoré par le shader actuel
      // mais on pourrait modifier radius dynamiquement dans update si besoin. Pour l'instant on bouge juste x/y)
    }
  }

  /**
   * Malus Explosion: Fait exploser l'UI et disperse les masques aléatoirement
   */
  private applyExplosionMalus() {
    console.log('💥 MALUS EXPLOSION: Masques dispersés!')
    emitSound('explosion')

    // Afficher un message visuel
    const malusText = this.add.text(400, 200, '💥 EXPLOSION: Masques dispersés!', {
      fontSize: '24px',
      color: '#ff6600',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
      align: 'center',
    })
    malusText.setOrigin(0.5, 0.5)
    malusText.setDepth(25)

    // Faire disparaître le texte après 2 secondes
    this.tweens.add({
      targets: malusText,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        malusText.destroy()
      },
    })

    // Shake de la caméra pour l'effet d'explosion
    this.cameras.main.shake(500, 0.02)

    // Disperser les slots d'inventaire
    this.inventorySlotObjects.forEach((slot, maskId) => {
      // Rendre le slot interactif pour pouvoir le remettre en place
      slot.setInteractive({ draggable: true, useHandCursor: true })

      // Position aléatoire sur l'écran (zone plus large pour l'explosion)
      const randomX = Phaser.Math.Between(100, 700)
      const randomY = Phaser.Math.Between(100, 500) // Plus bas pour ne pas gêner le header

      // Mettre à jour la position cible du slot
      const inventoryPos = this.inventorySlots.get(maskId)
      if (inventoryPos) {
        inventoryPos.x = randomX
        inventoryPos.y = randomY
      }

      // Animer le slot
      this.tweens.add({
        targets: slot,
        x: randomX,
        y: randomY,
        angle: Phaser.Math.Between(-45, 45), // Rotation du slot aussi
        duration: 500,
        ease: 'Back.easeOut',
      })

      // Si le masque associé est dans l'inventaire (pas placé), il suit le slot
      const mask = this.masks.find((m) => m.id === maskId)
      if (mask && !mask.isPlaced) {
        const maskObj = this.maskObjects.get(maskId)
        if (maskObj) {
          // Animer le masque vers sa nouvelle position (celle du slot)
          this.tweens.add({
            targets: maskObj.image,
            x: randomX,
            y: randomY,
            angle: Phaser.Math.Between(-30, 30),
            duration: 500,
            ease: 'Back.easeOut',
          })

          // Mettre à jour la position logique du masque
          mask.x = randomX
          mask.y = randomY
        }
      }
    })
  }

  /**
   * Malus Radiation: Irradie les masques et les rend blancs (perte de couleur)
   */
  private applyRadiationMalus() {
    console.log('☢️ MALUS RADIATION: Masques irradiés!')

    // Afficher un message visuel
    const malusText = this.add.text(400, 200, '☢️ RADIATION: Masques irradiés!', {
      fontSize: '24px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
      align: 'center',
    })
    malusText.setOrigin(0.5, 0.5)
    malusText.setDepth(25)

    // Faire disparaître le texte après 2 secondes
    this.tweens.add({
      targets: malusText,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        malusText.destroy()
      },
    })

    // Trouver le masque équipé
    const equippedMask = this.masks.find((m) => m.isPlaced)

    if (equippedMask) {
      this.radiationLockedLayers = 5
      this.irradiatedMaskId = equippedMask.id

      // Ejecter le masque vers l'inventaire
      if (equippedMask.slotIndex !== undefined) {
        const slotIndex = equippedMask.slotIndex
        this.placedMasksStore.removeMaskFromSlot(slotIndex)
        this.slotTexts[slotIndex].setVisible(true)
        equippedMask.isPlaced = false
        equippedMask.slotIndex = undefined
      }

      this.updateDrillerMask(null)

      // Animer le retour à l'inventaire
      const maskObj = this.maskObjects.get(equippedMask.id)
      const inventoryPos = this.inventorySlots.get(equippedMask.id)

      if (maskObj && inventoryPos) {
        // Rendre visible (au cas où)
        maskObj.image.setAlpha(1)
        maskObj.image.setVisible(true)
        maskObj.image.setTint(0x00ff00) // Vert fluo

        // Animation
        this.tweens.add({
          targets: maskObj.image,
          x: inventoryPos.x,
          y: inventoryPos.y,
          duration: 500,
          ease: 'Back.easeOut',
        })

        // Update logique pos
        equippedMask.x = inventoryPos.x
        equippedMask.y = inventoryPos.y
      }

      emitSound('radiation')
    } else {
      // Si aucun masque n'est porté, pas de malus spécifique (ou dégâts ?)
      // Pour l'instant on ne fait rien
    }
  }

  /**
   * Malus Acide: Le drill devient acide et fore 10x plus vite pendant 2 couches
   */
  private applyAcidMalus() {
    console.log('🧪 MALUS ACIDE: Forage ultra-rapide!')

    // Afficher un message visuel
    const malusText = this.add.text(400, 200, '🧪 ACIDE: Forage 10x plus rapide!', {
      fontSize: '24px',
      color: '#ccff00',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
      align: 'center',
    })
    malusText.setOrigin(0.5, 0.5)
    malusText.setDepth(25)

    // Faire disparaître le texte après 2 secondes
    this.tweens.add({
      targets: malusText,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        malusText.destroy()
      },
    })

    // Activer l'effet acide pour les 2 prochaines couches
    this.acidLayersRemaining = 2

    // Créer une aura acide autour du drill
    if (this.acidDrillerAura) {
      this.acidDrillerAura.destroy()
    }

    this.acidDrillerAura = this.add.image(this.driller.x, this.driller.y, this.driller.texture.key)
    this.acidDrillerAura.setOrigin(0.5, 0.5)
    this.acidDrillerAura.setScale(this.driller.scaleX + 0.1, this.driller.scaleY + 0.1)
    this.acidDrillerAura.setTint(0x88ff00)
    this.acidDrillerAura.setAlpha(0.8)
    this.acidDrillerAura.setDepth(this.driller.depth - 1)

    // Animation de pulsation
    this.tweens.add({
      targets: this.acidDrillerAura,
      scaleX: this.driller.scaleX + 0.15,
      scaleY: this.driller.scaleY + 0.15,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    })

    emitSound('malus/acid') // Si le son existe, sinon generic
  }

  /**
   * Malus Flammable: Brûle tous les masques et les rend calcinés (noir)
   */
  private applyFlammableMalus() {
    console.log('🔥 MALUS FLAMMABLE: Masques calcinés!')

    // Afficher un message visuel
    const malusText = this.add.text(400, 200, '🔥 FLAMMABLE: Masques brûlés!', {
      fontSize: '24px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
      align: 'center',
    })
    malusText.setOrigin(0.5, 0.5)
    malusText.setDepth(25)

    // Faire disparaître le texte après 2 secondes
    this.tweens.add({
      targets: malusText,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        malusText.destroy()
      },
    })

    // Appliquer un tint noir à tous les masques pour les calciner
    this.maskObjects.forEach((maskObj) => {
      maskObj.image.setTint(0x222222) // Gris très foncé (presque noir)

      // Animation de flammes avec effet de scale
      this.tweens.add({
        targets: maskObj.image,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        yoyo: true,
        repeat: 3,
      })
    })
  }

  /**
   * Malus Bio-hazard: Masques contaminés deviennent inutilisables temporairement
   */
  private applyBioHazardMalus() {
    console.log('☣️ MALUS BIO-HAZARD: Masques contaminés!')

    // Afficher un message visuel
    const malusText = this.add.text(400, 200, '☣️ BIO-HAZARD: Masques contaminés!', {
      fontSize: '24px',
      color: '#00ffff',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
      align: 'center',
    })
    malusText.setOrigin(0.5, 0.5)
    malusText.setDepth(25)

    // Faire disparaître le texte après 2 secondes
    this.tweens.add({
      targets: malusText,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        malusText.destroy()
      },
    })

    // Rendre tous les masques non-draggable pendant 5 secondes
    this.maskObjects.forEach((maskObj) => {
      maskObj.image.disableInteractive()

      // Appliquer un effet visuel de contamination (tint cyan + transparence)
      maskObj.image.setTint(0x00ffff)
      maskObj.image.setAlpha(0.5)

      // Animation de pulsation pour montrer la contamination
      this.tweens.add({
        targets: maskObj.image,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: 9, // 5 secondes total (500ms * 2 * 10 / 1000)
      })
    })

    // Rendre les slots du centre également non-draggable
    this.slots.forEach((slot) => {
      slot.disableInteractive()
    })

    // Réactiver les masques et slots après 5 secondes
    this.time.delayedCall(5000, () => {
      this.maskObjects.forEach((maskObj) => {
        maskObj.image.setInteractive({ draggable: true, useHandCursor: true })
        maskObj.image.setAlpha(1)
      })

      this.slots.forEach((slot) => {
        slot.setInteractive({ draggable: true, useHandCursor: true })
      })

      console.log('☣️ Bio-hazard terminé - masques réactivés')
    })
  }
}

export default GameState
