/**
 * Render thinking timer logic
 */
if (typeof window !== 'undefined') {
    window.updateThinkingTimer = function (startTime) {
        const timerEl = document.getElementById('thinking-timer-display');
        if (!timerEl) return;

        const now = Date.now();
        const diff = (now - startTime) / 1000;
        timerEl.textContent = `${diff.toFixed(1)}s`;
    };

    window.updateStreamUI = function (data, isThinking = false) {
        // Find the card content element
        const cardIndex = data.cardIndex || (state.aiResultsFeed.length - 1);
        const cardId = `ai-card-${cardIndex}`;
        const cardEl = document.getElementById(cardId);

        if (!cardEl) return;

        const contentEl = cardEl.querySelector('.ai-card-content');
        if (!contentEl) return;

        // If we are thinking, we might want to update a specific "thinking" section
        // For now, we assume the content is being appended or replaced in app.js
        // This function can be expanded for more complex DOM manipulations
    }
}

// ==========================================
// THINKING PARSER (Ported from Ollama parser.go)
// ==========================================

const ThinkingState = {
    LOOKING_FOR_OPEN: 0,
    EATING_WHITESPACE_AFTER_OPEN: 1,
    THINKING: 2,
    EATING_WHITESPACE_AFTER_CLOSE: 3,
    DONE: 4
};

class ThinkingParser {
    constructor() {
        this.state = ThinkingState.LOOKING_FOR_OPEN;
        this.openingTag = '<think>';
        this.closingTag = '</think>';
        this.buffer = ''; // Accumulator for ambiguous content
    }

    /**
     * Parse a chunk of text.
     * @param {string} chunk - New text chunk from stream
     * @returns {object} { thinking: string, content: string }
     */
    process(chunk) {
        this.buffer += chunk;
        let thinkingOutput = '';
        let contentOutput = '';

        let keepLooping = true;
        while (keepLooping) {
            const { thinking, content, continueLoop } = this.eat();
            thinkingOutput += thinking;
            contentOutput += content;
            keepLooping = continueLoop;
        }

        return { thinking: thinkingOutput, content: contentOutput };
    }

    eat() {
        switch (this.state) {
            case ThinkingState.LOOKING_FOR_OPEN: {
                if (this.buffer.length === 0) return { thinking: '', content: '', continueLoop: false };

                // Check if buffer STARTS with part of the opening tag
                // But we must be careful: "Hello <th" -> "Hello " is content, "<th" is buffer.

                // Simple heuristic: search for tag index
                const openIdx = this.buffer.indexOf(this.openingTag);

                if (openIdx !== -1) {
                    // Found full opening tag
                    const preTagContent = this.buffer.substring(0, openIdx);
                    this.buffer = this.buffer.substring(openIdx + this.openingTag.length);
                    this.state = ThinkingState.EATING_WHITESPACE_AFTER_OPEN;
                    return { thinking: '', content: preTagContent, continueLoop: true };
                }

                // Check for impartial partial match at the END of buffer
                // e.g. "Content <th"
                let partialMatchLen = 0;
                for (let i = 1; i < this.openingTag.length; i++) {
                    if (this.buffer.endsWith(this.openingTag.substring(0, i))) {
                        partialMatchLen = i;
                    }
                }

                if (partialMatchLen > 0) {
                    // We have potential tag start, output everything before it
                    const safeContent = this.buffer.substring(0, this.buffer.length - partialMatchLen);
                    this.buffer = this.buffer.substring(this.buffer.length - partialMatchLen); // Keep partial in buffer
                    return { thinking: '', content: safeContent, continueLoop: false }; // Wait for more data
                }

                // No tag found, everything is content
                const content = this.buffer;
                this.buffer = '';
                // If we haven't found a tag yet, we might find one later, but for now this chunk is content.
                // However, strictly speaking, if we are "LookingForOpening", we should output.
                // State stays LOOKING_FOR_OPEN until we find one. 
                // Wait, if the model outputs "<think>" later, we handle it then.
                // But we assumed "Thinking" usually starts at the beginning or we handle mixed content.
                // Ollama parser assumes it eats *everything* until it finds tag.
                // We will behave similarly: dump buffer as content loop

                // Fix for the port: If we are looking for open, and didn't find partial or full, 
                // all currently buffered text is likely content, UNLESS the stream is strangely segmented.
                // Safe bet: output everything.
                return { thinking: '', content: content, continueLoop: false };
            }

            case ThinkingState.EATING_WHITESPACE_AFTER_OPEN: {
                // Trim leading whitespace from thinking content
                const trimmed = this.buffer.trimStart();
                if (trimmed.length === 0) {
                    // Only whitespace seen so far, keep eating
                    this.buffer = '';
                    return { thinking: '', content: '', continueLoop: false };
                }

                // Non-whitespace found
                this.buffer = trimmed;
                this.state = ThinkingState.THINKING;
                return { thinking: '', content: '', continueLoop: true };
            }

            case ThinkingState.THINKING: {
                const closeIdx = this.buffer.indexOf(this.closingTag);
                if (closeIdx !== -1) {
                    // Found closing tag
                    const thought = this.buffer.substring(0, closeIdx);
                    this.buffer = this.buffer.substring(closeIdx + this.closingTag.length);
                    this.state = ThinkingState.EATING_WHITESPACE_AFTER_CLOSE;
                    return { thinking: thought, content: '', continueLoop: true };
                }

                // Check for partial closing tag at the end
                let partialMatchLen = 0;
                for (let i = 1; i < this.closingTag.length; i++) {
                    if (this.buffer.endsWith(this.closingTag.substring(0, i))) {
                        partialMatchLen = i;
                    }
                }

                if (partialMatchLen > 0) {
                    // Output explicit thinking up to the partial tag
                    const safeThought = this.buffer.substring(0, this.buffer.length - partialMatchLen);
                    this.buffer = this.buffer.substring(this.buffer.length - partialMatchLen);
                    return { thinking: safeThought, content: '', continueLoop: false };
                }

                // No closing tag, all is thought
                const thought = this.buffer;
                this.buffer = '';
                return { thinking: thought, content: '', continueLoop: false };
            }

            case ThinkingState.EATING_WHITESPACE_AFTER_CLOSE: {
                const trimmed = this.buffer.trimStart();
                if (trimmed.length === 0) {
                    this.buffer = '';
                    return { thinking: '', content: '', continueLoop: false };
                }
                this.buffer = trimmed;
                this.state = ThinkingState.DONE;
                return { thinking: '', content: '', continueLoop: true };
            }

            case ThinkingState.DONE: {
                // Just pass through everything as content
                const content = this.buffer;
                this.buffer = '';
                return { thinking: '', content: content, continueLoop: false };
            }
        }
        return { thinking: '', content: '', continueLoop: false };
    }
}

if (typeof window !== 'undefined') {
    window.ThinkingParser = ThinkingParser;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThinkingParser };
}
