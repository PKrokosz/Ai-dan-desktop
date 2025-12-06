/**
 * @module context-limits
 * @description Test 1: Context Window Limits - sprawdza max tokeny dla każdego modelu
 * ISOLATED - nie modyfikuje głównego kodu
 */

const http = require('http');
const logger = require('../../shared/logger');
const testCache = require('./test-cache');

// Known context limits for common models (fallback)
const KNOWN_LIMITS = {
    'llama3': 8192,
    'llama3.2': 131072,
    'qwen2.5': 32768,
    'qwen3': 32768,
    'gemma3': 8192,
    'deepseek-r1': 65536,
    'tinyllama': 2048,
    'mistral': 32768,
    'phi4': 16384
};

class ContextLimitsTest {
    constructor() {
        this.results = [];
    }

    /**
     * Get model info from Ollama API
     */
    async getModelInfo(modelName) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({ name: modelName });

            const req = http.request({
                hostname: '127.0.0.1',
                port: 11434,
                path: '/api/show',
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
                        resolve({
                            success: true,
                            modelfile: parsed.modelfile || '',
                            parameters: parsed.parameters || '',
                            template: parsed.template || '',
                            details: parsed.details || {}
                        });
                    } catch (e) {
                        resolve({ success: false, error: e.message });
                    }
                });
            });

            req.on('error', (e) => resolve({ success: false, error: e.message }));
            req.setTimeout(10000);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Extract context limit from model info
     */
    extractContextLimit(modelInfo, modelName) {
        // Try to find num_ctx in parameters
        const paramMatch = modelInfo.parameters?.match(/num_ctx\s+(\d+)/i);
        if (paramMatch) {
            return parseInt(paramMatch[1]);
        }

        // Try to find in modelfile
        const modelfileMatch = modelInfo.modelfile?.match(/num_ctx\s+(\d+)/i);
        if (modelfileMatch) {
            return parseInt(modelfileMatch[1]);
        }

        // Fallback to known limits
        const baseModel = modelName.split(':')[0].toLowerCase();
        for (const [key, limit] of Object.entries(KNOWN_LIMITS)) {
            if (baseModel.includes(key)) {
                return limit;
            }
        }

        return 4096; // Default fallback
    }

    /**
     * Test a single model
     */
    async testModel(modelName) {
        logger.info(`[ContextLimits] Testing model: ${modelName}`);

        const modelInfo = await this.getModelInfo(modelName);

        if (!modelInfo.success) {
            return {
                model: modelName,
                success: false,
                error: modelInfo.error
            };
        }

        const maxContext = this.extractContextLimit(modelInfo, modelName);

        // Calculate recommendations
        const optimalContext = Math.min(maxContext, 4096); // Usually 4K is sweet spot
        const warningThreshold = Math.floor(maxContext * 0.8);

        const result = {
            model: modelName,
            success: true,
            metrics: {
                maxContext,
                optimalContext,
                warningThreshold,
                source: modelInfo.parameters?.includes('num_ctx') ? 'model_config' : 'inference'
            },
            // Dual format output
            json: {
                testType: 'context_limits',
                model: modelName,
                maxContext,
                optimalContext,
                warningThreshold,
                recommendation: maxContext >= 32768 ? 'long_context_capable' :
                    maxContext >= 8192 ? 'medium_context' : 'short_context_only'
            },
            narrative: this.generateNarrative(modelName, maxContext, optimalContext)
        };

        return result;
    }

    /**
     * Generate human-readable narrative
     */
    generateNarrative(modelName, maxContext, optimalContext) {
        const ctxStr = maxContext >= 1000 ? `${Math.round(maxContext / 1000)}K` : maxContext;
        const optStr = optimalContext >= 1000 ? `${Math.round(optimalContext / 1000)}K` : optimalContext;

        let recommendation = '';
        if (maxContext >= 32768) {
            recommendation = '✅ Doskonały do długich dokumentów i złożonych kontekstów.';
        } else if (maxContext >= 8192) {
            recommendation = '⚠️ Dobry do średnich promptów. Unikaj bardzo długich kontekstów.';
        } else {
            recommendation = '❌ Tylko krótkie prompty. Może tracić kontekst przy większych zadaniach.';
        }

        return `📏 **${modelName}** - Context Window

Max tokens: **${ctxStr}** | Optymalne: **${optStr}**

${recommendation}`;
    }

    /**
     * Run test on all available models
     */
    async testAllModels(modelNames) {
        logger.info(`[ContextLimits] Testing ${modelNames.length} models`);

        this.results = [];

        for (const modelName of modelNames) {
            const result = await this.testModel(modelName);
            this.results.push(result);
        }

        // Save to cache
        testCache.save('context-limits', this.results);

        return {
            testType: 'context_limits',
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

        const sorted = [...successful].sort((a, b) =>
            b.metrics.maxContext - a.metrics.maxContext
        );

        return {
            totalModels: this.results.length,
            successfulTests: successful.length,
            largestContext: sorted[0]?.model || 'N/A',
            largestContextValue: sorted[0]?.metrics.maxContext || 0,
            smallestContext: sorted[sorted.length - 1]?.model || 'N/A',
            smallestContextValue: sorted[sorted.length - 1]?.metrics.maxContext || 0,
            recommendations: {
                longContext: sorted.filter(r => r.metrics.maxContext >= 32768).map(r => r.model),
                mediumContext: sorted.filter(r => r.metrics.maxContext >= 8192 && r.metrics.maxContext < 32768).map(r => r.model),
                shortContext: sorted.filter(r => r.metrics.maxContext < 8192).map(r => r.model)
            }
        };
    }

    /**
     * Load cached results
     */
    loadCached() {
        return testCache.loadLatest('context-limits');
    }
}

module.exports = new ContextLimitsTest();
