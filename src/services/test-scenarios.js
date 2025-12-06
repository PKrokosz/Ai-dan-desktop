/**
 * @module test-scenarios
 * @description Definicje scenariuszy testowych dla model-testbench
 * Każdy scenariusz testuje różne aspekty modeli LLM
 */

// Przykładowe profile postaci do testowania
const TEST_PROFILES = {
    kopacz_minimalny: {
        'Imie postaci': 'Grim',
        'Gildia': 'Brak',
        'Region': 'Stary Obóz',
        'Wina': 'Kradzież chleba',
        'O postaci': 'Prosty chłop z wioski.',
        'Przyszlosc': 'Przeżyć',
        'Slabosci': 'Tchórzostwo',
        'Umiejetnosci': 'Kopanie'
    },

    straznik_sredni: {
        'Imie postaci': 'Brutus',
        'Gildia': 'Strażnik',
        'Region': 'Stary Obóz',
        'Wina': 'Zabójstwo w afekcie',
        'O postaci': 'Były żołnierz królewski. W aferze zabił szlachcica. Ma kontakty wśród najemników.',
        'Jak zarabiala na zycie, kim byla': 'Dowódca patrolu w armii królewskiej',
        'Przyszlosc': 'Odzyskać honor i wrócić do wojska',
        'Kim chce zostac': 'Magnat - dowódca strażników',
        'Slabosci': 'Wybuchowy temperament, pije za dużo',
        'Umiejetnosci': 'Walka mieczem, dowodzenie, zastraszanie'
    },

    mag_kompletny: {
        'Imie postaci': 'Kaldor',
        'Gildia': 'Mag Wody',
        'Region': 'Nowy Obóz',
        'Wina': 'Nielegalne eksperymenty magiczne',
        'O postaci': 'Były uczeń Krągu Ognia. Został wyrzucony za zakazane rytuały nekromancji. W kolonii szuka artefaktów starych kultur.',
        'Jak zarabiala na zycie, kim byla': 'Adept w Kręgu Ognia',
        'Przyszlosc': 'Odkryć sekret Bariery i wykorzystać ją do własnych celów',
        'Kim chce zostac': 'Arcymistrz sekretnej loży magów',
        'Slabosci': 'Obsesja na punkcie zakazanej wiedzy, arogancja, brak empatii',
        'Umiejetnosci': 'Magia (ognia, wody), rytuały, alchemia, czytanie starożytnych tekstów',
        'Religia': 'Cynizm, manipulowanie kultem Śniącego',
        'Tajne cele': 'Znaleźć Focus do kontrolowania Bariery',
        'Wrogowie': 'Krąg Ognia (za zdradę), Bractwo (za herezję)'
    },

    templariusz_intryga: {
        'Imie postaci': 'Mordred',
        'Gildia': 'Templariusz',
        'Region': 'Bractwo Śniącego',
        'Wina': 'Spisek przeciwko królowi',
        'O postaci': 'Młody szlachcic uwikłany w polityczną intrygę. W kolonii próbuje odbudować władzę przez kult.',
        'Jak zarabiala na zycie, kim byla': 'Dworzanin, szpieg dla wpływowej frakcji',
        'Przyszlosc': 'Zostać Y\'Berionem i rządzić Bractwem z cienia',
        'Slabosci': 'Żądza władzy, skłonność do manipulacji',
        'Umiejetnosci': 'Perswazja, szpiegostwo, walka, znajomość etykiety'
    }
};

