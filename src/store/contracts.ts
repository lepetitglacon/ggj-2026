import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Contract {
  id: number;
  title: string;
  oil: number;
  minSteps: number;
  knownDangers: string[];
  x: number;
  y: number;
}

export const useContractsStore = defineStore('contracts', () => {
  const contracts = ref<Contract[]>([]);
  const selectedContract = ref<Contract | null>(null);

  const setContracts = (newContracts: Contract[]) => {
    contracts.value = newContracts;
  };

  const selectContract = (contract: Contract | null) => {
    selectedContract.value = contract;
  };

  const acceptContract = (contract: Contract) => {
    selectedContract.value = contract;
    // TODO: Sauvegarder pour le jeu
    console.log('Contrat accepté:', contract);
  };

  const clearSelection = () => {
    selectedContract.value = null;
  };

  const isContractSelected = computed(() => selectedContract.value !== null);

  return {
    contracts,
    selectedContract,
    isContractSelected,
    setContracts,
    selectContract,
    acceptContract,
    clearSelection,
  };
});
