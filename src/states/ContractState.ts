import Phaser from 'phaser'
import { useEngineStore } from '../store/engine'
import { useContractsStore, type Contract } from '../store/contracts'
import { useGameStore } from '../store/game.store'
import { dangers, type DangerKey } from '../data/dangers.ts'
import { generateLayers } from '../data/layers'

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
    this.load.image('world', '/img/world.jpg')
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a1a')

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
  }

  private generateContracts() {
    const contractTitles = [
      'Golfe Persique',
      'Mer du Nord',
      'Alaska',
      'Venezuela',
      'Nigeria',
      'Sibérie',
      'Texas',
      'Arabie Saoudite',
      'Canada',
      'Mer Caspienne',
    ]

    const numContracts = 8
    const contracts: Contract[] = []
    const gameStore = useGameStore()

    for (let i = 0; i < numContracts; i++) {
      const worldBounds = {
        x: 400 - this.worldImage.displayWidth / 2,
        y: 320 - this.worldImage.displayHeight / 2,
        width: this.worldImage.displayWidth,
        height: this.worldImage.displayHeight,
      }

      // Générer les dangers connus pour ce contrat
      const knownDangers = this.getRandomDangers(
        dangers.map((d) => d.id),
        Math.floor(Math.random() * 3) + 1
      )

      const contract: Contract = {
        id: i + 1,
        title: contractTitles[i % contractTitles.length] + ` #${i + 1}`,
        oil: Math.floor(Math.random() * 5000) + 1000,
        minSteps: Math.floor(Math.random() * 8) + 3,
        knownDangers,
        layers: generateLayers(gameStore.recognitionLevel, knownDangers),
        x: worldBounds.x + Math.random() * worldBounds.width,
        y: worldBounds.y + Math.random() * worldBounds.height,
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
}
