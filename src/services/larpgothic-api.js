/**
 * @module LarpGothicService
 * @description Pobieranie profili postaci z API larpgothic.pl
 */

const https = require('https');
const config = require('../shared/config');
const logger = require('../shared/logger');

class LarpGothicService {
    constructor() {
        this.baseUrl = 'https://larpgothic.pl/api';
        this.apiKey = process.env.LARPGOTHIC_API_KEY || '1c28ff73-6013-4d5b-8c9c-ae847e02b4bb';

        // Character/Guild mappings (identified from API data)
        this.characterMap = {
            16: 'Skazaniec',
            1: 'Kopacz',
            2: 'Cień',
            3: 'Strażnik',
            5: 'Mag Ognia',
            30: 'Służba',
            4: 'Magnat',
            21: 'Kret',
            13: 'Szkodnik',
            14: 'Najemnik',
            6: 'Mag Wody',
            7: 'Nowicjusz',
            15: 'Strażnik Świątynny',
            18: 'Guru'
        };

        // Region mappings (IDs 1-7 found, using generic names until verified)
        this.regionMap = {
            1: 'Region 1 (Stary Obóz?)',
            2: 'Region 2',
            3: 'Region 3',
            4: 'Region 4 (Kopalnia?)',
            5: 'Region 5',
            6: 'Region 6',
            7: 'Region 7'
        };

        // Tag categories for semantic search
        this.tagCategories = {
            // ⚖️ Za co siedzi (guilt/crime)
            'kradzież': { icon: '🗡️', keywords: ['kradzież', 'kradł', 'złodziej', 'ukradł', 'włamanie'] },
            'przemyt': { icon: '📦', keywords: ['przemyt', 'przemycał', 'kontraband', 'szmuglował'] },
            'zabójstwo': { icon: '💀', keywords: ['zabójstwo', 'zabił', 'morderstwo', 'morderca', 'śmierć'] },
            'oszustwo': { icon: '🎭', keywords: ['oszustwo', 'oszukał', 'fałszerstwo', 'szarlatan'] },
            'bójka': { icon: '👊', keywords: ['bójka', 'pobicie', 'napaść', 'bijatyka'] },
            'długi': { icon: '💰', keywords: ['dług', 'długi', 'nie spłacił', 'bankrut'] },

            // 💼 Zawód/Zajęcie
            'górnik': { icon: '⛏️', keywords: ['kopacz', 'górnik', 'ruda', 'kopalnia', 'wydobycie', 'kopie'] },
            'kowal': { icon: '🔨', keywords: ['kowal', 'płatnerz', 'kuźnia', 'żelazo', 'ostrza', 'miecz'] },
            'handlarz': { icon: '💎', keywords: ['kupiec', 'handlarz', 'handel', 'sprzedaż', 'targ', 'sklep'] },
            'łowca': { icon: '🏹', keywords: ['łowca', 'myśliwy', 'polowanie', 'tropiciel', 'zwierzyna'] },
            'strażnik': { icon: '🛡️', keywords: ['strażnik', 'ochroniarz', 'wartownik', 'patrol'] },
            'najemnik': { icon: '⚔️', keywords: ['najemnik', 'wojownik', 'gladiator', 'walka', 'żołnierz'] },
            'zielarz': { icon: '🌿', keywords: ['zielarz', 'uzdrowiciel', 'medyk', 'leczenie', 'ziół'] },
            'alchemik': { icon: '⚗️', keywords: ['alchemik', 'alchemia', 'mikstury', 'eliksir'] },
            'paser': { icon: '🔓', keywords: ['paser', 'paserstwo', 'kradzione', 'cienie'] },
            'skryba': { icon: '📜', keywords: ['skryba', 'pisarz', 'uczony', 'księgi', 'czytanie'] },

            // ⚠️ Wady/Cechy (useful for GM)
            'alkoholik': { icon: '🍺', keywords: ['alkohol', 'pijak', 'pić', 'wódka', 'piwo'] },
            'hazardzista': { icon: '🎲', keywords: ['hazard', 'kości', 'grać', 'zakład'] },
            'chciwość': { icon: '🤑', keywords: ['chciwy', 'chciwość', 'żądny', 'bogactwo'] },
            'gniew': { icon: '😠', keywords: ['gniewny', 'wściekły', 'porywczy', 'agresywny'] },
            'tchórz': { icon: '😰', keywords: ['tchórz', 'strach', 'boi się', 'ucieka'] },
            'naiwny': { icon: '🤷', keywords: ['naiwny', 'łatwowierny', 'głupi', 'ufny'] }
        };
    }

