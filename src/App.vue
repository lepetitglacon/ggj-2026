<template>
  <ContractHeader />
  <ContractDetailsPanel />
  <StorePanel />
</template>

<script setup lang="ts">
import ContractHeader from './components/ContractHeader.vue';
import ContractDetailsPanel from './components/ContractDetailsPanel.vue';
import StorePanel from './components/StorePanel.vue';
</script>

<style>
* {
  box-sizing: border-box;
}
</style>
