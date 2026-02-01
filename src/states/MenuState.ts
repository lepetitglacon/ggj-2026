import Phaser from 'phaser'
import { useEngineStore } from '../store/engine'
import { preloadSounds, emitSound } from '../listeners/sound.listener'

export class MenuState extends Phaser.Scene {
  constructor() {
    super({ key: 'menu' })
  }

  init() {
    // Synchroniser avec le store Pinia
    const engineStore = useEngineStore()
    engineStore.changeState('menu')
  }

  preload() {
    // Load any assets needed for preloader here
    this.load.image('main-menu', 'img/menu/bg.avif')
    preloadSounds(this)
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e')

    const image = this.add.image(0, 0, 'main-menu')
    image.setOrigin(0.5, 0.5)
    image.setPosition(800 / 2, 600 / 2)
    image.setScale(1.5)

    // Titre du menu
    const title = this.add.text(400, 200, 'Drilling', {
      fontSize: '48px',
      color: '#000000',
    })
    title.setOrigin(0.5, 0.5)
    title.setPosition(800 / 2 + 150, 600 / 2 - 100)

    // Bouton pour aller au contrat
    const contractButton = this.add.rectangle(title.x, 450, 200, 60, 0x0066cc)
    contractButton.setInteractive({ useHandCursor: true })

    const contractText = this.add.text(400, 350, 'Contrats', {
      fontSize: '24px',
      color: '#ffffff',
    })
    contractText.setOrigin(0.5, 0.5)
    contractText.setPosition(contractButton.x, contractButton.y)

    contractButton.on('pointerdown', () => {
      emitSound('clic')
      this.scene.start('contract')
    })

    contractButton.on('pointerover', () => {
      contractButton.setFillStyle(0x0055aa)
    })

    contractButton.on('pointerout', () => {
      contractButton.setFillStyle(0x0066cc)
    })
  }
}
