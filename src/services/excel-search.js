/**
 * Service for searching character mentions in Excel
 */
const XLSX = require('xlsx');
const path = require('path');
const logger = require('../shared/logger');

class ExcelSearchService {
    constructor() {
        this.filePath = path.join(__dirname, '../../docs/tabela podsumowan.xlsx');
        this.data = null;
        this.lastLoad = 0;
        this.CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
    }

    async loadData() {
        const now = Date.now();
        if (this.data && (now - this.lastLoad < this.CACHE_DURATION)) {
            return this.data;
        }

        try {
            logger.info('Loading Excel file for search', { path: this.filePath });
            const workbook = XLSX.readFile(this.filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Read with headers
            this.data = XLSX.utils.sheet_to_json(sheet);
            this.lastLoad = now;
            logger.info('Excel data loaded', { rows: this.data.length });
            return this.data;
        } catch (error) {
            logger.error('Failed to load Excel file', { error: error.message });
            throw error;
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
        if (!this.data) return null;

        const normalize = (str) => (str || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const targetName = normalize(name);

        // 1. Exact match (normalized)
        let match = this.data.find(row => {
            const rowName = normalize(row['Imie postaci'] || row['name']);
            const rowNick = normalize(row['nick']);
            return rowName === targetName || rowNick === targetName;
        });

        // 2. Fallback: Check if target is a substring of row name (for "Iblis" -> "Iblis ibn Nadżib")
        if (!match) {
            match = this.data.find(row => {
                const rowName = normalize(row['Imie postaci'] || row['name']);
                return rowName.includes(targetName) || targetName.includes(rowName);
            });
        }

        return match || null;
    }

    async getAllNames() {
        await this.loadData();
        if (!this.data) return [];

        return this.data
            .map(row => row['Imie postaci'] || row['name'])
            .filter(name => name && typeof name === 'string' && name.length > 0);
    }
}

module.exports = new ExcelSearchService();
