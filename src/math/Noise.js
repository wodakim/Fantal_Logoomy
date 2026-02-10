// Simple Noise implementation placeholder
export class Noise {
    constructor(seed) {
        this.seed = seed;
    }

    get(x, y) {
        return Math.sin(x) * Math.cos(y); // Placeholder
    }
}
