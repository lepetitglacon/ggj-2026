<template>
  <div class="engine-state-control">
    <h2>État du moteur</h2>
    <div class="current-state">
      État actuel: <strong>{{ stateLabels[engineStore.state] }}</strong>
    </div>
    <div class="button-group">
      <button
        @click="engineStore.changeState('menu')"
        :class="{ active: engineStore.state === 'menu' }"
      >
        Menu
      </button>
      <button
        @click="engineStore.changeState('contract')"
        :class="{ active: engineStore.state === 'contract' }"
      >
        Contrats
      </button>
      <button
        @click="engineStore.changeState('game')"
        :class="{ active: engineStore.state === 'game' }"
      >
        Jeu
      </button>
    </div>
    <div class="info">
      Cliquez sur les boutons pour changer l'état du jeu depuis Vue
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEngineStore, type EngineState } from '../store/engine';

const engineStore = useEngineStore();

const stateLabels: Record<EngineState, string> = {
  menu: 'Menu',
  contract: 'Contrats',
  game: 'Jeu',
};
</script>

<style scoped>
.engine-state-control {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.85);
  padding: 20px;
  border-radius: 10px;
  border: 2px solid #00ccff;
  color: white;
  font-family: Arial, sans-serif;
  z-index: 1000;
  min-width: 250px;
}

h2 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #00ccff;
  text-align: center;
}

.current-state {
  font-size: 16px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(0, 204, 255, 0.1);
  border-radius: 5px;
  text-align: center;
}

.current-state strong {
  color: #00ff00;
  font-size: 18px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

button {
  background: #444;
  color: white;
  border: 2px solid #666;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #555;
  border-color: #00ccff;
  transform: translateX(5px);
}

button:active {
  transform: translateX(5px) scale(0.95);
}

button.active {
  background: #00ccff;
  color: #000;
  border-color: #00ccff;
}

.info {
  font-size: 12px;
  color: #aaa;
  text-align: center;
  font-style: italic;
  line-height: 1.4;
}
</style>
