<template>
  <div v-if="contractsStore.isContractSelected" class="contract-panel-overlay" @click.self="closePanel">
    <div class="contract-panel">
      <button class="close-button" @click="closePanel">×</button>

      <h1 class="contract-title">{{ contractsStore.selectedContract!.title }}</h1>
      <div class="contract-level">
        <span v-if="contractsStore.selectedContract!.recognitionLevel === 0" class="level-tuto">TUTORIEL</span>
        <span v-else class="level-stars">{{ '★'.repeat(contractsStore.selectedContract!.recognitionLevel) }}</span>
      </div>

      <div class="contract-info">
        <div class="info-row">
          <div class="info-item oil">
            <span class="label">Pétrole:</span>
            <span class="value">{{ contractsStore.selectedContract!.oil }} barils</span>
          </div>

          <div class="info-item steps">
            <span class="label">Étapes minimum:</span>
            <span class="value">{{ contractsStore.selectedContract!.minSteps }}</span>
          </div>
        </div>

        <div class="dangers-section">
          <h3>Dangers connus:</h3>
          <div class="dangers-list">
            <div
              v-for="(dangerId, index) in contractsStore.selectedContract!.knownDangers"
              :key="index"
              class="danger-item"
            >
              <img
                v-if="getDanger(dangerId)"
                :src="getDanger(dangerId)!.icon"
                :alt="getDanger(dangerId)!.label"
                class="danger-icon"
              />
              <span class="danger-label">{{ getDanger(dangerId)?.label || dangerId }}</span>
            </div>
          </div>
        </div>

        <div class="layers-section">
          <div class="layers-header">
            <h3>Couches ({{ contractsStore.selectedContract!.layers.length }} au total)</h3>
          </div>

          <!-- Bouton Radar Payant -->
          <div v-if="!radarActivated" class="radar-button-container">
            <button
              :disabled="engineStore.oil < radarCost || isLoadingRadar"
              :class="['radar-button', { 'radar-loading': isLoadingRadar }]"
              @click="activateRadar"
            >
              <span v-if="isLoadingRadar" class="loading-spinner">⟳</span>
              <span v-else>📡</span>
              <span class="button-text">
                <span v-if="isLoadingRadar">Scan en cours...</span>
                <span v-else>Voir avec le radar</span>
              </span>
              <span v-if="!isLoadingRadar" class="cost">{{ radarCost }} 🛢️</span>
            </button>
            <p v-if="engineStore.oil < radarCost" class="insufficient-oil">
              ⚠️ Pétrole insuffisant ({{ engineStore.oil }} / {{ radarCost }})
            </p>
          </div>

          <!-- Grille des Couches (affichée après activation du radar) -->
          <div v-show="radarActivated" class="layers-grid">
            <div
              v-for="(layer, index) in contractsStore.selectedContract!.layers"
              :key="layer.id"
              :class="[
                'layer-box',
                {
                  'layer-normal': layer.type === 'normal' && index < inventoryStore.visibleLayersCount,
                  'layer-danger': layer.type === 'danger' && index < inventoryStore.visibleLayersCount,
                  'layer-hidden': index >= inventoryStore.visibleLayersCount && !inventoryStore.isLayerRevealed(contractsStore.selectedContract!.id, index),
                  'layer-revealed': index >= inventoryStore.visibleLayersCount && inventoryStore.isLayerRevealed(contractsStore.selectedContract!.id, index),
                },
              ]"
              :title="getLayerTooltip(layer, index)"
              @click="revealLayer(index)"
              @mouseenter="showRevealTooltip(index)"
              @mouseleave="hideRevealTooltip"
            >
              <span class="layer-number">{{ index + 1 }}</span>
              <img
                v-if="layer.type === 'danger' && layer.dangerId && index < inventoryStore.visibleLayersCount"
                :src="getDanger(layer.dangerId)!.icon"
                :alt="getDanger(layer.dangerId)!.label"
                class="layer-danger-icon"
              />
              <span v-else-if="index >= inventoryStore.visibleLayersCount && !inventoryStore.isLayerRevealed(contractsStore.selectedContract!.id, index)" class="layer-unknown">?</span>
            </div>
          </div>

          <!-- Info Radar après activation -->
          <p v-if="radarActivated" class="radar-info active">
            📡 Radar actif - {{ inventoryStore.visibleLayersCount }} couches visibles
          </p>
        </div>
      </div>

      <div class="button-group">
        <button class="btn-cancel" @click="closePanel">Annuler</button>
        <button class="btn-accept" @click="acceptContract">Accepter le contrat</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useContractsStore } from '../store/contracts';
