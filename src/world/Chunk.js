export class Chunk {
    constructor(size = 16) {
        this.size = size;
        this.area = size * size;

        this.heightMap = new Int8Array(this.area);
        this.typeMap = new Uint8Array(this.area);
        this.liquidLevel = new Uint8Array(this.area);
    }

    getIndex(x, y) {
        return y * this.size + x;
    }

    // Debug method to create some terrain
    randomize() {
        for (let i = 0; i < this.area; i++) {
            this.heightMap[i] = Math.floor(Math.random() * 4); // Random height 0-3
            this.typeMap[i] = 1; // Stone
        }
    }
}
