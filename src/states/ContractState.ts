import Phaser from 'phaser'
import { useEngineStore } from '../store/engine'
import { useContractsStore, type Contract } from '../store/contracts'
import { useStoreStore } from '../store/store'
import { useInventoryStore } from '../store/inventory.store'
import { dangers, getDangerById, dangersByRecognitionLevel, type DangerKey } from '../data/dangers.ts'
import { generateLayers } from '../data/layers'
import { locations, projectCoordinates } from '../data/locations'

export class ContractState extends Phaser.Scene {
  private worldImage!: Phaser.GameObjects.Image
  private contractsStore = useContractsStore()

  constructor() {
    super({ key: 'contract' })
  }

  init() {
    // Synchroniser avec le store Pinia
    const engineStore = useEngineStore()
    engineStore.changeState('contract')
  }

  preload() {
    this.load.image('world', 'img/world_pixelated.jpg')

    // Précharger les icônes des dangers
    dangers.forEach((danger) => {
      this.load.image(`danger-${danger.id}`, danger.icon)
    })

    // Précharger toutes les images de couches
    const normalImages = ['1', '2', '3', '4']

    this.load.image('layer-top-top', 'img/layers-pixelated/top/top.png')

    normalImages.forEach((img) => {
      this.load.image(`layer-normal-${img}`, `img/layers-pixelated/normal/${img}.png`)
    })
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a1a')

    // Afficher les infos de niveau en haut
    this.displayLevelInfo()

    // Afficher l'image du monde
    this.worldImage = this.add.image(400, 300, 'world')

    // Ajuster la taille de l'image pour qu'elle s'adapte
    const scaleX = 700 / this.worldImage.width
    const scaleY = 500 / this.worldImage.height
    const scale = Math.min(scaleX, scaleY)
    this.worldImage.setScale(scale)
    this.worldImage.setPosition(400, 320)

    // Générer des contrats aléatoires et les mettre dans le store
    this.generateContracts()

    // Afficher les marqueurs de contrats
    this.displayContractMarkers()

    // Afficher le marqueur du magasin
    this.displayStoreMarker()
  }

  private generateContracts() {
    const numContracts = 15
    const contracts: Contract[] = []
    const engineStore = useEngineStore()

    // Mélanger les lieux pour avoir des destinations aléatoires mais cohérentes
    const shuffledLocations = [...locations].sort(() => Math.random() - 0.5)

    for (let i = 0; i < numContracts; i++) {
      const location = shuffledLocations[i % shuffledLocations.length]
      
      const coords = projectCoordinates(
        location.lat, 
        location.lon, 
        400, // Center X
        320, // Center Y
        this.worldImage.displayWidth, 
        this.worldImage.displayHeight
      )

      // Générer les dangers connus pour ce contrat
      // Niveau 0 (tutoriel) = exactement 2 dangers, sinon 1-3 aléatoire
      const recognitionTier = engineStore.getRecognitionTier()
      const dangerCount = recognitionTier === 0 ? 2 : Math.floor(Math.random() * 3) + 1

      // Obtenir les dangers disponibles pour ce niveau
      const availableDangers = dangersByRecognitionLevel[recognitionTier as 0 | 1 | 2 | 3]
      const knownDangers = this.getRandomDangers(
        [...availableDangers],
        dangerCount
      )

      const contract: Contract = {
        id: i + 1,
        title: location.name,
        oil: Math.floor(Math.random() * 5000) + 1000,
        minSteps: Math.floor(Math.random() * 8) + 3,
        knownDangers,
        layers: generateLayers(recognitionTier, knownDangers),
        x: coords.x,
        y: coords.y,
        recognitionLevel: recognitionTier,
      }

      contracts.push(contract)
    }

    this.contractsStore.setContracts(contracts)
  }

