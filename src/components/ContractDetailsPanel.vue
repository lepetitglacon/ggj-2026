<template>
  <div v-if="contractsStore.isContractSelected" class="contract-panel-overlay" @click.self="closePanel">
    <div class="contract-panel">
      <button class="close-button" @click="closePanel">×</button>

      <h1 class="contract-title">{{ contractsStore.selectedContract!.title }}</h1>

      <div class="contract-info">
        <div class="info-item oil">
          <span class="label">Pétrole:</span>
          <span class="value">{{ contractsStore.selectedContract!.oil }} barils</span>
        </div>

        <div class="info-item steps">
          <span class="label">Étapes minimum:</span>
          <span class="value">{{ contractsStore.selectedContract!.minSteps }}</span>
        </div>

        <div class="dangers-section">
          <h3>Dangers connus:</h3>
          <ul>
            <li v-for="(danger, index) in contractsStore.selectedContract!.knownDangers" :key="index">
              {{ danger }}
            </li>
          </ul>
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
import { useContractsStore } from '../store/contracts';
import { useEngineStore } from '../store/engine';

const contractsStore = useContractsStore();
const engineStore = useEngineStore();

const closePanel = () => {
  contractsStore.clearSelection();
};

const acceptContract = () => {
  if (contractsStore.selectedContract) {
    contractsStore.acceptContract(contractsStore.selectedContract);
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
  max-width: 500px;
  width: 90%;
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
  margin: 0 0 25px 0;
  text-align: center;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.contract-info {
  margin-bottom: 25px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid;
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

.dangers-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dangers-section li {
  color: #ff9999;
  padding: 8px 0;
  padding-left: 25px;
  position: relative;
  font-size: 16px;
}

.dangers-section li::before {
  content: '⚠';
  position: absolute;
  left: 0;
  color: #ff6666;
  font-size: 18px;
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
</style>
