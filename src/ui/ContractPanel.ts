import Phaser from 'phaser'
import { useContractsStore, type Contract } from '../store/contracts'
import { useEngineStore } from '../store/engine'
import { useGameStore } from '../store/game.store'
import { useInventoryStore } from '../store/inventory.store'
import { getDangerById, type DangerKey } from '../data/dangers'
import { emitSound } from '../listeners/sound.listener'

export class ContractPanel {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private contract: Contract
  private onClose?: () => void

  constructor(scene: Phaser.Scene, contract: Contract, onClose?: () => void) {
    this.scene = scene
    this.contract = contract
    this.onClose = onClose
    this.container = this.createPanel()
  }

  private createPanel(): Phaser.GameObjects.Container {
    const { scene, contract } = this
    const width = 800
    const height = 600
    const panelWidth = 500
    const panelHeight = 480

    const container = scene.add.container(0, 0)
    container.setDepth(500)

    // Overlay sombre
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
    overlay.setInteractive()
    container.add(overlay)

    // Panel principal
    const panelX = width / 2
    const panelY = height / 2
    const panel = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0a0a1a)
    panel.setStrokeStyle(3, 0x00ffff)
    container.add(panel)

    // Bordure intérieure
    const innerPanel = scene.add.rectangle(panelX, panelY, panelWidth - 10, panelHeight - 10, 0x1a1a3a)
    innerPanel.setStrokeStyle(1, 0x00ffff, 0.3)
    container.add(innerPanel)

    let currentY = panelY - panelHeight / 2 + 30

