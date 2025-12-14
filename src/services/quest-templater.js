const fs = require('fs');
const path = require('path');
const logger = require('../shared/logger');

class QuestTemplater {
    constructor() {
        this.templates = {};
        this.categories = [];
        this.isLoaded = false;
        this.questsPath = path.join(__dirname, '../contexts/quests.txt');
    }

    load() {
        try {
            if (!fs.existsSync(this.questsPath)) {
                logger.warn('QuestTemplater: quests.txt not found at ' + this.questsPath);
                return;
            }

            const content = fs.readFileSync(this.questsPath, 'utf-8');
            this._parseContent(content);
            this.isLoaded = true;
            logger.info(`QuestTemplater: Loaded ${this.categories.length} categories and ${this._countTotal()} templates.`);
        } catch (error) {
            logger.error('QuestTemplater: Failed to load templates', error);
        }
    }

    _parseContent(content) {
        const lines = content.split('\n');
        let currentCategory = 'General';

        // Styles mapping based on file structure headers
        // Headers look like: "I. Mroczna Intryga & Dworska Decepcja (Questy 1–25)"

        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            // Detect Category Header
            if (line.match(/^[IVX]+\./)) {
                // Remove numbering and parens
                currentCategory = line.replace(/^[IVX]+\.\s*/, '').replace(/\s*\(.*\)/, '').trim();
                if (!this.templates[currentCategory]) {
                    this.templates[currentCategory] = [];
                    this.categories.push(currentCategory);
                }
            }
            // Detect Template: "[Style]: [Content]"
            else if (line.startsWith('[')) {
                // e.g. "[Mroczna Intryga]: Text..."
                // We want to store the whole line as a template, or maybe just the content?
                // Storing whole line gives context to AI.
                if (!this.templates[currentCategory]) {
                    // Fallback if no header found yet
                    this.templates[currentCategory] = [];
                }
                this.templates[currentCategory].push(line);
            }
        });
    }

    _countTotal() {
        return Object.values(this.templates).reduce((acc, arr) => acc + arr.length, 0);
    }

    getTemplates(style = 'auto', count = 3) {
        if (!this.isLoaded) this.load();

        let pool = [];

        if (style === 'auto' || !style) {
            // Flatten all
            pool = Object.values(this.templates).flat();
        } else {
            // Find matching category (fuzzy match)
            // Style input might be 'political', 'mystical' (from UI keys) or full name
            const map = {
                'political': 'Mroczna Intryga & Dworska Decepcja',
                'mystical': 'Mistyczna Wizja & Kultowy Dogmat',
                'ambition': 'Osobista Ambitność & Zemsta Skazańca',
                'action': 'Surowy Realizm & Brutalna Egzekucja'
            };

            const key = map[style] || Object.keys(this.templates).find(k => k.toLowerCase().includes(style.toLowerCase()));

            if (key && this.templates[key]) {
                pool = this.templates[key];
            } else {
                // Fallback to random if style not found
                pool = Object.values(this.templates).flat();
            }
        }

        if (pool.length === 0) return [];

        // Random selection
        const selected = [];
        const usedIndices = new Set();

        // Safety cap
        const needed = Math.min(count, pool.length);

        while (selected.length < needed) {
            const idx = Math.floor(Math.random() * pool.length);
            if (!usedIndices.has(idx)) {
                usedIndices.add(idx);
                selected.push(pool[idx]);
            }
        }

        return selected;
    }
}

module.exports = new QuestTemplater();
