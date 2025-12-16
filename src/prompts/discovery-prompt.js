/**
 * @module DiscoveryPrompt
 * @description Prompts for Guided Conversation Flow (GCF) stages.
 */

/**
 * Diagnosis Prompt
 * Identifies the user's goal with confidence score.
 */
function buildDiagnosisPrompt({ message, history, profileName }) {
    const historyText = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    return `Analyze the user's intent based on the conversation.
    Target: Character '${profileName}'
    History:
    ${historyText}
    Current Message: "${message}"

    Classify the intent into one of the following GOALS:
    - GENERATE_QUEST (User wants a quest, adventure, mission)
    - UNKNOWN (Unclear, chitchat, or unrelated)

    Output format: STRICT SINGLE WORD (GENERATE_QUEST or UNKNOWN).
    `;
}

/**
 * Extraction Prompt
 * Extracts structured data from user message based on schema.
 */
function buildExtractionPrompt({ schema, message, currentData }) {
    return `Extract data for goal: ${schema.id}.
    Schema Fields:
    ${Object.entries(schema.fields).map(([k, v]) => `- ${k} (${v.type}): ${v.description || ''}`).join('\n')}

    Current context/data: ${JSON.stringify(currentData)}
    User Message: "${message}"

    Rules:
    1. Extract values that match the schema fields.
    2. Normalize values if possible (e.g. synonyms).
    3. Return ONLY valid JSON object with extracted fields.
    `;
}

/**
 * Collection Question Prompt
 * Generates a natural language question for missing fields.
 */
function buildCollectionQuestionPrompt({ schema, missing, currentData }) {
    const missingFieldsDef = missing.map(key => {
        const field = schema.fields[key];
        return `- ${key} (${field.description || field.type})`;
    }).join('\n');

    return `You are a Game Master assistant. The user wants to generate: ${schema.id}.
    
    Collected Data: ${JSON.stringify(currentData)}
    
    MISSING information that you MUST ask for:
    ${missingFieldsDef}

    Task:
    Ask the user a natural, thematic question to gather the missing information.
    Focus on: ${missing.join(', ')}.
    Keep it short (1-2 sentences). Style: Gothic, dark fantasy universe.
    `;
}

/**
 * Confirmation Check
 * Simple analyzer for Yes/No/Cancel
 */
function isConfirmation(message) {
    const lower = message.toLowerCase();
    if (['tak', 'yes', 'dobrze', 'zgoda', 'ok', 'dawaj', 'rób'].some(w => lower.includes(w))) return 'YES';
    if (['nie', 'no', 'błąd', 'zmień', 'czekaj'].some(w => lower.includes(w))) return 'NO';
    return 'UNCLEAR';
}

module.exports = {
    buildDiagnosisPrompt,
    buildExtractionPrompt,
    buildCollectionQuestionPrompt,
    isConfirmation
};
