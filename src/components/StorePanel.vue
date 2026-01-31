<template>
  <div v-if="storeStore.isOpen" class="store-overlay" @click.self="closeStore">
    <div class="store-panel">
      <button class="close-button" @click="closeStore">×</button>

      <h1 class="store-title">🛒 Magasin d'Équipement</h1>

      <div class="oil-display">
        <span class="oil-icon">🛢️</span>
        <span class="oil-amount">{{ engineStore.oil }} barils</span>
      </div>

      <div class="store-content">
        <!-- Radar Section -->
        <div class="item-section">
          <h2 class="section-title">📡 Radar</h2>
          <p class="section-description">Permet de voir les couches à venir</p>
          <div class="current-item">
            <span>Actuel: {{ radarConfig[inventoryStore.radarLevel].name }}</span>
            <span v-if="inventoryStore.radarLevel < 5">{{ inventoryStore.visibleLayersCount }} couches visibles</span>
            <span v-else>Tous les niveaux débloqués</span>
          </div>

          <!-- Si on a tous les radars 2, 3, 4, afficher l'Ultime en grand -->
          <div v-if="inventoryStore.radarLevel >= 4" class="ultimate-radar-container">
            <div :class="['item-card', 'ultimate-radar-card', { owned: inventoryStore.radarLevel >= 5 }]">
              <h3>{{ radarConfig[5].name }}</h3>
              <p class="ultimate-description">
                Débloquez le potentiel infini<br>
                Révélez les couches cachées pour du pétrole
              </p>
              <div class="ultimate-price">{{ radarConfig[5].cost }} 🛢️</div>
              <button
                v-if="inventoryStore.radarLevel < 5"
                :disabled="!inventoryStore.canBuyRadar(5 as RadarLevel)"
                @click="buyItem('radar', 5 as RadarLevel)"
                class="buy-button ultimate-button"
              >
                {{ inventoryStore.canBuyRadar(5 as RadarLevel) ? '✨ Débloquer l\'Ultime' : 'Pas assez de pétrole' }}
              </button>
              <div v-else class="owned-badge">✨ Possédé</div>
            </div>
          </div>

          <!-- Affichage normal des radars (seulement si on n'a pas tous les 3) -->
          <div v-else class="items-grid">
            <div
              v-for="level in [2, 3, 4]"
              :key="'radar-' + level"
              :class="['item-card', { owned: inventoryStore.radarLevel >= level }]"
            >
              <h3>{{ radarConfig[level as RadarLevel].name }}</h3>
              <p>{{ radarConfig[level as RadarLevel].visibleLayers }} couches visibles</p>
              <div class="item-cost">{{ radarConfig[level as RadarLevel].cost }} 🛢️</div>
              <button
                v-if="inventoryStore.radarLevel < level"
                :disabled="!inventoryStore.canBuyRadar(level as RadarLevel)"
                @click="buyItem('radar', level as RadarLevel)"
                class="buy-button"
              >
                {{ inventoryStore.canBuyRadar(level as RadarLevel) ? 'Acheter' : 'Pas assez de pétrole' }}
              </button>
              <div v-else class="owned-badge">Possédé</div>
            </div>
          </div>
        </div>

        <!-- Drill Section -->
        <div class="item-section">
          <h2 class="section-title">⚙️ Drill</h2>
          <p class="section-description">Augmente la vitesse de forage</p>
          <div class="current-item">
            <span>Actuel: {{ drillConfig[inventoryStore.drillLevel].name }}</span>
            <span>Vitesse: ×{{ drillConfig[inventoryStore.drillLevel].speed }}</span>
          </div>
          <div class="items-grid">
            <div
              v-for="level in [2, 3, 4]"
              :key="'drill-' + level"
              :class="['item-card', { owned: inventoryStore.drillLevel >= level }]"
            >
              <h3>{{ drillConfig[level as DrillLevel].name }}</h3>
              <p>Vitesse: ×{{ drillConfig[level as DrillLevel].speed }}</p>
              <div class="item-cost">{{ drillConfig[level as DrillLevel].cost }} 🛢️</div>
              <button
                v-if="inventoryStore.drillLevel < level"
                :disabled="!inventoryStore.canBuyDrill(level as DrillLevel)"
                @click="buyItem('drill', level as DrillLevel)"
                class="buy-button"
              >
                {{ inventoryStore.canBuyDrill(level as DrillLevel) ? 'Acheter' : 'Pas assez de pétrole' }}
              </button>
              <div v-else class="owned-badge">Possédé</div>
            </div>
          </div>
        </div>

        <!-- Mask Upgrade Section -->
        <div class="item-section">
          <h2 class="section-title">🎭 Slots de Masques</h2>
          <p class="section-description">Augmente le nombre de slots de forage disponibles</p>
          <div class="current-item">
            <span>Actuel: {{ maskConfig[inventoryStore.maskLevel].name }}</span>
            <span>{{ maskConfig[inventoryStore.maskLevel].slots }} slot(s)</span>
          </div>
          <div class="items-grid">
            <div
              v-for="level in [2, 3, 4]"
              :key="'maskUpgrade-' + level"
              :class="['item-card', { owned: inventoryStore.maskLevel >= level }]"
            >
              <h3>{{ maskConfig[level as MaskLevel].name }}</h3>
              <p>{{ maskConfig[level as MaskLevel].slots }} slot(s)</p>
              <div class="item-cost">{{ maskConfig[level as MaskLevel].cost }} 🛢️</div>
              <button
                v-if="inventoryStore.maskLevel < level"
                :disabled="!inventoryStore.canBuyMaskUpgrade(level as MaskLevel)"
                @click="buyItem('maskUpgrade', level as MaskLevel)"
                class="buy-button"
              >
                {{ inventoryStore.canBuyMaskUpgrade(level as MaskLevel) ? 'Acheter' : 'Pas assez de pétrole' }}
              </button>
              <div v-else class="owned-badge">Possédé</div>
            </div>
          </div>
        </div>

        <!-- Mask Types Section -->
        <div class="item-section">
          <h2 class="section-title">🛡️ Types de Masques</h2>
          <p class="section-description">Achète de nouveaux types de masques pour te protéger contre plus de dangers</p>
          <div class="items-grid">
            <div
              v-for="maskId in (['1', '2', '3', '4', '5', '6'] as const)"
              :key="'maskType-' + maskId"
              :class="['item-card', { owned: inventoryStore.isMaskOwned(maskId) }]"
            >
              <h3>{{ maskTypesConfig[maskId as MaskTypeKey].name }}</h3>
              <p v-if="getDangerById(maskId)">{{ getDangerById(maskId)?.label }}</p>
              <div class="item-cost">{{ maskTypesConfig[maskId as MaskTypeKey].cost }} 🛢️</div>
              <button
                v-if="!inventoryStore.isMaskOwned(maskId)"
                :disabled="!inventoryStore.canBuyMaskType(maskId as MaskTypeKey)"
                @click="buyItem('maskType', maskId as MaskTypeKey)"
                class="buy-button"
              >
                {{ inventoryStore.canBuyMaskType(maskId as MaskTypeKey) ? 'Acheter' : 'Pas assez de pétrole' }}
              </button>
              <div v-else class="owned-badge">Possédé</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStoreStore } from '../store/store';
