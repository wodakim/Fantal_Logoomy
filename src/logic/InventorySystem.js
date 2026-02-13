import { ITEMS, ITEM_TYPES } from '../data/Items.js';

export class InventorySystem {
    constructor() {
        this.inventory = []; // List of Item IDs
        this.equipment = {
            mainHand: null, // Item ID
            offHand: null,
            armor: null,
            accessory: null
        };
    }

    addItem(itemId) {
        if (ITEMS[itemId]) {
            this.inventory.push(itemId);
            console.log(`Added item: ${ITEMS[itemId].name}`);
            return true;
        }
        return false;
    }

    removeItem(itemId) {
        const index = this.inventory.indexOf(itemId);
        if (index > -1) {
            this.inventory.splice(index, 1);
            return true;
        }
        return false;
    }

    equipItem(itemId, slot) {
        if (!this.inventory.includes(itemId)) {
            console.warn("Cannot equip item: Not in inventory.");
            return false;
        }

        const item = ITEMS[itemId];
        if (!item) return false;

        // Auto-detect slot if not provided
        if (!slot) {
            if (item.type === ITEM_TYPES.WEAPON) slot = 'mainHand';
            else if (item.type === ITEM_TYPES.ARMOR) slot = 'armor';
            else if (item.type === ITEM_TYPES.ACCESSORY) slot = 'accessory';
        }

        // Unequip current
        if (this.equipment[slot]) {
            this.unequipItem(slot);
        }

        this.equipment[slot] = itemId;
        // Remove from inventory while equipped? Or keep it?
        // Usually in RPGs, equipped items leave the "bag".
        this.removeItem(itemId);
        console.log(`Equipped ${item.name} to ${slot}`);
        return true;
    }

    unequipItem(slot) {
        if (this.equipment[slot]) {
            this.inventory.push(this.equipment[slot]);
            this.equipment[slot] = null;
        }
    }

    getWeaponPower() {
        const weaponId = this.equipment.mainHand;
        if (weaponId && ITEMS[weaponId]) {
            return ITEMS[weaponId].wp;
        }
        return 0; // Unarmed or fallback default handled by calculator
    }

    // Load from save
    loadState(data) {
        if (data.inventory) this.inventory = data.inventory;
        if (data.equipment) this.equipment = data.equipment;
    }

    saveState() {
        return {
            inventory: this.inventory,
            equipment: this.equipment
        };
    }
}
