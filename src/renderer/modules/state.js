/**
 * @module state
 * @description Centralny stan aplikacji Agent MG
 * ES6 Module - Faza 1 modularizacji
 */

export const state = {
    currentStep: 1,
    totalSteps: 6,
    traceId: '---',
    ollamaConnected: false,
    ollamaModels: [],

    // Step data
    sheetData: null,
    selectedRow: null,
    lanes: null,
    laneResults: null,
    profile: null,
    quests: null,

    // UI state
    aiProcessing: false,
    aiResult: null,
    aiCommand: null,
    showPromptHistory: false,
    promptHistory: [],
    executionQueue: [],
    executionStatus: 'idle', // 'idle' | 'running' | 'paused'
    aiResultsFeed: [],

    // Sort state
    sortColumn: 'Imie postaci',
    sortAsc: true,

    // Model selection
    selectedModel: null,
    aiTemperature: 0.7,

    // Character Data Cache
    allProfiles: [],
    allCharacterNames: [],

    // Operator/MG Profile
    mgProfiles: [],
    activeMgProfile: null,
    factionHistory: {},
    worldContext: null,

    // Search state
    searchQuery: '',
    searchCache: null,

    // Streaming state
    streamData: {
        active: false,
        cardIndex: -1,
        content: '',
        isThinking: false,
        thinkStartTime: 0,
        startTime: 0
    },

    // Thinking Parser reference (set after load)
    thinkingParser: null,

    // Prompt Configuration state
    promptParts: {
        role: '',
        goal: '',
        context: '',
        dod: '',
        useCoT: false,
        negative: '',
        examples: ''
    },

    promptConfig: {
        contexts: {
            geography: true,
            system: true,
            aspirations: false,
            weaknesses: false,
            quests: true
        },
        style: 'auto',
        fewShotCount: 2,
        responseLength: 'medium',
        usePlaceholders: true,
        focus: {
            faction: null,
            theme: null
        }
    },

    // Prompt Templates
    promptTemplates: [],

    // UI State for new minimalist interface
    ui: {
        dropdowns: {
            quickActions: false,
            context: false,
            model: false,
            personality: false
        }
    },

    // Active downloads tracking
    activeDownloads: {},

    // Processing status
    processingStatus: ''
};

// Helper to reset state (useful for testing)
export function resetState() {
    state.currentStep = 1;
    state.sheetData = null;
    state.selectedRow = null;
    state.aiResult = null;
    state.aiResultsFeed = [];
}

// Make state globally available for legacy code compatibility
if (typeof window !== 'undefined') {
    window.state = state;
}
