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
    COMMAND_LABELS
} from './config.js';

// UI Helpers (excluding renderStep - use ui-core version)
export {
    addLog,
    setProgress,
    getCurrentStep,
    goToStep,
    setRenderStep,
    updateStepIndicators,
    updateStepTitle,
    toggleTagsDrawer
} from './ui-helpers.js';

export {
    closeModal,
    createModal,
    showContextPreviewModal
} from './ui-modal-helper.js';

// UI Core (primary renderStep source)
import {
    renderStep,
    showSettings,
    showTestbench,
    updatePromptConfig
} from './ui-core.js';

export {
    renderStep,
    showSettings,
    showTestbench,
    updatePromptConfig
};

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

// Core Logic Modules
export * as mermaidAdapter from './mermaid-adapter.js';
export * as relationshipAnalyzer from './relationship-analyzer.js';
export { showGlobalGraph } from './relationship-analyzer.js';

// AI Core Functions
export {
    getModelSpecificSystemPrompt,
    applyModelOptimization
} from './ai-utils.js';

export {
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

export { runCharacterTest } from './character-test-runner.js';

// Features (Consolidated below)

// AI Panel & Dropdowns
import {
    toggleDropdown,
    renderQuickActionsDropdown,
    renderModelDropdown,
    renderContextDropdown,
    updatePromptPart,
    renderMinimalistAIPanel
} from './ai-panel.js';

export {
    toggleDropdown,
    renderQuickActionsDropdown,
    renderModelDropdown,
    renderContextDropdown,
    updatePromptPart,
    renderMinimalistAIPanel
};

// Data Manager (Consolidated)
import {
    updateSearchStats,
    handleSearchInput,
    selectSuggestion,
    hideSuggestions,
    searchByTag,
    preloadData,
    loadDataSource,
    getSortedRows,
    sortData,
    selectRow,
    triggerSpark,
    setFilters
} from './data-manager.js';

export {
    updateSearchStats,
    handleSearchInput,
    selectSuggestion,
    hideSuggestions,
    searchByTag,
    preloadData,
    loadDataSource,
    getSortedRows,
    sortData,
    selectRow,
    triggerSpark,
    setFilters
};

import { openLetterGenerator } from './letter-generator.js';
import { generateGossip } from './gossip-module.js';

export { openLetterGenerator, generateGossip };

// Initialization
export {
    init
} from './app-init.js';

// Ollama Setup
export {
    checkOllamaSetup,
    showOllamaSetupModal,
    closeOllamaSetupModal,
    installOllama
} from './ollama-setup.js';

// Excel Search & Tests
import {
    runExcelSearch,
    highlightSearchText,
    clearActiveSteps,
    showAdvancedTests
} from './excel-search.js';

export {
    runExcelSearch,
    highlightSearchText,
    clearActiveSteps,
    showAdvancedTests
};

// Slash Commands & Utils (primary SLASH_COMMANDS source)
export {
    runCustomPrompt,
    updatePromptPartLocal,
    SLASH_COMMANDS,
    SLASH_COMMAND_LABELS,
    copyAIResult,
    saveAIResult,
    copyToClipboard
} from './slash-commands.js';

// Automated Test
import {
    runFullPipelineTest
} from './automated-test.js';

export {
    runFullPipelineTest
};

// Testbench
import {
    getTestbenchTemplate,
    initTestbenchView,
    runTestbench,
    cancelTestbench,
    exportTestbenchReport,
    selectAllModels,
    selectAllScenarios,
    selectTestProfile
} from './testbench.js';

export {
    getTestbenchTemplate,
    initTestbenchView,
    runTestbench,
    cancelTestbench,
    exportTestbenchReport,
    selectAllModels,
    selectAllScenarios,
    selectTestProfile
};

// Models Manager (consolidated)
import {
    OLLAMA_MODELS,
    filterModelsByVram,
    renderModelCategories,
    populateModelSelects,
    isModelInstalled,
    checkOllama,
    updateModelStatuses,
    updateDownloadQueue,
    pullModel,
    toggleCategory,
    setExtractionModel,
    setGenerationModel,
    getCurrentModel,
    pickModelPath,
    changeModelPath
} from './models-manager.js';

export {
    OLLAMA_MODELS,
    filterModelsByVram,
    renderModelCategories,
    populateModelSelects,
    isModelInstalled,
    checkOllama,
    updateModelStatuses,
    updateDownloadQueue,
    pullModel,
    toggleCategory,
    setExtractionModel,
    setGenerationModel,
    getCurrentModel,
    pickModelPath,
    changeModelPath
};


// ==============================
// Global Exposure for Legacy HTML
// ==============================
if (typeof window !== 'undefined') {
    window.AppModules = {
        renderStep,
        showSettings,
        showTestbench,
        showAdvancedTests,
        renderMinimalistAIPanel,
        initTestbenchView,
        runTestbench,
        cancelTestbench,
        exportTestbenchReport,
        selectAllModels,
        selectAllScenarios,
        selectTestProfile,
        selectTestProfile,
        runFullPipelineTest,
        triggerSpark,
        setFilters,
        openLetterGenerator,
        generateGossip,
        pickModelPath,
        changeModelPath
    };

    // Legacy direct access for onclick="" in HTML
    window.showSettings = showSettings;
    window.showTestbench = showTestbench;
    window.showAdvancedTests = showAdvancedTests;
    window.renderStep = renderStep;
    window.pickModelPath = pickModelPath;
    window.changeModelPath = changeModelPath;
    window.checkOllama = checkOllama;
}
export { default as ContextManager } from './context-manager.js';


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

// Data Processor
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