    /**
     * Fetch profiles with optional search filters
     * @param {Object} search - Search filters (name, character, region, city, friends, trigger, edition)
     * @returns {Promise<{success: boolean, rows: Array, error?: string}>}
     */
    async fetchProfiles(search = {}) {
        return new Promise((resolve) => {
            try {
                let url = `${this.baseUrl}/profiles`;

                if (Object.keys(search).length > 0) {
                    url += `?search=${encodeURIComponent(JSON.stringify(search))}`;
                }

                logger.info('Fetching from LarpGothic API', { url, search });

                const urlObj = new URL(url);
                const options = {
                    hostname: urlObj.hostname,
                    path: urlObj.pathname + urlObj.search,
                    method: 'GET',
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Accept': 'application/json'
                    }
                };

                const req = https.request(options, (res) => {
                    // Set proper encoding for Polish characters
                    res.setEncoding('utf8');
                    let data = '';

                    res.on('data', chunk => { data += chunk; });

                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);

                            // API returns array directly, not {data: [...]}
                            let profiles = [];
                            if (Array.isArray(json)) {
                                profiles = json;
                            } else if (json.data && Array.isArray(json.data)) {
                                profiles = json.data;
                            }

                            // Map API fields to our expected format
                            const rows = profiles.map(profile => this.mapProfile(profile));
                            logger.info('LarpGothic profiles fetched', { count: rows.length });
                            resolve({ success: true, rows, total: rows.length });

                        } catch (parseError) {
                            logger.error('Failed to parse LarpGothic response', { error: parseError.message, data: data.substring(0, 200) });
                            resolve({ success: false, error: 'Błąd parsowania odpowiedzi', rows: [] });
                        }
                    });
                });

                req.on('error', (error) => {
                    logger.error('LarpGothic API request failed', { error: error.message });
                    resolve({ success: false, error: error.message, rows: [] });
                });

                req.setTimeout(15000, () => {
                    req.destroy();
                    resolve({ success: false, error: 'Timeout połączenia', rows: [] });
                });

                req.end();

            } catch (error) {
                logger.error('LarpGothic service error', { error: error.message });
                resolve({ success: false, error: error.message, rows: [] });
            }
        });
    }

    /**
     * Map LarpGothic API profile to our app format
     */
    mapProfile(profile) {
        const charId = parseInt(profile.character) || 0;
        const regionId = parseInt(profile.region) || 0;

        // Auto-generate tags based on profile content
        const tags = this.tagProfile(profile);

        return {
            'id': profile.id,
            'Imie postaci': profile.name || '',
            'Gildia': this.characterMap[charId] || `Nieznana (${charId})`,
            'GildiaId': charId,
            'Region': this.regionMap[regionId] || `Nieznany (${regionId})`,
            'RegionId': regionId,
            'Miejscowosc': profile.city || '',
            'Jak zarabiala na zycie, kim byla': profile.now || '',
            'Znajomi, przyjaciele i wrogowie': profile.friends || '',
            'Slabosci': profile.weaks || '',
            'Umiejetnosci': profile.talent || '',
            'O postaci': profile.about || '',
            'Fakty': profile.facts || '',
            'Wina': profile.guilt || '',
            'Przyszlosc': profile.future || '',
            'Questy': profile.quests || '',
            'Podsumowanie': profile.summary || '',
            'Status': profile.status,
            'Discord': profile.discord || '',
            'Facebook': profile.fb || '',
            'Tags': tags, // Auto-generated tags for semantic search
            // Raw data for AI processing
            '_raw': profile
        };
    }

    /**
     * Search profiles by name
     */
    async searchByName(name) {
        return this.fetchProfiles({ name });
    }

    /**
     * Search profiles by region
     */
    async searchByRegion(regionId) {
        return this.fetchProfiles({ region: regionId });
    }

    /**
     * Auto-tag a profile based on text content
     */
    tagProfile(profile) {
        const tags = [];
        const searchText = `${profile.guilt || ''} ${profile.now || ''} ${profile.about || ''} ${profile.weaks || ''} ${profile.talent || ''}`.toLowerCase();

        for (const [tagName, tagData] of Object.entries(this.tagCategories)) {
            if (tagData.keywords.some(kw => searchText.includes(kw))) {
                tags.push({ name: tagName, icon: tagData.icon });
            }
        }

        return tags;
    }

    /**
     * Get all tag categories for UI display
     */
    getTagCategories() {
        return Object.entries(this.tagCategories).map(([name, data]) => ({
            name,
            icon: data.icon,
            keywords: data.keywords
        }));
    }
}

module.exports = new LarpGothicService();
