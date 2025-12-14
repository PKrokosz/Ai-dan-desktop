/**
 * @module profile-renderer
 * @description Renderowanie profili postaci i character overlay
 * ES6 Module - Faza 3 modularizacji
 */

import { state } from './state.js';

// ==============================
// Text Highlighting
// ==============================

/**
 * Highlight text matches
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} HTML with highlights
 */
export function highlightText(text, query) {
    if (!text || !query) return text || '';

    try {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    } catch {
        return text;
    }
}

// ==============================
// Name Linking
// ==============================

/**
 * Link character names in text to character overlays
 * @param {string} text - Text containing character names
 * @param {string} excludeName - Name to exclude from linking
 * @returns {string} HTML with linked names
 */
export function linkifyNames(text, excludeName = '') {
    if (!text) return '';

    // Get names source
    const sourceNames = state.allCharacterNames || (state.sheetData?.rows?.map(p => p['Imie postaci']));
    if (!sourceNames || sourceNames.length === 0) return text;

    // Cache sorted names (longest first)
    if (!state.sortedGlobalNamesCache && state.allCharacterNames) {
        state.sortedGlobalNamesCache = state.allCharacterNames
            .filter(n => n && n.length > 2)
            .sort((a, b) => b.length - a.length);
    }

    const namesList = state.sortedGlobalNamesCache || sourceNames.filter(n => n && n.length > 2).sort((a, b) => b.length - a.length);

    // Filter out the excluded name
    const filteredNames = excludeName
        ? namesList.filter(n => n.toLowerCase() !== excludeName.toLowerCase())
        : namesList;

    if (filteredNames.length === 0) return text;

    // Create master regex
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = filteredNames.map(escapeRegExp).join('|');

    try {
        const regex = new RegExp(`(?<![\\w\\u00C0-\\u017F])(${pattern})(?![\\w\\u00C0-\\u017F])(?![^<]*>)`, 'gi');

        return text.replace(regex, (match) => {
            const safeMatch = match.replace(/'/g, "\\'");
            return `<span class="char-link" onclick="event.stopPropagation(); openCharacterOverlay('${safeMatch}')">${match}</span>`;
        });
    } catch (e) {
        console.error("Regex error in linkifyNames", e);
        return text;
    }
}

// ==============================
// Character Overlay
// ==============================

/**
 * Close character overlay
 */
export function closeCharacterOverlay() {
    const overlay = document.getElementById('charOverlay');
    if (overlay) overlay.remove();
}

/**
 * Open character overlay with profile data
 * @param {string} name - Character name
 */
export async function openCharacterOverlay(name) {
    if (!name) return;

    // Try to find in current sheetData first
    let profile = state.sheetData?.rows?.find(p => p['Imie postaci']?.toLowerCase() === name.toLowerCase());
    let isFetching = false;

    if (!profile) {
        isFetching = true;
        profile = { 'Imie postaci': name, 'Gildia': 'Ładowanie...', 'O postaci': 'Pobieranie danych...' };
    }

    closeCharacterOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'charOverlay';
    overlay.className = 'character-overlay';

    const renderOverlayContent = (p) => {
        const pName = p['Imie postaci'] || p['name'] || p['Imie'] || 'Nieznana';
        const pGuild = p['Gildia'] || p['guild'] || 'Nieznana';
        const pStory = p['O postaci'] || p['about'] || p['history'];
        const pFacts = p['Fakty'] || p['facts'];
        const pId = p['id'] || '?';
        const pRegion = p['Region'] || p['region'] || '-';

        return `
      <div class="overlay-header" id="overlayHeader">
        <div class="overlay-title">
           <span>👤</span> ${pName} <span style="font-weight:normal; color:var(--text-dim); font-size:11px;">(${pGuild})</span>
        </div>
        <div class="overlay-close" onclick="closeCharacterOverlay()">✕</div>
      </div>
      <div class="overlay-content" id="overlayBody">
        ${pStory ? `
        <div class="overlay-section">
           <h4>Historia</h4>
           <div>${highlightText(pStory, '')}</div>
        </div>` : ''}
        ${pFacts ? `
        <div class="overlay-section">
           <h4>Fakty</h4>
           <div>${highlightText(pFacts, '')}</div>
        </div>` : ''}
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 10px;">
           ID: ${pId} | Region: ${pRegion}
        </div>
      </div>
    `;
    };

    overlay.innerHTML = renderOverlayContent(profile);
    document.body.appendChild(overlay);

    // Setup Dragging
    const setupDrag = () => {
        const header = document.getElementById('overlayHeader');
        if (!header) return;
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        header.onmousedown = function (e) {
            isDragging = true;
            offset.x = overlay.offsetLeft - e.clientX;
            offset.y = overlay.offsetTop - e.clientY;
        };
        document.onmousemove = function (e) {
            if (isDragging) {
                e.preventDefault();
                overlay.style.left = (e.clientX + offset.x) + 'px';
                overlay.style.top = (e.clientY + offset.y) + 'px';
            }
        };
        document.onmouseup = function () { isDragging = false; };
    };
    setupDrag();

    // Fetch if needed
    if (isFetching) {
        try {
            const apiResult = await window.electronAPI.getProfileByName(name);
            if (apiResult.success && apiResult.profile) {
                overlay.innerHTML = renderOverlayContent(apiResult.profile);
                setupDrag();
            } else {
                const body = document.getElementById('overlayBody');
                if (body) body.innerHTML = `<p style="color: var(--text-muted);">Nie znaleziono szczegółowych danych tej postać w bazie.</p>`;
            }
        } catch (e) {
            const body = document.getElementById('overlayBody');
            if (body) body.innerHTML = `<p style="color: var(--warning);">Błąd pobierania danych: ${e.message}</p>`;
        }
    }
}

/**
 * Jump to character in extraction view
 * @param {string} name - Character name
 */
export function jumpToCharacter(name) {
    if (!state.sheetData?.rows) {
        console.warn('jumpToCharacter: No sheet data');
        return;
    }

    const index = state.sheetData.rows.findIndex(p =>
        p['Imie postaci']?.toLowerCase() === name.toLowerCase()
    );

    if (index !== -1) {
        state.selectedRow = index;
        state.currentStep = 2; // Go to extraction step
        if (typeof renderStep === 'function') {
            renderStep();
        }
    } else {
        openCharacterOverlay(name);
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.linkifyNames = linkifyNames;
    window.highlightText = highlightText;
    window.openCharacterOverlay = openCharacterOverlay;
    window.closeCharacterOverlay = closeCharacterOverlay;
    window.jumpToCharacter = jumpToCharacter;
}
