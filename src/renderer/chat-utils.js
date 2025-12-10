/**
 * ChatUtils - Helper for AI Conversation Flow
 * Handles history formatting and prompt engineering.
 */
class ChatUtils {
    /**
     * Formats the last N messages from the feed into a string context.
     * @param {Array} feed - The state.aiResultsFeed array
     * @param {number} limit - Number of messages to include (default 10)
     * @returns {string} Formatted history string
     */
    static getRecentChatHistory(feed, limit = 10) {
        if (!feed || feed.length === 0) return '';

        // Filter valid chat items
        const chatItems = feed.filter(item =>
            (item.type === 'user' || item.type === 'ai') &&
            item.content &&
            !item.content.startsWith('❌') // Skip errors
        );

        // Take last N items
        const recent = chatItems.slice(-limit);

        if (recent.length === 0) return '';

        let history = "HISTORIA ROZMOWY (Chronologicznie):\n";
        recent.forEach(item => {
            const role = item.type === 'user' ? 'User' : 'AI';
            // Clean content (remove HTML if needed, though simple regex is usually enough for basic stripping)
            const cleanContent = item.content.replace(/<[^>]*>/g, '').trim();
            history += `${role}: ${cleanContent}\n`;
        });
        history += "----------------\n";

        return history;
    }

    /**
     * Enhances the base system prompt with "Natural & Goal-Oriented" instructions.
     * @param {string} baseSystemPrompt - The original system prompt
     * @returns {string} Enhanced system prompt
     */
    static enhanceSystemPrompt(baseSystemPrompt) {
        return `${baseSystemPrompt}

DYREKTYWY STYLU ROZMOWY:
1. NATURALNOŚĆ: Pisz jak człowiek, nie jak AI. Unikaj sztywnych formułek ("Jako model językowy..."). Używaj luźniejszego języka, ale z zachowaniem klimatu.
2. ZWIĘZŁOŚĆ: Odpowiadaj krótko i konkretnie. Nie lej wody, chyba że jesteś proszony o opowiadanie.
3. CELOWOŚĆ: Pamiętaj, że twoim celem jest pomoc w tworzeniu postaci/questa. Zadawaj pytania pomocnicze, jeśli brakuje ci informacji.
4. PROAKTYWNOŚĆ: Nie czekaj biernie. Jeśli gracz poda mglisty pomysł, zaproponuj konkrety (np. "Masz na myśli coś jak X czy Y?").
5. KONTEKST: Odnoś się do tego, co zostało powiedziane wcześniej (patrz Historia Rozmowy).`;
    }


    // =========================================================================
    //  DROPDOWN & AUTOCOMPLETE LOGIC (Ported from ConversationFlowExtension)
    // =========================================================================

    static SLASH_COMMANDS = {
        '/quest': '🎯 Główny quest', '/q': '🎯 Quest (skrót)', '/side': '📋 Poboczny quest',
        '/hook': '🪝 Haczyki', '/secret': '🔮 Sekret', '/analiza': '🔍 Analiza relacji',
        '/cechy': '📊 Cechy', '/frakcja': '⚔️ Frakcja', '/ksywka': '🏷️ Ksywka', '/pomoc': '❓ Pomoc'
    };

    static MENTION_FIELDS = {
        '@imie': { field: 'Imie postaci', icon: '👤', desc: 'Imię' },
        '@gildia': { field: 'Gildia', icon: '⚔️', desc: 'Gildia' },
        '@slabosci': { field: 'Słabości', icon: '💔', desc: 'Słabości' },
        '@aspiracje': { field: 'Aspiracje', icon: '🌟', desc: 'Aspiracje' },
        '@historia': { field: 'Historia postaci', icon: '📜', desc: 'Historia' },
        '@relacje': { field: 'Relacje', icon: '🤝', desc: 'Relacje' },
        '@sekret': { field: 'Sekret', icon: '🔮', desc: 'Sekret' }
    };

