/**
 * Preload script - Exposes safe APIs to renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Ollama Connection
    checkOllama: () => ipcRenderer.invoke('check-ollama'),
    pullModel: (modelName) => ipcRenderer.invoke('pull-model', modelName),
    onModelPullProgress: (callback) => {
        ipcRenderer.on('model-pull-progress', (event, data) => callback(data));
    },

    // Ollama Installation
    checkOllamaInstalled: () => ipcRenderer.invoke('check-ollama-installed'),
    installOllama: () => ipcRenderer.invoke('install-ollama'),
    startOllama: () => ipcRenderer.invoke('start-ollama'),
    onOllamaInstallStatus: (callback) => {
        ipcRenderer.on('ollama-install-status', (event, data) => callback(data));
    },
    onOllamaInstallProgress: (callback) => {
        ipcRenderer.on('ollama-install-progress', (event, data) => callback(data));
    },

    // Ollama Configuration
    getModelsPath: () => ipcRenderer.invoke('ollama:get-models-path'),
    pickModelsPath: () => ipcRenderer.invoke('ollama:pick-models-path'),
    setModelsPath: (newPath, moveModels) => ipcRenderer.invoke('ollama:set-models-path', { newPath, moveModels }),

    // System Diagnostics
    getSystemSpecs: () => ipcRenderer.invoke('get-system-specs'),

    // Tracing
    getTraceId: () => ipcRenderer.invoke('get-trace-id'),

    // Pipeline operations
    fetchSheets: () => ipcRenderer.invoke('fetch-sheets'),
    fetchLarpGothic: (search) => ipcRenderer.invoke('fetch-larpgothic', search),
    fetchWorldContext: () => ipcRenderer.invoke('fetch-world-context'),
    processLane: (lane, data) => ipcRenderer.invoke('process-lane', lane, data),
    processAllLanes: (lanes) => ipcRenderer.invoke('process-all-lanes', lanes),
    reduceProfile: (laneResults) => ipcRenderer.invoke('reduce-profile', laneResults),
    generateQuests: (profile) => ipcRenderer.invoke('generate-quests', profile),
    renderCards: (profile, quests) => ipcRenderer.invoke('render-cards', profile, quests),
    searchExcelMentions: (characterName) => ipcRenderer.invoke('search-excel-mentions', characterName),
    getProfileByName: (name) => ipcRenderer.invoke('get-profile-by-name', name),
    getAllCharacterNames: () => ipcRenderer.invoke('get-all-character-names'),

    // Data Loading (Excel)
    dataLoadMgProfiles: () => ipcRenderer.invoke('data:load-mg-profiles'),
    dataLoadFactionHistory: () => ipcRenderer.invoke('data:load-faction-history'),
    dataLoadCharHistory: () => ipcRenderer.invoke('data:load-char-history'),
    dataLoadWorldContext: () => ipcRenderer.invoke('data:load-world-context'),

    // AI Assistant
    aiCommand: (commandType, profile, options = {}) => ipcRenderer.invoke('ai-command', commandType, profile, options),
    onAIStream: (callback) => {
        ipcRenderer.on('ai-stream', (event, data) => callback(data));
    },
    onAIStatus: (callback) => {
        ipcRenderer.on('ai-status', (event, data) => callback(data));
    },

    // Conversation Flow (Two-Phase AI)
    convFlowProcess: (profileName, message, profileData) => ipcRenderer.invoke('conv-flow:process', profileName, message, profileData),
    convFlowGetState: (convId) => ipcRenderer.invoke('conv-flow:get-state', convId),
    convFlowReset: (convId) => ipcRenderer.invoke('conv-flow:reset', convId),
    convFlowGetRecipe: (convId) => ipcRenderer.invoke('conv-flow:get-recipe', convId),
    onConvFlowUpdate: (callback) => {
        ipcRenderer.on('conv-flow-update', (event, data) => callback(data));
    },

    // File operations
    saveOutput: (filename, content) => ipcRenderer.invoke('save-output', filename, content),
    openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),

    // Event listeners for progress
    onProgress: (callback) => {
        ipcRenderer.on('progress', (event, data) => callback(data));
    },
    onLog: (callback) => {
        ipcRenderer.on('log', (event, data) => callback(data));
    },

    // Model Testbench
    testbenchGetModels: () => ipcRenderer.invoke('testbench:get-models'),
    testbenchGetScenarios: () => ipcRenderer.invoke('testbench:get-scenarios'),
    testbenchRunTests: (modelNames, scenarioIds) => ipcRenderer.invoke('testbench:run-tests', modelNames, scenarioIds),
    testbenchCancel: () => ipcRenderer.invoke('testbench:cancel'),
    testbenchGetProgress: () => ipcRenderer.invoke('testbench:get-progress'),
    testbenchExportReport: (summary, filename) => ipcRenderer.invoke('testbench:export-report', summary, filename),
    onTestbenchProgress: (callback) => {
        ipcRenderer.on('testbench-progress', (event, progress) => callback(progress));
    },

    // Advanced Tests
    testsContextLimitsRunAll: (modelNames) => ipcRenderer.invoke('tests:context-limits:run-all', modelNames),
    testsContextLimitsLoadCache: () => ipcRenderer.invoke('tests:context-limits:load-cache'),
    testsMemoryUsageRunAll: (modelNames) => ipcRenderer.invoke('tests:memory-usage:run-all', modelNames),
    testsMemoryUsageLoadCache: () => ipcRenderer.invoke('tests:memory-usage:load-cache'),
    testsConsistencyRunAll: (modelNames) => ipcRenderer.invoke('tests:consistency:run-all', modelNames),
    testsConsistencyLoadCache: () => ipcRenderer.invoke('tests:consistency:load-cache'),
    testsPromptSensitivityRunAll: (modelNames) => ipcRenderer.invoke('tests:prompt-sensitivity:run-all', modelNames),
    testsPromptSensitivityLoadCache: () => ipcRenderer.invoke('tests:prompt-sensitivity:load-cache'),
    testsInstructionFollowingRunAll: (modelNames) => ipcRenderer.invoke('tests:instruction-following:run-all', modelNames),
    testsInstructionFollowingLoadCache: () => ipcRenderer.invoke('tests:instruction-following:load-cache'),
    testsHallucinationRunAll: (modelNames) => ipcRenderer.invoke('tests:hallucination:run-all', modelNames),
    testsHallucinationLoadCache: () => ipcRenderer.invoke('tests:hallucination:load-cache'),
    testsLatencyRunAll: (modelNames) => ipcRenderer.invoke('tests:latency:run-all', modelNames),
    testsLatencyLoadCache: () => ipcRenderer.invoke('tests:latency:load-cache'),
    testsCostEfficiencyRunAll: (modelNames) => ipcRenderer.invoke('tests:cost-efficiency:run-all', modelNames),
    testsCostEfficiencyLoadCache: () => ipcRenderer.invoke('tests:cost-efficiency:load-cache'),
    testsNeedleHaystackRunAll: (modelNames) => ipcRenderer.invoke('tests:needle-haystack:run-all', modelNames),
    testsNeedleHaystackLoadCache: () => ipcRenderer.invoke('tests:needle-haystack:load-cache'),
    testsSafetyLimitsRunAll: (modelNames) => ipcRenderer.invoke('tests:safety-limits:run-all', modelNames),
    testsSafetyLimitsLoadCache: () => ipcRenderer.invoke('tests:safety-limits:load-cache'),
    testsLanguageStabilityRunAll: (modelNames) => ipcRenderer.invoke('tests:language-stability:run-all', modelNames),
    testsLanguageStabilityLoadCache: () => ipcRenderer.invoke('tests:language-stability:load-cache')
});
