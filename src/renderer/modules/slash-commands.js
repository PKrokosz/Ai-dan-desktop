/**
 * @module slash-commands
 * @description Slash commands, runCustomPrompt, unified prompt execution
 * ES6 Module - Faza 8 modularizacji
 */

import { state } from './state.js';
import { addLog, renderStep } from './ui-helpers.js';
import { runAI } from './ai-core.js';

// ==============================
// Slash Command Definitions
// ==============================

export const SLASH_COMMANDS = {
    '/quest': 'quest_main',
    '/q': 'quest_main',
    '/side': 'side_quest',
    '/hook': 'story_hooks',
    '/secret': 'secret',
    '/analiza': 'analyze_relations',
    '/cechy': 'extract_traits',
    '/frakcja': 'faction_suggestion',
    '/ksywka': 'nickname',
};

export const SLASH_COMMAND_LABELS = {
    '/quest': '🎯 Główny Quest',
    '/q': '🎯 Quest',
    '/side': '📜 Side Quest',
    '/hook': '🎣 Story Hook',
    '/secret': '🔒 Sekret',
    '/analiza': '🔍 Analiza',
    '/cechy': '✨ Cechy',
    '/frakcja': '⚔️ Frakcja',
    '/ksywka': '🏷️ Ksywka',
};

// ==============================
// Prompt Part Update
// ==============================

/**
 * Update prompt part in state
 * @param {string} part - Part name
 * @param {*} value - Value to set
 */
export function updatePromptPartLocal(part, value) {
    if (!state.promptParts) state.promptParts = {};
    state.promptParts[part] = value;
    // Mirror UI update logic from legacy app.js
    renderStep();
}

// ==============================
// Unified Prompt Execution
// ==============================

/**
 * Run custom prompt with unified logic
 */
// ==============================
// Unified Prompt Execution
// ==============================

/**
 * Run custom prompt with unified logic
 */
export async function runCustomPrompt() {
    // 1. Validation
    if (state.aiProcessing) return;

    // 2. Get Input
    const promptText = (state.promptParts?.goal || '').trim() || document.getElementById('mainPromptInput')?.value.trim();
    if (!promptText) return;

    // 3. Get Profile
    const profile = state.sheetData?.rows?.[state.selectedRow];
    if (!profile) {
        addLog('error', 'Wybierz najpierw postać.');
        return;
    }

    // 4. Pre-process Input (Mentions & Slash Commands)
    let processedText = promptText;

    // Expand Mentions (legacy window.expandMentions)
    if (window.expandMentions && promptText.includes('@')) {
        const allProfiles = state.sheetData?.rows || [];
        processedText = window.expandMentions(promptText, profile, allProfiles);
    }

    // Handle Slash Commands
    if (window.SLASH_COMMAND_LABELS) {
        const slashMatch = Object.entries(window.SLASH_COMMAND_LABELS).find(([key]) =>
            processedText.toLowerCase().startsWith(key)
        );
        if (slashMatch) {
            const [cmd] = slashMatch;
            // E.g. /quest -> "Główny Quest" (passed as commandType to runAI)
            // But runAI expects commandType. If it's a known command key, maybe map it?
            // Actually, runAI handles raw strings.
            // But we should probably pass the processed intent.

            // For now, keep existing logic: strip command, use rest as custom prompt OR command trigger
            // If it matches a Quick Action ID, we might want to trigger that?
            // SLASH_COMMANDS maps '/quest' -> 'quest_main'.

            if (SLASH_COMMANDS[cmd]) {
                // If there is text after command, append it as context/goal?
                // runAI('quest_main', profile, { additionalGoal: ... })?
                // For simplicity, let's treat everything as "Custom Prompt" for now unless it's a pure command.

                // Logic:
                const rest = processedText.substring(cmd.length).trim();
                if (rest) {
                    processedText = rest; // Just the goal
                    // But we want to trigger specific mode?
                    // Let's stick to simple pass-through for now. runAI will handle "Stage 0" for chat.
                    // If user typed "/quest kill rats", we want Context!
                    // This refactor focuses on "siema" (chat).

                    // For "siema", no slash command.
                }
            }
            // Just logging
            console.log('🎯 Slash goal:', cmd, '→', processedText);
        }
    }

    // 5. Update UI (Feed & Input)
    if (!state.aiResultsFeed) state.aiResultsFeed = [];
    state.aiResultsFeed.push({
        type: 'user',
        content: processedText,
        isNew: true,
        timestamp: new Date()
    });

    // Clear UI Input
    if (typeof updatePromptPart === 'function') updatePromptPart('goal', '');
    const inp = document.getElementById('mainPromptInput');
    if (inp) inp.value = '';

    // 6. Execute via ai-core.runAI
    // This ensures we use the Optimize Context / Auto-Activation logic
    try {
        await runAI('chat', profile, { customGoal: processedText });
    } catch (e) {
        addLog('error', 'Błąd uruchamiania AI: ' + e.message);
        state.aiProcessing = false;
        renderStep();
    }
}

