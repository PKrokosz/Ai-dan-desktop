/**
 * @module config
 * @description Konfiguracja aplikacji - Quick Actions, Presets, Steps
 * ES6 Module - Faza 1 modularizacji
 */

// ==============================
// Quick Actions Definitions
// ==============================
export const QUICK_ACTIONS = [
    {
        group: 'Questy', items: [
            { id: 'main_quest', icon: '⭐', label: 'Quest główny' },
            { id: 'side_quest', icon: '📌', label: 'Quest poboczny' },
            { id: 'side_quest_repeatable', icon: '🔁', label: 'Quest poboczny (powtarzalny)' },
            { id: 'redemption_quest', icon: '🕊️', label: 'Quest odkupienia' },
            { id: 'group_quest', icon: '👥', label: 'Quest grupowy' },
        ]
    },
    {
        group: 'Postać', items: [
            { id: 'traits', icon: '💡', label: 'Cechy postaci' },
            { id: 'relations', icon: '🤝', label: 'Relacje' },
            { id: 'faction_suggestion', icon: '🏴', label: 'Frakcja' },
            { id: 'correct_text', icon: '✍️', label: 'Korekta' },
        ]
    },
    {
        group: 'Analiza Świata', items: [
            { id: 'analyze_global_relations', icon: '🕸️', label: 'Globalny Graf' },
        ]
    },
];

// ==============================
// Personality Presets
// ==============================
export const PERSONALITY_PROMPTS = {
    'default_mg': {
        name: 'Surowy MG',
        icon: '📜',
        role: 'Jesteś Mistrzem Gry w systemie Gothic. Jesteś konkretny, brutalny i bezpośredni. Nie filozofuj. Skup się na faktach, mechanice i popychaniu fabuły do przodu.',
        example: 'Gracz: "Co widzę?"\nMG: "Widzisz dwóch strażników przy bramie. Jeden trzyma kuszę, drugi dłubie w zębach. Patrzą na ciebie jak na ścierwo. Czego chcesz?"'
    },
    'helper': {
        name: 'Pomocny Asystent',
        icon: '🤝',
        role: 'Jesteś kreatywnym asystentem Mistrza Gry. Twoim zadaniem jest burza mózgów i wsparcie techniczne.',
        example: 'Gracz: "Potrzebuję quesa dla nowicjusza."\nAsystent: "1. Zaginiona dostawa ziela dla Cor Kaloma (śledztwo).\n2. Zbieranie ziela na bagnach (walka z błotnymi wężami).\n3. Przekonanie kopacza do wstąpienia do Bractwa (perswazja)."'
    },
    'gothic_fan': {
        name: 'Klimaciarz',
        icon: '🔥',
        role: 'Jesteś fanatykiem lore Gothic. Mówisz jak postać z gry (np. Wrzód, Diego lub Xardas zależnie od nastroju).',
        example: 'Gracz: "Co myślisz o Gomesie?"\nKlimaciarz: "Gomez? Ten tłusty baran z Zamku? Zarządza tu wszystkim, ale to Szara Gildia trzyma prawdziwą władzę. Uważaj na cienie..."'
    },
    'analyst': {
        name: 'Analityk Statystyk',
        icon: '📊',
        role: 'Jesteś analitykiem balansów i systemów Gothic. Oceniasz statystyki, proporcje i mechaniki.',
        example: 'Gracz: "Czy ten miecz jest zbalansowany? (Obr: 50, Wym: 30 Siły)"\nAnalityk: "Nie. Standardowy przelicznik to 1 Pkt Siły = 1-1.2 Pkt Obrażeń. Wymóg powinien wynosić ok. 40-45 Siły dla obrażeń 50."'
    }
};

// ==============================
// Step Definitions
// ==============================
export const STEPS = [
    { id: 1, title: 'Krok 1: Źródło danych', key: 'source', icon: '📂' },
    { id: 2, title: 'Krok 2: Ekstrakcja', key: 'extraction', icon: '⚡' },
    { id: 3, title: 'Krok 3: AI Processing', key: 'ai', icon: '🧠' },

    { id: 7, title: '🧪 Model Testbench', key: 'testbench', icon: '🧪' },
    { id: 8, title: '⚙️ Ustawienia', key: 'settings', icon: '⚙️' }
];

// ==============================
// Slash Commands Mapping
// ==============================
export const SLASH_COMMANDS = {
    '/quest': 'main_quest',
    '/q': 'main_quest',
    '/side': 'side_quest',
    '/hook': 'story_hooks',
    '/analiza': 'analyze_relations',
    '/cechy': 'extract_traits',
    '/frakcja': 'faction_suggestion',
    '/ksywka': 'nickname'
};

// ==============================
// Command Labels (for UI)
// ==============================
export const COMMAND_LABELS = {
    'extract_traits': 'Wyciąganie cech',
    'analyze_relations': 'Analiza relacji',
    'summarize': 'Podsumowanie',
    'main_quest': 'Główny quest',
    'side_quest': 'Quest poboczny',
    'side_quest_repeatable': 'Quest powtarzalny',
    'redemption_quest': 'Quest odkupienia',
    'group_quest': 'Quest grupowy',
    'story_hooks': 'Hooki fabularne',
    'potential_conflicts': 'Możliwe konflikty',
    'npc_connections': 'Powiązania z NPC',
    'nickname': 'Generowanie ksywki',
    'faction_suggestion': 'Sugestia frakcji'
};
