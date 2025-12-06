/**
 * @module consistency
 * @description Test 3: Consistency - uruchamia ten sam prompt 3x i mierzy różnice
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

// Test prompt for consistency checking
const TEST_PROMPT = `Jesteś Mistrzem Gry Gothic LARP. Opisz w 2-3 zdaniach Stary Obóz w Kolonii Karnej. Bądź konkretny i konsekwentny.`;

class ConsistencyTest {
    constructor() {
        this.results = [];
        this.runsPerModel = 3;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[m][n];
    }

    /**
     * Calculate similarity percentage between two strings
     */
    similarityPercent(str1, str2) {
        if (!str1 || !str2) return 0;
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 100;
        const distance = this.levenshteinDistance(str1, str2);
        return Math.round((1 - distance / maxLen) * 100);
    }

    /**
     * Run single inference
     */
    async runInference(modelName) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                model: modelName,
                prompt: TEST_PROMPT,
                stream: false,
                options: {
                    temperature: 0,  // Deterministic
                    seed: 42,        // Fixed seed
                    num_predict: 200
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
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ success: true, response: parsed.response || '' });
                    } catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                });
            });

            req.on('error', (e) => resolve({ success: false, error: e.message }));
            req.setTimeout(120000);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Test a single model for consistency
     */
    async testModel(modelName) {
        logger.info(`[Consistency] Testing model: ${modelName} (${this.runsPerModel} runs)`);

        const outputs = [];

        // Run N times
        for (let i = 0; i < this.runsPerModel; i++) {
            const result = await this.runInference(modelName);
            if (result.success) {
                outputs.push(result.response);
            } else {
                return {
                    model: modelName,
                    success: false,
                    error: result.error
                };
            }
        }

        // Calculate pairwise similarities
        const similarities = [];
        for (let i = 0; i < outputs.length; i++) {
            for (let j = i + 1; j < outputs.length; j++) {
                similarities.push(this.similarityPercent(outputs[i], outputs[j]));
            }
        }

        const avgSimilarity = similarities.length > 0
            ? Math.round(similarities.reduce((a, b) => a + b, 0) / similarities.length)
            : 0;

        const minSimilarity = Math.min(...similarities);
        const maxSimilarity = Math.max(...similarities);

        const isConsistent = avgSimilarity >= 90;
        const isHighlyConsistent = avgSimilarity >= 98;

        const result = {
            model: modelName,
            success: true,
            metrics: {
                runs: this.runsPerModel,
                avgSimilarity,
                minSimilarity,
                maxSimilarity,
                isConsistent,
                isHighlyConsistent,
                variance: maxSimilarity - minSimilarity
            },
            outputs: outputs.map(o => o.substring(0, 200) + (o.length > 200 ? '...' : '')),
            json: {
                testType: 'consistency',
                model: modelName,
                avgSimilarity,
                isConsistent,
                recommendation: isHighlyConsistent ? 'highly_deterministic' :
                    isConsistent ? 'mostly_consistent' : 'variable_outputs'
            },
            narrative: this.generateNarrative(modelName, avgSimilarity, isConsistent, isHighlyConsistent)
        };

        return result;
    }

    /**
     * Generate human-readable narrative
     */
    generateNarrative(modelName, avgSimilarity, isConsistent, isHighlyConsistent) {
        let status, description;

        if (isHighlyConsistent) {
            status = '✅';
            description = 'Bardzo deterministyczny - identyczne odpowiedzi przy temp=0.';
        } else if (isConsistent) {
            status = '⚠️';
            description = 'Przeważnie spójny, drobne różnice między odpowiedziami.';
        } else {
            status = '❌';
            description = 'Niespójny - znaczące różnice nawet przy temp=0.';
        }

        return `🔄 **${modelName}** - Consistency

Średnie podobieństwo: **${avgSimilarity}%** (${this.runsPerModel} uruchomień)

${status} ${description}`;
    }

    /**
     * Run test on all available models
     */
    async testAllModels(modelNames) {
        logger.info(`[Consistency] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        testCache.save('consistency', this.results);

        return {
            testType: 'consistency',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        };
    }

    /**
     * Generate summary
     */
    generateSummary() {
        const successful = this.results.filter(r => r.success);

        const highlyConsistent = successful.filter(r => r.metrics.isHighlyConsistent);
        const mostlyConsistent = successful.filter(r => r.metrics.isConsistent && !r.metrics.isHighlyConsistent);
        const inconsistent = successful.filter(r => !r.metrics.isConsistent);

        const sorted = [...successful].sort((a, b) =>
            b.metrics.avgSimilarity - a.metrics.avgSimilarity
        );

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            highlyConsistent: highlyConsistent.map(r => r.model),
            mostlyConsistent: mostlyConsistent.map(r => r.model),
            inconsistent: inconsistent.map(r => r.model),
            mostConsistent: sorted[0]?.model || 'N/A',
            mostConsistentScore: sorted[0]?.metrics.avgSimilarity || 0,
            leastConsistent: sorted[sorted.length - 1]?.model || 'N/A',
            leastConsistentScore: sorted[sorted.length - 1]?.metrics.avgSimilarity || 0
        };
    }

    loadCached() {
        return testCache.loadLatest('consistency');
    }
}

module.exports = new ConsistencyTest();
