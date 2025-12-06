/**
 * @module latency
 * @description Test 7: Latency Breakdown - mierzy TTFT i tokens/sec
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

const TEST_PROMPT = `Jesteś Mistrzem Gry Gothic LARP. Opisz Stary Obóz w 3 zdaniach po polsku.`;

class LatencyTest {
    constructor() {
        this.results = [];
    }

    /**
     * Run streaming inference to measure TTFT
     */
    async measureLatency(modelName) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            let firstTokenTime = null;
            let totalTokens = 0;
            let response = '';

            const postData = JSON.stringify({
                model: modelName,
                prompt: TEST_PROMPT,
                stream: true,
                options: {
                    temperature: 0.7,
                    num_predict: 150
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
                res.on('data', chunk => {
                    const lines = chunk.toString().split('\n').filter(l => l.trim());

                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);

                            // First token detection
                            if (!firstTokenTime && parsed.response) {
                                firstTokenTime = Date.now();
                            }

                            if (parsed.response) {
                                response += parsed.response;
                                totalTokens++;
                            }

                            // Capture final stats
                            if (parsed.done && parsed.eval_count) {
                                totalTokens = parsed.eval_count;
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                });

                res.on('end', () => {
                    const endTime = Date.now();
                    const totalTime = endTime - startTime;
                    const ttft = firstTokenTime ? firstTokenTime - startTime : totalTime;
                    const generationTime = endTime - (firstTokenTime || startTime);
                    const tokensPerSecond = generationTime > 0 ? Math.round((totalTokens / generationTime) * 1000) : 0;

                    resolve({
                        success: true,
                        metrics: {
                            ttft,
                            totalTime,
                            generationTime,
                            totalTokens,
                            tokensPerSecond
                        },
                        responsePreview: response.substring(0, 100)
                    });
                });
            });

            req.on('error', (e) => resolve({ success: false, error: e.message }));
            req.setTimeout(120000);
            req.write(postData);
            req.end();
        });
    }

    async testModel(modelName) {
        logger.info(`[Latency] Testing model: ${modelName}`);

        const result = await this.measureLatency(modelName);

        if (!result.success) {
            return { model: modelName, success: false, error: result.error };
        }

        const m = result.metrics;

        // Performance categories
        const ttftCategory = m.ttft < 500 ? 'fast' : m.ttft < 2000 ? 'medium' : 'slow';
        const tpsCategory = m.tokensPerSecond > 50 ? 'fast' : m.tokensPerSecond > 20 ? 'medium' : 'slow';

        return {
            model: modelName,
            success: true,
            metrics: {
                ttft: m.ttft,
                ttftCategory,
                totalTime: m.totalTime,
                generationTime: m.generationTime,
                totalTokens: m.totalTokens,
                tokensPerSecond: m.tokensPerSecond,
                tpsCategory
            },
            json: {
                testType: 'latency',
                model: modelName,
                ttft: m.ttft,
                tokensPerSecond: m.tokensPerSecond,
                recommendation: ttftCategory === 'fast' && tpsCategory !== 'slow' ? 'good_for_interactive' : 'better_for_batch'
            },
            narrative: this.generateNarrative(modelName, m, ttftCategory, tpsCategory)
        };
    }

    generateNarrative(modelName, m, ttftCat, tpsCat) {
        const ttftIcon = ttftCat === 'fast' ? '🚀' : ttftCat === 'medium' ? '⚡' : '🐢';
        const tpsIcon = tpsCat === 'fast' ? '🚀' : tpsCat === 'medium' ? '⚡' : '🐢';

        return `⏱️ **${modelName}** - Latency Breakdown

TTFT: **${m.ttft}ms** ${ttftIcon} | Tok/s: **${m.tokensPerSecond}** ${tpsIcon}

Total: ${m.totalTime}ms | Tokens: ${m.totalTokens}`;
    }

    async testAllModels(modelNames) {
        logger.info(`[Latency] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        testCache.save('latency', this.results);

        return {
            testType: 'latency',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const successful = this.results.filter(r => r.success);

        const fastTTFT = successful.filter(r => r.metrics.ttftCategory === 'fast');
        const slowTTFT = successful.filter(r => r.metrics.ttftCategory === 'slow');

        const sortedByTTFT = [...successful].sort((a, b) => a.metrics.ttft - b.metrics.ttft);
        const sortedByTPS = [...successful].sort((a, b) => b.metrics.tokensPerSecond - a.metrics.tokensPerSecond);

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            fastestTTFT: sortedByTTFT[0]?.model || 'N/A',
            fastestTTFTValue: sortedByTTFT[0]?.metrics.ttft || 0,
            highestTPS: sortedByTPS[0]?.model || 'N/A',
            highestTPSValue: sortedByTPS[0]?.metrics.tokensPerSecond || 0,
            fastModels: fastTTFT.map(r => r.model),
            slowModels: slowTTFT.map(r => r.model)
        };
    }

    loadCached() {
        return testCache.loadLatest('latency');
    }
}

module.exports = new LatencyTest();
