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

// Models Database
export {
    VRAM_BY_SIZE,
    MODEL_CATEGORIES,
    OLLAMA_MODELS,
    getVramForSize,
    filterModelsByVram,
    getAllModelIds
} from './models-db.js';

// Core Logic Modules
export * as mermaidAdapter from './mermaid-adapter.js';
export * as relationshipAnalyzer from './relationship-analyzer.js';

// AI Core Functions
export {
    updatePromptConfig,
    getModelSpecificSystemPrompt,
    applyModelOptimization,
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
    jumpToCharacter
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
    updatePromptPart
} from './ai-panel.js';

// API Functions
export {
    checkOllama,
    updateModelStatuses,
    updateDownloadQueue,
    pullModel,
    deduplicateProfiles,
    loadDataSource,
    getSortedRows,
    sortData,
    selectRow,
    processAI,
    generateQuests,
    exportResults,
    openOutputFolder
} from './api-functions.js';

// Search Functions
export {
    updateSearchStats,
    handleSearchInput,
    selectSuggestion,
    hideSuggestions,
    searchByTag,
    preloadData
} from './search-functions.js';

// Operator / MG Functions
export {
    loadMgProfiles,
    setOperator,
    openOperatorModal,
    renderMgDetails
} from './operator-functions.js';

// Initialization
export {
    init,
    setupLogsPanelToggle,
    setupIpcListeners,
    setupSidebarNavigation,
    setupNavigationButtons
} from './init.js';

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

// Slash Commands
export {
    SLASH_COMMANDS as SLASH_COMMANDS_MAP,
    SLASH_COMMAND_LABELS,
    runCustomPrompt,
    runLegacyAICommand,
    copyAIResult,
    saveAIResult,
    copyToClipboard,
    saveSpecificResult
} from './slash-commands.js';

// Model Selector
export {
    filterModelsByVramUI,
    renderModelCategories,
    toggleCategory,
    populateModelSelects,
    isModelInstalled,
    setExtractionModel,
    setGenerationModel,
    getCurrentModel
} from './model-selector.js';
