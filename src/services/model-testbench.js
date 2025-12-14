/**
 * @module model-testbench
 * @description Automatyczny framework do testowania i porównywania modeli Ollama
 */

const ollamaService = require('./ollama-client'); // Using official ollama npm library
const promptBuilder = require('../prompts/prompt-builder');
const testScenarios = require('./test-scenarios');
const logger = require('../shared/logger');
const { getTraceId } = require('../shared/tracing');

class ModelTestbench {
    constructor() {
        this.isRunning = false;
        this.shouldCancel = false;
        this.currentProgress = {
            totalTests: 0,
            completedTests: 0,
            currentModel: '',
            currentScenario: '',
            results: []
        };
    }

    /**
     * Cancel running test suite
     */
    cancel() {
        if (this.isRunning) {
            logger.info('Test suite cancellation requested');
            this.shouldCancel = true;
        }
    }

    /**
     * Pobiera listę dostępnych modeli z Ollama (z cache)
     */
    async getAvailableModels() {
        const traceId = getTraceId();
        logger.info(`[${traceId}] Fetching available Ollama models (via Service)`);

        try {
            // Use unified service to get models (includes local scan)
            const result = await ollamaService.checkConnection();

            if (!result || !result.models) {
                logger.warn(`[${traceId}] No models returned from service`);
                return [];
            }

            // Filter embedding models
            const textModels = result.models
                .filter(m => !m.name.includes('embed'))
                .map(m => ({
                    name: m.name,
                    size: m.size || 0,
                    modified: m.modified_at || new Date().toISOString()
                }));

            logger.info(`[${traceId}] Found ${textModels.length} text generation models`);
            return textModels;

        } catch (error) {
            logger.error(`[${traceId}] Error getting models:`, error);
            return [];
        }
    }

