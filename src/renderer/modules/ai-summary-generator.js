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
        const filename = `ai-dna/${safeName}_${type}_${date}.json`;

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
                console.log(`✅ AI-DNA saved: ${filename}`);
                // Also save to Session State for immediate UI update access
                this._saveToSession(profileName, type, artifact);
                return result.path;
            }
        } catch (e) {
            console.error("Failed to save AI-DNA", e);
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
}

// Export globally
window.AiSummaryGenerator = AiSummaryGenerator;
