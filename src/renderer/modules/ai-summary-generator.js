/**
 * @module ai-summary-generator
 * @description Handles generation of AI summaries and AI-DNA artifacts.
 */

// Questions definitions for context
const QUESTIONS_2025 = {
    ans1: 'Profesja/Zajęcie',
    ans2: 'Umiejętności (bojowe/rzemieślnicze)',
    ans3: 'Zmiany w charakterze (ostatni rok)',
    ans4: 'Kontakt (Giełda)',
    ans5: 'Kontakt (Stary Obóz/Zamek)',
    ans6: 'Kontakt (Inne)',
    ans7: 'Posiadłość/Dobytek',
    ans8: 'Wątki/Plany',
    ans9: 'Chronologia wydarzeń'
};

const QUESTIONS_2024 = {
    ans1: 'Opis postaci (wygląd/zachowanie)',
    ans2: 'Przyjaciele/Wrogowie',
    ans3: 'Ważne kontakty',
    ans4: 'Wątki/Cele',
    ans5: 'Zmiany w charakterze',
    ans6: 'Rozwój postaci',
    ans7: 'Przynależność (Grupa)',
    ans8: 'Dołączenie do Frakcji',
    ans9: 'Notatnik' // Sometimes empty or different
};

export class AiSummaryGenerator {

    /**
     * Generates a Climatic Report (AI-DNA) for a character.
     * @param {Object} profile - Character profile object
     * @param {Function} onStream - Callback for streaming text
     * @param {Function} onComplete - Callback when done (text)
     * @param {string} selectedModel - Model to use (optional)
     */
    static async generateReport(profile, onStream, onComplete, selectedModel) {
        if (!profile) return;

        const systemPrompt = this._buildSystemPrompt(profile);
        const userPrompt = this._buildUserPrompt(profile);

        // Use selected model, or configured, or fallback
        const model = selectedModel || 'gemma2:9b';

        try {
            await window.electronAPI.aiCommand('custom', profile, {
                system: systemPrompt,
                customPrompt: userPrompt,
                model: model,
                stream: true,
                temperature: 0.7, // Creativity balanced with coherence
                promptConfig: { responseLength: 'long' } // Hint for limits
            });

            // Listen to stream
            // Note: The main renderer handles the actual IPC listener binding usually.
            // But here we need to hook into the global listener or expect the caller to do it.
            // WORKAROUND: We will attach a temporary listener here if possible, 
            // OR we assume the CALLER (profile-renderer) sets up the listener.
            // Current `window.electronAPI.onAIStream` is global.

            // We'll rely on the global AppModules or the caller to handle the stream event
            // basically we return true to indicate "Started".
            return true;

        } catch (e) {
            console.error("AI Generation Failed", e);
            if (onComplete) onComplete(null, e);
            return false;
        }
    }

    /**
     * Saves AI-DNA artifact to disk
     */
    static async saveArtifact(profileName, type, content) {
        const date = new Date().toISOString().split('T')[0];
        const safeName = profileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        let subfolder = 'ai-dna';
        if (type === 'note') subfolder = 'ai-dna/notes';

        // Ensure folder structure exists (handled by backend ideally, but path here matters)
        // We will just use prefix in filename and let backend handle it, or path separator.
        // Electron 'save-output' handles recursive mkdir? Yes, ipc-handlers L326 says recursive: true.

        const filename = `${subfolder}/${safeName}_${type}_${date}_${Date.now()}.json`;

        const artifact = {
            profile: profileName,
            type: type,
            date: date,
            timestamp: Date.now(),
            content: content
        };

        try {
            const result = await window.electronAPI.saveOutput(filename, JSON.stringify(artifact, null, 2));
            if (result.success) {
                console.log(`✅ Artifact saved: ${filename}`);
                // Also save to Session State for immediate UI update access
                this._saveToSession(profileName, type, artifact);
                return result.path;
            }
        } catch (e) {
            console.error("Failed to save Artifact", e);
        }
    }

    static _saveToSession(name, type, artifact) {
        if (!window.state.aiDnaCache) window.state.aiDnaCache = {};
        if (!window.state.aiDnaCache[name]) window.state.aiDnaCache[name] = [];
        // Remove old of same type/day? Or keep history? Keep for now.
        window.state.aiDnaCache[name].push(artifact);
    }

    static getSessionArtifacts(name) {
        if (!window.state.aiDnaCache) return [];
        return window.state.aiDnaCache[name] || [];
    }

    // --- Private Prompt Builders ---

