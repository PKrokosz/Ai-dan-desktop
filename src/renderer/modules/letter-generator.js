/**
 * Letter Generator & Relationship Matrix Module
 * Allows users to visualize connections and generate in-character letters.
 */

import { createModal, closeModal } from './ui-modal-helper.js';

export async function openLetterGenerator(charIndex) {
    if (!window.state.sheetData || !window.state.sheetData.rows[charIndex]) return;
    const char = window.state.sheetData.rows[charIndex];
    const charName = char['Imie postaci'] || 'Postać';

    // Show loading modal
    createModal('letter-modal', `📮 Centrum Korespondencji: ${charName}`, `
        <div style="padding: 20px; text-align: center; color: var(--gold);">
           <div class="spinner"></div><br>
           Analiza siatki wywiadowczej i relacji...
        </div>
    `);

    try {
        // 1. Fetch Relationship Graph
        // Force refresh false (use cache)
        const response = await window.electronAPI.analyzeRelations(false);

        if (!response.success) {
            throw new Error(response.error);
        }

        const graph = response.graph; // { nodes, edges }

        // 2. Filter connections for THIS character
        // Outgoing: I mention them
        // Incoming: They mention me (more important for "receiving" but for writing letter, "Outgoing" implies I know them)
        // Let's combine both.
        const connections = [];
        const seen = new Set();

        graph.edges.forEach(e => {
            let targetName = null;
            let type = 'neutral';
            let context = e.context || '';

            if (e.source === charName) {
                targetName = e.target;
                type = 'outgoing'; // I know them
            } else if (e.target === charName) {
                targetName = e.source;
                type = 'incoming'; // They know me
            }

            if (targetName && !seen.has(targetName)) {
                // Find target node data
                const node = graph.nodes.find(n => n.id === targetName);
                connections.push({
                    name: targetName,
                    group: node ? node.group : '?',
                    type: type,
                    context: context,
                    weight: e.weight
                });
                seen.add(targetName);
            }
        });

        // Add heuristic connections based on Guild (e.g. Bosses)
        // TODO: Add Thorus/Gomez/Lee if unknown? Keep it strict for now.

        renderLetterInterface(char, connections, graph);

    } catch (e) {
        createModal('letter-modal', 'Błąd', `<div style="color:red; padding:20px;">${e.message}</div>`);
    }
}