// Warianty konfiguracji promptów (iteracje)
const PROMPT_VARIATIONS = {
    minimal: {
        id: 'minimal',
        label: 'Minimalny kontekst',
        contexts: {
            geography: false,
            system: false,
            aspirations: false,
            weaknesses: false,
            quests: false
        },
        style: 'auto',
        temperature: 0.7,
        responseLength: 'short',
        fewShotCount: 0
    },

    standard: {
        id: 'standard',
        label: 'Standardowy (default)',
        contexts: {
            geography: true,
            system: true,
            aspirations: false,
            weaknesses: false,
            quests: true
        },
        style: 'auto',
        temperature: 0.7,
        responseLength: 'medium',
        fewShotCount: 2
    },

    full_context: {
        id: 'full_context',
        label: 'Pełny kontekst',
        contexts: {
            geography: true,
            system: true,
            aspirations: true,
            weaknesses: true,
            quests: true
        },
        style: 'auto',
        temperature: 0.7,
        responseLength: 'long',
        fewShotCount: 3
    },

    creative_high_temp: {
        id: 'creative_high_temp',
        label: 'Kreatywny (temp=1.0)',
        contexts: {
            geography: true,
            system: true,
            aspirations: true,
            weaknesses: false,
            quests: true
        },
        style: 'auto',
        temperature: 1.0,
        responseLength: 'medium',
        fewShotCount: 2
    },

    precise_low_temp: {
        id: 'precise_low_temp',
        label: 'Precyzyjny (temp=0.3)',
        contexts: {
            geography: true,
            system: true,
            aspirations: false,
            weaknesses: false,
            quests: true
        },
        style: 'auto',
        temperature: 0.3,
        responseLength: 'medium',
        fewShotCount: 2
    },

    political_focus: {
        id: 'political_focus',
        label: 'Intryga polityczna',
        contexts: {
            geography: false,
            system: true,
            aspirations: true,
            weaknesses: false,
            quests: true
        },
        style: 'political',
        temperature: 0.7,
        responseLength: 'medium',
        fewShotCount: 2
    }
};

