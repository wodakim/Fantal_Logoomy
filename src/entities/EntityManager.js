export const MAX_ENTITIES = 256;

export class EntityManager {
    constructor() {
        this.count = 0;
        this.nextId = 0;
        this.activeMap = new Uint8Array(MAX_ENTITIES); // 1 = active, 0 = free
    }

    createEntity() {
        // Find first free slot
        let id = -1;
        for (let i = 0; i < MAX_ENTITIES; i++) {
            if (this.activeMap[i] === 0) {
                id = i;
                break;
            }
        }

        if (id === -1) {
            console.error("Max entities reached!");
            return null;
        }

        this.activeMap[id] = 1;
        this.count++;
        return id;
    }

    removeEntity(id) {
        if (this.activeMap[id] === 1) {
            this.activeMap[id] = 0;
            this.count--;
            // TODO: Clear component data for this ID
        }
    }
}
