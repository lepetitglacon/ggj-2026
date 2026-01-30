import Phaser from 'phaser'
import { useEngineStore } from '../store/engine'

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
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e')

    // Titre du menu
    const title = this.add.text(400, 200, 'Menu Principal', {
      fontSize: '48px',
      color: '#00ff00',
    })
    title.setOrigin(0.5, 0.5)

    // Bouton pour aller au contrat
    const contractButton = this.add.rectangle(400, 350, 200, 60, 0x0066cc)
    contractButton.setInteractive({ useHandCursor: true })

    const contractText = this.add.text(400, 350, 'Contrats', {
      fontSize: '24px',
      color: '#ffffff',
    })
    contractText.setOrigin(0.5, 0.5)

    contractButton.on('pointerdown', () => {
      this.scene.start('contract')
    })

    contractButton.on('pointerover', () => {
      contractButton.setFillStyle(0x0055aa)
    })

    contractButton.on('pointerout', () => {
      contractButton.setFillStyle(0x0066cc)
    })

    // Bouton pour aller au jeu
    const gameButton = this.add.rectangle(400, 450, 200, 60, 0x00cc00)
    gameButton.setInteractive({ useHandCursor: true })

    const gameText = this.add.text(400, 450, 'Démarrer le jeu', {
      fontSize: '24px',
      color: '#000000',
    })
    gameText.setOrigin(0.5, 0.5)

    gameButton.on('pointerdown', () => {
      this.scene.start('game')
    })

    gameButton.on('pointerover', () => {
      gameButton.setFillStyle(0x00aa00)
    })

    gameButton.on('pointerout', () => {
      gameButton.setFillStyle(0x00cc00)
    })
  }
}
