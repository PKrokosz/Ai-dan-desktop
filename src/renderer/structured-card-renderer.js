/**
 * Structured Card Renderer
 * Renders JSON structured outputs as beautiful cards instead of raw JSON
 */

/**
 * Detect if content is valid JSON and what type it is
 * @param {string} content 
 * @returns {object|null} Parsed JSON and detected type, or null if not JSON
 */
function detectStructuredOutput(content) {
    try {
        // Try to extract JSON from the content
        let jsonStr = content.trim();

        // Handle markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);

        // Detect type by fields
        if (parsed.nazwa_watku || parsed.wpis_fabularny || parsed.styl) {
            return { type: 'quest', data: parsed };
        }
        if (parsed.cechy_charakteru || parsed.slabosci || parsed.nalogi) {
            return { type: 'traits', data: parsed };
        }
        if (parsed.relacje && Array.isArray(parsed.relacje)) {
            return { type: 'npc', data: parsed };
        }

        // Generic JSON
        return { type: 'generic', data: parsed };
    } catch (e) {
        return null;
    }
}

/**
 * Render Quest card HTML
 */
function renderQuestCard(data) {
    const styleBadges = {
        'Mroczna Intryga': { emoji: '🗡️', color: '#8b0000' },
        'Mistyczna Wizja': { emoji: '🔮', color: '#4b0082' },
        'Osobista Ambitność': { emoji: '⚔️', color: '#b8860b' },
        'Surowy Realizm': { emoji: '⛏️', color: '#2f4f4f' }
    };

    const style = styleBadges[data.styl] || { emoji: '📜', color: '#705d4d' };
    const frakcje = data.zaangazowane_frakcje || [];

    return `
    <div class="structured-card quest-card" style="border-left: 4px solid ${style.color};">
        <div class="card-header-row">
            <span class="card-type-badge">${style.emoji} ${data.styl || 'Quest'}</span>
            <span class="card-zakres">${data.zakres || ''}</span>
        </div>
        <h3 class="quest-title">${data.nazwa_watku || 'Nowy wątek'}</h3>
        
        ${data.cel ? `
        <div class="quest-section">
            <span class="section-label">🎯 Cel:</span>
            <span class="section-value">${data.cel}</span>
        </div>` : ''}
        
        ${data.przeszkoda ? `
        <div class="quest-section">
            <span class="section-label">⚠️ Przeszkoda:</span>
            <span class="section-value">${data.przeszkoda}</span>
        </div>` : ''}
        
        ${data.wpis_fabularny ? `
        <div class="quest-narrative">
            ${data.wpis_fabularny}
        </div>` : ''}
        
        ${frakcje.length > 0 ? `
        <div class="quest-factions">
            ${frakcje.map(f => `<span class="faction-tag">${f}</span>`).join('')}
        </div>` : ''}
        
        ${data.powiazane_postacie?.length > 0 ? `
        <div class="quest-characters">
            <span class="section-label">👥 Postacie:</span>
            ${data.powiazane_postacie.map(p => `<span class="character-tag">${p}</span>`).join('')}
        </div>` : ''}
        
        ${data.nagroda ? `
        <div class="quest-reward">
            <span class="section-label">💰 Nagroda:</span> ${data.nagroda}
        </div>` : ''}
        
        <div class="card-actions">
            <button class="card-btn" onclick="copyCardJSON(this)" data-json='${JSON.stringify(data).replace(/'/g, "&#39;")}'>📋 Kopiuj</button>
            <button class="card-btn" onclick="toggleRawJSON(this)">👁️ JSON</button>
        </div>
        <pre class="raw-json" style="display: none;">${JSON.stringify(data, null, 2)}</pre>
    </div>
    `;
}

/**
 * Render Traits card HTML
 */
function renderTraitsCard(data) {
    const cechy = data.cechy_charakteru || [];
    const slabosci = data.slabosci || [];
    const mocne = data.mocne_strony || [];
    const nalogi = data.nalogi || [];
    const motywacje = data.motywacje || [];

    return `
    <div class="structured-card traits-card">
        <div class="card-header-row">
            <span class="card-type-badge">🎭 Cechy Postaci</span>
        </div>
        
        ${cechy.length > 0 ? `
        <div class="traits-section">
            <h4>Cechy charakteru</h4>
            <div class="traits-list">
                ${cechy.map(c => `<span class="trait-tag neutral">${c}</span>`).join('')}
            </div>
        </div>` : ''}
        
        ${mocne.length > 0 ? `
        <div class="traits-section">
            <h4>💪 Mocne strony</h4>
            <div class="traits-list">
                ${mocne.map(m => `<span class="trait-tag positive">${m}</span>`).join('')}
            </div>
        </div>` : ''}
        
        ${slabosci.length > 0 ? `
        <div class="traits-section">
            <h4>⚠️ Słabości</h4>
            <div class="traits-list">
                ${slabosci.map(s => `<span class="trait-tag negative">${s}</span>`).join('')}
            </div>
        </div>` : ''}
        
        ${nalogi.length > 0 ? `
        <div class="traits-section">
            <h4>🌿 Nałogi</h4>
            <div class="traits-list">
                ${nalogi.map(n => {
        const name = typeof n === 'object' ? n.nazwa : n;
        const level = typeof n === 'object' && n.poziom ? ` (${n.poziom})` : '';
        return `<span class="trait-tag addiction">${name}${level}</span>`;
    }).join('')}
            </div>
        </div>` : ''}
        
        ${motywacje.length > 0 ? `
        <div class="traits-section">
            <h4>🔥 Motywacje</h4>
            <ul class="motivation-list">
                ${motywacje.map(m => `<li>${m}</li>`).join('')}
            </ul>
        </div>` : ''}
        
        <div class="card-actions">
            <button class="card-btn" onclick="copyCardJSON(this)" data-json='${JSON.stringify(data).replace(/'/g, "&#39;")}'>📋 Kopiuj</button>
            <button class="card-btn" onclick="toggleRawJSON(this)">👁️ JSON</button>
        </div>
        <pre class="raw-json" style="display: none;">${JSON.stringify(data, null, 2)}</pre>
    </div>
    `;
}

