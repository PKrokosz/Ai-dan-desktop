const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class PromotionTracker {
    constructor() {
        this.cache = null;
        this.filePath = path.join(process.cwd(), 'docs', 'drzewka postaci.xlsx');
    }

    loadData() {
        if (this.cache) return this.cache;

        try {
            if (!fs.existsSync(this.filePath)) {
                console.warn('PromotionTracker: Excel file not found at', this.filePath);
                return [];
            }

            const workbook = XLSX.readFile(this.filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (json.length < 3) return [];

            const yearsRow = json[0];
            // Identify year columns mapping
            // Structure: Gracz, Drzewko, 2018, empty, 2019, empty...
            // Col 2 = 2018 Class, Col 3 = 2018 Name.
            // Years logic: checking non-empty or previous.

            const yearMap = [];
            let currentYear = null;

            // Start from column 2
            for (let i = 2; i < yearsRow.length; i++) {
                if (yearsRow[i]) {
                    currentYear = yearsRow[i];
                }
                // We assume pairs: Class, Name.
                // But wait, the subheader says [Klasa, Imię].
                // So for column i, year is currentYear.
                if (currentYear) {
                    yearMap[i] = currentYear;
                }
            }

            const promotions = []; // { name, year, rank, player }

            // Iterate rows starting from index 2
            for (let r = 2; r < json.length; r++) {
                const row = json[r];
                const player = row[0];

                // Iterate columns pairs starting from 2
                for (let c = 2; c < row.length - 1; c += 2) {
                    const year = yearMap[c];
                    const rank = row[c];      // Klasa/Ranga
                    const name = row[c + 1];  // Imię

                    if (name && year && rank) {
                        // Normalize name
                        const cleanName = name.trim();
                        if (cleanName.length > 1) {
                            promotions.push({
                                name: cleanName,
                                year: year.toString(),
                                rank: rank.trim(),
                                player: player || 'Nieznany'
                            });
                        }
                    }
                }
            }

            console.log(`PromotionTracker: Loaded ${promotions.length} promotion events.`);
            this.cache = promotions;
            return promotions;

        } catch (e) {
            console.error('PromotionTracker Error:', e);
            return [];
        }
    }

    getPromotionsForCharacter(characterName) {
        const all = this.loadData();
        if (!characterName) return [];

        // Simple fuzzy match or strict?
        // Names in excel might be just "Magnus", "Magnus (Cośtam)".
        // CharacterName from API might be "Magnus Żelazne Serce".

        const target = characterName.toLowerCase();

        return all.filter(p => {
            const source = p.name.toLowerCase();
            // Check exact match or inclusion
            return source === target || target.includes(source) || source.includes(target);
        });
    }
}

module.exports = new PromotionTracker();
