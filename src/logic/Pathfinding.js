export class Pathfinding {
    constructor(chunk) {
        this.chunk = chunk;
    }

    // Returns array of {x, y} or empty if no path
    findPath(startX, startY, endX, endY, jumpHeight) {
        // Simple A* implementation
        const size = this.chunk.size;
        const startNode = { x: startX, y: startY, g: 0, h: 0, parent: null };

        let openSet = [startNode];
        let closedSet = new Uint8Array(size * size); // 0 or 1

        while (openSet.length > 0) {
            // Sort by f = g + h (Inefficient for JS, use MinHeap in prod)
            openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
            let current = openSet.shift();

            if (current.x === endX && current.y === endY) {
                // Reconstruct path
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
                if (closedSet[n.y * size + n.x]) continue;

                // Height check
                const h1 = this.chunk.heightMap[current.y * size + current.x];
                const h2 = this.chunk.heightMap[n.y * size + n.x];
                if (Math.abs(h1 - h2) > jumpHeight) continue;

                // Add to open set
                const g = current.g + 1; // + cost (fluid = 2)
                const h = Math.abs(n.x - endX) + Math.abs(n.y - endY);
                openSet.push({ x: n.x, y: n.y, g: g, h: h, parent: current });
            }
        }
        return [];
    }
}
