import { MAX_ENTITIES } from '../EntityManager.js';

export const COMPONENT_STATS = {
    hp: new Int16Array(MAX_ENTITIES),
    maxHp: new Int16Array(MAX_ENTITIES),
    ct: new Uint8Array(MAX_ENTITIES),
    speed: new Uint8Array(MAX_ENTITIES),
    // Limb Loss Bitmask (0x01: Left Arm, 0x02: Right Arm, 0x04: Legs, 0x08: Head)
    limbs: new Uint8Array(MAX_ENTITIES)
};
