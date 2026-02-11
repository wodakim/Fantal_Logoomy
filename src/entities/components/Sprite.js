import { MAX_ENTITIES } from '../EntityManager.js';

export const COMPONENT_SPRITE = {
    active: new Uint8Array(MAX_ENTITIES),
    // We can't store ImageBitmap in TypedArray.
    // We store an ID that references a cache, or we cheat for Phase 9 and use a Map.
    // For Strict ECS with TypedArrays, usually we store an integer ID (SpriteID).
    spriteId: new Uint16Array(MAX_ENTITIES),
    color: new Uint32Array(MAX_ENTITIES) // Hex integer 0xRRGGBBAA? Or just index.
};

// Global Sprite Cache (Not strict ECS but necessary for JS objects)
export const SPRITE_CACHE = [];
