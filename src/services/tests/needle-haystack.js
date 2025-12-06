/**
 * @module needle-haystack
 * @description Test 9: Needle in a Haystack - sprawdza czy model potrafi znaleźć informację w długim kontekście
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

// Base HAYSTACK - repeated Gothic lore to fill context
const HAYSTACK_FILLER = `
Górnicza Dolina to miejsce zesłania dla skazańców Królestwa Myrtany. 
Otoczona magiczną barierą, uniemożliwia ucieczkę, ale pozwala na wejście do środka.
Ruda wydobywana w kopalniach jest niezbędna do prowadzenia wojny z Orkami.
Wewnątrz bariery władzę sprawują Magnaci ze Starego Obozu, a Magowie Ognia strzegą równowagi.
Na bagnach Bractwo Śniącego czci tajemnicze bóstwo, wierząc w odzyskanie wolności.
Nowy Obóz, prowadzony przez Magów Wody i Lee, planuje wysadzić Kopiec Rudy, by zniszczyć barierę.
Orkowie budują swoje świątynie w głębi ziemi, czcząc demona.
Zwierzęta w Kolonii są agresywne: cieniostwory, ścierwojady i zębacze stanowią zagrożenie.
`.trim();

const NEEDLE_QUESTION = "Jaki jest ulubiony napój Gomeza?";
const NEEDLE_ANSWER = "Ulubionym napojem Gomeza jest Sok z Gumijagód.";
const EXPECTED_KEYPHRASE = "Sok z Gumijagód";

class NeedleHaystackTest {
    constructor() {
        this.results = [];
    }

    generateContext(depthPercent, totalLength = 20) {
        // depthPercent: 0 (start), 50 (middle), 100 (end)
        // totalLength: number of filler repetitions (approx 8k tokens if large, keep small for fast test)
        // Let's use ~3000 tokens for standard test (enough to break small context models)

        const fillerCount = 50; // Approx 4000 words
        let context = "";

        const needlePosition = Math.floor((fillerCount * depthPercent) / 100);

        for (let i = 0; i <= fillerCount; i++) {
            if (i === needlePosition) {
                context += `\n[WAŻNA INFORMACJA: ${NEEDLE_ANSWER}]\n`;
            } else {
                context += HAYSTACK_FILLER + " ";
            }
        }

        return context;
    }

    async runInference(modelName, context, question) {
        return new Promise((resolve) => {
            const prompt = `Kontekst:\n${context}\n\nPytanie: ${question}\nOdpowiedz jednym zdaniem, bazując TYLKO na kontekście.`;

            const postData = JSON.stringify({
                model: modelName,
                prompt,
                stream: false,
                options: { temperature: 0.1, num_predict: 100 } // Low temp for retrieval
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
            req.setTimeout(120000); // 2 mins timeout for long context
            req.write(postData);
            req.end();
        });
    }

    async testModel(modelName) {
        logger.info(`[Needle] Testing model: ${modelName}`);

        // Test 3 points: 0% (Start), 50% (Middle), 100% (End)
        const depths = [0, 50, 100];
        const depthResults = [];

        for (const depth of depths) {
            const context = this.generateContext(depth);
            const result = await this.runInference(modelName, context, NEEDLE_QUESTION);

            let passed = false;
            if (result.success) {
                const lowerResp = result.response.toLowerCase();
                if (lowerResp.includes("gumijagód") || lowerResp.includes("sok z gumijagód")) {
                    passed = true;
                }
            }

            depthResults.push({
                depth: `${depth}%`,
                passed,
                response: result.success ? result.response.substring(0, 100) : "ERROR"
            });
        }

        // Calculate score
        const passedCount = depthResults.filter(r => r.passed).length;
        const score = Math.round((passedCount / depths.length) * 100);

        return {
            model: modelName,
            success: true,
            metrics: {
                score,
                depthResults,
                passedCount,
                isReliable: score === 100
            },
            json: {
                testType: 'needle_haystack',
                model: modelName,
                score,
                depthsTested: depths,
                passedDepths: depthResults.filter(r => r.passed).map(r => r.depth)
            },
            narrative: this.generateNarrative(modelName, score, depthResults)
        };
    }

    generateNarrative(modelName, score, results) {
        const passedDepths = results.filter(r => r.passed).map(r => r.depth).join(', ');
        const failedDepths = results.filter(r => !r.passed).map(r => r.depth).join(', ');

        return `🧵 **${modelName}** - Context Retrieval (Needle)

Score: **${score}%**
✅ Znaleziono w: ${passedDepths || 'Brak'}
❌ Zgubiono w: ${failedDepths || 'Brak'}

${score === 100 ? '⭐ Perfekcyjna pamięć w całym kontekście.' : '⚠️ Gubienie informacji (Lost in the Middle?).'}`;
    }

    async testAllModels(modelNames) {
        logger.info(`[Needle] Testing ${modelNames.length} models`);
        this.results = [];
        for (const modelName of modelNames) {
            this.results.push(await this.testModel(modelName));
        }
        testCache.save('needle-haystack', this.results);
        return {
            testType: 'needle-haystack',
            timestamp: new Date().toISOString(),
            results: this.results
        };
    }

    loadCached() {
        return testCache.loadLatest('needle-haystack');
    }
}

module.exports = new NeedleHaystackTest();
