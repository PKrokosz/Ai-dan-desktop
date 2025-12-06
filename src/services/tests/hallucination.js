/**
 * @module hallucination
 * @description Test 6: Hallucination Detection - wykrywa wymyślone fakty
 * ISOLATED - nie modyfikuje głównego kodu
 * 
 * Uses real Gothic LARP facts from docs/parsed to check if model invents
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

// Real Gothic LARP facts for validation
const KNOWN_FACTS = {
    factions: ['Stary Obóz', 'Nowy Obóz', 'Bractwo Śniącego', 'Bagno'],
    leaders: ['Gomez', 'Lee', 'Y\'Berion', 'Xardas', 'Saturas', 'Corristo'],
    locations: ['Kolonia Karna', 'Górnicza Dolina', 'Khorinis', 'Myrtana', 'Arena', 'Zamek'],
    concepts: ['Magiczna Bariera', 'ruda', 'Bagienne Ziele', 'Orkowie', 'Śniący'],
    factionRoles: {
        stary: ['Magnat', 'Strażnik', 'Cień', 'Kopacz', 'Mag Ognia'],
        nowy: ['Najemnik', 'Mag Wody', 'Kopacz'],
        bractwo: ['Guru', 'Templariusz', 'Nowicjusz']
    }
};

// Fake terms that should NOT appear (signs of hallucination)
const HALLUCINATION_MARKERS = [
    'Mordor', 'Sauron', 'Gandalf', 'Frodo', 'Hobbit',
    'Skyrim', 'Dragonborn', 'Dovahkiin',
    'Witcher', 'Geralt', 'Ciri',
    'LOTR', 'Ring of Power',
    'Harry Potter', 'Hogwarts', 'Voldemort',
    'Minecraft', 'Creeper',
    'Google', 'Microsoft', 'Apple'
];

class HallucinationTest {
    constructor() {
        this.results = [];
    }

    async runInference(modelName, prompt) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                model: modelName,
                prompt,
                stream: false,
                options: { temperature: 0.5, num_predict: 400 }
            });

            const req = http.request({
                hostname: '127.0.0.1',
                port: 11434,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ success: true, response: parsed.response || '' });
                    } catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                });
            });

            req.on('error', (e) => resolve({ success: false, error: e.message }));
            req.setTimeout(90000);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Check for hallucinations in response
     */
    checkForHallucinations(response) {
        const lowerResponse = response.toLowerCase();
        const foundHallucinations = [];
        const usedCorrectFacts = [];

        // Check for hallucination markers
        for (const marker of HALLUCINATION_MARKERS) {
            if (lowerResponse.includes(marker.toLowerCase())) {
                foundHallucinations.push(marker);
            }
        }

        // Check for correct Gothic facts usage
        const allKnown = [
            ...KNOWN_FACTS.factions,
            ...KNOWN_FACTS.leaders,
            ...KNOWN_FACTS.locations,
            ...KNOWN_FACTS.concepts
        ];

        for (const fact of allKnown) {
            if (lowerResponse.includes(fact.toLowerCase())) {
                usedCorrectFacts.push(fact);
            }
        }

        return {
            hallucinations: foundHallucinations,
            correctFacts: usedCorrectFacts,
            score: this.calculateScore(foundHallucinations, usedCorrectFacts)
        };
    }

    calculateScore(hallucinations, correctFacts) {
        // Penalize hallucinations heavily
        const hallucinationPenalty = hallucinations.length * 30;
        // Reward correct facts usage
        const factBonus = Math.min(correctFacts.length * 10, 50);

        const score = Math.max(0, Math.min(100, 100 - hallucinationPenalty + (factBonus / 2)));
        return Math.round(score);
    }

    async testModel(modelName) {
        logger.info(`[Hallucination] Testing model: ${modelName}`);

        const prompt = `Jesteś asystentem wiedzy o grze Gothic (gra komputerowa/LARP). To jest zadanie sprawdzające poprawność faktograficzną.
        
Opisz zwięźle trzy główne obozy w Kolonii Karnej (Gothic I), wymieniając ich przywódców.
Bądź precyzyjny. Nie wymyślaj postaci ani miejsc spoza gry.

Kontekst: Fikcyjne uniwersum fantasy.`;

        const result = await this.runInference(modelName, prompt);

        if (!result.success) {
            return { model: modelName, success: false, error: result.error };
        }

        const check = this.checkForHallucinations(result.response);
        const isReliable = check.hallucinations.length === 0 && check.score >= 70;

        return {
            model: modelName,
            success: true,
            metrics: {
                score: check.score,
                hallucinationsFound: check.hallucinations,
                correctFactsUsed: check.correctFacts,
                hallucinationCount: check.hallucinations.length,
                factCount: check.correctFacts.length,
                isReliable
            },
            responsePreview: result.response.substring(0, 300),
            json: {
                testType: 'hallucination',
                model: modelName,
                score: check.score,
                hallucinationCount: check.hallucinations.length,
                recommendation: isReliable ? 'factually_reliable' : 'prone_to_hallucination'
            },
            narrative: this.generateNarrative(modelName, check, isReliable)
        };
    }

    generateNarrative(modelName, check, isReliable) {
        let status, description;

        if (isReliable) {
            status = '✅';
            description = 'Pozostaje wierny faktom Gothic LARP.';
        } else if (check.hallucinations.length === 0) {
            status = '⚠️';
            description = 'Brak halucynacji, ale mało faktów.';
        } else {
            status = '❌';
            description = `Wykryto halucynacje: ${check.hallucinations.join(', ')}`;
        }

        return `🔍 **${modelName}** - Hallucination Detection

Score: **${check.score}%** | Fakty: ${check.factCount} | Halucynacje: ${check.hallucinationCount}

${status} ${description}`;
    }

    async testAllModels(modelNames) {
        logger.info(`[Hallucination] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        testCache.save('hallucination', this.results);

        return {
            testType: 'hallucination',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const successful = this.results.filter(r => r.success);

        const reliable = successful.filter(r => r.metrics.isReliable);
        const unreliable = successful.filter(r => !r.metrics.isReliable);

        const sorted = [...successful].sort((a, b) => b.metrics.score - a.metrics.score);

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            reliableModels: reliable.map(r => r.model),
            unreliableModels: unreliable.map(r => r.model),
            bestModel: sorted[0]?.model || 'N/A',
            bestScore: sorted[0]?.metrics.score || 0
        };
    }

    loadCached() {
        return testCache.loadLatest('hallucination');
    }
}

module.exports = new HallucinationTest();