import { useEngineStore } from '../store/engine';
import { useGameStore } from '../store/game.store';
import { useInventoryStore } from '../store/inventory.store';
import { getDangerById } from '../data/dangers';
import { emitSound, stopSound } from '../listeners/sound.listener';
import type { DangerKey } from '../data/dangers';
import type { Layer } from '../data/layers';

const contractsStore = useContractsStore();
const engineStore = useEngineStore();
const gameStore = useGameStore();
const inventoryStore = useInventoryStore();

// État du radar
const radarActivated = ref(false);
const isLoadingRadar = ref(false);
const radarCost = 500; // Coût en pétrole pour activer le radar

const getDanger = (id: DangerKey) => {
  return getDangerById(id);
};

const getLayerTooltip = (layer: Layer, index: number): string => {
  if (inventoryStore.isLayerRevealed(contractsStore.selectedContract!.id, index)) {
    // Couche révélée
    if (layer.type === 'normal') {
      return `Couche ${index + 1}: Normale`;
    }
    if (layer.type === 'danger' && layer.dangerId) {
      const danger = getDanger(layer.dangerId);
      return `Couche ${index + 1}: ${danger?.label || 'Danger'}`;
    }
    return `Couche ${index + 1}`;
  }

  if (index >= inventoryStore.visibleLayersCount) {
    if (inventoryStore.radarLevel >= 5) {
      const cost = inventoryStore.calculateRevealCost(index);
      return `Couche ${index + 1}: Inconnue - ${cost} 🛢️ pour révéler`;
    }
    return 'Couche inconnue - Améliorez votre radar';
  }
  if (layer.type === 'normal') {
    return `Couche ${index + 1}: Normale`;
  }
  if (layer.type === 'danger' && layer.dangerId) {
    const danger = getDanger(layer.dangerId);
    return `Couche ${index + 1}: ${danger?.label || 'Danger'}`;
  }
  return `Couche ${index + 1}`;
};

const revealLayer = (index: number) => {
  if (inventoryStore.radarLevel < 5) return;
  if (index < inventoryStore.visibleLayersCount) return;

  const contract = contractsStore.selectedContract;
  if (!contract) return;

  const success = inventoryStore.revealLayer(contract.id, index);
  if (success) {
    console.log(`Couche ${index + 1} révélée!`);
  }
};

const showRevealTooltip = (_index: number) => {
  // Le tooltip est géré par :title
};

const hideRevealTooltip = () => {
  // Rien à faire
};

const closePanel = () => {
  contractsStore.clearSelection();
};

const activateRadar = async () => {
  // Vérifier les ressources
  if (engineStore.oil < radarCost) {
    return;
  }

  // Déduire le pétrole
  engineStore.removeOil(radarCost);

  // Lancer le chargement
  isLoadingRadar.value = true;
  emitSound('radar');

  // Simuler le temps de scan (2 secondes)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Arrêter le son radar et jouer le son de confirmation
  stopSound('radar');
  radarActivated.value = true;
  isLoadingRadar.value = false;
  emitSound('radar-ok');
};

const acceptContract = () => {
  if (contractsStore.selectedContract) {
    // Envoyer le contrat au game store pour le jeu des couches
    gameStore.setContract(contractsStore.selectedContract);
    contractsStore.acceptContract(contractsStore.selectedContract);
    // Fermer la fenêtre du contrat
    contractsStore.clearSelection();
    engineStore.changeState('game');
  }
};
</script>

<style scoped>
.contract-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.contract-panel {
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%);
  border: 3px solid #00ffff;
  border-radius: 15px;
  padding: 30px;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 50px rgba(0, 255, 255, 0.3);
  position: relative;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #cc0000;
  border: none;
  color: white;
  font-size: 28px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.close-button:hover {
  background: #ff0000;
  transform: rotate(90deg);
}