import { useEngineStore } from '../store/engine';
import {
  useInventoryStore,
  radarConfig,
  drillConfig,
  maskConfig,
  maskTypesConfig,
  type RadarLevel,
  type DrillLevel,
  type MaskLevel,
  type MaskTypeKey,
} from '../store/inventory.store';
import { getDangerById } from '../data/dangers';

const storeStore = useStoreStore();
const engineStore = useEngineStore();
const inventoryStore = useInventoryStore();

const closeStore = () => {
  storeStore.closeStore();
};

const buyItem = (type: string, level: RadarLevel | DrillLevel | MaskLevel | MaskTypeKey) => {
  let success = false;

  if (type === 'radar') {
    success = inventoryStore.buyRadar(level as RadarLevel);
  } else if (type === 'drill') {
    success = inventoryStore.buyDrill(level as DrillLevel);
  } else if (type === 'maskUpgrade') {
    success = inventoryStore.buyMaskUpgrade(level as MaskLevel);
  } else if (type === 'maskType') {
    success = inventoryStore.buyMaskType(level as MaskTypeKey);
  }

  if (success) {
    console.log(`Acheté ${type} ${level}`);
  }
};
</script>

<style scoped>
.store-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
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

.store-panel {
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%);
  border: 3px solid #ffaa00;
  border-radius: 15px;
  padding: 30px;
  max-width: 900px;
  width: 95%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 10px 50px rgba(255, 170, 0, 0.3);
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