    static _buildSystemPrompt(profile) {
        return `Jesteś EKSPERTEM LORE GOTHIC (Gothic 1, 2, 3, Kroniki Myrtany) oraz PROFILEREM PSYCHOLOGICZNYM.
Twoim zadaniem jest stworzenie "Raportu Klimatycznego" (AI-DNA) dla postaci gracza w LARP Gothic.

ANALIZA DANYCH:
Analizujesz odpowiedzi gracza z ankiety (opisane jako ans1-ans9). Musisz zinterpretować te chłodne dane i zamienić je w żywy, psychologiczny portret.

WYMAGANA STRUKTURA RAPORTU (Użyj Markdown):
1. **Rys Psychologiczny**: Co napędza tę postać? Czego się boi? (Analiza 'between the lines').
2. **Sieć Społeczna**: Kto jest dla niej narzędziem, a kto przyjacielem? (Analiza pola 'Przyjaciele/Kontakty').
3. **Trajektoria Fabularna**: Jaki jest główny motyw tej postaci na nadchodzącą grę? (Na podstawie Celów/Wątków).
4. **Kronika**: Krótkie, klimatyczne podsumowanie jej ostatnich losów (max 3 zdania).

STYL:
- Mroczny, realistyczny, "brudny" styl Gothic.
- Bądź konkretny. Nie lej wody.
- Używaj terminologii ze świata (Innos, Beliar, Magiczny Krąg, Ruda, Stary Obóz itp.).
- Jeżeli dane są skąpe, napisz to wprost ("Postać - tabula rasa"), ale spróbuj wyciągnąć wnioski z klasy/gildii.`;
    }

    static _buildUserPrompt(profile) {
        const edition = profile['Edycja'] || '2025';
        const questions = edition.includes('2024') ? QUESTIONS_2024 : QUESTIONS_2025;

        // Helper to get Answer safely
        const getAns = (k) => {
            const val = profile._raw ? profile._raw[k] : profile[k];
            return (val && val !== 'NULL') ? val : 'Brak danych';
        };

        let dataBlock = `Imię: ${profile['Imie postaci']}\nGildia: ${profile['Gildia']}\n`;

        // Add Bio if exists
        if (profile['O postaci']) dataBlock += `Bio: ${profile['O postaci']}\n`;

        // Add Answers with Labels
        dataBlock += `\nANKIETA GRACZA (${edition}):\n`;
        Object.keys(questions).forEach(key => {
            const answer = getAns(key);
            if (answer !== 'Brak danych') {
                dataBlock += `- ${questions[key]}: ${answer}\n`;
            }
        });

        return `Przeanalizuj poniższe dane i wygeneruj RAPORT AI-DNA:\n\n${dataBlock}`;
    }

    /**
     * Loads saved notes for a profile
     */
    static async loadNotes(profileName) {
        if (!profileName) return [];
        try {
            // Updated to use specific exposed API
            const result = await window.electronAPI.listFiles('ai-dna/notes');
            if (result.success && result.files) {
                // Filter by profile name
                // Note: saved artifacts have "profile" field
                const notes = result.files.filter(f =>
                    f.profile === profileName && f.type === 'note'
                );
                // Sort by date/timestamp desc
                return notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
            return [];
        } catch (e) {
            console.error("Failed to load notes", e);
            return [];
        }
    }

    /**
     * Updates an existing note content
     */
    static async updateNote(noteObject, newContent) {
        if (!noteObject || !noteObject._filename) return false;

        try {
            // Update content and timestamp
            const updated = { ...noteObject, content: newContent, updated: Date.now() };
            // Remove internal fields before saving
            const filename = updated._filename;
            const savePath = `ai-dna/notes/${filename}`;

            // Create clean copy for saving
            const toSave = { ...updated };
            delete toSave._filename;
            delete toSave._path;

            const result = await window.electronAPI.saveOutput(savePath, JSON.stringify(toSave, null, 2));
            return result.success;
        } catch (e) {
            console.error("Failed to update note", e);
            return false;
        }
    }
}

// Export globally
window.AiSummaryGenerator = AiSummaryGenerator;

/**
 * Global handler for saving chat message as note
 */
window.saveChatToNote = async (content) => {
    // Get current profile
    const profile = state.sheetData?.rows?.[state.selectedRow];
    if (!profile) {
        alert('Wybierz postać przed zapisaniem notatki.');
        return;
    }

    const name = profile['Imie postaci'] || 'Nieznany';

    // Add toast/log
    if (window.addLog) window.addLog('info', `Zapisuję notatkę dla: ${name}...`);

    const path = await AiSummaryGenerator.saveArtifact(name, 'note', content);

    if (path) {
        if (window.addLog) window.addLog('success', `Notatka zapisana!`);
        // Trigger UI refresh if needed (e.g. reload profile notes section)
        if (window.renderProfileDetails) {
            const container = document.getElementById('ai-profile-details');
            if (container) container.innerHTML = window.renderProfileDetails(profile);
        }
    } else {
        alert('Błąd zapisu notatki.');
    }
};