/**
 * Render NPC Profile card HTML
 */
function renderNpcCard(data) {
    const relacje = data.relacje || [];

    return `
    <div class="structured-card npc-card">
        <div class="card-header-row">
            <span class="card-type-badge">👤 Profil NPC</span>
            ${data.frakcja ? `<span class="faction-badge">${data.frakcja}</span>` : ''}
        </div>
        
        <h3 class="npc-name">${data.imie || 'Nieznany'}</h3>
        ${data.ranga ? `<div class="npc-rank">${data.ranga}</div>` : ''}
        
        ${relacje.length > 0 ? `
        <div class="npc-relations">
            <h4>🔗 Relacje</h4>
            <div class="relations-grid">
                ${relacje.map(r => {
        const typeColors = {
            'sojusznik': '#2e7d32',
            'wróg': '#c62828',
            'rywal': '#e65100',
            'przyjaciel': '#1565c0',
            'dłużnik': '#6a1b9a',
            'wierzyciel': '#00695c'
        };
        const color = typeColors[r.typ] || '#705d4d';
        return `
                    <div class="relation-item" style="border-left: 3px solid ${color};">
                        <strong>${r.osoba}</strong>
                        <span class="relation-type" style="color: ${color};">${r.typ}</span>
                        ${r.opis ? `<p class="relation-desc">${r.opis}</p>` : ''}
                    </div>
                    `;
    }).join('')}
            </div>
        </div>` : ''}
        
        ${data.sekrety?.length > 0 ? `
        <div class="npc-secrets">
            <h4>🤫 Sekrety</h4>
            <ul>${data.sekrety.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>` : ''}
        
        ${data.cele?.length > 0 ? `
        <div class="npc-goals">
            <h4>🎯 Cele</h4>
            <ul>${data.cele.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>` : ''}
        
        <div class="card-actions">
            <button class="card-btn" onclick="copyCardJSON(this)" data-json='${JSON.stringify(data).replace(/'/g, "&#39;")}'>📋 Kopiuj</button>
            <button class="card-btn" onclick="toggleRawJSON(this)">👁️ JSON</button>
        </div>
        <pre class="raw-json" style="display: none;">${JSON.stringify(data, null, 2)}</pre>
    </div>
    `;
}

/**
 * Main entry point: try to render structured content
 * @param {string} content - Raw AI response
 * @returns {string|null} HTML card or null if can't render as card
 */
function tryRenderStructuredCard(content) {
    const detected = detectStructuredOutput(content);
    if (!detected) return null;

    switch (detected.type) {
        case 'quest':
            return renderQuestCard(detected.data);
        case 'traits':
            return renderTraitsCard(detected.data);
        case 'npc':
            return renderNpcCard(detected.data);
        default:
            // For generic JSON, render as a clean list/card instead of code block
            return renderGenericJson(detected.data);
    }
}

/**
 * Render generic JSON as human-readable HTML
 */
function renderGenericJson(data) {
    if (typeof data !== 'object' || data === null) return String(data);

    // Helper to recursive render
    function renderValue(val) {
        if (Array.isArray(val)) {
            return `<ul class="json-list">${val.map(v => `<li>${renderValue(v)}</li>`).join('')}</ul>`;
        }
        if (typeof val === 'object' && val !== null) {
            return renderGenericJson(val); // Recursive card
        }
        return `<span>${val}</span>`;
    }

    let html = '<div class="structured-card generic-card"><div class="card-content">';

    // If it's a flat object, render distinct rows
    for (const [key, value] of Object.entries(data)) {
        // Skip some internal metadata if present
        if (['_id', 'id'].includes(key)) continue;

        // Capitalize key
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        html += `
        <div class="json-row">
            <span class="json-key">${label}:</span>
            <div class="json-value">${renderValue(value)}</div>
        </div>`;
    }

    html += '</div></div>';
    return html;
}

// Helper functions for card interactions
function copyCardJSON(btn) {
    const json = btn.dataset.json;
    navigator.clipboard.writeText(json).then(() => {
        btn.textContent = '✓ Skopiowano!';
        setTimeout(() => btn.textContent = '📋 Kopiuj', 2000);
    });
}

function toggleRawJSON(btn) {
    const pre = btn.parentElement.nextElementSibling;
    if (pre && pre.classList.contains('raw-json')) {
        pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
        btn.textContent = pre.style.display === 'none' ? '👁️ JSON' : '🙈 Ukryj';
    }
}

// Export to window
window.StructuredCardRenderer = {
    detectStructuredOutput,
    renderQuestCard,
    renderTraitsCard,
    renderNpcCard,
    tryRenderStructuredCard
};
window.copyCardJSON = copyCardJSON;
window.toggleRawJSON = toggleRawJSON;

console.log('✅ StructuredCardRenderer loaded');
