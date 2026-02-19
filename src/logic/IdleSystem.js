export class IdleSystem {
    constructor() {
        this.key = 'VERMILION_IDLE_ALPHA';

        this.resourceIds = ['wood', 'stone', 'herb', 'insect'];
        this.resources = new Uint32Array(this.resourceIds.length);

        this.jobIds = ['lumber', 'mining', 'herbalism', 'entomology'];
        this.jobLevels = new Uint8Array(this.jobIds.length);
        this.jobXp = new Uint32Array(this.jobIds.length);

        this.lastTick = Date.now();
        this._initLevels();
        this.load();
    }

    _initLevels() {
        for (let i = 0; i < this.jobLevels.length; i++) {
            if (this.jobLevels[i] < 1) this.jobLevels[i] = 1;
        }
    }

    _jobRate(index) {
        return 0.2 + (this.jobLevels[index] * 0.08);
    }

    _gain(index, amount) {
        this.resources[index] += amount;
        this.jobXp[index] += amount;

        const xpNeed = this.jobLevels[index] * 150;
        if (this.jobXp[index] >= xpNeed && this.jobLevels[index] < 10) {
            this.jobXp[index] -= xpNeed;
            this.jobLevels[index] += 1;
        }
    }

    tick(dtSec) {
        for (let i = 0; i < this.jobIds.length; i++) {
            const base = Math.floor(this._jobRate(i) * dtSec);
            if (base > 0) this._gain(i, base);

            if (this.jobLevels[i] >= 3 && Math.random() < 0.005 * dtSec) {
                // higher level unlocks more side material from same section
                const bonus = (i + 1) % this.resources.length;
                this.resources[bonus] += 1;
            }
        }
    }

    applyOfflineProgress() {
        const now = Date.now();
        const elapsedSec = Math.min(60 * 60 * 8, Math.floor((now - this.lastTick) / 1000));
        if (elapsedSec > 0) this.tick(elapsedSec);
        this.lastTick = now;
    }

    getState() {
        const res = {};
        const jobs = {};
        this.resourceIds.forEach((id, i) => { res[id] = this.resources[i]; });
        this.jobIds.forEach((id, i) => {
            jobs[id] = {
                level: this.jobLevels[i],
                xp: this.jobXp[i],
                xpNeed: this.jobLevels[i] * 150
            };
        });
        return { resources: res, jobs };
    }

    save() {
        const data = {
            resources: Array.from(this.resources),
            jobLevels: Array.from(this.jobLevels),
            jobXp: Array.from(this.jobXp),
            lastTick: this.lastTick
        };
        localStorage.setItem(this.key, JSON.stringify(data));
    }

    load() {
        const raw = localStorage.getItem(this.key);
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            if (data.resources) this.resources.set(data.resources);
            if (data.jobLevels) this.jobLevels.set(data.jobLevels);
            if (data.jobXp) this.jobXp.set(data.jobXp);
            if (data.lastTick) this.lastTick = data.lastTick;
            this._initLevels();
        } catch (e) {
            console.warn('Idle save corrupted', e);
        }
    }

    boostAll(amount = 100) {
        for (let i = 0; i < this.resources.length; i++) this.resources[i] += amount;
    }
}