  private getRandomDangers(dangerKeys: DangerKey[], count: number): DangerKey[] {
    const shuffled = [...dangerKeys].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, dangerKeys.length))
  }

  private displayContractMarkers() {
    this.contractsStore.contracts.forEach((contract) => {
      // Créer un marqueur pour chaque contrat
      const marker = this.add.circle(contract.x, contract.y, 8, 0xff0000)
      marker.setStrokeStyle(2, 0xffff00)
      marker.setInteractive({ useHandCursor: true })

      // Afficher les étoiles du niveau de reconnaissance
      const starsText = this.getStarsForLevel(contract.recognitionLevel)
      const starsLabel = this.add.text(contract.x, contract.y - 15, starsText, {
        fontSize: '12px',
        color: '#ffff00',
        fontStyle: 'bold',
      })
      starsLabel.setOrigin(0.5, 1)

      // Ajouter un effet de pulsation
      this.tweens.add({
        targets: marker,
        scale: 1.3,
        alpha: 0.7,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      })

      // Clic sur le marqueur - ouvre le menu Vue
      marker.on('pointerdown', () => {
        this.contractsStore.selectContract(contract)
      })

      // Survol
      marker.on('pointerover', () => {
        marker.setFillStyle(0xffff00)
        this.showContractTooltip(contract)
      })

      marker.on('pointerout', () => {
        marker.setFillStyle(0xff0000)
        this.hideContractTooltip()
      })
    })
  }

  private getStarsForLevel(level: number): string {
    if (level === 0) return 'TUTO'
    return '★'.repeat(level)
  }

  private showContractTooltip(contract: Contract) {
    // Afficher un tooltip simple avec le titre
    const tooltip = this.add.text(contract.x, contract.y - 20, contract.title, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 4 },
    })
    tooltip.setOrigin(0.5, 1)
    tooltip.setName('tooltip')
  }

  private hideContractTooltip() {
    const tooltip = this.children.getByName('tooltip')
    if (tooltip) {
      tooltip.destroy()
    }
  }

  private displayLevelInfo() {
    const engineStore = useEngineStore()
    const inventoryStore = useInventoryStore()

    const recognitionLevel = engineStore.getRecognitionTier() as 0 | 1 | 2 | 3
    const potentialDangers = dangersByRecognitionLevel[recognitionLevel]

    // --- À GAUCHE: Niveau d'accréditation ---
    this.add.text(20, 10, '📋 Niveau d\'Accréditation', {
      fontSize: '14px',
      color: '#ffaa00',
      fontStyle: 'bold',
    })

    // Afficher les dangers du niveau actuel avec leurs icônes
    let dangerY = 35
    potentialDangers.forEach((dangerId) => {
      const danger = getDangerById(dangerId)
      if (danger) {
        // Afficher l'icône (16x16)
        const icon = this.add.image(25, dangerY, `danger-${danger.id}`)
        icon.setDisplaySize(16, 16)

        // Afficher le label à côté
        this.add.text(40, dangerY, danger.label, {
          fontSize: '12px',
          color: '#ffaa00',
        })
          .setOrigin(0, 0.5)

        dangerY += 18
      }
    })

    // --- À DROITE: Masques Possédés ---
    const maskTitle = this.add.text(800, 10, '🛡️ Masques Possédés', {
      fontSize: '14px',
      color: '#ffaa00',
      fontStyle: 'bold',
      align: 'right',
    })
    maskTitle.setOrigin(1, 0)

    // Afficher les masques possédés
    let maskY = 35
    inventoryStore.ownedMasks.forEach((maskId) => {
      const danger = getDangerById(maskId)
      if (danger) {
        // Créer un petit carré coloré + nom
        const maskBox = this.add.rectangle(785, maskY, 12, 12, danger.color)
        maskBox.setOrigin(0.5, 0.5)

        this.add.text(770, maskY, danger.label, {
          fontSize: '12px',
          color: '#ffaa00',
          align: 'right',
        })
          .setOrigin(1, 0.5)

        maskY += 18
      }
    })
  }

  private displayStoreMarker() {
    const storeStore = useStoreStore()

    // Position du marqueur du magasin (Groenland)
    const greenlandCoords = projectCoordinates(
      72.0, // Latitude Groenland
      -40.0, // Longitude Groenland
      400, // Center X
      320, // Center Y
      this.worldImage.displayWidth,
      this.worldImage.displayHeight
    )
    const storeX = greenlandCoords.x
    const storeY = greenlandCoords.y

    // Créer un marqueur spécial pour le magasin
    const storeMarker = this.add.circle(storeX, storeY, 12, 0xffaa00)
    storeMarker.setStrokeStyle(3, 0xffff00)
    storeMarker.setInteractive({ useHandCursor: true })

    // Ajouter une icône de magasin
    const storeIcon = this.add.text(storeX, storeY, '🛒', {
      fontSize: '24px',
    })
    storeIcon.setOrigin(0.5, 0.5)
    storeIcon.setInteractive({ useHandCursor: true })

    // Ajouter un effet de pulsation
    this.tweens.add({
      targets: [storeMarker, storeIcon],
      scale: 1.2,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
    })

    // Clic sur le marqueur - ouvre le magasin
    const openStore = () => {
      storeStore.openStore()
    }

    storeMarker.on('pointerdown', openStore)
    storeIcon.on('pointerdown', openStore)

    // Survol
    const showStoreTooltip = () => {
      storeMarker.setFillStyle(0xffff00)
      const tooltip = this.add.text(storeX, storeY - 30, 'Magasin', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 6 },
      })
      tooltip.setOrigin(0.5, 1)
      tooltip.setName('store-tooltip')
    }

    const hideStoreTooltip = () => {
      storeMarker.setFillStyle(0xffaa00)
      const tooltip = this.children.getByName('store-tooltip')
      if (tooltip) {
        tooltip.destroy()
      }
    }

    storeMarker.on('pointerover', showStoreTooltip)
    storeMarker.on('pointerout', hideStoreTooltip)
    storeIcon.on('pointerover', showStoreTooltip)
    storeIcon.on('pointerout', hideStoreTooltip)
  }
}