    /**
     * Uruchamia pełny zestaw testów
     * @param {Array<string>} modelNames - Nazwy modeli do testowania
     * @param {Array<string>} scenarioIds - ID scenariuszy do uruchomienia (lub null dla wszystkich)
     * @param {Object} options - Opcje testowania
     */
    async runTestSuite(modelNames, scenarioIds = null, options = {}) {
        const traceId = getTraceId();
        const { progressCallback } = options;
        logger.info(`[${traceId}] Starting test suite with ${modelNames.length} models`);

        this.isRunning = true;
        this.shouldCancel = false;

        // Pobierz scenariusze do testowania
        const scenarios = scenarioIds
            ? scenarioIds.map(id => testScenarios.getScenarioById(id)).filter(Boolean)
            : testScenarios.getAllScenarios();

        this.currentProgress = {
            totalTests: modelNames.length * scenarios.length,
            completedTests: 0,
            currentModel: '',
            currentScenario: '',
            results: [],
            startTime: Date.now()
        };

        const results = [];

        try {
            // Iteruj po modelach
            for (const modelName of modelNames) {
                // Check for cancellation
                if (this.shouldCancel) {
                    logger.info(`[${traceId}] Test suite cancelled by user`);
                    throw new Error('Tests cancelled by user');
                }

                this.currentProgress.currentModel = modelName;
                logger.info(`[${traceId}] Testing model: ${modelName}`);

                // Iteruj po scenariuszach
                for (const scenario of scenarios) {
                    // Check for cancellation
                    if (this.shouldCancel) {
                        logger.info(`[${traceId}] Test suite cancelled by user`);
                        throw new Error('Tests cancelled by user');
                    }

                    this.currentProgress.currentScenario = scenario.name;
                    logger.info(`[${traceId}] Running scenario: ${scenario.id} on ${modelName}`);

                    try {
                        const result = await this.runSingleTest(modelName, scenario, traceId);
                        results.push(result);
                    } catch (error) {
                        logger.error(`[${traceId}] Test failed: ${scenario.id} on ${modelName}`, error);
                        results.push({
                            modelName,
                            scenario: scenario.id,
                            scenarioName: scenario.name,
                            success: false,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        });
                    }

                    this.currentProgress.completedTests++;

                    // Emit real-time progress update
                    if (progressCallback) {
                        const progressPercent = Math.round((this.currentProgress.completedTests / this.currentProgress.totalTests) * 100);
                        progressCallback({
                            ...this.currentProgress,
                            progressPercent,
                            isRunning: this.isRunning
                        });
                    }
                }
            }

            this.currentProgress.endTime = Date.now();
            this.currentProgress.results = results;

            logger.info(`[${traceId}] Test suite completed. ${results.length} tests executed.`);
            return this.generateSummary(results);

        } catch (error) {
            logger.error(`[${traceId}] Test suite failed:`, error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Uruchamia pojedynczy test
     */
    async runSingleTest(modelName, scenario, traceId) {
        const startTime = Date.now();

        // Pobierz konfigurację promptu
        const promptConfig = testScenarios.getPromptVariation(scenario.promptVariation);

        // Zbuduj prompt
        const prompt = promptBuilder.buildPrompt(
            scenario.commandType,
            scenario.profile,
            promptConfig
        );

        logger.debug(`[${traceId}] Generated prompt (${prompt.length} chars) for ${scenario.id}`);

        // Wywołaj model
        let response;
        let responseTime;

        try {
            const testOptions = {
                model: modelName,
                temperature: promptConfig.temperature || 0.7,
                system: 'Jesteś Mistrzem Gry. Odpowiadaj TYLKO po polsku.'
            };

            // Używamy generateText (nie JSON, bo większość zadań nie wymaga struktury)
            const result = await ollamaService.generateText(prompt, testOptions);
            responseTime = Date.now() - startTime;

            // Check if generation was successful
            if (!result.success || !result.text) {
                return {
                    modelName,
                    scenario: scenario.id,
                    scenarioName: scenario.name,
                    category: scenario.category,
                    success: false,
                    error: result.error || 'No response text generated',
                    responseTime,
                    timestamp: new Date().toISOString()
                };
            }

            // Extract actual text from result
            response = result.text;

        } catch (error) {
            return {
                modelName,
                scenario: scenario.id,
                scenarioName: scenario.name,
                category: scenario.category,
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }

        // Oceń odpowiedź
        const evaluation = this.evaluateResponse(response, scenario.evaluationCriteria);

        return {
            modelName,
            scenario: scenario.id,
            scenarioName: scenario.name,
            category: scenario.category,
            commandType: scenario.commandType,
            promptVariation: scenario.promptVariation,
            success: true,
            response: response,
            responseLength: response.length,
            responseTime: responseTime,
            evaluation: evaluation,
            tokenMetrics: result.stats ? {
                promptTokens: result.stats.promptEvalCount || 0,
                responseTokens: result.stats.evalCount || 0,
                totalTokens: result.stats.totalTokens || 0,
                tokensPerSecond: result.stats.tokensPerSecond || 0
            } : null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Ocenia odpowiedź modelu według kryteriów
     */
    evaluateResponse(response, criteria) {
        const evaluation = {
            passed: true,
            score: 0,
            maxScore: 0,
            checks: []
        };

        // 1. Sprawdź długość
        evaluation.maxScore += 10;
        if (response.length >= criteria.minLength && response.length <= criteria.maxLength) {
            evaluation.score += 10;
            evaluation.checks.push({ name: 'length', passed: true, message: `Length OK (${response.length} chars)` });
        } else {
            evaluation.passed = false;
            evaluation.checks.push({
                name: 'length',
                passed: false,
                message: `Length ${response.length} outside range [${criteria.minLength}, ${criteria.maxLength}]`
            });
        }

        // 2. Sprawdź język (czy po polsku)
        if (criteria.language === 'pl') {
            evaluation.maxScore += 15;
            const hasPolishChars = /[ąćęłńóśźż]/i.test(response);
            const hasCommonPolishWords = /(jest|są|może|będzie|przez|oraz|który)/i.test(response);

            if (hasPolishChars && hasCommonPolishWords) {
                evaluation.score += 15;
                evaluation.checks.push({ name: 'language', passed: true, message: 'Polish language detected' });
            } else {
                evaluation.passed = false;
                evaluation.checks.push({ name: 'language', passed: false, message: 'Not clearly in Polish' });
            }
        }

        // 3. Sprawdź czy NIE ma angielskiego (jeśli wymagane)
        if (criteria.shouldAvoidEnglish) {
            evaluation.maxScore += 10;
            const commonEnglishWords = /\b(the|is|are|was|were|have|has|will|would|should|could)\b/i;
            const hasEnglish = commonEnglishWords.test(response);

            if (!hasEnglish) {
                evaluation.score += 10;
                evaluation.checks.push({ name: 'no_english', passed: true, message: 'No English words detected' });
            } else {
                evaluation.checks.push({ name: 'no_english', passed: false, message: 'English words found' });
            }
        }

        // 4. Sprawdź wymagane słowa kluczowe
        if (criteria.requiredKeywords && criteria.requiredKeywords.length > 0) {
            const pointsPerKeyword = 10;
            evaluation.maxScore += pointsPerKeyword * criteria.requiredKeywords.length;

            const lowerResponse = response.toLowerCase();
            const foundKeywords = [];
            const missingKeywords = [];

            criteria.requiredKeywords.forEach(keyword => {
                if (lowerResponse.includes(keyword.toLowerCase())) {
                    evaluation.score += pointsPerKeyword;
                    foundKeywords.push(keyword);
                } else {
                    missingKeywords.push(keyword);
                }
            });

            if (missingKeywords.length > 0) {
                evaluation.passed = false;
                evaluation.checks.push({
                    name: 'keywords',
                    passed: false,
                    message: `Missing keywords: ${missingKeywords.join(', ')}`
                });
            } else {
                evaluation.checks.push({
                    name: 'keywords',
                    passed: true,
                    message: `All keywords found: ${foundKeywords.join(', ')}`
                });
            }
        }

        // 5. Custom checks (z definicji scenariusza)
        if (criteria.customChecks && criteria.customChecks.length > 0) {
            const pointsPerCheck = 15;
            evaluation.maxScore += pointsPerCheck * criteria.customChecks.length;

            criteria.customChecks.forEach(customCheck => {
                try {
                    const passed = customCheck.check(response);
                    if (passed) {
                        evaluation.score += pointsPerCheck;
                        evaluation.checks.push({
                            name: customCheck.name,
                            passed: true,
                            message: customCheck.description
                        });
                    } else {
                        evaluation.passed = false;
                        evaluation.checks.push({
                            name: customCheck.name,
                            passed: false,
                            message: `Failed: ${customCheck.description}`
                        });
                    }
                } catch (error) {
                    evaluation.checks.push({
                        name: customCheck.name,
                        passed: false,
                        message: `Error: ${error.message}`
                    });
                }
            });
        }

        // Oblicz procent
        evaluation.scorePercent = evaluation.maxScore > 0
            ? Math.round((evaluation.score / evaluation.maxScore) * 100)
            : 0;

        return evaluation;
    }

    /**
     * Generuje podsumowanie wyników
     */
    generateSummary(results) {
        const summary = {
            totalTests: results.length,
            successfulTests: results.filter(r => r.success).length,
            failedTests: results.filter(r => !r.success).length,
            modelStats: {},
            categoryStats: {},
            topPerformers: [],
            detailedResults: results
        };

        // Statystyki per model
        const modelNames = [...new Set(results.map(r => r.modelName))];
        modelNames.forEach(modelName => {
            const modelResults = results.filter(r => r.modelName === modelName && r.success);
            const scores = modelResults.map(r => r.evaluation?.scorePercent || 0);

            // Token metrics
            const tokenMetrics = modelResults
                .filter(r => r.tokenMetrics)
                .map(r => r.tokenMetrics);

            const avgPromptTokens = tokenMetrics.length > 0
                ? Math.round(tokenMetrics.reduce((sum, m) => sum + m.promptTokens, 0) / tokenMetrics.length)
                : 0;

            const avgResponseTokens = tokenMetrics.length > 0
                ? Math.round(tokenMetrics.reduce((sum, m) => sum + m.responseTokens, 0) / tokenMetrics.length)
                : 0;

            const avgTotalTokens = tokenMetrics.length > 0
                ? Math.round(tokenMetrics.reduce((sum, m) => sum + m.totalTokens, 0) / tokenMetrics.length)
                : 0;

            const avgTokensPerSecond = tokenMetrics.length > 0
                ? Math.round((tokenMetrics.reduce((sum, m) => sum + m.tokensPerSecond, 0) / tokenMetrics.length) * 100) / 100
                : 0;

            summary.modelStats[modelName] = {
                totalTests: results.filter(r => r.modelName === modelName).length,
                successfulTests: modelResults.length,
                averageScore: scores.length > 0
                    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                    : 0,
                averageResponseTime: modelResults.length > 0
                    ? Math.round(modelResults.reduce((sum, r) => sum + r.responseTime, 0) / modelResults.length)
                    : 0,
                tokenMetrics: {
                    avgPromptTokens,
                    avgResponseTokens,
                    avgTotalTokens,
                    avgTokensPerSecond
                }
            };
        });

        // Statystyki per kategoria
        const categories = [...new Set(results.map(r => r.category).filter(Boolean))];
        categories.forEach(category => {
            const categoryResults = results.filter(r => r.category === category && r.success);

            summary.categoryStats[category] = {
                totalTests: results.filter(r => r.category === category).length,
                successfulTests: categoryResults.length,
                bestModel: this.findBestModelForCategory(results, category)
            };
        });

        // Top performers (najlepszy model dla każdego scenariusza)
        const scenarioIds = [...new Set(results.map(r => r.scenario))];
        scenarioIds.forEach(scenarioId => {
            const scenarioResults = results.filter(r => r.scenario === scenarioId && r.success);
            if (scenarioResults.length > 0) {
                const best = scenarioResults.reduce((prev, current) => {
                    return (current.evaluation?.scorePercent || 0) > (prev.evaluation?.scorePercent || 0)
                        ? current : prev;
                });

                summary.topPerformers.push({
                    scenario: scenarioId,
                    scenarioName: best.scenarioName,
                    winnerModel: best.modelName,
                    score: best.evaluation?.scorePercent || 0
                });
            }
        });

        return summary;
    }

    /**
     * Znajduje najlepszy model dla danej kategorii
     */
    findBestModelForCategory(results, category) {
        const categoryResults = results.filter(r => r.category === category && r.success);
        if (categoryResults.length === 0) return null;

        const modelScores = {};
        categoryResults.forEach(result => {
            if (!modelScores[result.modelName]) {
                modelScores[result.modelName] = [];
            }
            modelScores[result.modelName].push(result.evaluation?.scorePercent || 0);
        });

        let bestModel = null;
        let bestAverage = 0;

        Object.entries(modelScores).forEach(([modelName, scores]) => {
            const average = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (average > bestAverage) {
                bestAverage = average;
                bestModel = modelName;
            }
        });

        return bestModel;
    }

    /**
     * Zwraca aktualny postęp testów
     */
    getProgress() {
        return {
            isRunning: this.isRunning,
            ...this.currentProgress,
            progressPercent: this.currentProgress.totalTests > 0
                ? Math.round((this.currentProgress.completedTests / this.currentProgress.totalTests) * 100)
                : 0
        };
    }
}

module.exports = new ModelTestbench();
