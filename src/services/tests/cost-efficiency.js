/**
 * @module cost-efficiency
 * @description Test 8: Cost Efficiency - oblicza jakość per token i per ms
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

const TEST_PROMPT = `Jesteś Mistrzem Gry Gothic LARP. Opisz Gomeza, władcę Starego Obozu. Bądź konkretny i precyzyjny. Odpowiedz po polsku.`;

class CostEfficiencyTest {
    constructor() {
        this.results = [];
    }

    async runInference(modelName) {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const postData = JSON.stringify({
                model: modelName,
                prompt: TEST_PROMPT,
                stream: false,
                options: { temperature: 0.7, num_predict: 200 }
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
                        const tokens = parsed.eval_count || Math.ceil(response.length / 4);

                        resolve({
                            success: true,
                            response,
                            tokens,
                            responseTime
                        });
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
     * Evaluate quality (simple heuristics)
     */
    evaluateQuality(response) {
        let score = 0;

        // Length
        if (response.length > 100) score += 15;
        if (response.length > 200) score += 10;

        // Polish language
        const polishWords = ['jest', 'się', 'że', 'i', 'w', 'na'];
        const hasPolish = polishWords.filter(w => response.toLowerCase().includes(w)).length;
        score += Math.min(hasPolish * 5, 20);

        // Gothic keywords
        const gothicKeywords = ['gomez', 'stary', 'obóz', 'mag', 'strażnik', 'ruda', 'kolonia'];
        const gothicCount = gothicKeywords.filter(k => response.toLowerCase().includes(k)).length;
        score += gothicCount * 8;

        // Completeness
        if (response.endsWith('.') || response.endsWith('!')) score += 10;

        return Math.min(100, score);
    }

    async testModel(modelName) {
        logger.info(`[CostEfficiency] Testing model: ${modelName}`);

        const result = await this.runInference(modelName);

        if (!result.success) {
            return { model: modelName, success: false, error: result.error };
        }

        const quality = this.evaluateQuality(result.response);
        const tokens = result.tokens;
        const time = result.responseTime;

        // Calculate efficiency metrics
        const qualityPerToken = tokens > 0 ? Math.round((quality / tokens) * 100) / 100 : 0;
        const qualityPerMs = time > 0 ? Math.round((quality / time) * 1000) / 1000 : 0;
        const tokensPerMs = time > 0 ? Math.round((tokens / time) * 1000) / 1000 : 0;

        // Efficiency score (weighted combination)
        const efficiencyScore = Math.round(
            (quality * 0.5) +
            (qualityPerToken * 20) +
            (qualityPerMs * 50)
        );

        const isEfficient = efficiencyScore >= 50;

        return {
            model: modelName,
            success: true,
            metrics: {
                quality,
                tokens,
                time,
                qualityPerToken,
                qualityPerMs,
                tokensPerMs,
                efficiencyScore,
                isEfficient
            },
            json: {
                testType: 'cost_efficiency',
                model: modelName,
                quality,
                efficiencyScore,
                recommendation: isEfficient ? 'cost_effective' : 'high_cost'
            },
            narrative: this.generateNarrative(modelName, quality, tokens, time, efficiencyScore)
        };
    }

    generateNarrative(modelName, quality, tokens, time, effScore) {
        const effIcon = effScore >= 60 ? '💚' : effScore >= 40 ? '💛' : '❤️';

        return `💰 **${modelName}** - Cost Efficiency

Quality: **${quality}%** | Tokens: ${tokens} | Time: ${time}ms
Efficiency: **${effScore}** ${effIcon}`;
    }

    async testAllModels(modelNames) {
        logger.info(`[CostEfficiency] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        testCache.save('cost-efficiency', this.results);

        return {
            testType: 'cost_efficiency',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const successful = this.results.filter(r => r.success);

        const efficient = successful.filter(r => r.metrics.isEfficient);
        const notEfficient = successful.filter(r => !r.metrics.isEfficient);

        const sortedByEfficiency = [...successful].sort((a, b) =>
            b.metrics.efficiencyScore - a.metrics.efficiencyScore
        );
        const sortedByQuality = [...successful].sort((a, b) =>
            b.metrics.quality - a.metrics.quality
        );

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            efficientModels: efficient.map(r => r.model),
            highCostModels: notEfficient.map(r => r.model),
            mostEfficient: sortedByEfficiency[0]?.model || 'N/A',
            mostEfficientScore: sortedByEfficiency[0]?.metrics.efficiencyScore || 0,
            highestQuality: sortedByQuality[0]?.model || 'N/A',
            highestQualityScore: sortedByQuality[0]?.metrics.quality || 0
        };
    }

    loadCached() {
        return testCache.loadLatest('cost-efficiency');
    }
}

module.exports = new CostEfficiencyTest();
