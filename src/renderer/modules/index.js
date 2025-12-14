/**
 * @module index
 * @description Barrel export dla wszystkich modułów ES6
 * Centralny punkt wejścia dla importów
 */

// Core state
export { state, resetState } from './state.js';

// Configuration
export {
    QUICK_ACTIONS,
    PERSONALITY_PROMPTS,
    STEPS,
    SLASH_COMMANDS,
    COMMAND_LABELS
} from './config.js';

// UI Helpers
export {
    addLog,
    setProgress,
    getCurrentStep,
    goToStep,
    renderStep,
    setRenderStep,
    updateStepIndicators,
    updateStepTitle,
    closeModal,
    createModal
} from './ui-helpers.js';

// UI Core
export {
    renderStep,
    showSettings,
    showTestbench,
    updatePromptConfig
} from './ui-core.js';

// Step Templates
export {
    stepTemplates,
    sourceTemplate,
    extractionTemplate,
    aiTemplate,
    mergeTemplate,
    questsTemplate,
    exportTemplate,
    settingsTemplate,
    testbenchTemplate,
    getStepTemplate
} from './step-templates.js';

// Models Database (Deprecated - use models-manager)
// export * from './models-db.js';

// Core Logic Modules
export * as mermaidAdapter from './mermaid-adapter.js';
export * as relationshipAnalyzer from './relationship-analyzer.js';

// AI Core Functions
export {
    getModelSpecificSystemPrompt,
    applyModelOptimization
} from './ai-utils.js';

export {
    buildDynamicContext,
    runAI,
    runAllSequentially,
    processQueue,
    togglePause
} from './ai-core.js';

// Profile Renderer
export {
    highlightText,
    linkifyNames,
    closeCharacterOverlay,
    openCharacterOverlay,
    jumpToCharacter,
    renderProfileDetails
} from './profile-renderer.js';

// Streaming Handler
export {
    formatMarkdown,
    updateThinkingTimer,
    updateStreamUI,
    handleAIStreamChunk
} from './streaming-handler.js';

// AI Panel & Dropdowns
export {
    toggleDropdown,
    renderQuickActionsDropdown,
    renderModelDropdown,
    renderContextDropdown,
    updatePromptPart,
    renderMinimalistAIPanel,
    // formatMarkdown exported from streaming-handler
} from './ai-panel.js';

// API Functions (Deprecated)
// export * from './api-functions.js';

// Search Functions (Replaced by DataManager)
export {
    updateSearchStats,
    handleSearchInput,
    selectSuggestion,
    hideSuggestions,
    searchByTag,
    preloadData
} from './data-manager.js';

// Operator / MG Functions (Replaced by Operator Manager)
// export * from './operator-functions.js';

// Initialization
export {
    init,
    // setupLogsPanelToggle, // These are internal to init now
    // setupIpcListeners,
    // setupSidebarNavigation,
    // setupNavigationButtons
} from './app-init.js';

// Ollama Setup
export {
    checkOllamaSetup,
    showOllamaSetupModal,
    closeOllamaSetupModal,
    installOllama
} from './ollama-setup.js';

// Excel Search & Tests
export {
    runExcelSearch,
    highlightSearchText,
    clearActiveSteps,
    showAdvancedTests
} from './excel-search.js';

// Slash Commands & Utils
export {
    runCustomPrompt,
    updatePromptPartLocal,
    SLASH_COMMANDS,
    SLASH_COMMAND_LABELS,
    copyAIResult,
    saveAIResult,
    copyToClipboard
} from './slash-commands.js';

// Testbench
export {
    getTestbenchTemplate,
    initTestbenchView,
    runTestbench,
    cancelTestbench,
    exportTestbenchReport,
    selectAllModels,
    selectAllScenarios
} from './testbench.js';

// Models Manager
export {
    OLLAMA_MODELS,
    filterModelsByVram,
    renderModelCategories,
    populateModelSelects,
    isModelInstalled,
    checkOllama,
    updateModelStatuses,
    updateDownloadQueue,
    pullModel
} from './models-manager.js';

// Operator Manager
export {
    loadMgProfiles,
    setOperator,
    openOperatorModal,
    renderMgDetails
} from './operator-manager.js';

// System Diagnostics
export {
    loadSystemSpecs
} from './system-diagnostics.js';

// Data Processor Export
export {
    loadDataSource,
    getSortedRows,
    sortData,
    selectRow
} from './data-manager.js';

export {
    processAI,
    generateQuests,
    exportResults,
    openOutputFolder,
    editProfile
} from './data-processor.js';

// Prompt History
export {
    syncHistoryPanelVisibility,
    togglePromptHistory,
    renderPromptHistory,
    loadPromptTemplates,
    savePromptTemplate,
    deletePromptTemplate,
    applyPromptTemplate
} from './prompt-history.js';

export {
    toggleCategory,
    setExtractionModel,
    setGenerationModel,
    getCurrentModel
} from './models-manager.js';
