const ollamaService = require('./ollama-client'); // Using official ollama npm library
const logger = require('../shared/logger');

class TextCorrectorService {
    constructor() {
        this.defaultModel = 'gemma:2b'; // Preferred small model, fallback to config default
    }

    /**
     * Corrects the given text using a small, fast LLM.
     * @param {string} text - The text to correct.
     * @param {object} options - Options (model, temperature, etc.)
     * @returns {Promise<string>} - The corrected text.
     */
    async correctText(text, options = {}) {
        if (!text || text.trim().length === 0) return text;

        const model = options.model || this.defaultModel;

        logger.info('Correcting text', { length: text.length, model });

        const prompt = `Twoim zadaniem jest poprawienie tekstu po OCR lub szybkiego pisania.
ZASADY:
1. Popraw tylko: literówki, błędy interpunkcyjne, brakujące polskie znaki, oczywiste błędy OCR.
2. NIE ZMIENIAJ stylu, sensu ani słownictwa.
3. Jeśli tekst jest poprawny, zwróć go bez zmian.
4. Zwróć TYLKO poprawiony tekst, bez komentarzy.

TEKST DO POPRAWY:
${text}`;

        try {
            const result = await ollamaService.generateText(prompt, {
                model: model,
                temperature: 0.1, // Low temp for deterministic correction
                num_predict: Math.max(200, text.length * 1.5), // Ensure enough tokens
                system: "Jesteś precyzyjnym korektorem tekstu."
            });

            if (result.success) {
                return result.text.trim();
            } else {
                logger.warn('Text correction failed, returning original', { error: result.error });
                return text;
            }
        } catch (error) {
            logger.error('Text correction exception', { error: error.message });
            return text;
        }
    }
}

module.exports = new TextCorrectorService();
