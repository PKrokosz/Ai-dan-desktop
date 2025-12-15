/**
 * @module ConversationFlowExtension
 * @description Rozszerzenie app.js o conversation flow, slash commands i @ mentions.
 */

// ==========================================
// FEATURE FLAGS
// ==========================================

// Feature flag managed by ConfigHub
let conversationFlowEnabled = false;

// Initialize flag from config
if (window.electronAPI?.configGet) {
    window.electronAPI.configGet('features.conversationFlow', false).then(val => {
        conversationFlowEnabled = !!val;
        console.log('Conversation Flow enabled:', conversationFlowEnabled);
    });
}




// ==========================================
// STATE EXTENSION
// ==========================================

// ==========================================
// STATE EXTENSION & SAFETY
// ==========================================

function getState() {
    const s = window.AppModules?.state || window.state;
    if (!s) return null;

    // Ensure extension state exists
    if (!s.conversationFlow) {
        s.conversationFlow = {
            active: false, convId: null, stage: 'IDLE',
            questionsAsked: 0, pendingConfirmReset: false, lastSlashCommand: null,
            currentLayer: 0, targetEntity: null, intent: null
        };
    }
    if (!s.ui) s.ui = {};
    if (!s.ui.slashDropdown) s.ui.slashDropdown = { visible: false, filter: '', selectedIndex: 0 };
    if (!s.ui.mentionDropdown) s.ui.mentionDropdown = { visible: false, level: 1, selectedField: null, filter: '', selectedIndex: 0, characters: [] };

    return s;
}

// ==========================================
// CONSTANTS
// ==========================================

const SLASH_COMMAND_LABELS = {
    '/quest': '🎯 Główny quest', '/q': '🎯 Quest (skrót)', '/side': '📋 Poboczny quest',
    '/hook': '🪝 Haczyki', '/secret': '🔮 Sekret', '/analiza': '🔍 Analiza relacji',
    '/cechy': '📊 Cechy', '/frakcja': '⚔️ Frakcja', '/ksywka': '🏷️ Ksywka', '/pomoc': '❓ Pomoc'
};

const MENTION_FIELDS = {
    '@imie': { field: 'Imie postaci', icon: '👤', desc: 'Imię' },
    '@gildia': { field: 'Gildia', icon: '⚔️', desc: 'Gildia' },
    '@slabosci': { field: 'Słabości', icon: '💔', desc: 'Słabości' },
    '@aspiracje': { field: 'Aspiracje', icon: '🌟', desc: 'Aspiracje' },
    '@historia': { field: 'Historia postaci', icon: '📜', desc: 'Historia' },
    '@relacje': { field: 'Relacje', icon: '🤝', desc: 'Relacje' },
    '@sekret': { field: 'Sekret', icon: '🔮', desc: 'Sekret' }
};

const ESCAPE_WORDS = ['pomiń', 'wystarczy', 'generuj', 'dawaj', 'ok', 'lecimy'];
const MAX_QUESTIONS = 5;

// ==========================================
// INPUT SELECTOR - correct ID from app.js
// ==========================================

function getInput() {
    return document.getElementById('mainPromptInput');
}

function getInputContainer() {
    return document.querySelector('.ai-input-container');
}

// ==========================================
// SLASH COMMANDS
// ==========================================

function getFilteredSlashCommands(filter) {
    return Object.entries(SLASH_COMMAND_LABELS)
        .filter(([key]) => key.includes(filter.toLowerCase()))
        .map(([key, label]) => ({ key, label }));
}

function renderSlashDropdown() {
    const s = getState();
    if (!s || !s.ui.slashDropdown.visible) return '';
    const items = getFilteredSlashCommands(s.ui.slashDropdown.filter);
    if (!items.length) return '';
    return `<div id="slashDropdown" style="position:absolute;bottom:100%;left:0;width:280px;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);z-index:1000;max-height:200px;overflow-y:auto;margin-bottom:4px;">
        ${items.map((c, i) => `<div class="slash-item" style="padding:10px 12px;cursor:pointer;display:flex;gap:8px;${i === s.ui.slashDropdown.selectedIndex ? 'background:#b4823a;color:#fff;' : ''}" onclick="selectSlashCommand('${c.key}')" onmouseenter="getState().ui.slashDropdown.selectedIndex=${i};updateDropdownHighlight('slash')"><span style="font-family:monospace">${c.key}</span><span style="opacity:.7">${c.label.split(' ').slice(1).join(' ')}</span></div>`).join('')}
    </div>`;
}