function renderLetterInterface(char, connections, graph) {
    // Sort connections by weight/importance
    connections.sort((a, b) => b.weight - a.weight);

    const html = `
    <div style="display: flex; height: 70vh; gap: 0;">
        <!-- Left: Network List -->
        <div style="width: 250px; border-right: 1px solid var(--border); overflow-y: auto; background: rgba(0,0,0,0.2);">
            <div style="padding: 10px; font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">
                Znane Kontakty (${connections.length})
            </div>
            ${connections.length === 0 ? '<div style="padding:10px; color:#666;">Brak wykrytych powiązań w historii.</div>' : ''}
            <div class="contact-list">
                ${connections.map(c => `
                    <div class="contact-item" onclick="selectContact('${c.name}', '${c.group}', \`${c.context.replace(/"/g, '&quot;')}\`)" 
                         style="padding: 10px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: 0.2s;">
                        <div style="color: var(--gold); font-weight: bold;">${c.name}</div>
                        <div style="font-size: 10px; color: #888;">${c.group}</div>
                        ${c.context ? `<div style="font-size: 9px; color: #555; margin-top: 2px; font-style:italic;">"...${c.context.substring(0, 40)}..."</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Right: Composer -->
        <div style="flex: 1; display: flex; flex-direction: column; padding: 20px;">
            
            <!-- Header Controls -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                   <label style="display:block; color:var(--text-dim); font-size:10px; margin-bottom:4px;">DO KOGO</label>
                   <input type="text" id="letterTarget" class="gothic-input" placeholder="Wybierz z listy lub wpisz..." value="${connections[0] ? connections[0].name : ''}">
                </div>
                <div>
           <label style="display:block; color:var(--text-dim); font-size:10px; margin-bottom:4px;">INTENCJA / TEMAT</label>
                   <select id="letterTopic" class="gothic-input" style="width:100%;">
                       <option value="Propozycja handlowa">💰 Propozycja handlowa</option>
                       <option value="Groźba / Szantaż">⚔️ Groźba / Szantaż</option>
                       <option value="Prośba o pomoc">🆘 Prośba o pomoc</option>
                       <option value="Donos / Plotka">📜 Donos / Plotka</option>
                       <option value="Zaproszenie na spotkanie">🍺 Zaproszenie na spotkanie</option>
                       <option value="Ostrzeżenie">⚠️ Ostrzeżenie</option>
                   </select>
                </div>
            </div>

            <!-- Context Hint -->
            <div id="connectionContext" style="background: rgba(184, 138, 43, 0.1); border-left: 2px solid var(--gold); padding: 8px; font-size: 11px; color: var(--text-muted); margin-bottom: 15px; display: none;">
               <!-- Filled by JS -->
            </div>

            <!-- Action Area -->
            <div style="margin-bottom: 15px;">
                <button class="btn btn-primary" style="width: 100%;" onclick="generateLetter('${char['Imie postaci']}', '${char['Gildia']}')">
                    ⚡ Generuj Treść Listu (AI)
                </button>
            </div>

            <!-- Editor -->
            <label style="display:block; color:var(--text-dim); font-size:10px; margin-bottom:4px;">TREŚĆ LISTU</label>
            <textarea id="letterContent" style="flex: 1; background: url('assets/paper-texture.jpg') #e8dfc8; color: #3d3126; font-family: 'Cinzel', serif; padding: 20px; border-radius: 4px; border: 1px solid #5c4d3c; line-height: 1.6; font-size: 14px;" placeholder="Tutaj pojawi się wygenerowany list..."></textarea>
            
            <!-- Footer -->
            <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn btn-secondary" onclick="closeModal('letter-modal')">Anuluj</button>
                <button class="btn btn-primary" onclick="saveLetter()">💾 Zapisz do Notatek</button>
            </div>
        </div>
    </div>
    `;

    createModal('letter-modal', `📮 Centrum Korespondencji: ${char['Imie postaci']}`, html);

    // Helper logic for selecting contact
    window.selectContact = (name, group, context) => {
        document.getElementById('letterTarget').value = name;
        const ctxDiv = document.getElementById('connectionContext');
        if (context && context !== 'undefined') {
            ctxDiv.style.display = 'block';
            ctxDiv.innerText = `Kontekst relacji: ${context}`;
        } else {
            ctxDiv.style.display = 'none';
        }
    };

    // Initial selection context
    if (connections.length > 0) {
        window.selectContact(connections[0].name, connections[0].group, connections[0].context);
    }
}

// Generate Call using AI
window.generateLetter = async (sender, senderGuild) => {
    const target = document.getElementById('letterTarget').value;
    const topic = document.getElementById('letterTopic').value;
    const context = document.getElementById('connectionContext').innerText;

    if (!target) return alert("Wybierz adresata!");

    const btn = document.querySelector('#letter-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "⏳ Pisanie...";
    btn.disabled = true;

    try {
        const prompt = `Napisz klimatyczny list "in-character" (Gothic 1 LARP).
        NADAWCA: ${sender} (${senderGuild})
        ADRESAT: ${target}
        TEMAT: ${topic}
        KONTEKST RELACJI: ${context.replace('Kontekst relacji: ', '')}
        
        STYL: Archaizowany, surowy, pasujący do Kolonii Karnej.
        KRÓTKO: Max 150 słów.
        FORMAT: Sam tekst listu, bez "Temat:" czy nagłówków poza treścią.`;

        // Direct AI call via custom hook or ai-command
        // We use 'chat' command but with specific prompt
        const response = await window.electronAPI.sendAICommand('custom', {
            'Imie postaci': sender,
            'Gildia': senderGuild
        }, {
            customPrompt: prompt,
            model: 'gemma2:9b', // Ensure coherent creative writing
            temperature: 0.8
        });

        if (response.success) {
            document.getElementById('letterContent').value = response.text;
        } else {
            alert("Błąd AI: " + response.error);
        }

    } catch (e) {
        alert("Błąd: " + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.saveLetter = () => {
    // Logic to save to notes (Issue #15 functionality)
    const content = document.getElementById('letterContent').value;
    if (content) {
        // Append to notes
        alert("Zapisano (Symulacja) - funkcja zapisu do notatek wkrótce!");
    }
};