    static state = {
        slash: { visible: false, filter: '', selectedIndex: 0 },
        mention: { visible: false, filter: '', selectedIndex: 0 }
    };

    /**
     * Resolves @mentions in the text to their actual values from the profile.
     * @param {string} text - User input
     * @param {object} profile - Current character profile
     * @returns {string} Text with resolved mentions (context injection!)
     */
    static expandMentions(text, profile) {
        if (!text || !text.includes('@')) return text;

        return text.replace(/@(\w+)/g, (match, fieldKey) => {
            const def = ChatUtils.MENTION_FIELDS['@' + fieldKey];
            if (!def) return match; // Not a known mention, leave it

            const val = profile ? profile[def.field] : null;
            if (val) {
                // Return format: [Label: Value] to give Context to AI
                return `[${def.desc}: ${val}]`;
            }
            return match;
        });
    }

    /**
     * Renders the visible dropdown HTML.
     */
    static renderDropdowns() {
        if (ChatUtils.state.slash.visible) return ChatUtils.renderSlashDropdown();
        if (ChatUtils.state.mention.visible) return ChatUtils.renderMentionDropdown();
        return '';
    }

    static renderSlashDropdown() {
        const filter = ChatUtils.state.slash.filter.toLowerCase();
        const items = Object.entries(ChatUtils.SLASH_COMMANDS)
            .filter(([key]) => key.includes(filter))
            .map(([key, label]) => ({ key, label }));

        if (!items.length) return '';

        return `<div id="slashDropdown" style="position:absolute;bottom:100%;left:0;width:280px;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);z-index:1000;max-height:200px;overflow-y:auto;margin-bottom:4px;">
            ${items.map((c, i) => `
                <div class="slash-item" 
                     style="padding:10px 12px;cursor:pointer;display:flex;gap:8px;${i === ChatUtils.state.slash.selectedIndex ? 'background:#b4823a;color:#fff;' : ''}" 
                     onclick="window.ChatUtils.selectSlash('${c.key}')"
                     onmouseenter="window.ChatUtils.setIndex('slash', ${i})">
                    <span style="font-family:monospace">${c.key}</span>
                    <span style="opacity:.7">${c.label.split(' ').slice(1).join(' ')}</span>
                </div>
            `).join('')}
        </div>`;
    }

    static renderMentionDropdown() {
        const filter = ChatUtils.state.mention.filter.toLowerCase();
        const items = Object.entries(ChatUtils.MENTION_FIELDS)
            .filter(([key]) => key.includes(filter))
            .map(([key, data]) => ({ key, ...data }));

        if (!items.length) return '';

        return `<div id="mentionDropdown" style="position:absolute;bottom:100%;left:0;width:260px;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);z-index:1000;max-height:200px;overflow-y:auto;margin-bottom:4px;">
            ${items.map((m, i) => `
                <div class="mention-item" 
                     style="padding:10px 12px;cursor:pointer;display:flex;gap:8px;${i === ChatUtils.state.mention.selectedIndex ? 'background:#b4823a;color:#fff;' : ''}" 
                     onclick="window.ChatUtils.selectMention('${m.key}')" 
                     onmouseenter="window.ChatUtils.setIndex('mention', ${i})">
                    ${m.icon} 
                    <span style="font-family:monospace">${m.key}</span> 
                    <span style="opacity:.7">${m.desc}</span>
                </div>
            `).join('')}
        </div>`;
    }

    // --- Actions ---

    static selectSlash(cmd) {
        const inp = document.getElementById('mainPromptInput');
        if (inp) {
            inp.value = cmd + ' ';
            inp.focus();
        }
        ChatUtils.state.slash.visible = false;
        ChatUtils.updateUI();
    }

