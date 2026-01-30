<template>
  <div v-if="engineStore.state === 'contract'" class="contract-header">
    <button class="back-button" @click="goToMenu">
      ← Menu
    </button>
    <h1 class="title">Sélectionner un Contrat</h1>
  </div>
</template>

<script setup lang="ts">
import { useEngineStore } from '../store/engine';

const engineStore = useEngineStore();

const goToMenu = () => {
  engineStore.changeState('menu');
};
</script>

<style scoped>
.contract-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px 20px;
  z-index: 1500;
  pointer-events: none;
}

.contract-header > * {
  pointer-events: auto;
}

.back-button {
  position: absolute;
  left: 20px;
  background: #cc0000;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-button:hover {
  background: #ff0000;
  transform: translateX(-3px);
}

.back-button:active {
  transform: translateX(-3px) scale(0.95);
}

.title {
  color: #00ffff;
  font-size: 32px;
  margin: 0;
  text-shadow:
    0 0 10px rgba(0, 255, 255, 0.5),
    2px 2px 4px rgba(0, 0, 0, 0.8);
  font-weight: bold;
}
</style>
