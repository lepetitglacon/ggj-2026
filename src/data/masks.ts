import type { DangerKey } from './dangers'

// Type pour un masque
export interface Mask {
  id: string
  dangerId: DangerKey // Quel danger ce masque contre
  color: number // Couleur du masque (sera affectée par les malus)
  x: number // Position x (sera affectée par les malus)
  y: number // Position y (sera affectée par les malus)
  isPlaced: boolean // Si le masque est placé sur un slot
  slotIndex?: number // Index du slot où il est placé
}

// Créer un masque pour un danger spécifique
export const createMask = (id: string, dangerId: DangerKey, color: number): Mask => {
  return {
    id,
    dangerId,
    color,
    x: 0,
    y: 0,
    isPlaced: false,
  }
}
