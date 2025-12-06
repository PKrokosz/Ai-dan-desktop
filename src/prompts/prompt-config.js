/**
 * @module prompt-config
 * @description Konfiguracja kontekstów i stylów dla prompt buildera
 */

// Definicje kontekstów dokumentów
const CONTEXTS = {
    geography: {
        id: 'geography',
        file: 'geography.txt',
        label: '🌍 Geografia i Lore',
        description: 'Krainy, lokacje, Barieria, Khorinis',
        maxTokens: 2000
    },
    system: {
        id: 'system',
        file: 'system.txt',
        label: '⚖️ System i Frakcje',
        description: 'Hierarchia, zasady, mechaniki, relacje',
        maxTokens: 4000
    },
    aspirations: {
        id: 'aspirations',
        file: 'aspirations.txt',
        label: '🎯 Intrygi i Ambicje',
        description: 'Aspiracje szczegółowe dla klas i frakcji',
        maxTokens: 2500
    },
    weaknesses: {
        id: 'weaknesses',
        file: 'weaknesses.txt',
        label: '⚠️ Słabości i Zagrożenia',
        description: 'Nałogi, traumy, pułapki systemu',
        maxTokens: 1800
    },
    quests: {
        id: 'quests',
        file: 'quests.txt',
        label: '📜 Schematy Questów',
        description: '100 wzorców w 4 stylach narracyjnych',
        maxTokens: 6000
    }
};

// Style narracyjne (mapują do zakresów schematów questów)
const STYLES = {
    political: {
        id: 'political',
        label: '🕵️ Intryga Polityczna',
        description: 'Szpiegostwo, manipulacja, negocjacje',
        questRange: [1, 25],
        keywords: ['szpieg', 'tajny', 'negocjacje', 'sojusz', 'zdrada', 'sabotaż']
    },
    mystical: {
        id: 'mystical',
        label: '🔮 Magia i Kulty',
        description: 'Artefakty, rytuały, wiara, Śniący',
        questRange: [26, 50],
        keywords: ['magia', 'rytuał', 'artefakt', 'wizja', 'Śniący', 'zwój']
    },
    personal: {
        id: 'personal',
        label: '💰 Osobiste Cele',
        description: 'Awans, zemsta, bogactwo, status',
        questRange: [51, 75],
        keywords: ['zemsta', 'awans', 'bogactwo', 'dług', 'honor', 'status']
    },
    action: {
        id: 'action',
        label: '⚔️ Akcja i Przetrwanie',
        description: 'Walka, kopalnia, rzemiosło, przetrwanie',
        questRange: [76, 100],
        keywords: ['walka', 'kopalnia', 'polowanie', 'patrol', 'transport', 'arena']
    },
    auto: {
        id: 'auto',
        label: '🎲 Automatyczny',
        description: 'AI dobiera styl na podstawie profilu postaci',
        questRange: [1, 100],
        keywords: []
    }
};

// Parametry domyślne
const DEFAULT_CONFIG = {
    contexts: {
        geography: true,
        system: true,
        aspirations: false,
        weaknesses: false,
        quests: true
    },
    style: 'auto',
    temperature: 0.7,
    responseLength: 'medium', // 'short' | 'medium' | 'long'
    usePlaceholders: true,
    fewShotCount: 2,
    focus: {
        faction: null,  // 'SO' | 'NO' | 'BS' | null
        rank: null,     // 'Kopacz' | 'Cień' | 'Strażnik' | etc.
        theme: null     // 'zemsta' | 'awans' | 'bogactwo' | etc.
    }
};

// Mapowanie frakcji
const FACTIONS = {
    SO: { label: 'Stary Obóz', ranks: ['Kopacz', 'Cień', 'Strażnik', 'Magnat', 'Służący'] },
    NO: { label: 'Nowy Obóz', ranks: ['Szkodnik', 'Najemnik', 'Mag Wody'] },
    BS: { label: 'Bractwo Śniącego', ranks: ['Nowicjusz', 'Templariusz', 'Guru'] }
};

// Motywy przewodnie
const THEMES = [
    { id: 'revenge', label: '🗡️ Zemsta' },
    { id: 'wealth', label: '💰 Bogactwo' },
    { id: 'power', label: '👑 Władza' },
    { id: 'escape', label: '🚪 Ucieczka' },
    { id: 'redemption', label: '⚖️ Odkupienie' },
    { id: 'knowledge', label: '📚 Wiedza' },
    { id: 'survival', label: '🛡️ Przetrwanie' }
];

module.exports = {
    CONTEXTS,
    STYLES,
    DEFAULT_CONFIG,
    FACTIONS,
    THEMES
};
