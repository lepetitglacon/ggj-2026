import Phaser from 'phaser';
import { useCounterStore } from '../store/counter';
import { useEngineStore } from '../store/engine';

export class GameState extends Phaser.Scene {
    private titleText!: Phaser.GameObjects.Text;
    private counterText!: Phaser.GameObjects.Text;
    private instructionsText!: Phaser.GameObjects.Text;
    private incrementButton!: Phaser.GameObjects.Rectangle;
    private decrementButton!: Phaser.GameObjects.Rectangle;
    private buttonText1!: Phaser.GameObjects.Text;
    private buttonText2!: Phaser.GameObjects.Text;
    private counterStore: ReturnType<typeof useCounterStore>;

    constructor() {
        super({ key: 'game' });
        this.counterStore = useCounterStore();
    }

    init() {
        // Synchroniser avec le store Pinia
        const engineStore = useEngineStore();
        engineStore.changeState('game');
    }

    create() {
        this.cameras.main.setBackgroundColor('#2d2d2d');

        this.titleText = this.add.text(400, 200, 'Phaser 3 + Vue + Pinia', {
            fontSize: '32px',
            color: '#00ff00',
        });
        this.titleText.setOrigin(0.5, 0.5);

        this.instructionsText = this.add.text(
            400,
            250,
            'Cliquez sur les boutons pour modifier le compteur!',
            { fontSize: '18px', color: '#ffffff' }
        );
        this.instructionsText.setOrigin(0.5, 0.5);

        // Afficher le compteur depuis le store
        this.counterText = this.add.text(400, 320, `Compteur du jeu: ${this.counterStore.count}`, {
            fontSize: '24px',
            color: '#ffff00',
        });
        this.counterText.setOrigin(0.5, 0.5);

        // Bouton pour incrémenter dans le jeu
        this.incrementButton = this.add.rectangle(300, 400, 150, 50, 0x00ff00);
        this.incrementButton.setInteractive({ useHandCursor: true });
        this.buttonText1 = this.add.text(300, 400, '+ Incrémenter', {
            fontSize: '16px',
            color: '#000000',
        });
        this.buttonText1.setOrigin(0.5, 0.5);

        this.incrementButton.on('pointerdown', () => {
            this.counterStore.increment();
        });

        this.incrementButton.on('pointerover', () => {
            this.incrementButton.setFillStyle(0x00cc00);
        });

        this.incrementButton.on('pointerout', () => {
            this.incrementButton.setFillStyle(0x00ff00);
        });

        // Bouton pour décrémenter dans le jeu
        this.decrementButton = this.add.rectangle(500, 400, 150, 50, 0xff0000);
        this.decrementButton.setInteractive({ useHandCursor: true });
        this.buttonText2 = this.add.text(500, 400, '- Décrémenter', {
            fontSize: '16px',
            color: '#ffffff',
        });
        this.buttonText2.setOrigin(0.5, 0.5);

        this.decrementButton.on('pointerdown', () => {
            this.counterStore.decrement();
        });

        this.decrementButton.on('pointerover', () => {
            this.decrementButton.setFillStyle(0xcc0000);
        });

        this.decrementButton.on('pointerout', () => {
            this.decrementButton.setFillStyle(0xff0000);
        });

        // Bouton retour au menu
        const backButton = this.add.rectangle(100, 550, 120, 40, 0x666666);
        backButton.setInteractive({ useHandCursor: true });
        const backText = this.add.text(100, 550, 'Menu', {
            fontSize: '16px',
            color: '#ffffff',
        });
        backText.setOrigin(0.5, 0.5);

        backButton.on('pointerdown', () => {
            this.scene.start('menu');
        });

        backButton.on('pointerover', () => {
            backButton.setFillStyle(0x555555);
        });

        backButton.on('pointerout', () => {
            backButton.setFillStyle(0x666666);
        });
    }

    update() {
        // Mettre à jour l'affichage du compteur
        this.counterText.setText(`Compteur du jeu: ${this.counterStore.count}`);
    }
}
