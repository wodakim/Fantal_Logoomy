export class Chunk {
    constructor(size = 16) {
        this.size = size;
        this.area = size * size;

        this.heightMap = new Int8Array(this.area);   // Z height
        this.typeMap = new Uint8Array(this.area);    // Biome
        this.liquidLevel = new Uint8Array(this.area); // Fluids
        this.objIndex = new Int16Array(this.area);    // Props ID (Fixed: Initialized now)
        this.wallMap = new Uint8Array(this.area);     // Walls

        this.unitIndex = new Int16Array(this.area).fill(-1); // Unit ID occupancy
    }

    getIndex(x, y) {
        return y * this.size + x;
    }

    randomize() {
        for (let i = 0; i < this.area; i++) {
            this.heightMap[i] = Math.floor(Math.random() * 4);
            this.typeMap[i] = 1;
        }
    }
}