function handleSlashInput(val) {
    const s = getState();
    if (!s) return;

    if (val.startsWith('/')) {
        s.ui.slashDropdown = { visible: true, filter: val.slice(1), selectedIndex: 0 };
        injectDropdown('slash');
    } else {
        hideDropdown('slash');
    }
}

function selectSlashCommand(cmd) {
    const inp = getInput();
    if (inp) {
        inp.value = cmd + ' ';
        inp.focus();
        inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    hideDropdown('slash');
    if (typeof updatePromptPart === 'function') updatePromptPart('dod', cmd + ' ');
}

// ==========================================
// @ MENTIONS
// ==========================================

function getFilteredMentionFields(filter) {
    return Object.entries(MENTION_FIELDS)
        .filter(([key]) => key.includes(filter.toLowerCase()))
        .map(([key, data]) => ({ key, ...data }));
}

function renderMentionDropdown() {
    const s = getState();
    if (!s || !s.ui.mentionDropdown.visible) return '';
    const isL2 = s.ui.mentionDropdown.level === 2;

    if (isL2) {
        const chars = (s.ui.mentionDropdown.characters || [])
            .filter(c => c.name?.toLowerCase().includes(s.ui.mentionDropdown.filter.toLowerCase())).slice(0, 12);
        if (!chars.length) return '';
        return `<div id="mentionDropdown" style="position:absolute;bottom:100%;left:0;width:300px;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);z-index:1000;max-height:220px;overflow-y:auto;margin-bottom:4px;">
            <div style="padding:6px 12px;background:#151515;border-bottom:1px solid #3a3a3a;font-size:11px;color:#888">Wybierz postać dla ${s.ui.mentionDropdown.selectedField}</div>
            ${chars.map((c, i) => `<div class="mention-item" style="padding:10px 12px;cursor:pointer;${i === s.ui.mentionDropdown.selectedIndex ? 'background:#b4823a;color:#fff;' : ''}" onclick="selectMentionCharacter('${c.name}')" onmouseenter="getState().ui.mentionDropdown.selectedIndex=${i};updateDropdownHighlight('mention')"><b>${c.name}</b> <span style="opacity:.6;font-size:12px">${c.guild || ''}</span></div>`).join('')}
        </div>`;
    }

    const items = getFilteredMentionFields(s.ui.mentionDropdown.filter);
    if (!items.length) return '';
    return `<div id="mentionDropdown" style="position:absolute;bottom:100%;left:0;width:260px;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);z-index:1000;max-height:200px;overflow-y:auto;margin-bottom:4px;">
        ${items.map((m, i) => `<div class="mention-item" style="padding:10px 12px;cursor:pointer;display:flex;gap:8px;${i === s.ui.mentionDropdown.selectedIndex ? 'background:#b4823a;color:#fff;' : ''}" onclick="selectMentionField('${m.key}')" onmouseenter="getState().ui.mentionDropdown.selectedIndex=${i};updateDropdownHighlight('mention')">${m.icon} <span style="font-family:monospace">${m.key}</span> <span style="opacity:.7">${m.desc}</span></div>`).join('')}
    </div>`;
}

function handleMentionInput(val, cursorPos) {
    const s = getState();
    if (!s) return;

    const before = val.substring(0, cursorPos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1 || before.substring(atIdx).includes(' ')) { hideDropdown('mention'); return; }

    const mentionText = before.substring(atIdx);
    if (mentionText.includes('.')) {
        const [field, charFilter] = mentionText.split('.');
        if (MENTION_FIELDS[field]) {
            s.ui.mentionDropdown = {
                visible: true, level: 2, selectedField: field, filter: charFilter || '', selectedIndex: 0,
                characters: s.allProfiles?.map(p => ({ name: p['Imie postaci'], guild: p['Gildia'] })) || []
            };
            injectDropdown('mention'); return;
        }
    }
    s.ui.mentionDropdown = { visible: true, level: 1, selectedField: null, filter: mentionText.substring(1), selectedIndex: 0, characters: [] };
    injectDropdown('mention');
}

function selectMentionField(field) {
    const s = getState();
    if (!s) return;
    const inp = getInput();
    if (!inp) return;
    const pos = inp.selectionStart, before = inp.value.substring(0, pos), after = inp.value.substring(pos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1) return;
    inp.value = before.substring(0, atIdx) + field + ' ' + after;
    inp.focus(); inp.setSelectionRange(atIdx + field.length + 1, atIdx + field.length + 1);
    hideDropdown('mention'); inp.dispatchEvent(new Event('input', { bubbles: true }));
}

function selectMentionCharacter(name) {
    const s = getState();
    if (!s) return;
    const inp = getInput();
    if (!inp) return;
    const field = s.ui.mentionDropdown.selectedField;
    const pos = inp.selectionStart, before = inp.value.substring(0, pos), after = inp.value.substring(pos);
    const atIdx = before.lastIndexOf('@');
    if (atIdx === -1) return;
    inp.value = before.substring(0, atIdx) + field + '.' + name + ' ' + after;
    inp.focus(); hideDropdown('mention'); inp.dispatchEvent(new Event('input', { bubbles: true }));
}

function expandMentions(text, profile, allProfiles = []) {
    return text.replace(/@(\w+)(?:\.([A-Za-zżźćńółęąśŻŹĆĄŚĘŁÓŃ\s]+))?/g, (match, field, charName) => {
        const def = MENTION_FIELDS['@' + field];
        if (!def) return match;
        let p = profile;
        if (charName) { p = allProfiles.find(x => x['Imie postaci']?.toLowerCase() === charName.trim().toLowerCase()); if (!p) return `[${charName}?]`; }
        const val = p?.[def.field];
        return val ? `[${charName ? charName + ' ' : ''}${def.desc}: ${val}]` : `[@${field}?]`;
    });
}

// ==========================================
// DROPDOWN HELPERS
// ==========================================

function injectDropdown(type) {
    const container = getInputContainer();
    if (!container) { console.warn('❌ Input container not found'); return; }

    const id = type === 'slash' ? 'slashDropdown' : 'mentionDropdown';
    document.getElementById(id)?.remove();

    const html = type === 'slash' ? renderSlashDropdown() : renderMentionDropdown();
    if (html) {
        container.style.position = 'relative';
        container.insertAdjacentHTML('beforeend', html);
        console.log('✅ Injected ' + type + ' dropdown');
    }
}

function hideDropdown(type) {
    const s = getState();
    if (!s) return;
    if (type === 'slash') { s.ui.slashDropdown.visible = false; document.getElementById('slashDropdown')?.remove(); }
    else { s.ui.mentionDropdown.visible = false; document.getElementById('mentionDropdown')?.remove(); }
}

function updateDropdownHighlight(type) {
    const s = getState();
    if (!s) return;
    const cls = type === 'slash' ? '.slash-item' : '.mention-item';
    const idx = type === 'slash' ? s.ui.slashDropdown.selectedIndex : s.ui.mentionDropdown.selectedIndex;
    document.querySelectorAll(cls).forEach((el, i) => {
        el.style.background = i === idx ? '#b4823a' : '';
        el.style.color = i === idx ? '#fff' : '#e5e7eb';
    });
}

function handleKeydown(e, type) {
    const s = getState();
    if (!s) return false;
    const dd = type === 'slash' ? s.ui.slashDropdown : s.ui.mentionDropdown;
    if (!dd.visible) return false;
    const items = type === 'slash' ? getFilteredSlashCommands(dd.filter)
        : (dd.level === 2 ? (dd.characters || []).filter(c => c.name?.toLowerCase().includes(dd.filter.toLowerCase())).slice(0, 12) : getFilteredMentionFields(dd.filter));
    if (!items.length) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); dd.selectedIndex = (dd.selectedIndex + 1) % items.length; updateDropdownHighlight(type); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); dd.selectedIndex = (dd.selectedIndex - 1 + items.length) % items.length; updateDropdownHighlight(type); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') {
        if (dd.visible) {
            e.preventDefault();
            e.stopPropagation();
            const sel = items[dd.selectedIndex];
            if (type === 'slash') selectSlashCommand(sel.key);
            else if (dd.level === 2) selectMentionCharacter(sel.name);
            else selectMentionField(sel.key);
            return true;
        }
    }
    if (e.key === 'Escape') { e.preventDefault(); hideDropdown(type); return true; }
    return false;
}

