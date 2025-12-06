const fs = require('fs');
const path = require('path');
const logger = require('../shared/logger');

class WorldContextService {
    constructor() {
        this.basePath = path.join(__dirname, '../../docs/parsed');
        this.cache = {
            weaknesses: null,
            plots: null,
            world: null,
            factions: null
        };
    }

    readFile(filename) {
        try {
            const filePath = path.join(this.basePath, filename);
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf-8');
            }
            logger.warn(`World Context file not found: ${filename}`);
            return '';
        } catch (err) {
            logger.error(`Error reading ${filename}:`, err);
            return '';
        }
    }

    loadWeaknessContext() {
        if (!this.cache.weaknesses) {
            this.cache.weaknesses = this.readFile('Słabości i Zagrożenia Kolonii Karnej.txt');
        }
        return this.cache.weaknesses;
    }

    loadPlotContext() {
        if (!this.cache.plots) {
            this.cache.plots = this.readFile('Intrygi i Ambicje Kolonii Karnej.txt');
        }
        return this.cache.plots;
    }

    loadWorldContext() {
        if (!this.cache.world) {
            this.cache.world = this.readFile('Geografia i Lore Świata Gothic LARP.txt');
        }
        return this.cache.world;
    }

    loadFactionContext() {
        if (!this.cache.factions) {
            this.cache.factions = this.readFile('System, Frakcje i Intrygi Kolonii Karnej.txt');
        }
        return this.cache.factions;
    }

    getAllContexts() {
        return {
            weaknesses: this.loadWeaknessContext(),
            plots: this.loadPlotContext(),
            world: this.loadWorldContext(),
            factions: this.loadFactionContext()
        };
    }
}

module.exports = new WorldContextService();
