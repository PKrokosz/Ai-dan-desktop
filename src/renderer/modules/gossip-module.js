/**
 * Gossip Module (Plotki)
 * Generates rumors (True/False) about characters using AI.
 */

import { createModal } from './ui-modal-helper.js';

export async function generateGossip(charIndex) {
    if (!window.state.sheetData || !window.state.sheetData.rows[charIndex]) return;
    const char = window.state.sheetData.rows[charIndex];
    const charName = char['Imie postaci'] || 'Nieznajomy';
    const charGuild = char['Gildia'] || 'Bez gildii';
    const facts = (char['Fakty'] || '') + ' ' + (char['O postaci'] || '');

    // Show loading
    createModal('gossip-modal', `👄 Plotki: ${charName}`, `
        <div style="padding: 20px; text-align: center; color: var(--gold);">
           <div class="spinner"></div><br>
           Nadstawiam uszu...
        </div>
    `);

    try {
        const prompt = `Jesteś wścibskim kopaczem w Kolonii Karnej (Gothic 1).
        Opowiedz dwie plotki o postaci: ${charName} (${charGuild}).
        Kontekst (Fakty): ${facts.substring(0, 500)}...
        
        Zadanie:
        1. Napisz jedną plotkę, która brzmi wiarygodnie i opiera się na faktach.
        2. Napisz jedną plotkę, która jest całkowitym kłamstwem, ale brzmi soczyście.
        
        Użyj prostego, "obozowego" języka. Krótko (max 2 zdania na plotkę).
        
        Format odpowiedzi:
        TRUE: [Treść prawdziwej plotki]
        FALSE: [Treść fałszywej plotki]`;

        const response = await window.electronAPI.sendAICommand('custom', {
            'Imie postaci': charName
        }, {
            customPrompt: prompt,
            model: 'gemma2:9b',
            temperature: 0.9 // High creativity for rumors
        });

        if (response.success) {
            const lines = response.text.split('\n');
            let truth = "Coś tam słyszałem, ale zapomniałem...";
            let lie = "Ludzie gadają różne rzeczy...";

            // Simple parsing
            lines.forEach(line => {
                if (line.includes('TRUE:') || line.includes('1.')) truth = line.replace(/TRUE:|1\./, '').trim();
                if (line.includes('FALSE:') || line.includes('2.')) lie = line.replace(/FALSE:|2\./, '').trim();
            });

            // Fallback if parsing fails (AI returns raw text)
            if (truth === "Coś tam słyszałem, ale zapomniałem..." && response.text.length > 10) {
                truth = response.text;
                lie = "";
            }

            renderGossipResult(charName, truth, lie);
        } else {
            throw new Error(response.error);
        }

    } catch (e) {
        createModal('gossip-modal', 'Błąd', `<div style="color:red; padding:20px;">${e.message}</div>`);
    }
}

function renderGossipResult(name, truth, lie) {
    const html = `
    <div style="padding: 20px; color: #dcb159; font-family: 'Cinzel', serif;">
        <div style="margin-bottom: 20px; background: rgba(0,0,0,0.3); padding: 15px; border-left: 3px solid #4caf50;">
            <h4 style="margin: 0 0 10px 0; color: #81c784; font-size: 14px; text-transform:uppercase;">📣 Prawdo-podobne</h4>
            <p style="font-style: italic; font-size: 16px; color: #e8f5e9;">"${truth}"</p>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-left: 3px solid #f44336;">
            <h4 style="margin: 0 0 10px 0; color: #e57373; font-size: 14px; text-transform:uppercase;">🤥 Bujda na resorach</h4>
            <p style="font-style: italic; font-size: 16px; color: #ffebee;">"${lie}"</p>
        </div>
        
        <div style="margin-top:20px; text-align:center; font-size:11px; color:#666;">
           *Informacje wygenerowane przez AI na podstawie szczątkowych danych.
        </div>
    </div>
    `;

    createModal('gossip-modal', `👄 Co ludzie gadają o: ${name}`, html);
}
