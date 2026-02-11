export class SaveSystem {
    constructor() {
        this.key = 'VERMILION_SAVE_ALPHA';
    }

    save(heroStats, inventory) {
        const data = {
            hero: {
                hp: heroStats.hp[0],
                maxHp: heroStats.maxHp[0],
                speed: heroStats.speed[0]
                // Add XP later
            },
            inventory: inventory || [],
            timestamp: Date.now()
        };
        localStorage.setItem(this.key, JSON.stringify(data));
        console.log("Game Saved", data);
    }

    load() {
        const str = localStorage.getItem(this.key);
        if (!str) return null;
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error("Save Corrupted", e);
            return null;
        }
    }

    clear() {
        localStorage.removeItem(this.key);
    }
}