.store-title {
  color: #ffaa00;
  font-size: 32px;
  margin: 0 0 20px 0;
  text-align: center;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 170, 0, 0.5);
}

.oil-display {
  background: rgba(255, 170, 0, 0.2);
  border: 2px solid #ffaa00;
  border-radius: 10px;
  padding: 15px;
  text-align: center;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.oil-icon {
  font-size: 32px;
}

.oil-amount {
  color: #ffaa00;
  font-size: 28px;
  font-weight: bold;
}

.store-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.item-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 20px;
}

.section-title {
  color: #ffaa00;
  font-size: 24px;
  margin: 0 0 8px 0;
  font-weight: bold;
}

.section-description {
  color: #aaaaaa;
  font-size: 14px;
  margin: 0 0 15px 0;
  font-style: italic;
}

.current-item {
  background: rgba(0, 255, 0, 0.1);
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #00ff00;
  font-weight: bold;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.item-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid #666666;
  border-radius: 10px;
  padding: 20px;
  transition: all 0.2s;
}

.item-card:hover {
  border-color: #ffaa00;
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(255, 170, 0, 0.3);
}

.item-card.owned {
  border-color: #00ff00;
  background: rgba(0, 255, 0, 0.05);
}

.item-card h3 {
  color: #ffffff;
  font-size: 18px;
  margin: 0 0 10px 0;
}

.item-card p {
  color: #aaaaaa;
  font-size: 14px;
  margin: 0 0 15px 0;
}

.item-cost {
  color: #ffaa00;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 15px;
}

.buy-button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #00cc00;
  color: #000000;
}

.buy-button:hover:not(:disabled) {
  background: #00ff00;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 0, 0.4);
}

.buy-button:disabled {
  background: #666666;
  color: #999999;
  cursor: not-allowed;
  opacity: 0.5;
}

.owned-badge {
  text-align: center;
  padding: 12px;
  background: rgba(0, 255, 0, 0.2);
  border-radius: 8px;
  color: #00ff00;
  font-weight: bold;
  font-size: 16px;
}

/* Scrollbar personnalisée */
.store-panel::-webkit-scrollbar {
  width: 10px;
}

.store-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}

.store-panel::-webkit-scrollbar-thumb {
  background: #ffaa00;
  border-radius: 5px;
}

.store-panel::-webkit-scrollbar-thumb:hover {
  background: #ffcc00;
}

.ultimate-radar-container {
  margin-top: 20px;
  margin-bottom: 20px;
}

.ultimate-radar-card {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, rgba(255, 170, 0, 0.2) 0%, rgba(100, 200, 255, 0.2) 100%);
  border: 3px solid #ffaa00;
  padding: 30px !important;
  position: relative;
  overflow: hidden;
}

.ultimate-radar-card::before {
  content: '✨';
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 32px;
  opacity: 0.3;
}

.ultimate-radar-card h3 {
  color: #ffaa00;
  font-size: 28px !important;
  margin-bottom: 15px;
}

.ultimate-description {
  color: #aaaaaa;
  font-size: 16px;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.ultimate-price {
  color: #ffaa00;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(255, 170, 0, 0.5);
}

.ultimate-button {
  background: linear-gradient(135deg, #ffaa00 0%, #ff8800 100%) !important;
  font-size: 18px !important;
  padding: 16px !important;
}

.ultimate-button:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(255, 170, 0, 0.6) !important;
}

.ultimate-preview {
  opacity: 0.5;
}

.locked-badge {
  text-align: center;
  padding: 12px;
  background: rgba(255, 170, 0, 0.2);
  border-radius: 8px;
  color: #ffaa00;
  font-weight: bold;
  font-size: 16px;
  text-transform: uppercase;
}
</style>