// ==========================================
// FLOW HELPERS
// ==========================================

function checkEscapeIntent(msg) { return ESCAPE_WORDS.some(w => msg.toLowerCase().includes(w)); }
function checkQuestionLimit() { return getState()?.conversationFlow.questionsAsked >= MAX_QUESTIONS; }
function resetConversationFlow() {
    const s = getState();
    if (s) s.conversationFlow = { active: false, convId: null, stage: 'IDLE', questionsAsked: 0, pendingConfirmReset: false, lastSlashCommand: null };
}

// ==========================================
// ATTACH TO INPUT
// ==========================================

function attachAutocomplete() {
    const inp = getInput();
    if (!inp) {
        console.log('⏳ Waiting for mainPromptInput...');
        return false;
    }
    if (inp.dataset.acAttached) return true;

    inp.dataset.acAttached = 'true';

    // Input handler
    inp.addEventListener('input', e => {
        handleSlashInput(e.target.value);
        handleMentionInput(e.target.value, e.target.selectionStart);
    });

    // Keydown handler - CAPTURE phase to intercept before app.js handles Enter
    inp.addEventListener('keydown', e => {
        if (handleKeydown(e, 'slash')) return;
        if (handleKeydown(e, 'mention')) return;
    }, true); // capture phase

    inp.addEventListener('blur', () => setTimeout(() => { hideDropdown('slash'); hideDropdown('mention'); }, 200));

    console.log('✅ Autocomplete attached to mainPromptInput');
    return true;
}

