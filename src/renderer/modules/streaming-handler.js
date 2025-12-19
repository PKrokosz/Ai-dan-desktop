/**
 * @module streaming-handler
 * @description Obsługa strumieniowania odpowiedzi AI
 * ES6 Module - Faza 3 modularizacji
 */

import { state } from './state.js';
import { addLog, renderStep } from './ui-helpers.js';

// ==============================
// Markdown Formatter
// ==============================

/**
 * Basic Markdown to HTML formatter
 * @param {string} text - Markdown text
 * @returns {string} HTML
 */
export function formatMarkdown(text) {
    if (!text) return '';

    let html = text;

    // Headers
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Unordered Lists
    html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

// ==============================
// Thinking Timer
// ==============================

/**
 * Update thinking timer display
 * @param {number} elapsed - Elapsed time in seconds
 */
export function updateThinkingTimer(elapsed) {
    const timerEl = document.getElementById('thinking-timer-display');
    if (timerEl) timerEl.textContent = `(${elapsed}s)`;
}

// ==============================
// Stream UI Update
// ==============================

/**
 * Update the streaming UI with new content
 * @param {number} index - Card index in aiResultsFeed
 * @param {string} fullContent - Full content so far
 * @param {boolean} isThinking - Whether model is in thinking phase
 */
export function updateStreamUI(index, fullContent, isThinking) {
    const contentEl = document.querySelector(`#ai-card-${index} .ai-card-content`);

    if (contentEl) {
        let displayHtml = fullContent;

        // Check if thinking is complete
        const hasCompleteThink = /<think>[\s\S]*?<\/think>/.test(displayHtml);

        if (hasCompleteThink) {
            const duration = state.streamData.thinkStartTime
                ? Math.round((Date.now() - state.streamData.thinkStartTime) / 1000)
                : 0;

            displayHtml = displayHtml.replace(
                /<think>([\s\S]*?)<\/think>/g,
                `<details class="thinking-collapsed"><summary class="thinking-summary">🧠 Myślał przez ${duration}s ›</summary><div class="thinking-details">$1</div></details>`
            );
        } else if (isThinking) {
            const elapsed = state.streamData.thinkStartTime
                ? ((Date.now() - state.streamData.thinkStartTime) / 1000).toFixed(1)
                : '0.0';

            displayHtml = displayHtml.replace(
                /<think>/g,
                `<div class="thinking-live">🧠 Myślę... ${elapsed}s</div><!--think-start-->`
            );
            const parts = displayHtml.split('<!--think-start-->');
            if (parts.length > 1) {
                displayHtml = parts[0] + '<div class="thinking-live">🧠 Myślę... ' + elapsed + 's</div>';
            }
        }

        // Try structured card renderer
        if (window.StructuredCardRenderer && !isThinking) {
            const cardHtml = window.StructuredCardRenderer.tryRenderStructuredCard(displayHtml);
            if (cardHtml) {
                contentEl.innerHTML = cardHtml;
                autoScrollFeed();
                return;
            }
        }

        // Fallback to markdown
        displayHtml = formatMarkdown(displayHtml);
        contentEl.innerHTML = displayHtml;
        autoScrollFeed();
    }
}

/**
 * Auto-scroll feed to bottom
 */
function autoScrollFeed() {
    const feedContainer = document.getElementById('aiFeedContainer');
    if (feedContainer) {
        feedContainer.scrollTop = feedContainer.scrollHeight;
    }
}

// ==============================
// Main Stream Handler
// ==============================

/**
 * Handle incoming AI stream chunks
 * @param {Object} data - Stream data
 */
export function handleAIStreamChunk(data) {
    if (!state.streamData?.active) return;

    const { chunk, done: isDone, error } = data;

    if (error) {
        addLog('error', `Streaming error: ${error}`);
        state.aiProcessing = false;
        state.streamData.active = false;
        return;
    }

    // Accumulate content
    if (chunk) {
        state.streamData.content += chunk;

        // Check for thinking state
        if (chunk.includes('<think>')) {
            state.streamData.isThinking = true;
            state.streamData.thinkStartTime = Date.now();
        }
        if (chunk.includes('</think>')) {
            state.streamData.isThinking = false;
        }

        // Update UI
        updateStreamUI(state.streamData.cardIndex, state.streamData.content, state.streamData.isThinking);
    }

    if (isDone) {
        // Finalize
        if (state.streamData.timerInterval) {
            clearInterval(state.streamData.timerInterval);
        }

        // Update feed with content and metadata
        if (state.aiResultsFeed[state.streamData.cardIndex]) {
            const item = state.aiResultsFeed[state.streamData.cardIndex];
            item.content = state.streamData.content;
            item.isStreaming = false;
            item.isNew = false;

            // Capture Reporting Metadata
            if (data.system) item.system = data.system;
            if (data.prompt) item.prompt = data.prompt;
            if (data.model) item.model = data.model;
        }

        state.aiProcessing = false;
        state.streamData.active = false;
        state.streamData.cardIndex = -1;

        renderStep();
        addLog('success', '✓ Wygenerowano odpowiedź (Stream)');
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.handleAIStreamChunk = handleAIStreamChunk;
    window.updateStreamUI = updateStreamUI;
    window.formatMarkdown = formatMarkdown;
}
