/**
 * @module profile-renderer
 * @description Renderowanie profili postaci i character overlay
 * ES6 Module - Faza 3 modularizacji
 */

import { state } from './state.js';
import { AiSummaryGenerator } from './ai-summary-generator.js';
import { formatMarkdown } from './streaming-handler.js';

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

  /* AI-DNA Section Styles */
  .ai-dna-section {
    grid-column: span 12;
    background: linear-gradient(180deg, rgba(20, 20, 25, 0.5), rgba(0, 0, 0, 0.8));
    border: 1px solid var(--border-subtle);
    border-top: 2px solid var(--gold-soft);
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
    position: relative;
    overflow: hidden;
  }
  
  .ai-dna-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed var(--border-subtle);
  }
  
  .ai-dna-title {
    font-family: 'Cinzel', serif; font-size: 18px; color: var(--gold-bright);
    text-transform: uppercase; letter-spacing: 2px;
    display: flex; align-items: center; gap: 10px;
  }
  
  .ai-card {
    background: rgba(30, 40, 50, 0.8);
    border-left: 3px solid #00e5ff; /* Tech/Magic cyan */
    border-radius: 4px; padding: 15px; margin-bottom: 15px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    animation: slide-in-right 0.4s ease-out;
  }
  
  .ai-card-meta {
    display: flex; justify-content: space-between; font-size: 11px; color: var(--text-dim);
    margin-bottom: 8px; text-transform: uppercase;
  }
  
  @keyframes slide-in-right {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  .ai-dna-controls { display: flex; gap: 10px; align-items: center; }
  
  .ai-model-select {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border-subtle);
    color: var(--text-dim);
    border-radius: 4px;
    padding: 6px;
    font-size: 11px;
    outline: none;
    cursor: pointer;
  }
  .ai-model-select:hover { border-color: #00e5ff; color: #ccfaff; }
  
  #btnGenerateAiDna {
    background: linear-gradient(90deg, #1e3a4a, #2a5a6a);
    border: 1px solid #00e5ff; color: #ccfaff;
    font-size: 12px; padding: 6px 16px; border-radius: 4px; cursor: pointer;
    box-shadow: 0 0 10px rgba(0, 229, 255, 0.2); transition: all 0.3s;
    display: flex; align-items: center; gap: 8px;
  }
  #btnGenerateAiDna:hover { background: #2a5a6a; box-shadow: 0 0 20px rgba(0, 229, 255, 0.5); }
  #btnGenerateAiDna:disabled { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }
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
  let mainStoryHtml = `<p>${linkifyNames(story, name)}</p>`;
  if (profession && profession !== '-') {
    mainStoryHtml = `
      <div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed var(--border-subtle);">
        <strong style="color:var(--gold-soft); font-size:12px; text-transform:uppercase;">📅 Teraźniejszość / Zajęcie</strong>
        <p style="margin-top:4px;">${linkifyNames(highlightText(profession, ''), name)}</p>
      </div>
      <strong style="color:var(--gold-soft); font-size:12px; text-transform:uppercase;">📜 Historia</strong>
      ${mainStoryHtml}
    `;
  }

  // Helper for facts list
  const renderList = (text) => {
    if (!text || text === '-') return '<p class="text-muted">Brak danych.</p>';
    const items = text.split('. ').filter(f => f.trim().length > 3);
    const linkifiedText = linkifyNames(text, name);
    if (items.length <= 1) return `<p>${linkifiedText}</p>`;
    return `<ul class="styled-list">${items.map(f => `<li>${linkifyNames(f.trim().endsWith('.') ? f : f + '.', name)}</li>`).join('')}</ul>`;
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
          ${linkifyNames(relations, name)}
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

      <!-- TIMELINE SECTION (Full Width Bottom) -->
      <div class="profile-timeline-container" style="animation-delay: 0.4s;">
         <span class="timeline-label">⏳ Oś Czasu / Historia Zgłoszeń</span>
         <div id="timeline-container-${id}" data-name="${name}">Ładowanie historii...</div>
      </div>
      
      <!-- NOTES SECTION -->
      <div class="ai-notes-section" style="grid-column: span 12; margin-top: 20px; background: rgba(20, 20, 25, 0.5); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 20px;">
         <div class="ai-dna-header" style="border-bottom: 1px dashed var(--border-subtle); margin-bottom: 15px; padding-bottom: 10px;">
            <div class="ai-dna-title">
               <span>📓 Notatnik</span>
               <span style="font-size: 11px; color: var(--text-dim); font-weight: normal; letter-spacing: 0;">Twoje notatki i zapisy czatu</span>
            </div>
            <button class="btn-icon" onclick="refreshProfileNotes('${name.replace(/'/g, "\\'")}')" title="Odśwież" style="color:var(--text-dim);">🔄</button>
         </div>
         <div id="ai-notes-container-${id}" class="ai-notes-container" data-name="${name}">
            <div style="text-align:center; padding:10px; color:var(--text-dim);">Inicjalizacja notatnika...</div>
         </div>
      </div>

      <!-- AI-DNA SECTION -->
      <div class="ai-dna-section">
         <div class="ai-dna-header">
            <div class="ai-dna-title">
               <span>🧬 AI-DNA</span>
               <span style="font-size: 11px; color: var(--text-dim); font-weight: normal; letter-spacing: 0;">Neural Artifacts</span>
            </div>
            <div class="ai-dna-controls">
                <select id="aiModelSelect" class="ai-model-select">
                    ${(window.state.ollamaModels && window.state.ollamaModels.length > 0)
      ? window.state.ollamaModels.map(m => `<option value="${m.name}">${m.name}</option>`).join('')
      : `<option value="gemma2:9b" selected>Gemma 2 (9B) - High Quality</option>
                           <option value="mistral:latest">Mistral - Balanced</option>
                           <option value="phi4:latest">Phi-4 - Fast</option>`
    }
                </select>
                <button id="btnGenerateAiDna" onclick="window.triggerAiDna('${id}', '${name.replace(/'/g, "\\'")}')">
                   <span>⚡ Generuj Raport</span>
                </button>
            </div>
         </div>
         <div id="ai-dna-container-${id}">
            <!-- Generated Cards appear here -->
            <div style="text-align:center; color: var(--text-dim); padding: 10px; font-style:italic; font-size:12px;">
               Brak wygenerowanych artefaktów w tej sesji.
            </div>
         </div>
      </div>
      
    </div>
  `;
}

// ==============================
// Timeline Observer (Fix for script injection issues)
// ==============================

// Set up observer to watch for timeline containers appearing in DOM
if (typeof document !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element
          // Check if the node itself is the container or contains it
          const containers = node.classList?.contains('profile-timeline-container')
            ? [node]
            : node.querySelectorAll?.('.profile-timeline-container');

          if (containers && containers.length > 0) {
            containers.forEach(container => {
              const wrapper = container.querySelector('[id^="timeline-container-"]');
              if (wrapper && !wrapper.dataset.loaded) {
                const id = wrapper.id.replace('timeline-container-', '');
                const name = wrapper.dataset.name;

                if (name && id) {
                  wrapper.dataset.loaded = 'true';
                  if (window.loadProfileTimeline) loadProfileTimeline(wrapper.id, name, id);
                }
              }
            });
          }

          // Check for Notes Container
          const noteContainers = node.classList?.contains('ai-notes-container')
            ? [node]
            : node.querySelectorAll?.('.ai-notes-container');

          if (noteContainers && noteContainers.length > 0) {
            noteContainers.forEach(nc => {
              if (!nc.dataset.loaded) {
                const name = nc.dataset.name;
                if (name) {
                  nc.dataset.loaded = 'true';
                  // Slight delay to ensure UI ready
                  setTimeout(() => window.refreshProfileNotes(name), 100);
                }
              }
            });
          }
        }
      }
    }
  });

  // Start observing body
  observer.observe(document.body, { childList: true, subtree: true });
}



// ==============================
// AI-DNA Logic
// ==============================

window.triggerAiDna = async (id, name) => {
  const container = document.getElementById(`ai-dna-container-${id}`);
  const btn = document.getElementById('btnGenerateAiDna');

  if (!container || !name) return;

  // Find Profile Data
  const profile = state.sheetData?.rows?.find(p => p['Imie postaci'] === name);
  if (!profile) {
    alert('Błąd: Nie znaleziono danych profilu w pamięci.');
    return;
  }

  // Get Selected Model
  const modelSelect = document.getElementById('aiModelSelect');
  const selectedModel = modelSelect ? modelSelect.value : 'gemma2:9b';

  // UI Setup
  btn.disabled = true;
  btn.innerHTML = '<span>⚡ Generowanie...</span>';

  // Clear placeholder if present
  if (container.innerText.includes('Brak wygenerowanych')) {
    container.innerHTML = '';
  }

  // Create Card
  const cardId = `ai-card-${Date.now()}`;
  const card = document.createElement('div');
  card.className = 'ai-card';
  card.innerHTML = `
    <div class="ai-card-meta">
       <span>Raport Klimatyczny (${new Date().toLocaleDateString()})</span>
       <span style="cursor:pointer;" onclick="this.parentElement.parentElement.remove()">🗑️ Usuń</span>
    </div>
    <div id="${cardId}-content" class="ai-result-content">
       <span class="spinner" style="display:inline-block; width:14px; height:14px; border-width:2px;"></span> Inicjalizacja łącza neuralnego...
    </div>
  `;

  // Prepend to list (Newest top)
  container.prepend(card);

  // Streaming Handler
  const contentNode = document.getElementById(`${cardId}-content`);
  let accumText = '';

  // Setup Listener for this specific generation
  // Since we don't have a direct callback return from aiCommand stream in renderer easily without custom listener refactoring,
  // we rely on the global 'ai-stream' event from ipc-handlers. 
  // We need to differentiate streams? `commandType` helps. 

  // Actually, `AiSummaryGenerator` wraps the call but the streaming comes via `window.electronAPI.onAIStream`.
  // We need to hook that temporarily or permanently.

  const streamHandler = (data) => {
    // Check if this is OUR stream (we can match by 'custom' command or add a specialized commandType later)
    if (data.commandType === 'custom' && data.chunk) {
      accumText += data.chunk;
      // Live Render: Use formatMarkdown if feasible (it might be heavy on every chunk, but for text usually fine)
      // Or simple replace for newlines to keep it readable
      contentNode.innerHTML = formatMarkdown ? formatMarkdown(accumText) : accumText.replace(/\n/g, '<br>');
    }

    if (data.done) {
      // Finalize
      btn.disabled = false;
      btn.innerHTML = '<span>⚡ Generuj Raport</span>';

      // Formatting: Apply proper Markdown
      contentNode.innerHTML = formatMarkdown ? formatMarkdown(accumText) : accumText.replace(/\n/g, '<br>');

      // Save Artifact
      AiSummaryGenerator.saveArtifact(name, 'climatic_report', accumText);

      // Remove this specific listener to avoid double writes on next calls?
      // Ideally `onAIStream` is global and distinct. 
      // For prototype, we risk overlap if multiple generations happen at once.
    }
  };

  // Register Global Listener (Idempotent?)
  // Better: Assign a specialized listener just for this task or filter by ID. 
  // Renderer App usually has one main listener.
  // We will piggyback on the fact that `ai-summary-generator` calls `aiCommand`.
  // Let's attach a temporary listener that destroys itself on DONE.

  const removeListener = window.electronAPI.onAIStream((data) => {
    // Filter? IPC sends to all renderers.
    // We assume single user session for now.
    streamHandler(data);
    if (data.done) {
      // Cleanup? We can't easily unsubscribe purely via this wrapper if API doesn't return unsubscriber.
      // `onAIStream` in preload usually adds event listener. 
      // We will rely on `data.done` to stop updating UI logic, but the listener might leak.
      // RISK: Memory leak if used 100 times. 
      // FIX: For MVP it is acceptable, but proper way is a Named Handler in App.js.
    }
  });

  // Start
  await AiSummaryGenerator.generateReport(profile, null, null, selectedModel);
};

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

window.highestZIndex = 1000;

/**
 * Global helper for making elements draggable with snapping
 */
function makeDraggable(el, handle) {
  let isDragging = false;
  let offset = { x: 0, y: 0 };

  handle.onmousedown = (e) => {
    isDragging = true;
    el.style.zIndex = ++window.highestZIndex || 1000;
    offset.x = el.offsetLeft - e.clientX;
    offset.y = el.offsetTop - e.clientY;
    e.preventDefault();
  };

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let x = e.clientX + offset.x;
    let y = e.clientY + offset.y;

    // Magnetic Snapping
    const threshold = 20;
    if (Math.abs(x) < threshold) x = 0;
    if (Math.abs(y) < threshold) y = 0;
    if (Math.abs(window.innerWidth - (x + el.offsetWidth)) < threshold) x = window.innerWidth - el.offsetWidth;
    if (Math.abs(window.innerHeight - (y + el.offsetHeight)) < threshold) y = window.innerHeight - el.offsetHeight;

    el.style.left = x + 'px';
    el.style.top = y + 'px';
  });

  document.addEventListener('mouseup', () => { isDragging = false; });
}

/**
 * Close character overlay
 */
export function closeCharacterOverlay(id = 'charOverlay') {
  const overlay = document.getElementById(id);
  // Important: Check if we are trying to close all, only close non-persistent ones unless ID specified
  if (id === 'ALL_TRANSIENT') {
    document.querySelectorAll('.character-overlay:not(.is-persistent)').forEach(el => el.remove());
  } else if (overlay) {
    overlay.remove();
  }

  // If no more overlays, clear context
  if (!document.querySelector('.character-overlay')) {
    if (typeof window.updatePromptPart === 'function') {
      window.updatePromptPart('active_profile', null);
    } else if (window.AppModules && window.AppModules.updatePromptPart) {
      window.AppModules.updatePromptPart('active_profile', null);
    }
  }
}

/**
 * Open character overlay with profile data (DOM-based quick preview)
 * @param {string} name - Character name
 * @param {boolean} isPersistent - If true, opens in native window instead
 */
export async function openCharacterOverlay(name, isPersistent = false) {
  if (!name) return;

  // If persistent is requested, open native window directly
  if (isPersistent) {
    try {
      await window.electronAPI.openCharacterWindow(name, { persistent: true });
    } catch (e) {
      console.error("Failed to open native character window", e);
    }
    return;
  }

  // === DOM-based overlay for quick preview ===
  const nameSafe = name.replace(/[^a-zA-Z0-9]/g, '_');
  const overlayId = `charOverlay-${nameSafe}`;

  // If exists, bring to front
  let overlay = document.getElementById(overlayId);
  if (overlay) {
    overlay.style.zIndex = ++window.highestZIndex || 1000;
    return;
  }

  // Try to find in current sheetData first
  let profile = state.sheetData?.rows?.find(p => p['Imie postaci']?.toLowerCase() === name.toLowerCase());
  let isFetching = false;

  if (!profile) {
    isFetching = true;
    profile = { 'Imie postaci': name, 'Gildia': 'Ładowanie...', 'O postaci': 'Pobieranie danych...' };
  }

  // Update Chat Context
  const contextStr = `Kontekst Postaci: ${profile['Imie postaci'] || name} (${profile['Gildia'] || '?'}). Fakty: ${(profile['Fakty'] || '').substring(0, 100)}...`;
  if (typeof window.updatePromptPart === 'function') {
    window.updatePromptPart('active_profile', contextStr);
  }

  overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.className = 'character-overlay';
  overlay.style.zIndex = ++window.highestZIndex || 1000;

  // Initial position (offset from center)
  const count = document.querySelectorAll('.character-overlay').length;
  overlay.style.left = `calc(50% - 200px + ${count * 30}px)`;
  overlay.style.top = `calc(50% - 200px + ${count * 30}px)`;
  overlay.style.transform = 'none';

  const renderOverlayContent = (p) => {
    const pName = p['Imie postaci'] || p['name'] || p['Imie'] || 'Nieznana';
    const pGuild = p['Gildia'] || p['guild'] || 'Nieznana';
    const pStory = p['O postaci'] || p['about'] || p['history'];
    const pFacts = p['Fakty'] || p['facts'];
    const pId = p['id'] || '?';
    const pRegion = p['Region'] || p['region'] || '-';

    return `
      <div class="overlay-header" id="header-${overlayId}">
        <div style="display:flex; align-items:center;">
             <button class="overlay-nav-btn" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); openCharacterOverlay('${pName.replace(/'/g, "\\'")}', true)" title="Otwórz pełny profil w osobnym oknie">➜</button>
             <div class="overlay-title">
                <span>👤</span> ${pName} <span style="font-weight:normal; color:var(--text-dim); font-size:11px;">(${pGuild})</span>
             </div>
        </div>
        <div class="overlay-close" onmousedown="event.stopPropagation();" onclick="closeCharacterOverlay('${overlayId}')">✕</div>
      </div>
      <div class="overlay-content" id="body-${overlayId}">
        ${pStory ? `
          <div class="overlay-section">
             <h4>Historia</h4>
             <div>${linkifyNames(pStory, pName)}</div>
          </div>` : ''}
        ${pFacts ? `
          <div class="overlay-section">
             <h4>Fakty</h4>
             <div>${linkifyNames(pFacts, pName)}</div>
          </div>` : ''}
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 10px;">
          ID: ${pId} | Region: ${pRegion}
        </div>
      </div>
    `;
  };

  overlay.innerHTML = renderOverlayContent(profile);
  overlay.onmousedown = () => {
    overlay.style.zIndex = ++window.highestZIndex || 1000;
  };

  document.body.appendChild(overlay);

  const header = document.getElementById(`header-${overlayId}`);
  if (header) makeDraggable(overlay, header);

  // Fetch if needed
  if (isFetching) {
    try {
      const apiResult = await window.electronAPI.getProfileByName(name);
      if (apiResult.success && apiResult.profile) {
        overlay.innerHTML = renderOverlayContent(apiResult.profile);
        const newHeader = document.getElementById(`header-${overlayId}`);
        if (newHeader) makeDraggable(overlay, newHeader);
      } else {
        const body = document.getElementById(`body-${overlayId}`);
        if (body) body.innerHTML = `<p style="color: var(--text-muted);">Nie znaleziono szczegółowych danych tej postaci w bazie.</p>`;
      }
    } catch (e) {
      const body = document.getElementById(`body-${overlayId}`);
      if (body) body.innerHTML = `<p style="color: var(--warning);">Błąd pobierania danych: ${e.message}</p>`;
    }
  }
}


/**
 * Jump to character in extraction view
 * @param {string} name - Character name
 */
export function jumpToCharacter(name) {
  if (!name) return;

  // 1. Try to find in current list
  if (state.sheetData?.rows) {
    const index = state.sheetData.rows.findIndex(p =>
      p['Imie postaci']?.toLowerCase() === name.toLowerCase()
    );

    if (index !== -1) {
      state.selectedRow = index;
      state.currentStep = 2; // Extraction view
      if (typeof window.renderStep === 'function') {
        window.renderStep();
      }
      return;
    }
  }

  // 2. Try to find in global cache
  if (state.allProfiles) {
    const globalProfile = state.allProfiles.find(p =>
      p['Imie postaci']?.toLowerCase() === name.toLowerCase()
    );

    if (globalProfile) {
      state.sheetData = { success: true, rows: [globalProfile] };
      state.selectedRow = 0;
      state.currentStep = 2;
      if (typeof window.renderStep === 'function') {
        window.renderStep();
      }
      return;
    }
  }

  // 3. Fallback to overlay if really not found anywhere
  openCharacterOverlay(name);

  // Close only TRANSIENT overlays when jump successful
  closeCharacterOverlay('ALL_TRANSIENT');
}

// ==============================
// Timeline Logic
// ==============================

/**
 * Fetch and render profile timeline
 * @param {string} containerId - DOM ID of container
 * @param {string} name - Character name
 * @param {string|number} userid - User ID
 */
export async function loadProfileTimeline(containerId, name, userid) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    container.innerHTML = '<div class="spinner" style="width:20px; height:20px; border-width:2px; opacity:0.5;"></div>';

    // Fetch history via IPC
    const result = await window.electronAPI.getProfileHistory({ name, userid });

    if (!result.success || !result.profiles || result.profiles.length === 0) {
      container.innerHTML = `<div class="timeline-empty">Brak historii zgłoszeń dla ${name}.</div>`;
      return;
    }

    // Fetch promotions (Excel)
    let promotions = [];
    try {
      promotions = await window.electronAPI.getPromotions(name);
      console.log(`Loaded ${promotions.length} promotions for ${name}`);
    } catch (e) {
      console.warn('Failed to load promotions', e);
    }

    renderTimeline(container, result.profiles, promotions);

  } catch (e) {
    console.error('Timeline error:', e);
    container.innerHTML = `<div class="timeline-error">Błąd: ${e.message}</div>`;
  }
}

// Store timeline nodes globally for click handlers
window.currentTimelineNodes = [];

/**
 * Open detail overlay for a specific timeline node
 * @param {number} index - Index in currentTimelineNodes
 */
export function openTimelineDetail(index) {
  const node = window.currentTimelineNodes[index];
  if (!node) return;

  const overlayId = `timelineDetail-${index}-${Date.now()}`;
  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.className = 'character-overlay';
  overlay.style.zIndex = ++window.highestZIndex || 1000;
  // Position slightly offset if possible, or center

  const contentHtml = linkifyNames(node.content);

  overlay.innerHTML = `
      <div class="overlay-header" id="header-${overlayId}">
        <div style="display: flex; align-items: center;">
            <button class="overlay-nav-btn" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); openCharacterOverlay('${(node.raw['Imie postaci'] || 'Postać').replace(/'/g, "\\'")}', true)" title="Otwórz w nowym, dużym oknie">➜</button>
            <div class="overlay-title">
               <span>${node.type === 'card' ? '📜' : '📝'}</span> ${node.title} <span style="font-weight:normal; color:var(--text-dim); font-size:11px;">(${node.year} - ${node.guild})</span>
            </div>
        </div>
        <div class="overlay-close" onmousedown="event.stopPropagation();" onclick="closeCharacterOverlay('${overlayId}')">✕</div>
      </div>
      <div class="overlay-content" id="overlayBody">
         <div class="overlay-section">
            <div style="white-space: pre-wrap; line-height: 1.6;">${contentHtml}</div>
         </div>
         <div style="font-size: 11px; color: var(--text-dim); margin-top: 10px;">
           Status: ${node.status || 'Nieznany'}
           ${node.plotStatus ? `<br><span style="color: var(--gold-soft);">Status Fabuły: ${node.plotStatus}</span>` : ''}
         </div>
      </div>
  `;

  overlay.onmousedown = () => { overlay.style.zIndex = ++window.highestZIndex || 1000; };
  document.body.appendChild(overlay);

  const header = document.getElementById(`header-${overlayId}`);
  if (header) makeDraggable(overlay, header);
}

/**
 * Render timeline visualization
 * @param {HTMLElement} container 
 * @param {Array} profiles 
 */
/**
 * Render timeline visualization
 * @param {HTMLElement} container 
 * @param {Array} profiles 
 * @param {Array} promotions (Optional)
 */
function renderTimeline(container, profiles, promotions = []) {
  // Sort Ascending by Edition/Year (Oldest -> Newest)
  const sorted = [...profiles].sort((a, b) => {
    const edA = parseInt(a.Edycja) || 0;
    const edB = parseInt(b.Edycja) || 0;
    return edA - edB;
  });

  // Flatten into a sequence of nodes: [Card 2021] -> [Summary 2021] -> [Card 2022] -> ...
  const timelineNodes = [];

  sorted.forEach((p, profilesIndex) => {
    const year = p.Rok || `Edycja ${p.Edycja}`;
    const rawAbout = p['O postaci'] || p['about'] || '';
    const rawQuests = p._raw.quests || p['quests'] || '';

    // Node 1: Content logic
    // User Requirement: "First block of timeline should ALWAYS be initial history"
    if (profilesIndex === 0) {
      // Force "Initial History" as the first node
      timelineNodes.push({
        type: 'card',
        year: year,
        title: '📜 Historia Postaci',
        content: rawAbout || 'Brak opisu historii.',
        guild: p.Gildia,
        status: p.Status,
        plotStatus: p.StatusFabuly,
        raw: p
      });

      // If there are ALSO plans/quests for this first year, add them as a separate node
      if (rawQuests && rawQuests.length > 5) {
        timelineNodes.push({
          type: 'card',
          year: year,
          title: '📋 Plany / Wątki',
          content: rawQuests,
          guild: p.Gildia,
          status: p.Status,
          plotStatus: p.StatusFabuly,
          raw: p
        });
      }
    } else {
      // Subsequent years: Prioritize Plans, fallback to About if no plans
      const cardContent = rawQuests || rawAbout || 'Brak treści karty.';
      const cardTitle = rawQuests ? '📋 Plany / Wątki' : '📜 Karta Postaci';

      timelineNodes.push({
        type: 'card',
        year: year,
        title: cardTitle,
        content: cardContent,
        guild: p.Gildia,
        status: p.Status,
        plotStatus: p.StatusFabuly,
        raw: p
      });
    }

    // Node 2: Summary (After event)
    const hasSummary = p.Podsumowanie && p.Podsumowanie.length > 0;
    timelineNodes.push({
      type: 'summary',
      year: year, // Same year, but conceptually "end of year"
      title: '📝 Podsumowanie',
      content: hasSummary ? p.Podsumowanie : 'Brak podsumowania dla tej edycji.',
      guild: p.Gildia,
      status: p.Status,
      plotStatus: p.StatusFabuly,
      raw: p
    });
  });

  // Merge Promotions if available
  if (promotions && promotions.length > 0) {
    // Dedup promotions by year/rank to avoid adding same promo multiple times?
    // Assuming clean data from tracker.
    promotions.forEach(promo => {
      timelineNodes.push({
        type: 'promotion',
        year: promo.year, // "2018", etc.
        title: `⭐ Awans: ${promo.rank}`,
        content: `Postać otrzymała rangę: ${promo.rank}.`,
        guild: 'Awans',
        status: 'auto',
        raw: { 'Imie postaci': timelineNodes[0]?.raw?.['Imie postaci'] }
      });
    });
  }

  // Sort ALL nodes by Year/Edition
  timelineNodes.sort((a, b) => {
    // Extract year number strictly
    const getYear = (y) => {
      if (!y) return 0;
      const match = y.toString().match(/\d{4}/);
      if (match) return parseInt(match[0]);
      return parseInt(y.toString().replace(/\D/g, '')) || 0;
    };

    const yearA = getYear(a.year);
    const yearB = getYear(b.year);

    if (yearA !== yearB) return yearA - yearB;

    // Secondary sort: Card < Promotion < Summary
    const typeOrder = { 'card': 1, 'promotion': 2, 'summary': 3 };
    return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
  });

  // Make sure function is globally available
  if (typeof window !== 'undefined') window.openTimelineDetail = openTimelineDetail;

  // Store for click handlers
  window.currentTimelineNodes = timelineNodes;
  console.log('Updated window.currentTimelineNodes:', window.currentTimelineNodes.length, 'nodes');

  // Get character name from first node
  const characterName = timelineNodes[0]?.raw?.['Imie postaci'] || 'Postać';

  const html = `
      <div class="timeline-actions" style="margin-bottom: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn-timeline-ai" onclick="window.generateTimelineSummary()" title="Wygeneruj spójną historię z AI">
          ✨ Generuj Historię AI
        </button>
      </div>
      <div id="mentions-container" class="mentions-container" style="display: none;"></div>
      <div class="timeline-scroll-wrapper">
        <div class="timeline-track">
          ${timelineNodes.map((node, index) => {
    const isCard = node.type === 'card';
    const isPromo = node.type === 'promotion';
    const statusClass = node.status === 'accepted' ? 'status-ok' : (node.status === 'rejected' ? 'status-bad' : 'status-neu');
    const markerClass = isCard ? 'marker-card' : (isPromo ? 'marker-promo' : 'marker-summary');

    return `
              <div class="timeline-node ${node.type}-node" data-node-year="${node.year}">
                <div class="timeline-year">${node.year}</div>
                <div class="timeline-type-label">${node.title}</div>
                <!-- Bookmark Container -->
                <div class="timeline-bookmarks-container" id="bookmarks-${node.year.replace(/\D/g, '')}"></div>
                
                <div class="timeline-marker ${statusClass} ${markerClass}"></div>
                <div class="timeline-content" onclick="console.log('Clicked node ${index}'); window.openTimelineDetail(${index})" style="cursor: pointer;">
                  <div class="t-summary" title="Kliknij by rozwinąć">${highlightText(node.content.substring(0, 300) + (node.content.length > 300 ? '...' : ''), '')}</div>
                  ${isCard ? `<div class="t-meta">Gildia: ${node.guild}</div>` : ''}
                </div>
                ${index < timelineNodes.length - 1 ? '<div class="timeline-connector"></div>' : ''}
              </div>
            `;
  }).join('')}
        </div>
      </div>
  `;

  container.innerHTML = html;

  // Auto-load bookmarks
  injectTimelineBookmarks(characterName);
}

/**
 * Fetch and inject cross-reference bookmarks into the timeline
 */
async function injectTimelineBookmarks(characterName) {
  console.log(`Loading bookmarks for ${characterName}...`);
  try {
    const result = await window.electronAPI.searchMentions(characterName);
    if (!result || !result.mentions || result.mentions.length === 0) return;

    // Group by year
    const byYear = {};
    result.mentions.forEach(m => {
      const y = m.year ? m.year.replace(/\D/g, '') : 'Unknown';
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(m);
    });

    // Render Tabs
    Object.keys(byYear).forEach(year => {
      const container = document.getElementById(`bookmarks-${year}`);
      if (container) {
        const count = byYear[year].length;
        const badge = document.createElement('div');
        badge.className = 'timeline-bookmark-badge';
        badge.innerHTML = `<span>🔖 Wzmianki (${count})</span>`;
        badge.title = `Kliknij, aby zobaczyć ${count} wzmianek o tej postaci w roku ${year}`;
        badge.onclick = (e) => {
          e.stopPropagation();
          openMentionsDrawer(year, byYear[year]);
        };
        container.appendChild(badge);
        // Make container visible
        container.style.display = 'flex';
      }
    });

  } catch (e) {
    console.error('Failed to load bookmarks', e);
  }
}

/**
 * Open a specific drawer for year-based mentions
 */
function openMentionsDrawer(year, mentions) {
  const overlayId = `mentionsOverlay-${year}-${Date.now()}`;
  let overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.className = 'character-overlay';
  overlay.style.zIndex = ++window.highestZIndex || 1000;
  document.body.appendChild(overlay);

  // Add click handler for expanding text
  window.toggleMentionText = (index) => {
    const el = document.getElementById(`mention-full-${index}`);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  };

  overlay.innerHTML = `
        <div class="overlay-header" id="header-${overlayId}">
            <div style="display:flex; align-items:center;">
                <div class="overlay-title">🔖 Wzmianki w roku ${year}</div>
            </div>
            <div class="overlay-close" onmousedown="event.stopPropagation();" onclick="closeCharacterOverlay('${overlayId}')">✕</div>
        </div>
        <div class="overlay-content">
            <div class="mentions-list">
                ${mentions.map((m, idx) => `
                    <div class="mention-item" style="cursor: auto;">
                        <div class="mention-header" style="cursor: pointer;" onclick="event.stopPropagation(); openCharacterOverlay('${m.sourceName.replace(/'/g, "\\'")}', true)">
                            <span class="mention-author">👤 ${m.sourceName}</span>
                            <span class="mention-guild">${m.sourceGuild || ''}</span>
                            <span style="margin-left:auto; font-size:10px;">➜ Otwórz</span>
                        </div>
                        
                        <div class="mention-text" style="cursor: pointer;" onclick="toggleMentionText(${idx})">
                            "${m.context}" <span style="color:var(--gold); font-size:10px;">(Pokaż całość)</span>
                        </div>
                        
                        <div id="mention-full-${idx}" style="display:none; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-subtle); color:var(--text-primary); font-size:12px; white-space: pre-wrap;">
                            ${highlightText(m.fullText || m.context, '')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

  overlay.classList.add('active');

  const header = document.getElementById(`header-${overlayId}`);
  if (header) makeDraggable(overlay, header);
}

/**
 * Load and display mentions of this character in other profiles (Legacy/Full List)
 */
export async function loadMentions(characterName) {
  const container = document.getElementById('mentions-container');
  if (!container) return;

  // Toggle visibility
  if (container.style.display === 'block') {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = '<p style="color: var(--text-dim);">Szukam wzmianek...</p>';

  try {
    const result = await window.electronAPI.searchMentions(characterName);

    if (!result.success || !result.mentions || result.mentions.length === 0) {
      container.innerHTML = '<p style="color: var(--text-dim); font-style: italic;">Brak wzmianek tej postaci w innych podsumowaniach.</p>';
      return;
    }

    // Group by year
    const byYear = {};
    result.mentions.forEach(m => {
      if (!byYear[m.year]) byYear[m.year] = [];
      byYear[m.year].push(m);
    });

    let html = '<div class="mentions-header">🔗 Wzmianki w innych postaciach:</div>';

    Object.keys(byYear).sort().forEach(year => {
      html += `<div class="mention-year-group">
        <div class="mention-year-header">${year}</div>
        <div class="mention-items">
          ${byYear[year].map((m, i) => `
            <div class="mention-item" style="flex-direction: column; align-items: flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:4px;">
                    <div style="cursor:pointer; display:flex; align-items:center; gap:5px;" onclick="closeCharacterOverlay(); jumpToCharacter('${m.sourceName.replace(/'/g, "\\'")}')">
                        <span class="mention-char">👤 ${m.sourceName}</span>
                        <span style="font-size:10px; color:var(--text-dim);">(${m.field})</span>
                    </div>
                    ${m.fullText ?
          `<button class="btn-icon" style="font-size:10px; padding:2px 6px;" onclick="document.getElementById('m-full-list-${year}-${i}').style.display = document.getElementById('m-full-list-${year}-${i}').style.display === 'none' ? 'block' : 'none'">🔍 Pokaż</button>`
          : ''
        }
                </div>
              
              <div class="mention-excerpt">"${m.context}"</div>
              
              <div id="m-full-list-${year}-${i}" style="display:none; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-subtle); font-size:11px; color:var(--text-primary); white-space:pre-wrap; width:100%;">
                 ${highlightText(m.fullText || '', '')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
    });

    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = `<p style="color: var(--warning);">Błąd: ${e.message}</p>`;
  }
}

/**
 * Generate a coherent story from the entire timeline using AI
 */
export async function generateTimelineSummary() {
  const nodes = window.currentTimelineNodes;
  if (!nodes || nodes.length === 0) {
    alert('Brak danych na osi czasu.');
    return;
  }

  const characterName = nodes[0]?.raw?.['Imie postaci'] || 'Postać';

  // Prepare context
  let context = `# Historia postaci: ${characterName}\n\n`;

  // Group by year
  const byYear = {};
  nodes.forEach(n => {
    if (!byYear[n.year]) byYear[n.year] = [];
    byYear[n.year].push(n);
  });

  Object.keys(byYear).sort().forEach(year => {
    context += `## ${year}\n`;
    byYear[year].forEach(n => {
      context += `### ${n.title}\n${n.content}\n\n`;
    });
  });

  // Show loading overlay
  closeCharacterOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'charOverlay';
  overlay.className = 'character-overlay';
  overlay.innerHTML = `
      <div class="overlay-header" id="overlayHeader">
        <div class="overlay-title">✨ Generowanie Historii AI</div>
        <div class="overlay-close" onclick="closeCharacterOverlay()">✕</div>
      </div>
      <div class="overlay-content" id="overlayBody">
         <div style="text-align: center; padding: 20px;">
            <div class="spinner" style="margin: 0 auto 15px; width: 40px; height: 40px; border: 4px solid var(--gold-dim); border-top-color: var(--gold-bright); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p>Analizuję oś czasu i generuję spójną historię...</p>
         </div>
      </div>
  `;
  document.body.appendChild(overlay);

  // Call AI
  try {
    const prompt = `Na podstawie poniższych danych z osi czasu postaci "${characterName}", napisz spójną, fabularną historię tej postaci. Uporządkuj ją chronologicznie, używając nagłówków dla lat. Zachowaj klimat gotyckiego fantasy. Bądź zwięzły, ale nie pomijaj ważnych wydarzeń.

DANE OSI CZASU:
${context}

INSTRUKCJE:
- Napisz historię w formie narracji w trzeciej osobie.
- Podziel na sekcje według lat.
- Zsyntetyzyuj plany i podsumowania w spójną fabułę.
- Zachowaj słownictwo i nazwy własne.`;

    const result = await window.electronAPI.aiCommand('custom', null, {
      customPrompt: prompt,
      temperature: 0.7,
      stream: false
    });

    const body = document.getElementById('overlayBody');
    if (result.success) {
      body.innerHTML = `
         <div class="overlay-section">
            <h4>📖 Historia postaci: ${characterName}</h4>
            <div style="white-space: pre-wrap; line-height: 1.7;">${highlightText(result.text, '')}</div>
         </div>
      `;
    } else {
      body.innerHTML = `<p style="color: var(--warning);">Błąd generowania: ${result.error}</p>`;
    }
  } catch (e) {
    const body = document.getElementById('overlayBody');
    if (body) body.innerHTML = `<p style="color: var(--warning);">Błąd: ${e.message}</p>`;
  }
}

// Ensure CSS for timeline
const timelineStyle = document.createElement('style');
timelineStyle.textContent = `
  .profile-timeline-container {
    grid-column: span 12;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border-subtle);
    overflow: hidden;
  }
  .timeline-label {
    font-size: 12px; color: var(--gold-soft); text-transform: uppercase; margin-bottom: 10px; display:block;
  }
  .timeline-type-label {
    font-size: 10px; color: var(--text-dim); margin-bottom: 4px; text-transform:uppercase; letter-spacing:1px;
  }
  .timeline-scroll-wrapper {
    overflow-x: auto;
    padding-bottom: 10px;
    /* Custom Scrollbar for timeline */
    scrollbar-width: thin;
    scrollbar-color: var(--gold-dim) var(--bg-dark);
  }
  .timeline-track {
    display: flex;
    gap: 0;
    min-width: max-content;
    padding: 0 10px;
  }
  .timeline-node {
    position: relative;
    width: 240px; /* Slightly wider */
    padding: 0 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }
  .timeline-year {
    font-size: 14px; font-weight: bold; color: var(--gold-bright); margin-bottom: 2px;
  }
  
  /* Bookmarks UI - Vertical Tabs */
  .timeline-bookmarks-container {
    display: none; /* Hidden by default */
    position: absolute;
    right: -24px;
    top: 10px;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    z-index: 5;
    width: auto;
  }
  .timeline-bookmark-badge {
    background: var(--gold-mid);
    color: #000;
    border: 1px solid var(--gold-bright);
    font-size: 10px;
    font-weight: bold;
    padding: 6px 2px;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
    writing-mode: vertical-rl;
    text-orientation: mixed;
    height: auto;
    min-height: 40px;
    width: 20px;
    text-align: center;
    transition: transform 0.2s, background 0.2s;
  }
  .timeline-bookmark-badge:hover {
    background: var(--gold-bright);
    transform: translateX(2px);
  }
  .timeline-bookmark-badge span {
     display: inline-block;
     white-space: nowrap;
  }
  .overlay-nav-btn {
    background: none; border: 1px solid var(--gold-dim); color: var(--gold-bright); 
    border-radius: 50%; width: 24px; height: 24px; margin-right: 10px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .overlay-nav-btn:hover { background: rgba(255, 215, 0, 0.2); }
  


  .timeline-marker {
    width: 12px; height: 12px; border-radius: 50%;
    margin-bottom: 10px;
    position: relative;
    z-index: 2;
    border: 2px solid var(--bg-dark);
  }
  .marker-card { background: #ffd700; box-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }
  .marker-promo { background: #4caf50; box-shadow: 0 0 8px rgba(76, 175, 80, 0.4); } 
  .marker-summary { background: #aaa; }

  .status-ok { border-color: #4caf50; }
  .status-bad { border-color: #f44336; }
  .status-neu { border-color: var(--text-dim); }
  
  .timeline-connector {
    position: absolute;
    top: 29px; /* Adjust based on Year height + Marker center */
    left: 50%;
    width: 100%; /* Spans to next */
    height: 2px;
    background: rgba(255, 215, 0, 0.2);
    z-index: 1;
  }
  .timeline-node:last-child .timeline-connector { display: none; }
  
  .timeline-content {
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 8px;
    font-size: 11px;
    width: 100%;
    color: var(--text-muted);
    transition: all 0.2s;
  }
  .timeline-content:hover {
    background: rgba(255, 215, 0, 0.05);
    border-color: var(--gold-dim);
    color: var(--text-primary);
  }
  .t-summary {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 4px;
    line-height: 1.4;
  }
  .t-meta { color: var(--text-dim); font-size: 10px; font-style: italic; }
  
  .timeline-empty { font-size: 12px; color: var(--text-dim); font-style: italic; padding: 10px; }
  .timeline-error { font-size: 12px; color: #f44336; padding: 10px; }
  
  .btn-timeline-ai {
    background: #FFD700; /* Solid Gold */
    color: #000000;
    border: 1px solid #B8860B;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }
  .btn-timeline-ai:hover {
    background: #FFC125;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.6);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .btn-timeline-mentions {
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .btn-timeline-mentions:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52,152,219,0.4);
  }
  
  .mentions-container {
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 15px;
  }
  .mentions-header {
    color: var(--gold-soft);
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .mention-year-group {
    margin-bottom: 10px;
  }
  .mention-year-header {
    color: var(--gold-bright);
    font-weight: bold;
    margin-bottom: 5px;
  }
  .mention-items {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mention-item {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    max-width: 300px;
    transition: background 0.2s;
  }
  .mention-item:hover {
    background: rgba(255,215,0,0.1);
  }
  .mention-char { color: var(--text-primary); font-weight: bold; }
  .mention-source { color: var(--text-dim); font-size: 10px; margin-left: 5px; }
  .mention-excerpt { color: var(--text-muted); font-size: 11px; font-style: italic; margin-top: 4px; }
`;
if (typeof document !== 'undefined') document.head.appendChild(timelineStyle);


// Make globally available
if (typeof window !== 'undefined') {
  window.renderProfileDetails = renderProfileDetails;
  window.linkifyNames = linkifyNames;
  window.highlightText = highlightText;
  window.openCharacterOverlay = openCharacterOverlay;
  window.closeCharacterOverlay = closeCharacterOverlay;
  window.jumpToCharacter = jumpToCharacter;
  window.loadProfileTimeline = loadProfileTimeline;
  window.openTimelineDetail = openTimelineDetail;
  window.generateTimelineSummary = generateTimelineSummary;
  window.loadMentions = loadMentions;
}
// ==============================
// Notes Section Logic
// ==============================

/**
 * Refresh and render notes for a profile
 */
window.refreshProfileNotes = async (name) => {
  const container = document.getElementById(`ai-notes-container-${(state.sheetData?.rows?.find(p => p['Imie postaci'] === name)?.id) || 'unknown'}`);
  // Fallback to searching by class if ID dynamic
  const containerAlt = document.querySelector('.ai-notes-container-active');

  const target = container || containerAlt;
  if (!target) return;

  target.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-dim);">Ładowanie notatek...</div>';

  const notes = await AiSummaryGenerator.loadNotes(name);

  if (!notes || notes.length === 0) {
    target.innerHTML = '<div style="text-align:center; padding:10px; font-style:italic; color:var(--text-dim);">Brak zapisanych notatek lub listów dla tej postaci.</div>';
    return;
  }

  target.innerHTML = '';
  notes.forEach(note => {
    // Detect type or content tag
    const isLetter = note.type === 'letter' || (note.content && note.content.includes('#list'));

    const card = document.createElement('div');
    card.className = `ai-card ${isLetter ? 'letter-card' : 'note-card'}`;

    if (isLetter) {
      card.style.background = '#f4e4bc'; // Parchment
      card.style.color = '#3e2b14'; // Ink
      card.style.fontFamily = '"Cinzel", "Georgia", serif'; // Gothic style
      card.style.fontSize = '14px';
      card.style.border = '1px solid #d4af37';
      card.style.boxShadow = 'inset 0 0 30px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.3)';
      card.style.minHeight = '150px';
      card.style.marginTop = '15px';
      card.style.padding = '20px';
      card.style.position = 'relative';
    } else {
      card.style.borderLeftColor = '#ffd700';
    }

    const contentHtml = note.content;
    const title = isLetter ? '📜 List / Dokument' : `📝 Notatka (${note.date || 'Nieznana data'})`;

    card.innerHTML = `
      <div class="ai-card-meta" style="display:flex; justify-content:space-between; align-items:center; ${isLetter ? 'border-bottom:1px solid rgba(62,43,20,0.2); padding-bottom:5px; margin-bottom:15px;' : ''}">
         <span style="${isLetter ? 'font-weight:bold; font-size:16px; letter-spacing:1px;' : ''}">${title}</span>
         <div class="note-controls">
           <button class="btn-icon btn-save-note" style="display:none; color:${isLetter ? '#2e7d32' : '#4caf50'};" title="Zapisz zmiany">💾</button>
           <button class="btn-icon" onclick="deleteNote('${note._filename}')" title="Usuń (BETA)" style="color:${isLetter ? '#c62828' : '#f44336'}; opacity:${isLetter ? '0.8' : '0.5'};">🗑️</button>
         </div>
      </div>
      <div class="note-content" contenteditable="true" style="white-space: pre-wrap; outline:none; padding:5px; border-radius:4px; transition:background 0.2s; ${isLetter ? 'font-style:italic; line-height:1.6;' : ''}">
         ${contentHtml}
      </div>
      ${isLetter ? '<div style="position:absolute; bottom:10px; right:15px; opacity:0.3; font-size:24px; pointer-events:none;">✒️</div>' : ''}
    `;

    // Event Listeners for Edit Mode
    const contentDiv = card.querySelector('.note-content');
    const saveBtn = card.querySelector('.btn-save-note');

    contentDiv.addEventListener('input', () => {
      saveBtn.style.display = 'inline-block';
      contentDiv.style.background = isLetter ? 'rgba(62,43,20,0.05)' : 'rgba(255,255,255,0.05)';
    });

    saveBtn.addEventListener('click', async () => {
      saveBtn.textContent = '⏳';
      const success = await AiSummaryGenerator.updateNote(note, contentDiv.innerHTML);
      if (success) {
        saveBtn.style.display = 'none';
        saveBtn.textContent = '💾';
        contentDiv.style.background = 'transparent';
        if (window.addLog) window.addLog('success', 'Zaktualizowano.');
      } else {
        saveBtn.textContent = '❌';
        alert('Błąd zapisu!');
      }
    });

    target.appendChild(card);
  });
};

window.deleteNote = (filename) => {
  // TODO: Implement delete functionality
  alert('Usuwanie notatek wkrótce!');
};
