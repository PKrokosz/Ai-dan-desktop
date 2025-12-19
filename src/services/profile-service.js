/**
 * @module ProfileService
 * @description Service for fetching detailed character profiles and history/timeline
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const logger = require('../shared/logger');
const { REGIONS, CITIES } = require('./geography-data');

class ProfileService {
    constructor() {
        this.baseUrl = 'https://larpgothic.pl/api';
        this.apiKey = process.env.LARPGOTHIC_API_KEY || '1c28ff73-6013-4d5b-8c9c-ae847e02b4bb';

        // Local data cache
        this.localDataCache = null;

        // Lookup tables for fast mapping
        this.regionsById = {};
        Object.entries(REGIONS).forEach(([id, name]) => {
            this.regionsById[id] = name;
        });

        this.citiesById = {};
        CITIES.forEach(c => {
            this.citiesById[c.id] = c;
        });

        // Guild mapping
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
            28: 'Mag Wody',
            29: 'Nowicjusz',
            15: 'Strażnik Świątynny',
            18: 'Guru'
        };
    }

    /**
     * Get character profiles by name or userid
     * @param {Object} create - { name, userid }
     * @returns {Promise<Array>} List of profiles sorted by edition (desc)
     */
    async getProfiles({ name, userid }) {
        if (!name && !userid) {
            throw new Error('Must provide name or userid');
        }

        // Ensure local data is loaded
        await this._loadLocalData();

        const params = new URLSearchParams();
        // User specified format: api/profile?name="Akania"
        // We must wrap values in quotes
        if (name) params.append('name', `"${name}"`);
        if (userid) params.append('userid', `"${userid}"`);

        const url = `${this.baseUrl}/profile?${params.toString()}`;

        logger.info('Fetching profiles history', { url });

        try {
            const rawData = await this._fetch(url);

            // API returns array of profiles
            let profiles = [];
            if (Array.isArray(rawData)) {
                profiles = rawData;
            } else if (rawData.data && Array.isArray(rawData.data)) {
                profiles = rawData.data;
            }

            // Map and Sort
            // User says: "zwraca od edycji pozniejszesj do wczesniejszej"
            // Map and Sort
            // User says: "zwraca od edycji pozniejszesj do wczesniejszej"
            const mapped = profiles.map(p => this._mapProfile(p));

            // Merge local data overrides
            mapped.forEach(p => this._mergeLocalData(p));

            // Sort by edition descending (Newest First) for Logic Calculation
            // We need newest first to easily check "has continuation" (which would be index 0 if we are at index 1)
            mapped.sort((a, b) => {
                const edA = parseInt(a.Edycja) || 0;
                const edB = parseInt(b.Edycja) || 0;
                return edB - edA;
            });

            // Calculate Plot Status for each profile
            // We pass the full list to context aware calculation
            const currentYear = new Date().getFullYear(); // Dynamic current year or fixed 2025?
            // User mentioned "bieżący rok". Let's assume 2025 is the target "current" edition based on logs.
            const targetEdition = 2025;

            mapped.forEach(p => {
                p.StatusFabuly = this._determinePlotStatus(p, mapped, targetEdition);
            });

            return { success: true, profiles: mapped };

        } catch (error) {
            logger.error('ProfileService error', { error: error.message });
            return { success: false, error: error.message, profiles: [] };
        }
    }

    /**
     * Determines the detailed Plot Status based on complex logic rules
     */
    _determinePlotStatus(profile, allProfiles, currentEdition) {
        const raw = profile._raw || {};
        const status = parseInt(raw.status) || 0;
        const year = parseInt(profile.Edycja) || 0;
        const isSummary = profile.Podsumowanie && profile.Podsumowanie.length > 0;

        // Check for continuation in current edition
        // "ma_kontynuacje_w_roku" -> Is there a profile entry for the current edition (2025)?
        // Use 'allProfiles' to find if user has a profile for 'currentEdition'
        const hasContinuation = allProfiles.some(p => (parseInt(p.Edycja) || 0) === currentEdition);

        // 1. Conscious Death
        if (raw.swiadoma_smierc === 'tak' || raw.swiadoma_smierc === true) {
            return "Zakończona – świadoma śmierć wybrana przez gracza/MG";
        }

        // 4. Active in Current Year 
        // Logic: "Czy postać ma kontynuację w bieżącym roku i jest gotowa?"
        // This applies to the CURRENT year profile.
        if (year === currentEdition && status === 8) {
            return "Aktywna – fabuła trwa w bieżącej edycji";
        }

        // 2. Ready but no summary (Likely dead)
        // "Czy postać była gotowa na grę, ale nie ma podsumowania?"
        if (status === 8 && !isSummary) {
            // Exception: If it is the current running edition (2025), logic 4 applies (Active).
            // But if logic 4 check failed (maybe not handled above?), or if this is a PAST edition (2024)
            // If 2024 was ready but no summary -> Dead.
            // If 2025 is ready but no summary -> Active (game ongoing).
            if (year < currentEdition) {
                return "Prawdopodobnie zginęła w trakcie gry – brak podsumowania po gotowości";
            }
            // For current year, if ready and no summary, it's Active (Logic 4 covers this usually, but double check)
            if (year === currentEdition) return "Aktywna – fabuła trwa w bieżącej edycji";
        }

        // 3. Summary but NO continuation
        // "Czy postać ma podsumowanie, ale NIE ma kontynuacji w bieżącym roku?"
        // This usually applies to the LATEST historical profile (e.g. 2024).
        if (isSummary && !hasContinuation) {
            return "On Hold po ostatniej edycji (fabularnie zawieszona)";
        }

        // 5. Accepted but not ready
        if (status === 3) { // 3 = zaakceptowana
            return "Zatrzymana przed bieżącą edycją – gracz zrezygnował w trakcie przygotowań";
        }

        // 6. Rejected
        if (status === 6) { // 6 = odrzucona
            return "Nie weszła na tę edycję – cofamy fabułę do poprzedniej";
        }

        // 7. Reserve
        if (raw.status_rekrutacji === 'rezerwowa') { // Check explicit string or ID?
            return "Rezerwa – nie zagrała w tej edycji";
        }

        // 8. Normal Continuation (Past editions)
        if (hasContinuation && isSummary) {
            return "Zakończona pomyślnie (Kontynuacja w kolejnych edycjach)";
        }

        // Fallback for weird data
        return "Niezdefiniowany – wymaga decyzji MG";
    }

    /**
     * Smart fetcher: 
     * 1. Search by name to find UserID
     * 2. Search by name + UserID to get full correct history
     */
    async getHistoryByName(name) {
        if (!name) return { success: false, error: 'Name required' };

        try {
            // Step 1: Find valid user(s) for this character name
            const step1 = await this.getProfiles({ name });
            if (!step1.success || !step1.profiles || step1.profiles.length === 0) {
                return step1; // Return as is (empty/error)
            }

            // Get the UserID from the most recent/relevant profile
            // We assume the first one (latest edition) is the correct current "owner"
            const primaryProfile = step1.profiles[0];
            const userid = primaryProfile._raw?.userid;

            if (!userid) {
                // If no userid found, just return what we have
                return step1;
            }

            logger.info(`Found UserID ${userid} for character ${name}. Fetching full history...`);

            // Step 2: Fetch specific history
            const step2 = await this.getProfiles({ name, userid });
            return step2;

        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Search all profiles for mentions of a character name in summaries
     * Returns list of mentions grouped by year
     */
    async searchMentions(characterName) {
        if (!characterName) return { success: false, mentions: [] };

        try {
            // Use the LarpGothic API to fetch all profiles
            const larpgothicService = require('./larpgothic-api');
            const result = await larpgothicService.fetchProfiles({});

            if (!result.success) {
                return { success: false, mentions: [], error: result.error };
            }

            const mentions = [];
            const foundKeys = new Set(); // Prevent duplicates per profile

            // 1. Prepare Keys & Stems
            const IGNORED_PREFIXES = ['Baal', 'Gor', 'Cor', 'Don', 'Lord', 'Baron', 'Sir', 'Mistrz'];
            const nameParts = characterName.split(/\s+/);
            let keys = [characterName];

            // Only add parts if they are not generic prefixes (unless the name IS just the prefix, unlikely)
            if (nameParts.length > 1) {
                nameParts.forEach(p => {
                    if (p.length > 2 && !IGNORED_PREFIXES.includes(p)) {
                        keys.push(p);
                    }
                });
            } else {
                // Single word name - add it regardless (e.g. just "Baal" if someone is named that)
                if (nameParts[0].length > 2) keys.push(nameParts[0]);
            }

            // Generate Stems for Vowel-Ending keys (simple stemming) to handle declensions like Diego -> Diega
            const finalKeys = [];
            const processedKeys = new Set();

            keys.forEach(k => {
                if (processedKeys.has(k)) return;
                processedKeys.add(k);

                finalKeys.push({ key: k, isStem: false });

                // If ends with vowel and length > 3, create a stem (e.g., Diego -> Dieg)
                const lastChar = k.slice(-1).toLowerCase();
                if (['a', 'e', 'i', 'o', 'y'].includes(lastChar) && k.length > 3) {
                    const stem = k.slice(0, -1);
                    if (!processedKeys.has(stem)) {
                        finalKeys.push({ key: stem, isStem: true });
                        processedKeys.add(stem);
                    }
                }
            });

            // 2. Build Strategies (Regexes)
            const strategies = finalKeys.map(item => {
                const key = item.key;
                const sanitized = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const firstChar = key[0];
                const isUpper = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase(); // Check if Capitalized

                // Regex Boundaries
                const boundaryStart = `(^|\\s|[.,;?!:()"\\-])`;
                // Lookahead to ensure we end at a boundary (whitespace, punctuation, or EOL)
                const boundaryEnd = `(?=($|\\s|[.,;?!:()"\\-]))`;

                if (isUpper) {
                    // Hybrid Strategy:
                    if (key.length > 3) {
                        // Long names (>3): Allow random suffix 0-4 chars (covers flexible declension)
                        // Example: Magnus -> Magnusa, Magnusowi
                        return new RegExp(`${boundaryStart}(${sanitized}|${sanitized.toUpperCase()})[a-ząęśżźółńć]{0,4}${boundaryEnd}`, 'm');
                    } else {
                        // Short names (<=3): Strict List of suffixes to avoid False Positives (e.g. Jan -> Janusz)
                        // Common PL suffixes: a, u, owi, em, ie, y, i, ów, om
                        const suffixes = "(a|u|owi|em|ie|y|i|ów|om|os|aś)?";
                        return new RegExp(`${boundaryStart}(${sanitized}|${sanitized.toUpperCase()})${suffixes}${boundaryEnd}`, 'm');
                    }
                } else {
                    // Standard Case Insensitive Prefix Match (for non-capitalized keywords)
                    return new RegExp(`${boundaryStart}${sanitized}`, 'i');
                }
            });

            result.rows.forEach(profile => {
                // Skip self (loose check)
                if (profile['Imie postaci']?.toLowerCase() === characterName.toLowerCase()) return;

                const summary = profile['Podsumowanie'] || profile['summary'] || '';
                const about = profile['O postaci'] || profile['about'] || '';
                const facts = profile['Fakty'] || profile['facts'] || '';
                const allText = `${summary} ${about} ${facts}`;

                // Check strategies
                for (let regex of strategies) {
                    if (regex.test(allText)) {
                        const year = profile['Rok'] || profile['Edycja'] || 'Nieznany';
                        // Extract excerpt
                        let excerpt = this._extractExcerptRegex(allText, regex);
                        if (!excerpt) excerpt = '...wspomniano...';

                        // Determine which field contains the match
                        let field = 'Raport';
                        if (regex.test(summary)) field = 'Podsumowanie';
                        else if (regex.test(about)) field = 'O postaci';
                        else if (regex.test(facts)) field = 'Fakty';

                        mentions.push({
                            year: year,
                            sourceName: profile['Imie postaci'] || 'Nieznana',
                            sourceGuild: profile['Gildia'] || 'Nieznana',
                            source: 'Raport',
                            field: field,
                            context: excerpt,
                            fullText: allText
                        });
                        break; // Stop after first valid key match for this profile
                    }
                }
            });

            // Sort by year
            mentions.sort((a, b) => {
                const yA = parseInt(a.year) || 0;
                const yB = parseInt(b.year) || 0;
                return yA - yB;
            });

            logger.info(`Found ${mentions.length} mentions of ${characterName}`);
            return { success: true, mentions };

        } catch (e) {
            logger.error('searchMentions error', { error: e.message });
            return { success: false, mentions: [], error: e.message };
        }
    }

    /**
     * Extract a short excerpt around the search term
     */
    _extractExcerpt(text, term, maxLen) {
        const idx = text.indexOf(term);
        if (idx === -1) return text.substring(0, maxLen) + '...';

        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + term.length + 60);
        let excerpt = text.substring(start, end);

        if (start > 0) excerpt = '...' + excerpt;
        if (end < text.length) excerpt += '...';

        return excerpt;
    }

    /**
     * Extract excerpt using Regex match
     */
    _extractExcerptRegex(text, regex) {
        const match = regex.exec(text);
        if (!match) return null;

        const idx = match.index;
        const matchLen = match[0].length;
        const padding = 60;

        let start = Math.max(0, idx - padding);
        let end = Math.min(text.length, idx + matchLen + padding);

        // Adjust start to space
        if (start > 0) {
            const spaceIdx = text.indexOf(' ', start);
            if (spaceIdx !== -1 && spaceIdx < idx) start = spaceIdx + 1;
        }

        // Adjust end to space
        if (end < text.length) {
            const spaceIdx = text.lastIndexOf(' ', end);
            if (spaceIdx !== -1 && spaceIdx > idx + matchLen) end = spaceIdx;
        }

        let excerpt = text.substring(start, end).trim();
        if (start > 0) excerpt = '...' + excerpt;
        if (end < text.length) excerpt = excerpt + '...';

        return excerpt;
    }

    async _fetch(url) {
        return new Promise((resolve, reject) => {
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
                res.setEncoding('utf8');
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            req.end();
        });
    }

    _mapProfile(profile) {
        // Reuse mapping logic similar to larpgothic-api.js but self-contained
        const charId = parseInt(profile.character) || 0;
        let regionId = parseInt(profile.region) || 0;
        let cityName = profile.city || '';

        // Resolve City
        const cityId = parseInt(profile.city);
        if (!isNaN(cityId) && this.citiesById[cityId]) {
            const c = this.citiesById[cityId];
            cityName = c.name;
            if (regionId === 0 && c.region) {
                regionId = c.region;
            }
        }

        return {
            'id': profile.id,
            'Imie postaci': profile.name || '',
            'Gildia': this.characterMap[charId] || `Nieznana (${charId})`,
            'Region': this.regionsById[regionId] || `Nieznany (${regionId})`,
            'Miejscowosc': cityName,
            'O postaci': profile.about || '',
            'Fakty': profile.facts || '',
            'Wina': profile.guilt || '',
            'Wina (za co skazany)': profile.guilt || '',
            'Podsumowanie': profile.summary || '',
            'Status': profile.status,
            'Edycja': profile.edition || '',
            'Rok': profile.year || (profile.edition ? (String(profile.edition).replace(/\D/g, '').length === 4 ? String(profile.edition).replace(/\D/g, '') : `20${String(profile.edition).replace(/\D/g, '')}`) : ''),
            // Additional fields for renderProfileDetails
            'Znajomi, przyjaciele i wrogowie': profile.friends || '',
            'Przyszlosc': profile.future || '',
            'Umiejetnosci': profile.skills || '',
            'Slabosci': profile.weaks || '',
            'Jak zarabiala na zycie, kim byla': profile.now || '',
            '_raw': profile
        };
    }

    /**
     * Load and parse local text file with summaries
     */
    async _loadLocalData() {
        if (this.localDataCache) return;

        try {
            const filePath = path.join(process.cwd(), 'docs', 'parsed', 'tabela podsumowan.txt');
            if (!fs.existsSync(filePath)) {
                // Try parent dir if in src/services
                const altPath = path.join(__dirname, '../../docs/parsed/tabela podsumowan.txt');
                if (fs.existsSync(altPath)) {
                    this._readFile(altPath);
                    return;
                }
                logger.warn('Local data file not found:', filePath);
                this.localDataCache = {};
                return;
            }
            this._readFile(filePath);
        } catch (e) {
            logger.error('Failed to load local data:', e);
            this.localDataCache = {};
        }
    }

    _readFile(filePath) {
        logger.info('Loading local data from:', filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const entries = content.split('### Wpis');

        this.localDataCache = {};

        entries.forEach(entry => {
            if (!entry.trim()) return;

            const getField = (key) => {
                const match = entry.match(new RegExp(`\\*\\*${key}\\*\\*: (.*)`, 'i'));
                return match ? match[1].trim() : null;
            };

            const userid = getField('userid');
            const edition = getField('edition');
            // Extract summary which might be multi-line
            // It starts after **summary**: and ends at next **key**: or end of entry
            const summaryMatch = entry.match(/\*\*summary\*\*:([\s\S]*?)(?=\*\*|$)/i);
            let summary = summaryMatch ? summaryMatch[1].trim() : '';
            if (summary === 'NULL' || summary === '-' || summary.length < 3) summary = null;

            const aboutMatch = entry.match(/\*\*about\*\*:([\s\S]*?)(?=\*\*|$)/i);
            let about = aboutMatch ? aboutMatch[1].trim() : '';
            if (about === 'NULL' || about === '-' || about.length < 3) about = null;

            const questsMatch = entry.match(/\*\*quests\*\*:([\s\S]*?)(?=\*\*|$)/i);
            let quests = questsMatch ? questsMatch[1].trim() : '';
            if (quests === 'NULL' || quests === '-' || quests.length < 3) quests = null;

            if (userid && edition) {
                if (!this.localDataCache[userid]) this.localDataCache[userid] = {};
                this.localDataCache[userid][edition] = {
                    summary: summary,
                    quests: quests,
                    about: about,
                    name: getField('name')
                };
            }
        });

        logger.info(`Loaded ${Object.keys(this.localDataCache).length} user profiles from local file.`);
    }

    /**
     * Merge local data into API profile row
     */
    _mergeLocalData(row) {
        if (!this.localDataCache) return;

        const userid = row._raw?.userid;
        const edition = row.Edycja || row.Rok;

        // Try strict match by userid + edition
        if (userid && this.localDataCache[userid] && this.localDataCache[userid][edition]) {
            const local = this.localDataCache[userid][edition];

            // Override/Fill Summary
            // If local has summary and remote is empty/short
            if (local.summary && (!row.Podsumowanie || row.Podsumowanie.length < 10 || row.Podsumowanie === 'NULL')) {
                row.Podsumowanie = local.summary;
                logger.info(`Merged local summary for User ${userid} (${row['Imie postaci']}) Year ${edition}`);
            }

            // Fill About if missing
            if (local.about && (!row['O postaci'] || row['O postaci'].length < 10)) {
                row['O postaci'] = local.about;
            }

            // Fill Quests if missing
            if (local.quests && (!row._raw.quests || row._raw.quests.length < 10)) {
                row._raw.quests = local.quests;
            }
            return;
        }

        // Fallback: Try match by Name + Edition?
        // Maybe later if needed.
    }
}

module.exports = new ProfileService();
