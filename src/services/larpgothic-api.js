/**
 * @module LarpGothicService
 * @description Pobieranie profili postaci z API larpgothic.pl
 */

const https = require('https');
const config = require('../shared/config');
const logger = require('../shared/logger');
const { REGIONS, CITIES } = require('./geography-data');

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

        // Camp mapping based on Guild IDs
        this.CAMP_MAP = {
            'Stary Obóz': [1, 2, 3, 4, 30],       // Kopacz, Cień, Strażnik, Magnat, Służba
            'Nowy Obóz': [21, 13, 14, 28, 6],    // Kret, Szkodnik, Najemnik, Mag Wody
            'Bractwo': [29, 7, 15, 18],          // Nowicjusz, Strażnik Świątynny, Guru
            'Skazaniec': [16]                    // Skazaniec
        };

        // Region mappings from geography-data.js
        this.regions = REGIONS;

        // City lookups for fast access
        this.citiesById = {};
        CITIES.forEach(c => {
            this.citiesById[c.id] = c;
        });

        // Tag categories for semantic search
        this.tagCategories = {
            // 🏰 Obóz (Camps)
            'stary obóz': { icon: '⛺', keywords: ['stary obóz', 'starym obozie', 'gomez', 'kminek'] },
            'nowy obóz': { icon: '🌊', keywords: ['nowy obóz', 'nowym obozie', 'lee', 'lares'] },
            'bractwo': { icon: '🏯', keywords: ['bractwo', 'obóz bractwa', 'sekta', 'yberion', 'kalom'] },

            // ⚖️ Za co siedzi (guilt/crime)
            'kradzież': { icon: '🗡️', keywords: ['kradzież', 'kradł', 'złodziej', 'ukradł', 'włamanie', 'zwinął'] },
            'przemyt': { icon: '📦', keywords: ['przemyt', 'przemycał', 'kontraband', 'szmuglował', 'nielegalny transport'] },
            'zabójstwo': { icon: '💀', keywords: ['zabójstwo', 'zabił', 'morderstwo', 'morderca', 'śmierć', 'pozbawił życia'] },
            'oszustwo': { icon: '🎭', keywords: ['oszustwo', 'oszukał', 'fałszerstwo', 'szarlatan', 'naciągał'] },
            'bójka': { icon: '👊', keywords: ['bójka', 'pobicie', 'napaść', 'bijatyka', 'uderzył'] },
            'długi': { icon: '💰', keywords: ['dług', 'długi', 'nie spłacił', 'bankrut', 'winien rudę'] },

            // 💼 Zawód/Zajęcie
            'górnik': { icon: '⛏️', keywords: ['kopacz', 'górnik', 'ruda', 'kopalnia', 'wydobycie', 'kopie', 'kilof'] },
            'kowal': { icon: '🔨', keywords: ['kowal', 'płatnerz', 'kuźnia', 'żelazo', 'ostrza', 'miecz', 'wykuwa'] },
            'handlarz': { icon: '💎', keywords: ['kupiec', 'handlarz', 'handel', 'sprzedaż', 'targ', 'sklep', 'wymiana'] },
            'łowca': { icon: '🏹', keywords: ['łowca', 'myśliwy', 'polowanie', 'tropiciel', 'zwierzyna', 'łuk', 'tatuuje'] },
            'strażnik': { icon: '🛡️', keywords: ['strażnik', 'ochroniarz', 'wartownik', 'patrol', 'pilnuje'] },
            'najemnik': { icon: '⚔️', keywords: ['najemnik', 'wojownik', 'gladiator', 'walka', 'żołnierz', 'zaciężny'] },
            'zielarz': { icon: '🌿', keywords: ['zielarz', 'uzdrowiciel', 'medyk', 'leczenie', 'ziół', 'apteka'] },
            'alchemik': { icon: '⚗️', keywords: ['alchemik', 'alchemia', 'mikstury', 'eliksir', 'warzy'] },
            'paser': { icon: '🔓', keywords: ['paser', 'paserstwo', 'kradzione', 'cienie', 'skup'] },
            'skryba': { icon: '📜', keywords: ['skryba', 'pisarz', 'uczony', 'księgi', 'czytanie', 'kaligrafia'] },

            // ⚠️ Wady/Cechy (useful for GM)
            'alkoholik': { icon: '🍺', keywords: ['alkohol', 'pijak', 'pić', 'wódka', 'piwo', 'ryżówka', 'nalewka'] },
            'hazardzista': { icon: '🎲', keywords: ['hazard', 'kości', 'grać', 'zakład', 'poker', 'szuler'] },
            'chciwość': { icon: '🤑', keywords: ['chciwy', 'chciwość', 'żądny', 'bogactwo', 'bryłki', 'skąpy'] },
            'gniew': { icon: '😠', keywords: ['gniewny', 'wściekły', 'porywczy', 'agresywny', 'wybuchowy'] },
            'tchórz': { icon: '😰', keywords: ['tchórz', 'strach', 'boi się', 'ucieka', 'lękliwy'] },
            'naiwny': { icon: '🤷', keywords: ['naiwny', 'łatwowierny', 'głupi', 'ufny', 'dał się nabrać'] }
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
        let regionId = parseInt(profile.region) || 0;
        let cityName = profile.city || '';

        // Resolve City ID to Name if possible
        const cityId = parseInt(profile.city);
        if (!isNaN(cityId) && this.citiesById[cityId]) {
            const cityData = this.citiesById[cityId];
            cityName = cityData.name;

            // If regionId is missing or 0, try to infer it from city
            if (regionId === 0 && cityData.region) {
                regionId = cityData.region;
            }
        }

        // Auto-generate tags based on profile content
        const tags = this.tagProfile(profile);

        // Map to Camp
        let camp = 'Inne';
        for (const [campName, ids] of Object.entries(this.CAMP_MAP)) {
            if (ids.includes(charId)) {
                camp = campName;
                break;
            }
        }
        if (camp !== 'Inne') {
            tags.push({ name: camp.toLowerCase(), icon: this.tagCategories[camp.toLowerCase()]?.icon || '📍' });
        }

        return {
            'id': profile.id,
            'Imie postaci': profile.name || '',
            'Gildia': this.characterMap[charId] || `Nieznana (${charId})`,
            'GildiaId': charId,
            'Region': this.regions[regionId] || `Nieznany (${regionId})`,
            'RegionId': regionId,
            'Miejscowosc': cityName,
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
            'Edycja': profile.edition || '',
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