// Definicje scenariuszy testowych
const TEST_SCENARIOS = [
    // === QUEST GENERATION ===
    {
        id: 'main_quest_kopacz',
        name: 'Main Quest - Kopacz (minimalny profil)',
        category: 'quest_generation',
        profile: TEST_PROFILES.kopacz_minimalny,
        commandType: 'main_quest',
        promptVariation: 'standard',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['quest', 'nazwa', 'opis'],
            language: 'pl',
            minLength: 100,
            maxLength: 2000,
            shouldAvoidEnglish: true,
            customChecks: [
                {
                    name: 'has_quest_structure',
                    description: 'Sprawdza czy jest nazwa i opis questu',
                    check: (response) => {
                        const lower = response.toLowerCase();
                        return (lower.includes('nazwa') || lower.includes('quest')) &&
                            lower.includes('opis');
                    }
                }
            ]
        }
    },

    {
        id: 'side_quest_straznik',
        name: 'Side Quest - Strażnik SO',
        category: 'quest_generation',
        profile: TEST_PROFILES.straznik_sredni,
        commandType: 'side_quest',
        promptVariation: 'standard',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['quest', 'zleceniodawca'],
            language: 'pl',
            minLength: 80,
            maxLength: 1500,
            shouldAvoidEnglish: true
        }
    },

    {
        id: 'redemption_quest_full_context',
        name: 'Redemption Quest - Mag (pełny kontekst)',
        category: 'quest_generation',
        profile: TEST_PROFILES.mag_kompletny,
        commandType: 'redemption_quest',
        promptVariation: 'full_context',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['odkupienie', 'wina', 'poświęcenie'],
            language: 'pl',
            minLength: 150,
            maxLength: 3000,
            shouldAvoidEnglish: true
        }
    },

    // === EXTRACTION TASKS ===
    {
        id: 'extract_traits_minimal',
        name: 'Extract Traits - Minimal Context',
        category: 'extraction',
        profile: TEST_PROFILES.kopacz_minimalny,
        commandType: 'extract_traits',
        promptVariation: 'minimal',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['cechy', 'charakter', 'motywacje'],
            language: 'pl',
            minLength: 50,
            maxLength: 800,
            shouldAvoidEnglish: true
        }
    },

    {
        id: 'analyze_relations_mag',
        name: 'Analyze Relations - Mag (pełny profil)',
        category: 'extraction',
        profile: TEST_PROFILES.mag_kompletny,
        commandType: 'analyze_relations',
        promptVariation: 'standard',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['relacje', 'sojusznicy', 'wrogowie'],
            language: 'pl',
            minLength: 100,
            maxLength: 1500,
            shouldAvoidEnglish: true
        }
    },

    // === CREATIVE TASKS ===
    {
        id: 'story_hooks_creative',
        name: 'Story Hooks - Wysoka temperatura',
        category: 'creative',
        profile: TEST_PROFILES.templariusz_intryga,
        commandType: 'story_hooks',
        promptVariation: 'creative_high_temp',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['hook', 'sytuacja'],
            language: 'pl',
            minLength: 100,
            maxLength: 1200,
            shouldAvoidEnglish: true,
            customChecks: [
                {
                    name: 'has_multiple_hooks',
                    description: 'Sprawdza czy są minimum 3 hooki',
                    check: (response) => {
                        // Szukaj numeracji lub nagłówków
                        const numbered = response.match(/[1-3]\./g);
                        return numbered && numbered.length >= 3;
                    }
                }
            ]
        }
    },

    {
        id: 'nickname_generation',
        name: 'Nickname Generation - Kreatywne',
        category: 'creative',
        profile: TEST_PROFILES.straznik_sredni,
        commandType: 'nickname',
        promptVariation: 'creative_high_temp',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['ksyw'],
            language: 'pl',
            minLength: 20,
            maxLength: 300,
            shouldAvoidEnglish: true
        }
    },

    // === ANALYTICAL TASKS ===
    {
        id: 'faction_suggestion_precise',
        name: 'Faction Suggestion - Niska temperatura',
        category: 'analytical',
        profile: TEST_PROFILES.kopacz_minimalny,
        commandType: 'faction_suggestion',
        promptVariation: 'precise_low_temp',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['frakcja', 'dlaczego'],
            language: 'pl',
            minLength: 50,
            maxLength: 500,
            shouldAvoidEnglish: true
        }
    },

    {
        id: 'secret_generation_political',
        name: 'Secret Generation - Styl polityczny',
        category: 'analytical',
        profile: TEST_PROFILES.templariusz_intryga,
        commandType: 'secret',
        promptVariation: 'political_focus',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: ['sekret', 'skrywa'],
            language: 'pl',
            minLength: 80,
            maxLength: 800,
            shouldAvoidEnglish: true
        }
    },

    // === SUMMARIZATION ===
    {
        id: 'summarize_short',
        name: 'Summarize - Maksymalnie zwięźle',
        category: 'summarization',
        profile: TEST_PROFILES.mag_kompletny,
        commandType: 'summarize',
        promptVariation: 'minimal',
        evaluationCriteria: {
            formatType: 'text',
            requiredKeywords: [],
            language: 'pl',
            minLength: 20,
            maxLength: 300,
            shouldAvoidEnglish: true,
            customChecks: [
                {
                    name: 'is_concise',
                    description: 'Sprawdza czy jest maksymalnie 3 zdania',
                    check: (response) => {
                        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
                        return sentences.length <= 3;
                    }
                }
            ]
        }
    }
];

/**
 * Zwraca listę wszystkich dostępnych scenariuszy
 */
function getAllScenarios() {
    return TEST_SCENARIOS;
}

/**
 * Zwraca scenariusze z danej kategorii
 */
function getScenariosByCategory(category) {
    return TEST_SCENARIOS.filter(s => s.category === category);
}

/**
 * Zwraca scenariusz po ID
 */
function getScenarioById(id) {
    return TEST_SCENARIOS.find(s => s.id === id);
}

/**
 * Zwraca konfigurację promptu dla danej wariacji
 */
function getPromptVariation(variationId) {
    return PROMPT_VARIATIONS[variationId] || PROMPT_VARIATIONS.standard;
}

/**
 * Zwraca wszystkie dostępne wariacje promptów
 */
function getAllPromptVariations() {
    return Object.values(PROMPT_VARIATIONS);
}

module.exports = {
    TEST_PROFILES,
    PROMPT_VARIATIONS,
    TEST_SCENARIOS,
    getAllScenarios,
    getScenariosByCategory,
    getScenarioById,
    getPromptVariation,
    getAllPromptVariations
};
