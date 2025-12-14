/**
 * @module ai-utils
 * @description Helper functions for AI prompt generation and optimization.
 */

// Helper: Get optimized system prompt for specific models
export function getModelSpecificSystemPrompt(modelName) {
    const name = modelName.toLowerCase();

    // Base instruction for language
    const base = "Jesteś pomocnym asystentem AI. Odpowiadaj zawsze w języku polskim.";

    if (name.includes('qwen')) {
        // Qwen likes its Identity but we can translate it or combine it.
        return "Jesteś Qwen, stworzonym przez Alibaba Cloud. " + base;
    }
    if (name.includes('mistral')) {
        // Mistral safe prompt translated + polish enforcement
        return "Zawsze pomagaj z szacunkiem i zgodnie z prawdą. " + base;
    }

    return base;
}

// Helper: Adjust prompt structure for specific models (Optimized for Ollama)
export function applyModelOptimization(promptParts, modelName) {
    const name = modelName.toLowerCase();
    let system = getModelSpecificSystemPrompt(modelName);
    let userContent = '';

    // 1. Build the core content from parts using Polish labels
    if (promptParts.role) system += `\nROLA: ${promptParts.role}`;
    if (promptParts.context) system += `\nKONTEKST: ${promptParts.context}`;
    if (promptParts.dod) system += `\nWYMAGANIA: ${promptParts.dod}`;
    if (promptParts.negative) system += `\nOGRANICZENIA (CZEGO UNIKAĆ): ${promptParts.negative}`;

    if (promptParts.examples) userContent += `PRZYKŁADY (Few-Shot):\n${promptParts.examples}\n\n`;
    if (promptParts.goal) userContent += `CEL/ZADANIE:\n${promptParts.goal}\n\n`;

    if (promptParts.useCoT) {
        userContent += `\nPrzeanalizuj to krok po kroku (Chain of Thought).\n`; // Polish CoT trigger
    }

    return { system, userContent };
}
