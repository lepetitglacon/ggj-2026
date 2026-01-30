<template>
  <EngineStateControl />
  <Counter />
  <ContractHeader />
  <ContractDetailsPanel />
</template>

<script setup lang="ts">
import Counter from './components/Counter.vue';
import EngineStateControl from './components/EngineStateControl.vue';
import ContractHeader from './components/ContractHeader.vue';
import ContractDetailsPanel from './components/ContractDetailsPanel.vue';
</script>

<style>
* {
  box-sizing: border-box;
}
</style>
