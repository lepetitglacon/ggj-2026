import Phaser from 'phaser'
import { emitSound } from '../listeners/sound.listener'

export interface DialogueConfig {
  scene: Phaser.Scene
  characterName: string
  characterImage: string
  text: string
  onClose?: () => void
}

export class DialogueBox {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private onCloseCallback?: () => void

  constructor(config: DialogueConfig) {
    this.scene = config.scene
    this.onCloseCallback = config.onClose
    this.container = this.createDialogue(config)
  }

  private createDialogue(config: DialogueConfig): Phaser.GameObjects.Container {
    const { scene, characterName, characterImage, text } = config
    const width = 800
    const height = 600

    // Create container for all dialogue elements
    const container = scene.add.container(0, 0)
    container.setDepth(1000)

    // Semi-transparent overlay
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
    overlay.setInteractive({ useHandCursor: true })
    container.add(overlay)

    // Dialogue panel dimensions
    const panelWidth = 700
    const panelHeight = 180
    const panelX = width / 2
    const panelY = height - panelHeight / 2 - 40

    // Panel background
    const panelBg = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e)
    panelBg.setStrokeStyle(4, 0xf39c12)
    container.add(panelBg)

    // Inner glow effect
    const innerGlow = scene.add.rectangle(panelX, panelY, panelWidth - 8, panelHeight - 8, 0x16213e)
    innerGlow.setStrokeStyle(2, 0xf39c12, 0.3)
    container.add(innerGlow)

    // Character image (right side)
    const imageSize = 130
    const imageX = panelX + panelWidth / 2 - imageSize / 2 - 20
    const imageY = panelY

    // Image circle border
    const imageBorder = scene.add.circle(imageX, imageY, imageSize / 2 + 5, 0xf39c12)
    container.add(imageBorder)

    // Character image
    const charImage = scene.add.image(imageX, imageY, characterImage)
    charImage.setDisplaySize(imageSize, imageSize)

    // Create circular mask for the image
    const maskShape = scene.make.graphics({})
    maskShape.fillStyle(0xffffff)
    maskShape.fillCircle(imageX, imageY, imageSize / 2)
    const mask = maskShape.createGeometryMask()
    charImage.setMask(mask)
    container.add(charImage)

    // Text area dimensions
    const textAreaX = panelX - panelWidth / 2 + 30
    const textAreaWidth = panelWidth - imageSize - 80

    // Character name
    const nameText = scene.add.text(textAreaX, panelY - 60, characterName, {
      fontSize: '22px',
      color: '#f39c12',
      fontStyle: 'bold',
    })
    container.add(nameText)

    // Dialogue text with word wrap
    const dialogueText = scene.add.text(textAreaX, panelY - 30, text, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: textAreaWidth },
      lineSpacing: 6,
    })
    container.add(dialogueText)

    // "Click to continue" hint
    const hintText = scene.add.text(panelX, panelY + panelHeight / 2 - 20, 'Cliquez pour continuer...', {
      fontSize: '12px',
      color: '#888888',
      fontStyle: 'italic',
    })
    hintText.setOrigin(0.5, 0.5)
    container.add(hintText)

    // Blinking animation for hint
    scene.tweens.add({
      targets: hintText,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
    })

    // Slide-in animation
    container.setAlpha(0)
    container.y = 50
    scene.tweens.add({
      targets: container,
      alpha: 1,
      y: 0,
      duration: 300,
      ease: 'Power2',
    })

    // Close on click
    overlay.on('pointerdown', () => this.close())

    return container
  }

  close() {
    emitSound('clic')

    // Fade out animation
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: 30,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.container.destroy()
        if (this.onCloseCallback) {
          this.onCloseCallback()
        }
      },
    })
  }

  isOpen(): boolean {
    return this.container && this.container.active
  }
}

// Helper function to show dialogue
export function showDialogue(config: DialogueConfig): DialogueBox {
  return new DialogueBox(config)
}
