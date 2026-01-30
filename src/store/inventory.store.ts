import { defineStore } from 'pinia';
import { ref } from 'vue';

export type InventoryItem = {};

export const useInventoryStore = defineStore('inventory', () => {
    const inventory = ref(new Map());

    const addItem = () => {};
    const buy = () => {};

    return {
        inventory,
    };
});