// ==============================
// Legacy AI Command Execution
// ==============================

/**
 * Run legacy/direct AI command with streaming
 * @param {string} type - Command type
 * @param {Object} profile - Character profile
 * @param {Object} options - Command options
 */
export async function runLegacyAICommand(type, profile, options) {
    const newItemIndex = state.aiResultsFeed.length;
    state.aiResultsFeed.push({
        id: newItemIndex,
        type: 'ai',
        command: options.customPrompt || type,
        content: '',
        model: options.model || state.selectedModel,
        timestamp: new Date(),
        isNew: true,
        isStreaming: true
    });

    state.streamData = {
        active: true,
        cardIndex: newItemIndex,
        content: '',
        isThinking: true,
        thinkStartTime: Date.now(),
        timerInterval: null
    };

    // Reset parser
    if (state.thinkingParser) {
        state.thinkingParser = typeof ThinkingParser !== 'undefined' ? new ThinkingParser() : null;
    }

    // Start timer
    if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);
    state.streamData.timerInterval = setInterval(() => {
        if (state.aiProcessing && state.streamData.thinkStartTime) {
            const elapsed = ((Date.now() - state.streamData.thinkStartTime) / 1000).toFixed(1);
            const timerEl = document.getElementById('thinking-timer-display');
            if (timerEl) timerEl.textContent = `(${elapsed}s)`;
        }
    }, 100);

    state.aiProcessing = true;
    renderStep();

    const aiResult = await window.electronAPI.aiCommand(type, profile, options);

    if (!aiResult.success) {
        if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);

        state.aiResultsFeed[newItemIndex].content = `❌ Błąd: ${aiResult.error}`;
        state.aiResultsFeed[newItemIndex].isStreaming = false;
        state.aiProcessing = false;
        state.streamData.active = false;
        renderStep();
    }
}

// ==============================
// Result Actions
// ==============================

/**
 * Copy AI result to clipboard
 * @param {number} index - Result index
 */
export function copyAIResult(index) {
    const item = state.aiResultsFeed?.[index];
    if (item?.content) {
        navigator.clipboard.writeText(item.content).then(() => {
            addLog('success', 'Skopiowano do schowka');
        }).catch(err => {
            addLog('error', 'Błąd kopiowania: ' + err.message);
        });
    }
}

/**
 * Save AI result to profile
 * @param {number} index - Result index
 */
export function saveAIResult(index) {
    const item = state.aiResultsFeed?.[index];
    if (item?.content && state.selectedRow !== null) {
        const profile = state.sheetData?.rows?.[state.selectedRow];
        if (profile) {
            if (!profile.savedResults) profile.savedResults = [];
            profile.savedResults.push({
                content: item.content,
                command: item.command,
                timestamp: new Date()
            });
            addLog('success', 'Zapisano do profilu postaci');
        }
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
export function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        addLog('success', 'Skopiowano');
    }).catch(err => {
        addLog('error', 'Błąd: ' + err.message);
    });
}

/**
 * Save specific result to profile
 * @param {string} content - Content to save
 * @param {string} type - Result type
 */
export function saveSpecificResult(content, type) {
    if (content && state.selectedRow !== null) {
        const profile = state.sheetData?.rows?.[state.selectedRow];
        if (profile) {
            if (!profile.savedResults) profile.savedResults = [];
            profile.savedResults.push({
                content: content,
                type: type,
                timestamp: new Date()
            });
            addLog('success', `Zapisano ${type} do profilu`);
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.SLASH_COMMANDS = SLASH_COMMANDS;
    window.SLASH_COMMAND_LABELS = SLASH_COMMAND_LABELS;
    window.runCustomPrompt = runCustomPrompt;
    window.runLegacyAICommand = runLegacyAICommand;
    window.copyAIResult = copyAIResult;
    window.saveAIResult = saveAIResult;
    window.copyToClipboard = copyToClipboard;
    window.saveSpecificResult = saveSpecificResult;
}
