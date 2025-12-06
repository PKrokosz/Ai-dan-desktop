/**
 * @module instruction-following
 * @description Test 5: Instruction Following - testuje czy model przestrzega instrukcji formatu
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

// Test cases for instruction following
const TESTS = {
    json: {
        name: 'JSON Format',
        prompt: `Odpowiedz TYLKO jako JSON (bez markdown, bez komentarzy):
{"model": "nazwa", "score": liczba}

Opisz siebie jako model AI.`,
        check: (response) => {
            try {
                // Try to parse as JSON
                const cleaned = response.trim().replace(/```json/g, '').replace(/```/g, '').trim();
                JSON.parse(cleaned);
                return { passed: true, reason: 'Valid JSON' };
            } catch (e) {
                return { passed: false, reason: 'Invalid JSON: ' + e.message };
            }
        }
    },
    list: {
        name: 'Lista numerowana',
        prompt: `Wymień dokładnie 5 elementów jako LISTĘ NUMEROWANĄ (1. 2. 3. 4. 5.):
Podaj 5 zalet modeli AI.`,
        check: (response) => {
            const hasNumbers = /1\.|2\.|3\.|4\.|5\./.test(response);
            const count = (response.match(/\d+\./g) || []).length;
            if (count >= 5 && hasNumbers) {
                return { passed: true, reason: `Found ${count} numbered items` };
            }
            return { passed: false, reason: `Expected 5 items, found ${count}` };
        }
    },
    polish: {
        name: 'Tylko polski',
        prompt: `Odpowiedz TYLKO po POLSKU. Żadnych angielskich słów.
Opisz czym jest sztuczna inteligencja w 2 zdaniach.`,
        check: (response) => {
            // Common English words that shouldn't appear
            const englishWords = ['the', 'is', 'are', 'and', 'for', 'with', 'that', 'this', 'artificial', 'intelligence', 'machine', 'learning'];
            const found = englishWords.filter(w => response.toLowerCase().includes(w));
            if (found.length === 0) {
                return { passed: true, reason: 'No English words detected' };
            }
            return { passed: false, reason: `English words found: ${found.join(', ')}` };
        }
    },
    length: {
        name: 'Limit długości',
        prompt: `Odpowiedz w MAKSYMALNIE 20 słowach. Ani jednego słowa więcej.
Co to jest Gothic LARP?`,
        check: (response) => {
            const wordCount = response.split(/\s+/).filter(w => w.length > 0).length;
            if (wordCount <= 25) { // Small tolerance
                return { passed: true, reason: `${wordCount} words (within limit)` };
            }
            return { passed: false, reason: `${wordCount} words (exceeded limit)` };
        }
    }
};

class InstructionFollowingTest {
    constructor() {
        this.results = [];
    }

    async runInference(modelName, prompt) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                model: modelName,
                prompt,
                stream: false,
                options: { temperature: 0.3, num_predict: 300 }
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
            req.setTimeout(60000);
            req.write(postData);
            req.end();
        });
    }

    async testModel(modelName) {
        logger.info(`[InstructionFollowing] Testing model: ${modelName}`);

        const testResults = {};
        let passedCount = 0;
        let totalTests = 0;

        for (const [testKey, test] of Object.entries(TESTS)) {
            const result = await this.runInference(modelName, test.prompt);

            if (!result.success) {
                testResults[testKey] = {
                    name: test.name,
                    passed: false,
                    reason: result.error
                };
            } else {
                const checkResult = test.check(result.response);
                testResults[testKey] = {
                    name: test.name,
                    passed: checkResult.passed,
                    reason: checkResult.reason,
                    responsePreview: result.response.substring(0, 100)
                };
                if (checkResult.passed) passedCount++;
            }
            totalTests++;
        }

        const complianceRate = Math.round((passedCount / totalTests) * 100);
        const isCompliant = complianceRate >= 75;

        return {
            model: modelName,
            success: true,
            metrics: {
                passedTests: passedCount,
                totalTests,
                complianceRate,
                isCompliant,
                tests: testResults
            },
            json: {
                testType: 'instruction_following',
                model: modelName,
                complianceRate,
                recommendation: isCompliant ? 'follows_instructions_well' : 'struggles_with_instructions'
            },
            narrative: this.generateNarrative(modelName, passedCount, totalTests, complianceRate)
        };
    }

    generateNarrative(modelName, passed, total, rate) {
        let status, description;

        if (rate >= 75) {
            status = '✅';
            description = 'Dobrze przestrzega instrukcji formatu.';
        } else if (rate >= 50) {
            status = '⚠️';
            description = 'Częściowo przestrzega instrukcji.';
        } else {
            status = '❌';
            description = 'Ma problemy z przestrzeganiem instrukcji.';
        }

        return `✅ **${modelName}** - Instruction Following

Wynik: **${passed}/${total}** testów (${rate}%)

${status} ${description}`;
    }

    async testAllModels(modelNames) {
        logger.info(`[InstructionFollowing] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        testCache.save('instruction-following', this.results);

        return {
            testType: 'instruction_following',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const successful = this.results.filter(r => r.success);

        const compliant = successful.filter(r => r.metrics.isCompliant);
        const nonCompliant = successful.filter(r => !r.metrics.isCompliant);

        const sorted = [...successful].sort((a, b) =>
            b.metrics.complianceRate - a.metrics.complianceRate
        );

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            compliantModels: compliant.map(r => r.model),
            nonCompliantModels: nonCompliant.map(r => r.model),
            bestModel: sorted[0]?.model || 'N/A',
            bestScore: sorted[0]?.metrics.complianceRate || 0
        };
    }

    loadCached() {
        return testCache.loadLatest('instruction-following');
    }
}

module.exports = new InstructionFollowingTest();
