<template>
  <div class="counter-container">
    <h2>Vue Counter</h2>
    <div class="counter-display">{{ counterStore.count }}</div>
    <div class="button-group">
      <button @click="counterStore.decrement">-</button>
      <button @click="counterStore.increment">+</button>
      <button @click="reset">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCounterStore } from '../store/counter';

const counterStore = useCounterStore();

const reset = () => {
  counterStore.setCount(0);
};
</script>

<style scoped>
.counter-container {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 10px;
  border: 2px solid #00ff00;
  color: white;
  font-family: Arial, sans-serif;
  z-index: 1000;
}

h2 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #00ff00;
  text-align: center;
}

.counter-display {
  font-size: 48px;
  font-weight: bold;
  text-align: center;
  margin: 15px 0;
  color: #00ff00;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
}

button {
  background: #00ff00;
  color: black;
  border: none;
  padding: 10px 20px;
  font-size: 20px;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #00cc00;
  transform: scale(1.05);
}

button:active {
  transform: scale(0.95);
}
</style>
