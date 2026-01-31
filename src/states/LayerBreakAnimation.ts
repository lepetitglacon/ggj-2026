import Phaser from 'phaser'

export interface LayerBreakAnimation {
  animate(
    scene: Phaser.Scene,
    currentLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    nextLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    onComplete: () => void
  ): void
}

/**
 * Animation simple: Flash blanc et transition rapide
 */
export class FlashAnimation implements LayerBreakAnimation {
  animate(
    scene: Phaser.Scene,
    _currentLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    _nextLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    onComplete: () => void
  ): void {
    scene.cameras.main.flash(200, 255, 255, 255)
    // Exécuter le callback après le flash
    scene.time.delayedCall(200, onComplete)
  }
}

/**
 * Animation avec fade out/in: La couche actuelle disparaît progressivement
 */
export class FadeAnimation implements LayerBreakAnimation {
  private duration: number = 400

  constructor(duration: number = 400) {
    this.duration = duration
  }

  animate(
    scene: Phaser.Scene,
    currentLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    nextLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    onComplete: () => void
  ): void {
    // Fade out la couche actuelle
    scene.tweens.add({
      targets: currentLayer,
      alpha: 0,
      duration: this.duration / 2,
      ease: 'Power2.out',
    })

    // Fade in la couche suivante
    if (nextLayer.alpha !== undefined) {
      nextLayer.alpha = 0
      scene.tweens.add({
        targets: nextLayer,
        alpha: 1,
        duration: this.duration / 2,
        ease: 'Power2.in',
        delay: this.duration / 2,
        onComplete: onComplete,
      })
    } else {
      scene.time.delayedCall(this.duration, onComplete)
    }
  }
}

/**
 * Animation avec brisure visuelle: La couche se fissure puis disparaît
 */
export class CrackAnimation implements LayerBreakAnimation {
  private duration: number = 600

  constructor(duration: number = 600) {
    this.duration = duration
  }

  animate(
    scene: Phaser.Scene,
    currentLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    nextLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    onComplete: () => void
  ): void {
    const startAlpha = currentLayer.alpha !== undefined ? currentLayer.alpha : 1

    // Enlever le filtre de couleur immédiatement (seulement pour les images)
    if (currentLayer instanceof Phaser.GameObjects.Image) {
      currentLayer.setTint(0xffffff)
    }

    // Phase 1: Trembler et diminuer l'opacité
    scene.tweens.add({
      targets: currentLayer,
      alpha: startAlpha * 0.5,
      duration: this.duration * 0.4,
      ease: 'Power1.out',
    })

    // Effet de tremblement
    const originalX = currentLayer.x
    const originalY = currentLayer.y
    for (let i = 0; i < 8; i++) {
      scene.tweens.add({
        targets: currentLayer,
        x: originalX + Phaser.Math.Between(-5, 5),
        y: originalY + Phaser.Math.Between(-5, 5),
        duration: 50,
        delay: this.duration * 0.3 + i * 50,
      })
    }

    // Phase 2: Disparition complète
    scene.tweens.add({
      targets: currentLayer,
      alpha: 0,
      duration: this.duration * 0.3,
      delay: this.duration * 0.6,
      ease: 'Power2.in',
    })

    scene.tweens.add({
      targets: currentLayer,
      x: originalX,
      y: originalY,
      duration: this.duration * 0.3,
      delay: this.duration * 0.6,
    })

    // La couche suivante devient visible instantanément à la fin
    scene.time.delayedCall(this.duration * 0.9, () => {
      if (nextLayer.alpha !== undefined) {
        nextLayer.alpha = 1
      }
      onComplete()
    })
  }
}

/**
 * Animation rapide: Transition instantanée avec effet de poussière
 */
export class DustAnimation implements LayerBreakAnimation {
  private duration: number = 300

  constructor(duration: number = 300) {
    this.duration = duration
  }

  animate(
    scene: Phaser.Scene,
    currentLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    _nextLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    onComplete: () => void
  ): void {
    // Créer un effet de poussière
    const dust = scene.add.rectangle(400, 300, 800, 600, 0x8b7355, 0.8)
    dust.setDepth(100)

    // Fade out la poussière
    scene.tweens.add({
      targets: dust,
      alpha: 0,
      duration: this.duration,
      ease: 'Power2.out',
      onComplete: () => {
        dust.destroy()
        onComplete()
      },
    })

    // Transition rapide
    scene.tweens.add({
      targets: currentLayer,
      alpha: 0,
      duration: this.duration * 0.3,
      ease: 'Power2.out',
    })
  }
}

/**
 * Pas d'animation: transition instantanée
 */
export class NoAnimation implements LayerBreakAnimation {
  animate(
    _scene: Phaser.Scene,
    _currentLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    _nextLayer: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    onComplete: () => void
  ): void {
    onComplete()
  }
}