    static selectMention(key) {
        const inp = document.getElementById('mainPromptInput');
        if (!inp) return;

        const pos = inp.selectionStart;
        const text = inp.value;
        const before = text.substring(0, pos);
        const after = text.substring(pos);

        // Find the @ symbol
        const atIdx = before.lastIndexOf('@');
        if (atIdx === -1) return;

        inp.value = before.substring(0, atIdx) + key + ' ' + after;

        // Restore focus and verify visibility
        ChatUtils.state.mention.visible = false;
        ChatUtils.updateUI();
        inp.focus();
    }

    static setIndex(type, idx) {
        ChatUtils.state[type].selectedIndex = idx;
        ChatUtils.updateUI(); // Re-render to show highlight
    }

    static updateUI() {
        const container = document.querySelector('.ai-input-container');
        if (!container) return;

        // Remove old
        document.getElementById('slashDropdown')?.remove();
        document.getElementById('mentionDropdown')?.remove();

        // Add new
        const html = ChatUtils.renderDropdowns();
        if (html) {
            container.style.position = 'relative'; // Ensure positioning context
            container.insertAdjacentHTML('beforeend', html);
        }
    }

    // --- Input Handlers ---

    static handleInput(e) {
        const val = e.target.value;
        const pos = e.target.selectionStart;

        // 1. Slash handling
        if (val.startsWith('/')) {
            // Only if it looks like a command being typed
            const cmdPart = val.split(' ')[0];
            if (val.indexOf(' ') === -1 || val.length <= cmdPart.length) {
                ChatUtils.state.slash.visible = true;
                ChatUtils.state.slash.filter = val.slice(1);
                ChatUtils.state.slash.selectedIndex = 0;
                ChatUtils.updateUI();
                return;
            }
        }
        ChatUtils.state.slash.visible = false;

        // 2. Mention handling
        const beforeCursor = val.substring(0, pos);
        const lastAt = beforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
            const mentionPart = beforeCursor.substring(lastAt);
            // Check if there's a space, which usually invalidates the mention unless strictly typing
            if (!mentionPart.includes(' ')) {
                ChatUtils.state.mention.visible = true;
                ChatUtils.state.mention.filter = mentionPart.slice(1);
                ChatUtils.state.mention.selectedIndex = 0;
                ChatUtils.updateUI();
                return;
            }
        }
        ChatUtils.state.mention.visible = false;

        ChatUtils.updateUI();
    }

    static handleKeydown(e) {
        const type = ChatUtils.state.slash.visible ? 'slash' : (ChatUtils.state.mention.visible ? 'mention' : null);
        if (!type) return;

        const stateObj = ChatUtils.state[type];

        // Basic Navigation
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            // Just visual update of index
            stateObj.selectedIndex++; // Logic needs simple bounds check in render or cycle here
            ChatUtils.updateUI();
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            stateObj.selectedIndex = Math.max(0, stateObj.selectedIndex - 1);
            ChatUtils.updateUI();
            return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            // Trigger selection
            // We need to fetch the actual item key based on filter and index
            // This is simplified; ideally we store 'currentItems' in state
            const filter = stateObj.filter.toLowerCase();
            const source = type === 'slash' ? ChatUtils.SLASH_COMMANDS : ChatUtils.MENTION_FIELDS;
            const items = Object.entries(source)
                .filter(([key]) => key.includes(filter));

            if (items[stateObj.selectedIndex]) {
                const key = items[stateObj.selectedIndex][0];
                if (type === 'slash') ChatUtils.selectSlash(key);
                else ChatUtils.selectMention(key);
            }
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            stateObj.visible = false;
            ChatUtils.updateUI();
        }
    }

    static attachListeners() {
        const input = document.getElementById('mainPromptInput');
        if (!input) {
            setTimeout(ChatUtils.attachListeners, 500);
            return;
        }

        if (input.dataset.cuAttached) return;
        input.dataset.cuAttached = "true";

        input.addEventListener('input', ChatUtils.handleInput);
        input.addEventListener('keydown', ChatUtils.handleKeydown);

        console.log('✅ ChatUtils listeners attached');

    }
}

// Export to window
window.ChatUtils = ChatUtils;
console.log('✅ ChatUtils loaded');
