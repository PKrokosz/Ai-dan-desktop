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
            { id: 'secret', icon: '🤫', label: 'Sekret' },
            { id: 'correct_text', icon: '✍️', label: 'Korekta' },
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
        role: 'Jesteś Mistrzem Gry w systemie Gothic. Jesteś bezstronnym narratorem brutalnego świata.',
        example: 'Gracz: "Gdzie znajdę miecz?"\nMG: "W Starym Obozie handluje nimi Fisk. Ale za darmo nic nie dostaniesz, kopaczu. Masz rudę?"'
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
    { id: 1, title: 'Krok 1: Źródło danych', key: 'source' },
    { id: 2, title: 'Krok 2: Ekstrakcja', key: 'extraction' },
    { id: 3, title: 'Krok 3: AI Processing', key: 'ai' },
    { id: 4, title: 'Krok 4: Scalanie', key: 'merge' },
    { id: 5, title: 'Krok 5: Generowanie questów', key: 'quests' },
    { id: 6, title: 'Krok 6: Eksport', key: 'export' }
];

// ==============================
// Slash Commands Mapping
// ==============================
export const SLASH_COMMANDS = {
    '/quest': 'quest_main',
    '/q': 'quest_main',
    '/side': 'side_quest',
    '/hook': 'story_hooks',
    '/secret': 'secret',
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
    'redemption_quest': 'Quest odkupienia',
    'group_quest': 'Quest grupowy',
    'story_hooks': 'Hooki fabularne',
    'potential_conflicts': 'Możliwe konflikty',
    'npc_connections': 'Powiązania z NPC',
    'nickname': 'Generowanie ksywki',
    'faction_suggestion': 'Sugestia frakcji',
    'secret': 'Wymyślanie sekretu'
};