.contract-title {
  color: #00ffff;
  font-size: 28px;
  margin: 0 0 10px 0;
  text-align: center;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.contract-level {
  text-align: center;
  margin-bottom: 20px;
}

.level-tuto {
  background: linear-gradient(135deg, #00aa00, #00ff00);
  color: #000;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.level-stars {
  color: #ffff00;
  font-size: 24px;
  text-shadow: 0 0 10px rgba(255, 255, 0, 0.5);
}

.contract-info {
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-row {
  display: flex;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid;
  flex: 1;
}

.info-item.oil {
  border-left-color: #ffff00;
}

.info-item.steps {
  border-left-color: #00ff00;
}

.info-item .label {
  color: #aaaaaa;
  font-size: 16px;
  font-weight: 500;
}

.info-item .value {
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
}

.info-item.oil .value {
  color: #ffff00;
}

.info-item.steps .value {
  color: #00ff00;
}

.dangers-section {
  background: rgba(255, 0, 0, 0.1);
  border: 2px solid #ff6666;
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.dangers-section h3 {
  color: #ff6666;
  font-size: 18px;
  margin: 0 0 12px 0;
  font-weight: bold;
}

.dangers-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.danger-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.2s;
  flex: 0 1 auto;
}

.danger-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.danger-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.danger-label {
  color: #ff9999;
  font-size: 16px;
  font-weight: 500;
}

.button-group {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.button-group button {
  padding: 12px 30px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
}

.btn-cancel {
  background: #666666;
  color: white;
}

.btn-cancel:hover {
  background: #888888;
  transform: translateY(-2px);
}

.btn-accept {
  background: #00cc00;
  color: #000000;
  box-shadow: 0 4px 15px rgba(0, 204, 0, 0.3);
}

.btn-accept:hover {
  background: #00ff00;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 255, 0, 0.5);
}

.btn-accept:active,
.btn-cancel:active {
  transform: translateY(0);
}

.layers-section {
  background: rgba(0, 100, 255, 0.1);
  border: 2px solid #6699ff;
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.layers-header {
  margin-bottom: 15px;
}

.layers-header h3 {
  color: #6699ff;
  font-size: 18px;
  margin: 0 0 8px 0;
  font-weight: bold;
}

.radar-info {
  color: #99ccff;
  font-size: 14px;
  margin: 0;
  font-style: italic;
}

.no-radar {
  color: #ffaa00;
}

.layers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 5px;
  /* Style de la scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #6699ff rgba(255, 255, 255, 0.1);
}

.layers-grid::-webkit-scrollbar {
  width: 8px;
}

.layers-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.layers-grid::-webkit-scrollbar-thumb {
  background: #6699ff;
  border-radius: 4px;
}

.layers-grid::-webkit-scrollbar-thumb:hover {
  background: #88bbff;
}

.layer-box {
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
  cursor: help;
  border: 2px solid;
}

.layer-normal {
  background: rgba(0, 255, 0, 0.2);
  border-color: #00ff00;
}

.layer-danger {
  background: rgba(255, 0, 0, 0.2);
  border-color: #ff6666;
}

.layer-hidden {
  background: rgba(100, 100, 100, 0.2);
  border-color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.layer-hidden:hover {
  border-color: #ffaa00;
  background: rgba(100, 100, 100, 0.4);
}

.layer-revealed {
  background: rgba(150, 150, 255, 0.3);
  border-color: #6699ff;
}

.layer-box:hover {
  transform: scale(1.1);
  z-index: 10;
}

.layer-number {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  color: white;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 4px;
  border-radius: 3px;
}

.layer-danger-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.layer-unknown {
  font-size: 24px;
  color: #999999;
  font-weight: bold;
}

.radar-button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: rgba(0, 150, 255, 0.15);
  border-radius: 8px;
  border: 2px dashed #0099ff;
}

.radar-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #0099ff, #0066cc);
  color: white;
  border: 2px solid #00ccff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(0, 153, 255, 0.3);
}

.radar-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #00ccff, #0099ff);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 204, 255, 0.5);
  border-color: #00ffff;
}

.radar-button:active:not(:disabled) {
  transform: translateY(0);
}

.radar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #666666, #333333);
  border-color: #666666;
  box-shadow: none;
}

.radar-button.radar-loading {
  background: linear-gradient(135deg, #ff9900, #ff6600);
  border-color: #ffaa00;
  box-shadow: 0 4px 15px rgba(255, 153, 0, 0.3);
}

.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 20px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.button-text {
  flex: 1;
  text-align: center;
}

.cost {
  font-size: 14px;
  background: rgba(255, 255, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ffff00;
  color: #ffff00;
  white-space: nowrap;
}

.insufficient-oil {
  color: #ff6666;
  font-size: 12px;
  margin: 0;
  font-weight: bold;
  text-align: center;
}

.radar-info.active {
  margin-top: 10px;
  padding: 10px;
  background: rgba(0, 204, 255, 0.2);
  border-radius: 6px;
  border-left: 4px solid #00ffff;
  color: #00ffff;
  text-align: center;
}
</style>
