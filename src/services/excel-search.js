/**
 * Service for searching character mentions in Excel
 */
const XLSX = require('xlsx');
const path = require('path');
const logger = require('../shared/logger');

const fs = require('fs');

class ExcelSearchService {
    constructor() {
        this.paths = {
            charHistory: path.join(__dirname, '../../docs/tabela podsumowan.xlsx'),
            mgProfiles: path.join(__dirname, '../../docs/Larp Gothic - Mapowanie kompetencji (Odpowiedzi).xlsx'),
            charTrees: path.join(__dirname, '../../docs/drzewka postaci.xlsx'),
            docsDir: path.join(__dirname, '../../docs/')
        };

        // Data caches
        this.data = {
            charHistory: null,
            mgProfiles: null,
            charTrees: null,
            factionHistory: {}
        };

        this.timestamps = {
            charHistory: 0,
            mgProfiles: 0,
            factionHistory: 0
        };

        this.CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
    }

    // --- Character History (Existing) ---
    async loadData() {
        return this.loadCharHistory();
    }

    async loadCharHistory() {
        const now = Date.now();
        if (this.data.charHistory && (now - this.timestamps.charHistory < this.CACHE_DURATION)) {
            return this.data.charHistory;
        }

        try {
            logger.info('Loading Character History', { path: this.paths.charHistory });
            if (!fs.existsSync(this.paths.charHistory)) {
                logger.warn('Character History file not found');
                return [];
            }

            const workbook = XLSX.readFile(this.paths.charHistory);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            this.data.charHistory = XLSX.utils.sheet_to_json(sheet);
            this.timestamps.charHistory = now;
            return this.data.charHistory;
        } catch (error) {
            logger.error('Failed to load Character History', { error: error.message });
            return [];
        }
    }

    // --- MG Profiles ---
    async loadMgProfiles() {
        const now = Date.now();
        if (this.data.mgProfiles && (now - this.timestamps.mgProfiles < this.CACHE_DURATION)) {
            return this.data.mgProfiles;
        }

        try {
            logger.info('Loading MG Profiles', { path: this.paths.mgProfiles });
            if (!fs.existsSync(this.paths.mgProfiles)) {
                logger.warn('MG Profiles file not found');
                return [];
            }

            const workbook = XLSX.readFile(this.paths.mgProfiles);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            const rawData = XLSX.utils.sheet_to_json(sheet);

            // Map to cleaner structure
            this.data.mgProfiles = rawData.map(row => ({
                id: row['Sygnatura czasowa'], // Use timestamp as ID
                email: row['Adres e-mail'],
                name: row['Imię i nazwisko'],
                role: row['Pełniona funkcja'],
                joined: row['Rok dołączenia do organizacji'],
                style_strengths: row['Z jakimi elementami prowadzenia gry czujesz się najlepiej?'] || '',
                style_weaknesses: row['Z jakimi elementami prowadzenia gry czujesz się najsłabiej/niepewnie?'] || '',
                preferences: row['Jakie rodzaje scen/wątków lubisz prowadzić najbardziej?'] || ''
            }));

            this.timestamps.mgProfiles = now;
            logger.info('MG Profiles loaded', { count: this.data.mgProfiles.length });
            return this.data.mgProfiles;
        } catch (error) {
            logger.error('Failed to load MG Profiles', { error: error.message });
            return [];
        }
    }

