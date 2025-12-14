/**
 * @module profile-renderer
 * @description Renderowanie profili postaci i character overlay
 * ES6 Module - Faza 3 modularizacji
 */

import { state } from './state.js';

// ==============================
// Styles
// ==============================

// Initial CSS injection for the profile view
const profileStyles = document.createElement('style');
profileStyles.textContent = `
  /* Main Grid Container */
  .profile-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-gap: 25px;
    padding: 20px;
    opacity: 0;
    animation: fade-in-up 0.6s ease-out forwards;
  }

  /* Entrance Animation */
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Card Base Style */
  .profile-card {
    background: var(--bg-card); /* Fallback */
    background: linear-gradient(145deg, rgba(30, 30, 35, 0.9), rgba(20, 20, 25, 0.95));
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(10px);
  }

  .profile-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    border-color: var(--gold-soft);
  }

  /* Card Header styling */
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  }

  .card-title {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--gold-bright);
    font-weight: 600;
    margin: 0;
  }

  .card-icon {
    font-size: 16px;
  }

  /* Card Content */
  .card-content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
    flex: 1;
  }

  /* Specific Areas */
  .area-hero { grid-column: span 12; }
  .area-story { grid-column: span 8; }
  .area-facts { grid-column: span 4; }
  .area-traits { grid-column: span 6; }
  .area-goals { grid-column: span 6; }
  .area-relations { grid-column: span 6; }
  .area-crime { grid-column: span 6; }

  /* Hero Card Specifics */
  .hero-card {
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.05), transparent);
    border-left: 4px solid var(--gold);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .hero-name {
    font-size: 28px;
    font-weight: 700;
    color: var(--gold-bright);
    margin: 0;
    text-shadow: 0 2px 10px rgba(255, 215, 0, 0.2);
  }
  
  .hero-sub {
    color: var(--text-dim);
    font-size: 13px; 
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .hero-meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  /* Tags/Badges */
  .c-tag {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .tag-guild { background: rgba(184, 138, 43, 0.2); color: #ffd700; border: 1px solid rgba(184, 138, 43, 0.4); }
  .tag-region { background: rgba(255, 255, 255, 0.05); color: #aaa; border: 1px solid rgba(255, 255, 255, 0.1); }
  .tag-crime { background: rgba(255, 50, 50, 0.15); color: #ff6b6b; border: 1px solid rgba(255, 50, 50, 0.3); }

  /* Crime Card Specifics */
  .crime-card {
    background: linear-gradient(145deg, rgba(40, 20, 20, 0.9), rgba(30, 20, 20, 0.95));
    border-color: rgba(255, 50, 50, 0.2);
  }
  .crime-card:hover { border-color: #ff6b6b; }

  /* List Styling (Relations/Facts) */
  .styled-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .styled-list li {
    position: relative;
    padding-left: 15px;
    margin-bottom: 6px;
    color: var(--text-muted);
  }
  .styled-list li::before {
    content: "•";
    color: var(--gold-soft);
    position: absolute;
    left: 0;
    top: 0px;
  }

  /* Trait Sections */
  .trait-section {
    margin-bottom: 12px;
  }
  .trait-label {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 4px;
    display: block;
  }
  .trait-text {
    font-size: 13px;
    color: var(--text-primary);
  }

  /* Responsive Adjustments */
  @media (max-width: 1200px) {
    .area-story { grid-column: span 12; }
    .area-facts { grid-column: span 12; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  }
  @media (max-width: 800px) {
    .profile-grid { grid-template-columns: 1fr; }
    /* Reset all spans to 1 column */
    .area-hero, .area-story, .area-facts, .area-traits, .area-goals, .area-relations, .area-crime { grid-column: span 1; }
    .area-facts { display: block; }
    .hero-card { flex-direction: column; align-items: flex-start; gap: 10px; }
    .hero-meta { justify-content: flex-start; }
  }
`;
if (typeof document !== 'undefined') {
    document.head.appendChild(profileStyles);
}

// ==============================
// Profile Rendering
// ==============================

/**
 * Render profile details HTML
 * @param {Object} profile - Character profile object
 * @returns {string} HTML content
 */
