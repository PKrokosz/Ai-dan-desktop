/**
 * @module memory-usage
 * @description Test 2: Memory Usage - mierzy zużycie RAM podczas inference
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

// Model size estimates (in GB, for 8GB RAM compatibility check)
const MODEL_SIZES = {
    'tinyllama': 0.5,
    'qwen2.5:0.5b': 0.5,
    'qwen3:0.6b': 0.6,
    'gemma3:1b': 1.0,
    'qwen2.5:1.5b': 1.5,
    'deepseek-r1:1.5b': 1.5,
    'llama3.2:1b': 1.0,
    'llama3.2:3b': 3.0,
    'mistral:7b': 7.0,
    'llama3:8b': 8.0
};

class MemoryUsageTest {
    constructor() {
        this.results = [];
    }

    /**
     * Get current process memory usage
     */
    getProcessMemory() {
        const mem = process.memoryUsage();
        return {
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            rss: Math.round(mem.rss / 1024 / 1024),
            external: Math.round(mem.external / 1024 / 1024)
        };
    }

    /**
     * Get Ollama process info (via ps endpoint if available)
     */
    async getOllamaMemory() {
        return new Promise((resolve) => {
            const req = http.get({
                hostname: '127.0.0.1',
                port: 11434,
                path: '/api/ps',
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        const models = parsed.models || [];
                        const totalSize = models.reduce((sum, m) => sum + (m.size || 0), 0);
                        resolve({
                            success: true,
                            loadedModels: models.map(m => m.name),
                            totalSizeBytes: totalSize,
                            totalSizeMB: Math.round(totalSize / 1024 / 1024),
                            totalSizeGB: Math.round(totalSize / 1024 / 1024 / 1024 * 100) / 100
                        });
                    } catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                });
            });

            req.on('error', () => resolve({ success: false, error: 'Ollama ps not available' }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Timeout' });
            });
        });
    }

    /**
     * Estimate model memory from name
     */
    estimateModelMemory(modelName) {
        const baseName = modelName.split(':')[0].toLowerCase();
        const tag = modelName.split(':')[1] || '';

        // Check known sizes
        for (const [key, size] of Object.entries(MODEL_SIZES)) {
            if (modelName.toLowerCase().includes(key)) {
                return size;
            }
        }

        // Estimate from parameter count in name
        const paramMatch = tag.match(/(\d+)b/i) || baseName.match(/(\d+)b/i);
        if (paramMatch) {
            const params = parseFloat(paramMatch[1]);
            // Rule of thumb: ~0.5-1GB per billion params for quantized models
            return params * 0.8;
        }

        return 2.0; // Default estimate
    }

    /**
     * Run simple inference to measure memory
     */
    async runInference(modelName) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                model: modelName,
                prompt: 'Powiedz "test" po polsku.',
                stream: false,
                options: { num_predict: 10 }
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
                        resolve({ success: true, response: parsed.response });
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

    /**
     * Test a single model
     */
    async testModel(modelName) {
        logger.info(`[MemoryUsage] Testing model: ${modelName}`);

        // Get memory before
        const memBefore = this.getProcessMemory();
        const ollamaBefore = await this.getOllamaMemory();

        // Run inference to load model
        const inferenceResult = await this.runInference(modelName);

        // Get memory after
        const memAfter = this.getProcessMemory();
        const ollamaAfter = await this.getOllamaMemory();

        // Estimate model size
        const estimatedSize = this.estimateModelMemory(modelName);
        const fits8GB = estimatedSize <= 6; // Leave 2GB for system

        const result = {
            model: modelName,
            success: inferenceResult.success,
            error: inferenceResult.error,
            metrics: {
                estimatedSizeGB: estimatedSize,
                fits8GB,
                processMemory: {
                    before: memBefore,
                    after: memAfter,
                    delta: memAfter.rss - memBefore.rss
                },
                ollamaMemory: ollamaAfter.success ? {
                    loadedModels: ollamaAfter.loadedModels,
                    totalSizeGB: ollamaAfter.totalSizeGB
                } : null
            },
            json: {
                testType: 'memory_usage',
                model: modelName,
                estimatedSizeGB: estimatedSize,
                fits8GB,
                recommendation: fits8GB ? 'can_run_locally' : 'may_require_more_ram'
            },
            narrative: this.generateNarrative(modelName, estimatedSize, fits8GB)
        };

        return result;
    }

    /**
     * Generate human-readable narrative
     */
    generateNarrative(modelName, sizeGB, fits8GB) {
        const sizeStr = sizeGB.toFixed(1);

        let status, recommendation;
        if (fits8GB) {
            status = '✅';
            recommendation = 'Komfortowo mieści się w 8GB RAM.';
        } else if (sizeGB <= 8) {
            status = '⚠️';
            recommendation = 'Może działać na 8GB RAM, ale z ograniczeniami.';
        } else {
            status = '❌';
            recommendation = 'Wymaga więcej niż 8GB RAM.';
        }

        return `💾 **${modelName}** - Memory Usage

Szacowany rozmiar: **${sizeStr} GB**

${status} ${recommendation}`;
    }

    /**
     * Run test on all available models
     */
    async testAllModels(modelNames) {
        logger.info(`[MemoryUsage] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        // Save to cache
        testCache.save('memory-usage', this.results);

        return {
            testType: 'memory_usage',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        };
    }

    /**
     * Generate summary of all results
     */
    generateSummary() {
        const successful = this.results.filter(r => r.success);

        const fitsInRAM = successful.filter(r => r.metrics.fits8GB);
        const doesNotFit = successful.filter(r => !r.metrics.fits8GB);

        const sorted = [...successful].sort((a, b) =>
            a.metrics.estimatedSizeGB - b.metrics.estimatedSizeGB
        );

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            fitsIn8GB: fitsInRAM.map(r => r.model),
            requiresMoreRAM: doesNotFit.map(r => r.model),
            smallest: sorted[0]?.model || 'N/A',
            smallestSize: sorted[0]?.metrics.estimatedSizeGB || 0,
            largest: sorted[sorted.length - 1]?.model || 'N/A',
            largestSize: sorted[sorted.length - 1]?.metrics.estimatedSizeGB || 0
        };
    }

    /**
     * Load cached results
     */
    loadCached() {
        return testCache.loadLatest('memory-usage');
    }
}

module.exports = new MemoryUsageTest();
