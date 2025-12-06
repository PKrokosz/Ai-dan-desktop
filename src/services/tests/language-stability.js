/**
 * @module language-stability
 * @description Test 11: Language Stability - sprawdza czy model utrzymuje język polski w długim tekście
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

const PROMPT = `
Opisz bardzo szczegółowo historię wojny z Orkami w świecie Gothic.
Uwzględnij perspektywę różnych frakcji: Starego Obozu, Nowego Obozu, Bractwa oraz Paladynów.
Opis ma być długi, wyczerpujący i bogaty w detale.
Napisz przynajmniej 500 słów. Odpowiedz tylko po polsku.
`;

const ENGLISH_MARKERS = [
    ' the ', ' and ', ' of ', ' to ', ' in ', ' is ', ' that ', ' for ', ' with ', ' as ',
    ' was ', ' are ', ' on ', ' by ', ' from ', ' at ', ' be ', ' this ', ' which ', ' or ',
    ' but ', ' not ', ' an ', ' if ', ' would ', ' their ', ' they ', ' have '
];

class LanguageStabilityTest {
    constructor() {
        this.results = [];
    }

    async runInference(modelName) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                model: modelName,
                prompt: PROMPT,
                stream: false,
                options: { temperature: 0.7, num_predict: 1000 } // Long generation
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
            req.setTimeout(180000); // 3 mins timeout
            req.write(postData);
            req.end();
        });
    }

    analyzeStability(text) {
        if (!text || text.length < 100) return { stabilityScore: 0, englishRatio: 0, bleedDetected: false };

        // Split text into halves to check degradation
        const midPoint = Math.floor(text.length / 2);
        const secondHalf = text.substring(midPoint).toLowerCase();

        // Count English markers in the second half
        let markerCount = 0;
        for (const marker of ENGLISH_MARKERS) {
            const matches = secondHalf.split(marker).length - 1;
            markerCount += matches;
        }

        // Approx word count in second half
        const wordCount = secondHalf.split(/\s+/).length;
        const englishRatio = wordCount > 0 ? (markerCount / wordCount) : 0;

        // Threshold: if > 5% of words are "the", "and", etc., it's likely English
        // Common English text has ~30-40% stop words. Polish text has ~0% of ENGLISH stop words.
        const bleedDetected = englishRatio > 0.05;

        // Score: 100 = 0% English, 0 = 100% English (loosely)
        // Let's make it linear: 0.05 ratio -> score 50? No.
        // If ratio > 0.2 (20%), score 0.
        // If ratio < 0.01 (1%), score 100.

        let stabilityScore = 100;
        if (englishRatio > 0.01) {
            stabilityScore = Math.max(0, 100 - Math.round(englishRatio * 500));
            // 0.02 * 500 = 10 -> Score 90
            // 0.05 * 500 = 25 -> Score 75
            // 0.10 * 500 = 50 -> Score 50
            // 0.20 * 500 = 100 -> Score 0
        }

        return {
            stabilityScore,
            englishRatio: Math.round(englishRatio * 100) + '%',
            bleedDetected,
            totalLength: text.length
        };
    }

    async testModel(modelName) {
        logger.info(`[Language] Testing model: ${modelName}`);

        const result = await this.runInference(modelName);

        if (!result.success) {
            return { model: modelName, success: false, error: result.error };
        }

        const analysis = this.analyzeStability(result.response);

        return {
            model: modelName,
            success: true,
            metrics: {
                score: analysis.stabilityScore,
                bleedDetected: analysis.bleedDetected,
                englishDensity: analysis.englishRatio,
                length: analysis.totalLength
            },
            json: {
                testType: 'language_stability',
                model: modelName,
                score: analysis.stabilityScore,
                bleedDetected: analysis.bleedDetected
            },
            narrative: this.generateNarrative(modelName, analysis)
        };
    }

    generateNarrative(modelName, analysis) {
        const status = analysis.bleedDetected ? '⚠️' : '✅';
        const msg = analysis.bleedDetected
            ? `Wykryto przejście na angielski w drugiej połowie tekstu (Density: ${analysis.englishRatio}).`
            : `Model stabilnie trzyma język polski (Długość: ${analysis.totalLength} znaków).`;

        return `🌍 **${modelName}** - Language Stability
        
Score: **${analysis.stabilityScore}%** ${status}
${msg}`;
    }

    async testAllModels(modelNames) {
        logger.info(`[Language] Testing ${modelNames.length} models`);
        this.results = [];
        for (const modelName of modelNames) {
            this.results.push(await this.testModel(modelName));
        }
        testCache.save('language-stability', this.results);
        return {
            testType: 'language-stability',
            timestamp: new Date().toISOString(),
            results: this.results
        };
    }

    loadCached() {
        return testCache.loadLatest('language-stability');
    }
}

module.exports = new LanguageStabilityTest();
