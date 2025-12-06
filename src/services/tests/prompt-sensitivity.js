/**
 * @module prompt-sensitivity
 * @description Test 4: Prompt Length Sensitivity - testuje jak model radzi sobie z różnymi długościami promptów
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

// Test prompts of different lengths
const SHORT_PROMPT = `Opisz Stary Obóz w 2 zdaniach.`;

const MEDIUM_PROMPT = `Jesteś Mistrzem Gry Gothic LARP w Kolonii Karnej. 
Stary Obóz to siedziba Gomeza i Magnatów Rudy. Jest to najpotężniejsza frakcja w kolonii.
Opisz atmosferę i główne zagrożenia w Starym Obozie dla nowego gracza. Bądź konkretny.`;

const LONG_PROMPT = `Jesteś doświadczonym Mistrzem Gry Gothic LARP w Kolonii Karnej.

KONTEKST ŚWIATA:
Kolonia Karna to więzienie górnicze otoczone magiczną barierą. Istnieją trzy główne obozy:
- Stary Obóz: kontrolowany przez Gomeza i Magnatów Rudy, handluje rudą z królem
- Nowy Obóz: zrzesza buntowników szukających ucieczki, zbiera rudę na gigantyczną kulę ognia
- Sektanci Bagna: wyznawcy Śniącego, mieszkają na bagnach i wierzą w uwolnienie przez boga

LOKALIZACJA: Stary Obóz
Stary Obóz to forteca w centrum doliny. Gomez rządzi twardą ręką przy pomocy swoich strażników.
Magnaci Rudy kontrolują handel i politykę. Arena służy do rozstrzygania sporów.
Zamek Gomeza jest najlepiej strzeżonym miejscem w kolonii.

POSTAĆ GRACZA:
Imię: Kaldor
Gildia: Mag Ognia (początkujący)
Słabości: Arogancja, strach przed Orkami
Aspiracje: Zostać potężnym magiem, znaleźć artefakty

ZADANIE:
Stwórz szczegółowy quest dla tej postaci w Starym Obozie. Quest powinien:
1. Wykorzystywać słabości postaci
2. Dawać okazję do rozwoju magii
3. Zawierać moralne dylematy
4. Angażować frakcje polityczne obozu

Opisz: cel, przeszkody, możliwe rozwiązania i konsekwencje.`;

class PromptSensitivityTest {
    constructor() {
        this.results = [];
    }

    async runInference(modelName, prompt, promptType) {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const postData = JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 500
                }
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
                    const responseTime = Date.now() - startTime;
                    try {
                        const parsed = JSON.parse(data);
                        const response = parsed.response || '';
                        resolve({
                            success: true,
                            response,
                            responseLength: response.length,
                            responseTime,
                            promptType,
                            promptLength: prompt.length
                        });
                    } catch (e) {
                        resolve({ success: false, error: e.message, promptType });
                    }
                });
            });

            req.on('error', (e) => resolve({ success: false, error: e.message, promptType }));
            req.setTimeout(120000);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Evaluate response quality (simple heuristics)
     */
    evaluateQuality(response, promptType) {
        if (!response) return 0;

        let score = 0;

        // Length scoring (longer responses for longer prompts expected)
        if (response.length > 100) score += 20;
        if (response.length > 300) score += 20;
        if (response.length > 500) score += 10;

        // Polish language check
        const polishWords = ['jest', 'się', 'że', 'nie', 'oraz', 'lub', 'który', 'która', 'które'];
        const hasPolish = polishWords.some(w => response.toLowerCase().includes(w));
        if (hasPolish) score += 20;

        // Gothic LARP keywords
        const gothicKeywords = ['obóz', 'kolonia', 'gomez', 'mag', 'ruda', 'bariera', 'stary'];
        const gothicCount = gothicKeywords.filter(k => response.toLowerCase().includes(k)).length;
        score += gothicCount * 5;

        // Completeness (ends properly)
        if (response.endsWith('.') || response.endsWith('!') || response.endsWith('?')) {
            score += 10;
        }

        return Math.min(100, score);
    }

    async testModel(modelName) {
        logger.info(`[PromptSensitivity] Testing model: ${modelName}`);

        const shortResult = await this.runInference(modelName, SHORT_PROMPT, 'short');
        const mediumResult = await this.runInference(modelName, MEDIUM_PROMPT, 'medium');
        const longResult = await this.runInference(modelName, LONG_PROMPT, 'long');

        if (!shortResult.success || !mediumResult.success || !longResult.success) {
            return {
                model: modelName,
                success: false,
                error: shortResult.error || mediumResult.error || longResult.error
            };
        }

        const shortScore = this.evaluateQuality(shortResult.response, 'short');
        const mediumScore = this.evaluateQuality(mediumResult.response, 'medium');
        const longScore = this.evaluateQuality(longResult.response, 'long');

        // Calculate degradation
        const avgScore = (shortScore + mediumScore + longScore) / 3;
        const degradation = shortScore - longScore; // Positive = worse on long
        const handlesLongWell = degradation < 10;

        const result = {
            model: modelName,
            success: true,
            metrics: {
                short: { score: shortScore, time: shortResult.responseTime, length: shortResult.responseLength },
                medium: { score: mediumScore, time: mediumResult.responseTime, length: mediumResult.responseLength },
                long: { score: longScore, time: longResult.responseTime, length: longResult.responseLength },
                avgScore: Math.round(avgScore),
                degradation,
                handlesLongWell
            },
            json: {
                testType: 'prompt_sensitivity',
                model: modelName,
                shortScore, mediumScore, longScore,
                recommendation: handlesLongWell ? 'handles_all_lengths' : 'better_for_short'
            },
            narrative: this.generateNarrative(modelName, shortScore, mediumScore, longScore, handlesLongWell)
        };

        return result;
    }

    generateNarrative(modelName, shortScore, mediumScore, longScore, handlesLongWell) {
        let status, description;

        if (handlesLongWell) {
            status = '✅';
            description = 'Dobrze radzi sobie z promptami różnej długości.';
        } else {
            status = '⚠️';
            description = 'Jakość spada przy dłuższych promptach.';
        }

        return `📐 **${modelName}** - Prompt Sensitivity

Wyniki: Short **${shortScore}%** | Medium **${mediumScore}%** | Long **${longScore}%**

${status} ${description}`;
    }

    async testAllModels(modelNames) {
        logger.info(`[PromptSensitivity] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        testCache.save('prompt-sensitivity', this.results);

        return {
            testType: 'prompt_sensitivity',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const successful = this.results.filter(r => r.success);

        const handlesAll = successful.filter(r => r.metrics.handlesLongWell);
        const shortOnly = successful.filter(r => !r.metrics.handlesLongWell);

        const sorted = [...successful].sort((a, b) => b.metrics.avgScore - a.metrics.avgScore);

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            handlesAllLengths: handlesAll.map(r => r.model),
            betterForShort: shortOnly.map(r => r.model),
            bestOverall: sorted[0]?.model || 'N/A',
            bestScore: sorted[0]?.metrics.avgScore || 0
        };
    }

    loadCached() {
        return testCache.loadLatest('prompt-sensitivity');
    }
}

module.exports = new PromptSensitivityTest();