// Try to attach immediately and also watch for DOM changes
function tryAttach() {
    if (!attachAutocomplete()) {
        setTimeout(tryAttach, 500);
    }
}

// Initial attach with delay + observer
setTimeout(tryAttach, 500);

const acObserver = new MutationObserver(() => {
    if (!getInput()?.dataset.acAttached) attachAutocomplete();
});
if (document.body) acObserver.observe(document.body, { childList: true, subtree: true });

// ==========================================
// MAIN HOOK: REMOVED (Logic moved to app.js)
// ==========================================
// The runCustomPrompt logic is now natively integrated into app.js
// to avoid race conditions and monkey-patching issues.


// Listen for conv-flow updates from main process
if (window.electronAPI?.onConvFlowUpdate) {
    electronAPI.onConvFlowUpdate((data) => {
        console.log('📩 Conv flow update:', data);
        state.conversationFlow.stage = data.stage;
        state.conversationFlow.questionsAsked = data.questionsAsked;
    });
}

// ==========================================
// EXPORTS
// ==========================================

Object.assign(window, {
    SLASH_COMMAND_LABELS, MENTION_FIELDS,
    getFilteredSlashCommands, renderSlashDropdown, handleSlashInput, selectSlashCommand,
    getFilteredMentionFields, renderMentionDropdown, handleMentionInput, selectMentionField, selectMentionCharacter, expandMentions,
    hideDropdown, updateDropdownHighlight, handleKeydown,
    checkEscapeIntent, checkQuestionLimit, resetConversationFlow, attachAutocomplete
});

console.log('✅ ConversationFlowExtension v6 loaded (primary conversation mode)');
