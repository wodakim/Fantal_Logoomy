import { MAX_ENTITIES } from '../EntityManager.js';

export const COMPONENT_STATS = {
    hp: new Int16Array(MAX_ENTITIES),
    maxHp: new Int16Array(MAX_ENTITIES),
    ct: new Uint8Array(MAX_ENTITIES),
    speed: new Uint8Array(MAX_ENTITIES)
};
