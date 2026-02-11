export class Pathfinding {
    constructor(chunk) {
        this.chunk = chunk;
    }

    // Returns array of {x, y} or empty if no path
    findPath(startX, startY, endX, endY, jumpHeight) {
        const size = this.chunk.size;

        // Safety Check
        if (startX < 0 || startX >= size || startY < 0 || startY >= size) return [];
        if (endX < 0 || endX >= size || endY < 0 || endY >= size) return [];

        // Props Check: Is destination blocked by a Prop?
        // (Assuming Unit cannot stand on a Prop)
        const endIdx = this.chunk.getIndex(endX, endY);
        if (this.chunk.objIndex[endIdx] > 0) return []; // Target is obstacle

        const startNode = { x: startX, y: startY, g: 0, h: 0, parent: null };

        let openSet = [startNode];
        let closedSet = new Uint8Array(size * size); // 0 or 1

        while (openSet.length > 0) {
            // Sort
            openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            let current = openSet.shift();

            if (current.x === endX && current.y === endY) {
                // Reconstruct
                let path = [];
                let temp = current;
                while (temp) {
                    path.push({ x: temp.x, y: temp.y });
                    temp = temp.parent;
                }
                return path.reverse();
            }

            closedSet[current.y * size + current.x] = 1;

            const neighbors = [
                {x: current.x, y: current.y-1},
                {x: current.x, y: current.y+1},
                {x: current.x-1, y: current.y},
                {x: current.x+1, y: current.y}
            ];

            for (let n of neighbors) {
                if (n.x < 0 || n.x >= size || n.y < 0 || n.y >= size) continue;

                const idx = n.y * size + n.x;
                if (closedSet[idx]) continue;

                // Obstacle Check (Props)
                if (this.chunk.objIndex[idx] > 0) continue;

                // Height check
                const h1 = this.chunk.heightMap[current.y * size + current.x];
                const h2 = this.chunk.heightMap[idx];
                if (Math.abs(h1 - h2) > jumpHeight) continue;

                // Cost
                const g = current.g + 1;
                const h = Math.abs(n.x - endX) + Math.abs(n.y - endY);

                // Check if already in openSet with lower g
                const existing = openSet.find(o => o.x === n.x && o.y === n.y);
                if (existing && existing.g <= g) continue;

                if (!existing) {
                    openSet.push({ x: n.x, y: n.y, g: g, h: h, parent: current });
                }
            }
        }
        return [];
    }
}
