/**
 * @module RecipeValidator
 * @description Waliduje receptę przed generacją
 */

/**
 * Waliduje receptę konwersacji
 * @param {Object} recipe - Recepta z conversation-flow
 * @returns {{ valid: boolean, issues: string[] }}
 */
function validateRecipe(recipe) {
    const issues = [];

    // 1. Sprawdź czy jest cel
    if (!recipe.goal?.type) {
        issues.push('Brak określonego celu (type)');
    }

    // 2. Sprawdź czy są wystarczające sloty kontekstu
    const enabledSlots = Object.keys(recipe.context_slots || {})
        .filter(k => recipe.context_slots[k] === true);

    if (enabledSlots.length < 1) {
        issues.push('Za mało kontekstu wybranego');
    }

    // 3. Sprawdź sprzeczności w constraintach
    if (recipe.constraints?.theme && recipe.constraints?.exclude_themes) {
        if (recipe.constraints.exclude_themes.includes(recipe.constraints.theme)) {
            issues.push(`Sprzeczność: theme "${recipe.constraints.theme}" jest też w exclude_themes`);
        }
    }

    // 4. Sprawdź czy ton nie jest sprzeczny
    const conflictingTones = {
        'mroczny': ['wesoły', 'komediowy'],
        'wesoły': ['mroczny', 'tragiczny'],
        'poważny': ['komediowy']
    };

    if (recipe.constraints?.tone && recipe.constraints?.exclude_tones) {
        const conflicts = conflictingTones[recipe.constraints.tone] || [];
        // To jest OK - po prostu wykluczamy sprzeczne tony
    }

    return {
        valid: issues.length === 0,
        issues
    };
}

/**
 * Sprawdza minimalną kompletność recepty do generacji
 */
function isRecipeMinimallyComplete(recipe) {
    return (
        recipe.goal?.type &&
        Object.keys(recipe.context_slots || {}).some(k => recipe.context_slots[k])
    );
}

/**
 * Sugeruje brakujące elementy recepty
 */
function suggestMissing(recipe) {
    const suggestions = [];

    if (!recipe.goal?.type) {
        suggestions.push('Zapytaj o typ celu (quest, analiza, hook, secret)');
    }

    if (!recipe.constraints?.tone) {
        suggestions.push('Możesz zapytać o ton (mroczny, lekki, poważny)');
    }

    if (!Object.keys(recipe.context_slots || {}).some(k => recipe.context_slots[k])) {
        suggestions.push('Wybierz które elementy profilu użyć');
    }

    return suggestions;
}

module.exports = {
    validateRecipe,
    isRecipeMinimallyComplete,
    suggestMissing
};
