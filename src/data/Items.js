export const ITEM_TYPES = {
    WEAPON: "WEAPON",
    ARMOR: "ARMOR",
    ACCESSORY: "ACCESSORY",
    MATERIAL: "MATERIAL"
};

export const ITEMS = {
    // Weapons
    101: {
        id: 101,
        name: "Rusty Bone Shiv",
        type: ITEM_TYPES.WEAPON,
        wp: 6,
        range: 1,
        desc: "A sharpened femur. Crude but effective."
    },
    102: {
        id: 102,
        name: "Iron Cleaver",
        type: ITEM_TYPES.WEAPON,
        wp: 12,
        range: 1,
        desc: "Heavy blade used for butchering."
    },
    104: {
        id: 104,
        name: "Serrated Bone Blade",
        type: ITEM_TYPES.WEAPON,
        wp: 18,
        w_ev: 15,
        range: 1,
        effect: { onHit: "ADD_BLEED", chance: 0.25 },
        desc: "Causes severe hemorrhaging."
    },

    // Armor
    201: {
        id: 201,
        name: "Leather Apron",
        type: ITEM_TYPES.ARMOR,
        hp_bonus: 20,
        desc: "Stained with blood. Offers minimal protection."
    },

    // Materials (Loot)
    901: { id: 901, name: "Flesh Scraps", type: ITEM_TYPES.MATERIAL },
    902: { id: 902, name: "Intact Heart", type: ITEM_TYPES.MATERIAL },
    903: { id: 903, name: "Demon Horn", type: ITEM_TYPES.MATERIAL }
};