    // Titre du contrat
    const title = scene.add.text(panelX, currentY, contract.title, {
      fontSize: '28px',
      color: '#00ffff',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5, 0)
    container.add(title)
    currentY += 40

    // Niveau (TUTORIEL ou étoiles)
    const levelText = contract.recognitionLevel === 0
      ? 'TUTORIEL'
      : '★'.repeat(contract.recognitionLevel)
    const levelColor = contract.recognitionLevel === 0 ? '#00ff00' : '#ffff00'
    const level = scene.add.text(panelX, currentY, levelText, {
      fontSize: '18px',
      color: levelColor,
      fontStyle: 'bold',
    })
    level.setOrigin(0.5, 0)
    container.add(level)
    currentY += 35

    // Info: Pétrole et Étapes
    const infoStartX = panelX - panelWidth / 2 + 30
    const infoWidth = (panelWidth - 80) / 2

    // Pétrole
    const oilBg = scene.add.rectangle(infoStartX + infoWidth / 2, currentY + 20, infoWidth, 40, 0x000000, 0.3)
    oilBg.setStrokeStyle(2, 0xffff00, 0.5)
    container.add(oilBg)
    const oilLabel = scene.add.text(infoStartX + 10, currentY + 10, 'Pétrole:', { fontSize: '14px', color: '#aaaaaa' })
    container.add(oilLabel)
    const oilValue = scene.add.text(infoStartX + infoWidth - 10, currentY + 25, `${contract.oil} barils`, {
      fontSize: '16px',
      color: '#ffff00',
      fontStyle: 'bold',
    })
    oilValue.setOrigin(1, 0.5)
    container.add(oilValue)

    // Étapes
    const stepsStartX = infoStartX + infoWidth + 20
    const stepsBg = scene.add.rectangle(stepsStartX + infoWidth / 2, currentY + 20, infoWidth, 40, 0x000000, 0.3)
    stepsBg.setStrokeStyle(2, 0x00ff00, 0.5)
    container.add(stepsBg)
    const stepsLabel = scene.add.text(stepsStartX + 10, currentY + 10, 'Couches:', { fontSize: '14px', color: '#aaaaaa' })
    container.add(stepsLabel)
    const stepsValue = scene.add.text(stepsStartX + infoWidth - 10, currentY + 25, `${contract.layers.length}`, {
      fontSize: '16px',
      color: '#00ff00',
      fontStyle: 'bold',
    })
    stepsValue.setOrigin(1, 0.5)
    container.add(stepsValue)
    currentY += 55

    // Section Dangers
    const dangersBg = scene.add.rectangle(panelX, currentY + 60, panelWidth - 40, 100, 0x330000, 0.3)
    dangersBg.setStrokeStyle(2, 0xff6666)
    container.add(dangersBg)

    const dangersTitle = scene.add.text(infoStartX, currentY + 20, 'Dangers connus:', {
      fontSize: '16px',
      color: '#ff6666',
      fontStyle: 'bold',
    })
    container.add(dangersTitle)

    // Afficher les icônes des dangers
    let dangerX = infoStartX + 20
    const dangerY = currentY + 70
    contract.knownDangers.forEach((dangerId: DangerKey) => {
      const danger = getDangerById(dangerId)
      if (danger) {
        const dangerIcon = scene.add.image(dangerX, dangerY, `danger-${dangerId}`)
        dangerIcon.setDisplaySize(32, 32)
        container.add(dangerIcon)

        const dangerLabel = scene.add.text(dangerX + 22, dangerY, danger.label, {
          fontSize: '12px',
          color: '#ff9999',
        })
        dangerLabel.setOrigin(0, 0.5)
        container.add(dangerLabel)

        dangerX += 120
      }
    })
    currentY += 130

    // Section Couches (grille)
    const layersBg = scene.add.rectangle(panelX, currentY + 55, panelWidth - 40, 90, 0x000033, 0.3)
    layersBg.setStrokeStyle(2, 0x6699ff)
    container.add(layersBg)

    const layersTitle = scene.add.text(infoStartX, currentY + 15, `Aperçu des couches:`, {
      fontSize: '16px',
      color: '#6699ff',
      fontStyle: 'bold',
    })
    container.add(layersTitle)

    // Grille des couches
    const inventoryStore = useInventoryStore()
    const gridStartX = infoStartX + 10
    const gridY = currentY + 55
    const boxSize = 28
    const boxGap = 4
    const maxPerRow = 12

    contract.layers.forEach((layer, index) => {
      const row = Math.floor(index / maxPerRow)
      const col = index % maxPerRow
      const boxX = gridStartX + col * (boxSize + boxGap) + boxSize / 2
      const boxY = gridY + row * (boxSize + boxGap)

      const isVisible = index < inventoryStore.visibleLayersCount
      const isRevealed = inventoryStore.isLayerRevealed(contract.id, index)

      let boxColor = 0x666666
      let borderColor = 0x666666

      if (isVisible || isRevealed) {
        if (layer.type === 'normal') {
          boxColor = 0x003300
          borderColor = 0x00ff00
        } else if (layer.type === 'danger') {
          boxColor = 0x330000
          borderColor = 0xff6666
        }
      }

      const box = scene.add.rectangle(boxX, boxY, boxSize, boxSize, boxColor)
      box.setStrokeStyle(2, borderColor)
      container.add(box)

      // Numéro de couche
      const numText = scene.add.text(boxX - boxSize / 2 + 3, boxY - boxSize / 2 + 2, `${index + 1}`, {
        fontSize: '8px',
        color: '#ffffff',
      })
      container.add(numText)

      // Icône de danger ou ?
      if (!isVisible && !isRevealed) {
        const unknown = scene.add.text(boxX, boxY + 2, '?', {
          fontSize: '16px',
          color: '#999999',
          fontStyle: 'bold',
        })
        unknown.setOrigin(0.5, 0.5)
        container.add(unknown)
      } else if (layer.type === 'danger' && layer.dangerId) {
        const dangerIcon = scene.add.image(boxX, boxY, `danger-${layer.dangerId}`)
        dangerIcon.setDisplaySize(18, 18)
        container.add(dangerIcon)
      }
    })

    currentY += 120

    // Boutons
    const buttonY = panelY + panelHeight / 2 - 40

    // Bouton Annuler
    const cancelBtn = scene.add.rectangle(panelX - 80, buttonY, 120, 40, 0x666666)
    cancelBtn.setStrokeStyle(2, 0x888888)
    cancelBtn.setInteractive({ useHandCursor: true })
    container.add(cancelBtn)

    const cancelText = scene.add.text(panelX - 80, buttonY, 'Annuler', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    cancelText.setOrigin(0.5, 0.5)
    container.add(cancelText)

    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x888888))
    cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0x666666))
    cancelBtn.on('pointerdown', () => this.close())

    // Bouton Accepter
    const acceptBtn = scene.add.rectangle(panelX + 80, buttonY, 140, 40, 0x00cc00)
    acceptBtn.setStrokeStyle(2, 0x00ff00)
    acceptBtn.setInteractive({ useHandCursor: true })
    container.add(acceptBtn)

    const acceptText = scene.add.text(panelX + 80, buttonY, 'Accepter', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold',
    })
    acceptText.setOrigin(0.5, 0.5)
    container.add(acceptText)

    acceptBtn.on('pointerover', () => acceptBtn.setFillStyle(0x00ff00))
    acceptBtn.on('pointerout', () => acceptBtn.setFillStyle(0x00cc00))
    acceptBtn.on('pointerdown', () => this.acceptContract())

    // Bouton fermer (X)
    const closeBtn = scene.add.circle(panelX + panelWidth / 2 - 20, panelY - panelHeight / 2 + 20, 15, 0xcc0000)
    closeBtn.setStrokeStyle(2, 0xff0000)
    closeBtn.setInteractive({ useHandCursor: true })
    container.add(closeBtn)

    const closeX = scene.add.text(panelX + panelWidth / 2 - 20, panelY - panelHeight / 2 + 20, '×', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    closeX.setOrigin(0.5, 0.5)
    container.add(closeX)

    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0xff0000))
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0xcc0000))
    closeBtn.on('pointerdown', () => this.close())

    // Animation d'entrée
    container.setAlpha(0)
    container.setScale(0.9)
    scene.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: 200,
      ease: 'Power2',
    })

    return container
  }

  private acceptContract() {
    emitSound('clic')
    const contractsStore = useContractsStore()
    const engineStore = useEngineStore()
    const gameStore = useGameStore()

    gameStore.setContract(this.contract)
    contractsStore.acceptContract(this.contract)
    contractsStore.clearSelection()

    this.container.destroy()
    engineStore.changeState('game')
  }

  close() {
    emitSound('clic')
    const contractsStore = useContractsStore()
    contractsStore.clearSelection()

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.9,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.container.destroy()
        if (this.onClose) {
          this.onClose()
        }
      },
    })
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container
  }
}

export function showContractPanel(scene: Phaser.Scene, contract: Contract, onClose?: () => void): ContractPanel {
  return new ContractPanel(scene, contract, onClose)
}