export function renderProfileDetails(profile) {
    if (!profile) return '';

    const getVal = (key, fallback = '-') => {
        const val = profile[key];
        return (val && val !== 'NULL' && val.trim() !== '') ? val : fallback;
    };

    // Basic Info
    const name = getVal('Imie postaci', 'Bez imienia');
    const guild = getVal('Gildia', 'Bez gildii');
    const region = getVal('Region', 'Region nieznany');
    const city = getVal('Miejscowosc', '');
    const id = profile['id'] || '?';

    // Thematic
    const crime = getVal('Wina (za co skazany)', getVal('Wina')); // Try both keys
    const crimeText = highlightText(crime === '-' ? 'Brak danych o wyroku' : crime, '');

    // Narrative
    const story = highlightText(getVal('O postaci', 'Brak historii.'), '');
    const profession = getVal('Jak zarabiala na zycie, kim byla', '');

    // Details
    const facts = highlightText(getVal('Fakty', ''), '');
    const relations = highlightText(getVal('Znajomi, przyjaciele i wrogowie', 'Brak danych'), '');
    const goals = highlightText(getVal('Przyszlosc', 'Brak sprecyzowanych planów'), '');

    // Traits
    const talents = highlightText(getVal('Umiejetnosci', 'Brak danych'), '');
    const weaknesses = highlightText(getVal('Slabosci', 'Brak danych'), '');

    // Combine profession into story if exists
    let mainStoryHtml = `<p>${story}</p>`;
    if (profession && profession !== '-') {
        mainStoryHtml = `
      <div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed var(--border-subtle);">
        <strong style="color:var(--gold-soft); font-size:12px; text-transform:uppercase;">📅 Teraźniejszość / Zajęcie</strong>
        <p style="margin-top:4px;">${highlightText(profession, '')}</p>
      </div>
      <strong style="color:var(--gold-soft); font-size:12px; text-transform:uppercase;">📜 Historia</strong>
      ${mainStoryHtml}
    `;
    }

    // Helper for facts list
    const renderList = (text) => {
        if (!text || text === '-') return '<p class="text-muted">Brak danych.</p>';
        const items = text.split('. ').filter(f => f.trim().length > 3);
        if (items.length <= 1) return `<p>${text}</p>`;
        return `<ul class="styled-list">${items.map(f => `<li>${f.trim().endsWith('.') ? f : f + '.'}</li>`).join('')}</ul>`;
    };

    return `
    <div class="profile-grid">
      
      <!-- HERO CARD (Top) -->
      <div class="profile-card hero-card area-hero">
        <div>
          <h2 class="hero-name">${name}</h2>
          <div class="hero-sub">
             <span>🆔 ${id}</span>
             ${city ? `<span>🏘️ ${city}</span>` : ''}
          </div>
        </div>
        <div class="hero-meta">
          <span class="c-tag tag-guild">🛡️ ${guild}</span>
          <span class="c-tag tag-region">🌍 ${region}</span>
        </div>
      </div>

      <!-- STORY CARD (Main Content) -->
      <div class="profile-card area-story" style="animation-delay: 0.1s;">
        <div class="card-header">
          <span class="card-icon">📖</span>
          <h3 class="card-title">Opowieść</h3>
        </div>
        <div class="card-content">
          ${mainStoryHtml}
        </div>
      </div>

      <!-- FACTS CARD (Side Content) -->
      <div class="profile-card area-facts" style="animation-delay: 0.15s;">
        <div class="card-header">
          <span class="card-icon">💡</span>
          <h3 class="card-title">Fakty</h3>
        </div>
        <div class="card-content">
           ${renderList(facts)}
        </div>
      </div>

      <!-- TRAITS CARD -->
      <div class="profile-card area-traits" style="animation-delay: 0.2s;">
        <div class="card-header">
          <span class="card-icon">⭐</span>
          <h3 class="card-title">Cechy i Umiejętności</h3>
        </div>
        <div class="card-content">
           <div class="trait-section">
             <span class="trait-label" style="color:#77ff77;">✨ Umiejętności</span>
             <div class="trait-text">${talents}</div>
           </div>
           <div class="trait-section" style="margin-top:15px;">
             <span class="trait-label" style="color:#ff7777;">⚠️ Słabości</span>
             <div class="trait-text">${weaknesses}</div>
           </div>
        </div>
      </div>

      <!-- GOALS CARD -->
      <div class="profile-card area-goals" style="animation-delay: 0.25s;">
        <div class="card-header">
          <span class="card-icon">🎯</span>
          <h3 class="card-title">Przyszłość i Cele</h3>
        </div>
        <div class="card-content">
          ${goals}
        </div>
      </div>

      <!-- RELATIONS CARD -->
      <div class="profile-card area-relations" style="animation-delay: 0.3s;">
        <div class="card-header">
          <span class="card-icon">🤝</span>
          <h3 class="card-title">Relacje</h3>
        </div>
        <div class="card-content">
          ${relations}
        </div>
      </div>

      <!-- CRIME CARD (Thematic) -->
      <div class="profile-card crime-card area-crime" style="animation-delay: 0.35s;">
        <div class="card-header">
          <span class="card-icon">⚖️</span>
          <h3 class="card-title" style="color:#ff8888;">Wina (Wyrok)</h3>
        </div>
        <div class="card-content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span style="font-style:italic;">"${crimeText}"</span>
             <span class="c-tag tag-crime" style="margin-left:10px; white-space:nowrap;">Skazaniec</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

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
    window.renderProfileDetails = renderProfileDetails;
    window.linkifyNames = linkifyNames;
    window.highlightText = highlightText;
    window.openCharacterOverlay = openCharacterOverlay;
    window.closeCharacterOverlay = closeCharacterOverlay;
    window.jumpToCharacter = jumpToCharacter;
}
