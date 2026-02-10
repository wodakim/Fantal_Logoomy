import { MAX_ENTITIES } from '../EntityManager.js';

export const COMPONENT_TRANSFORM = {
    x: new Uint8Array(MAX_ENTITIES),
    y: new Uint8Array(MAX_ENTITIES),
    z: new Uint8Array(MAX_ENTITIES),
    dir: new Uint8Array(MAX_ENTITIES) // 0-3
};