    // --- Faction History (2025 Inspiration) ---
    async loadFactionHistory() {
        const now = Date.now();
        // Check if any key exists in cache
        if (Object.keys(this.data.factionHistory).length > 0 && (now - this.timestamps.factionHistory < this.CACHE_DURATION)) {
            return this.data.factionHistory;
        }

        try {
            logger.info('Loading Faction History files...');
            const files = fs.readdirSync(this.paths.docsDir);
            const factionFiles = files.filter(f => f.startsWith('Fabuła') && f.endsWith('.xlsx'));

            const historyData = {};

            for (const file of factionFiles) {
                const fractionName = file.replace('Fabuła ', '').replace(' 2025.xlsx', '').trim();
                const fullPath = path.join(this.paths.docsDir, file);

                try {
                    const workbook = XLSX.readFile(fullPath);
                    const sheetName = workbook.SheetNames[0]; // Assume first sheet
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet);

                    historyData[fractionName] = rows;
                    logger.info(`Loaded faction history: ${fractionName}`, { count: rows.length });
                } catch (err) {
                    logger.warn(`Failed to read faction file: ${file}`, { error: err.message });
                }
            }

            this.data.factionHistory = historyData;
            this.timestamps.factionHistory = now;
            return this.data.factionHistory;
        } catch (error) {
            logger.error('Failed to load Faction History', { error: error.message });
            return {};
        }
    }

    // --- Character Trees (2021-2024 Index) ---
    async loadCharTrees() {
        const now = Date.now();
        if (this.data.charTrees && (now - this.timestamps.charTrees < this.CACHE_DURATION)) {
            return this.data.charTrees;
        }

        try {
            logger.info('Loading Character Trees', { path: this.paths.charTrees });
            if (!fs.existsSync(this.paths.charTrees)) {
                logger.warn('Character Trees file not found');
                return [];
            }

            const workbook = XLSX.readFile(this.paths.charTrees);
            // We want 'Indeks_postaci' sheet ideally, or first one if missing
            const sheetName = workbook.SheetNames.includes('Indeks_postaci')
                ? 'Indeks_postaci'
                : workbook.SheetNames[0];

            const sheet = workbook.Sheets[sheetName];
            this.data.charTrees = XLSX.utils.sheet_to_json(sheet);
            this.timestamps.charTrees = now;
            return this.data.charTrees;
        } catch (error) {
            logger.error('Failed to load Character Trees', { error: error.message });
            return [];
        }
    }


    generateNameVariations(name) {
        if (!name) return [];
        const cleanName = name.trim();
        const lowerName = cleanName.toLowerCase();

        // Start with base forms
        const variations = new Set([cleanName, lowerName]);

        // Split full name if exists
        const parts = cleanName.split(' ');
        if (parts.length > 1) {
            variations.add(parts[0]); // First name
            variations.add(parts[0].toLowerCase());
        }

        // Common Polish inflections (heuristic)
        if (lowerName.endsWith('a')) {
            // Feminine / Ends in 'a'
            const stem = lowerName.slice(0, -1);
            variations.add(stem + 'o'); // Kora -> Koro
            variations.add(stem + 'y'); // Kora -> Kory
            variations.add(stem + 'ę'); // Kora -> Korę
            variations.add(stem + 'ą'); // Kora -> Korą
            variations.add(stem + 'ze'); // Kora -> Korze (o Korze)
            variations.add(stem + 'i'); // Kora -> Kori (rare but possible)
        } else {
            // Masculine / Consonant ending
            variations.add(lowerName + 'a');   // Magnus -> Magnusa
            variations.add(lowerName + 'owi'); // Magnus -> Magnusowi
            variations.add(lowerName + 'em');  // Magnus -> Magnusem
            variations.add(lowerName + 'iem'); // Magnus -> Magnusiem (variant)
            variations.add(lowerName + 'ie');  // Magnus -> Magnusie
            variations.add(lowerName + 'u');   // Magnus -> Magnusu / Arik -> Ariku
            variations.add(lowerName + 'y');   // Rare but possible
        }

        return Array.from(variations);
    }

    async searchMentions(targetName) {
        if (!targetName) throw new Error('Target name is required');

        const data = await this.loadData();
        const variations = this.generateNameVariations(targetName);
        const results = [];

        // Columns to search in
        const searchColumns = [
            'about', 'friends', 'facts', 'now', 'guilt', 'future',
            'weaks', 'quests', 'summary', 'triger'
        ];

        // Column mapping for friendly display
        const columnNames = {
            'about': 'O postaci',
            'friends': 'Relacje',
            'facts': 'Fakty',
            'now': 'Teraźniejszość',
            'guilt': 'Wina',
            'future': 'Przyszłość/Cele',
            'weaks': 'Słabości',
            'quests': 'Questy',
            'summary': 'Podsumowanie',
            'triger': 'Trigger'
        };

        for (const row of data) {
            const rowName = row['name'] || row['nick'] || 'Unknown';

            // Skip self-references (fuzzy)
            if (rowName.toLowerCase().includes(targetName.toLowerCase())) continue;

            for (const col of searchColumns) {
                const cellValue = row[col];
                if (typeof cellValue === 'string') {
                    const lowerValue = cellValue.toLowerCase();

                    // Check all name variations
                    for (const variation of variations) {
                        const idx = lowerValue.indexOf(variation);
                        if (idx !== -1) {
                            // Logic to verify it's a "whole word" start to avoid Marik matching Arik
                            // We check if the character BEFORE the match is a letter.
                            // If it IS a letter, then it's a suffix match (bad).
                            // If it's NOT a letter (space, punctuation, start of string), it's good.

                            let currentIdx = idx;
                            let foundValidMatch = false;
                            const isLetter = (char) => /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(char);

                            while (currentIdx !== -1) {
                                // 1. Check BEFORE (Start of word)
                                const isStartOfWord = currentIdx === 0 || !isLetter(lowerValue[currentIdx - 1]);

                                // 2. Check AFTER (End of word)
                                const endIdx = currentIdx + variation.length;
                                const isEndOfWord = endIdx >= lowerValue.length || !isLetter(lowerValue[endIdx]);

                                if (isStartOfWord && isEndOfWord) {
                                    foundValidMatch = true;
                                    break;
                                }
                                // Find next occurrence
                                currentIdx = lowerValue.indexOf(variation, currentIdx + 1);
                            }

                            if (foundValidMatch) {
                                results.push({
                                    sourceName: rowName,
                                    sourceGuild: row['Gildia'] || row['guild'] || '',
                                    year: row['Rok'] || row['Edycja'] || 'Unknown',
                                    field: columnNames[col] || col,
                                    context: this.extractContext(cellValue, variation),
                                    fullText: cellValue
                                });
                                break;
                            }
                        }
                    }
                }
            }
        }

        return results;
    }

    extractContext(text, term) {
        if (!text) return '';
        const index = text.toLowerCase().indexOf(term.toLowerCase());
        if (index === -1) return text.substring(0, 100) + '...';

        const start = Math.max(0, index - 40);
        const end = Math.min(text.length, index + term.length + 60);

        let snippet = text.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        return snippet;
    }
    async getProfileByName(name) {
        await this.loadData();
        const data = this.data.charHistory;
        if (!data) return null;

        const normalize = (str) => (str || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const targetName = normalize(name);

        // 1. Exact match (normalized)
        let match = data.find(row => {
            const rowName = normalize(row['Imie postaci'] || row['name']);
            const rowNick = normalize(row['nick']);
            return rowName === targetName || rowNick === targetName;
        });

        // 2. Fallback: Check if target is a substring of row name (for "Iblis" -> "Iblis ibn Nadżib")
        if (!match) {
            match = data.find(row => {
                const rowName = normalize(row['Imie postaci'] || row['name']);
                return rowName.includes(targetName) || targetName.includes(rowName);
            });
        }

        return match || null;
    }

    async getAllNames() {
        await this.loadData();
        const data = this.data.charHistory;
        if (!data) return [];

        return data
            .map(row => row['Imie postaci'] || row['name'])
            .filter(name => name && typeof name === 'string' && name.length > 0);
    }
    /**
     * Enrich character datum with lore context extracted from text fields.
     * @param {Object} row - Raw row from Excel
     * @returns {Object} enriched context object
     */
    enrichCharacterMetadata(row) {
        // Aggregate all text
        const keys = ['about', 'facts', 'history', 'summary', 'ans1', 'ans2', 'ans3', 'ans4', 'ans5', 'ans6', 'ans7', 'ans8', 'ans9'];
        const fullText = keys.map(k => (row[k] || '')).join(' ').toLowerCase();

        const context = {
            badge: null,
            skills: [],
            seniority: 0.1 // Default: Newcomer
        };

        // 1. Identify Lore Badge (Specifics)
        const guild = (row['guild'] || row['class'] || '').toLowerCase();

        if (guild.includes('mag') || guild.includes('ogień') || fullText.includes('klasztor')) {
            // Mage Logic
            const circleMatch = fullText.match(/(i|ii|iii|iv|v|vi|\d)\s*krąg/i);
            if (circleMatch) {
                context.badge = `🔥 ${circleMatch[0].toUpperCase()}`;
            } else {
                context.badge = '🔥 Klasztor';
            }
            context.skills.push('magic');
        }
        else if (guild.includes('cień') || guild.includes('stary')) {
            // Shadow Logic
            if (fullText.includes('diego')) context.badge = '👥 Banda Diego';
            else if (fullText.includes('kruk')) context.badge = '🦅 Ludzie Kruka';
            else if (fullText.includes('gomez')) context.badge = '🏰 Ludzie Gomeza';
            else if (fullText.includes('fisk')) context.badge = '💰 Dłużnik Fiska';
            else if (fullText.includes('brama')) context.badge = '🛡️ Brama Płn.';
            else context.badge = '⛺ Stary Obóz';

            context.skills.push('stealth');
        }
        else if (guild.includes('szkodnik') || guild.includes('nowy')) {
            // Rogue Logic
            // New Rule: Thief vs Bandit
            if (fullText.includes('złodziej') || fullText.includes('krad')) context.badge = '🧤 Grupa Złodziei';
            else if (fullText.includes('bandyt') || fullText.includes('napad')) context.badge = '⚔️ Bandyci';
            else if (fullText.includes('lares')) context.badge = '🗡️ Banda Laresa';
            else if (fullText.includes('lee')) context.badge = '⚔️ Najemnicy Lee';
            else if (fullText.includes('ryż')) context.badge = '🌾 Pola Ryżowe';
            else context.badge = '🌊 Nowy Obóz';

            context.skills.push('combat');
        }
        else if (guild.includes('bractwo') || guild.includes('nowicjusz') || guild.includes('bagna')) {
            // Sect Logic
            if (fullText.includes('zbiór') || fullText.includes('ziera')) context.badge = '🌿 Zbieracz';
            else if (fullText.includes('guru') || fullText.includes('cor')) context.badge = '👁️ Uczeń Guru';
            else context.badge = '🏯 Obóz Bractwa';

            context.skills.push('alchemy');
        }
        else if (guild.includes('kopacz')) {
            // Digger Logic - Brigades
            const brigadeMatch = fullText.match(/(\d+)\.?\s*brygada|brygada\s*(\d+)/);
            if (brigadeMatch) {
                const num = brigadeMatch[1] || brigadeMatch[2];
                context.badge = `⛏️ Brygada ${num}`;
            }
            else if (fullText.includes('szyb') || fullText.includes('kopalni')) context.badge = '⛏️ Szyb Złoty';
            else context.badge = '⛏️ Zew. Pierścień';

            context.skills.push('smith'); // Often digging implies strength/smithing affinity
        }

        // 2. Extract Skills
        if (fullText.includes('alchemi') || fullText.includes('mikstur')) context.skills.push('alchemy');
        if (fullText.includes('kradzież') || fullText.includes('włam') || fullText.includes('złodziej')) context.skills.push('thief');
        if (fullText.includes('polowan') || fullText.includes('skór') || fullText.includes('zwierz') || fullText.includes('trofe')) context.skills.push('hunt');
        if (fullText.includes('handel') || fullText.includes('kupiec') || fullText.includes('towar')) context.skills.push('trade');
        if (fullText.includes('miecz') || fullText.includes('walka') || fullText.includes('siła')) context.skills.push('sword');
        if (fullText.includes('kowal')) context.skills.push('smith');

        // Dedupe skills
        context.skills = [...new Set(context.skills)];

        // 3. Extract Seniority (Editions)
        // Look for "3 edycja", "2 raz", etc.
        const editionMatch = fullText.match(/(\d+)\.?\s*(edycja|raz)/);
        if (editionMatch) {
            const count = parseInt(editionMatch[1]);
            // Normalize to 0-1 scale for bar: 1 is newcomer, 10 is max veteran
            context.seniority = Math.min(count * 0.1, 1.0);
            context.seniorityLabel = `${count}. Edycja`;
        } else {
            if (fullText.includes('stary') || fullText.includes('weteran')) {
                context.seniority = 0.8;
                context.seniorityLabel = 'Weteran';
            }
            else {
                context.seniority = 0.1;
                context.seniorityLabel = 'Debiut';
            }
        }

        return context;
        return context;
    }

    /**
     * Enrich a list of profiles with full lore context from local Faction History files.
     * @param {Array} profiles - List of profile objects
     * @returns {Promise<Array>} - Enriched profiles
     */
    async enrichWithLore(profiles) {
        // Ensure faction data is loaded
        const factionData = await this.loadFactionHistory();

        // Build efficient Lookup Map: Name (normalized) -> Lore Object
        const loreMap = new Map();

        Object.values(factionData).forEach(rows => {
            rows.forEach(row => {
                const name = (row['Imię postaci'] || row['Imie postaci'] || '').trim().toLowerCase();
                if (name) {
                    loreMap.set(name, {
                        group: row['Grupa / Profesja'] || row['Grupa'] || '',
                        description: row['Krótki opis postaci'] || '',
                        keywords: row['Słowa kluczowe'] || '',
                        plots: row['Wątki'] || '',
                        facts: row['Najważniejsze fakty z podsumowania'] || '',
                        goals: row['Cele personalne'] || '',
                        notes: row['Notatki'] || '',
                        playstyle: row['Playstyle'] || '',
                        origin: `${row['Pochodzenie ogólne'] || ''} ${row['Pochodzenie dokładne'] || ''}`.trim()
                    });
                }
            });
        });

        // Enrich profiles
        profiles.forEach(p => {
            const pNameFull = (p['Imie postaci'] || p['name'] || '').trim().toLowerCase();
            const pNameFirst = pNameFull.split(' ')[0]; // Handle "Nox (Cień)" -> "Nox"

            let lore = loreMap.get(pNameFull);

            // Fallback: Try first name or partial match if no exact match
            if (!lore) {
                for (const [key, val] of loreMap.entries()) {
                    if (key.includes(pNameFull) || pNameFull.includes(key)) {
                        lore = val;
                        break;
                    }
                }
            }

            if (lore) {
                p['StoryGroup'] = lore.group;
                p['Fabuła_Opis'] = lore.description;
                p['Fabuła_SłowaKluczowe'] = lore.keywords;
                p['Fabuła_Wątki'] = lore.plots;
                p['Fabuła_Fakty'] = lore.facts;
                p['Fabuła_Cele'] = lore.goals;
                p['Fabuła_Notatki'] = lore.notes;
                p['Fabuła_Playstyle'] = lore.playstyle;
                if (lore.origin && (!p['Region'] || p['Region'].includes('Nieznany'))) {
                    p['Region'] = lore.origin;
                }
            }
        });

        return profiles;
    }

} // End of Class

module.exports = new ExcelSearchService();
