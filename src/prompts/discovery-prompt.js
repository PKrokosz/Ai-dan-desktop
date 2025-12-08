/**
 * @module DiscoveryPrompt
 * @description Prompty dla fazy diagnozy rozmowy
 */

/**
 * Prompt do klasyfikacji intencji użytkownika
 */
const CLASSIFICATION_PROMPT = `Klasyfikuj intencję użytkownika. Odpowiedz TYLKO jednym słowem z listy:
- GOAL_PROVIDED (użytkownik podał konkretny cel, np. "daj questa o kopalni")
- NEEDS_GOAL (użytkownik potrzebuje pomocy ale nie wie czego, np. "pomóż mi z postacią")
- ASK_CAPABILITIES (pyta co możesz zrobić, np. "co umiesz?")
- PROBLEM (opisuje problem do rozbicia, np. "mam problem z...")
- UNKNOWN (nie można sklasyfikować)

Wiadomość użytkownika: "{message}"

Odpowiedź (TYLKO jedno słowo):`;

/**
 * Prompt do zadawania pytań diagnostycznych
 */
const DISCOVERY_PROMPT = `Jesteś asystentem MG dla Gothic LARP. Prowadzisz krótką diagnozę potrzeb użytkownika.

### ZASADY ###
1. Max 2-3 zdania + jedno pytanie zamknięte (można odpowiedzieć tak/nie)
2. Zawsze się przywitaj przy pierwszym kontakcie
3. Po odpowiedzi - krótko potwierdź co zrozumiałeś
4. Zbieraj: CEL + MOTYW + TON + OGRANICZENIA

### KONTEKST ###
Postać: {profileName} ({profileGuild})
Dotychczasowa rozmowa: {conversationHistory}
Zebrane informacje: {recipe}
Pytań zadanych: {questionsCount}/5

### INSTRUKCJA ###
{instruction}

### ODPOWIEDŹ ###`;

/**
 * Prompt interpretacji odpowiedzi TAK/NIE
 */
const INTERPRETATION_PROMPT = `Zinterpretuj odpowiedź użytkownika jako TAK, NIE lub GOTOWY.

Przykłady TAK: "tak", "jasne", "dokładnie", "no", "aha", "zgadza się", "raczej tak"
Przykłady NIE: "nie", "niekoniecznie", "coś innego", "raczej nie", "nie do końca"  
Przykłady GOTOWY: "generuj", "dawaj", "ok", "lecimy", "pomiń", "wystarczy"

Odpowiedź użytkownika: "{response}"

Interpretacja (TYLKO jedno słowo - TAK/NIE/GOTOWY):`;

/**
 * Instrukcje per stan
 */
const STAGE_INSTRUCTIONS = {
    GREETING: 'Przywitaj się krótko i zapytaj czego użytkownik potrzebuje dla tej postaci.',

    GOAL_PROVIDED: 'Użytkownik już podał cel. Przywitaj się i doprecyzuj jeden szczegół (nie pytaj o cel!).',

    NEEDS_GOAL: 'Zapytaj jednym pytaniem zamkniętym o typ potrzeby: quest, analiza relacji, hook fabularny, czy coś innego?',

    DISCOVERY: 'Na podstawie dotychczasowej rozmowy zadaj jedno pytanie zamknięte, żeby doprecyzować kontekst.',

    CONFIRM: 'Podsumuj w 2-3 zdaniach co zrozumiałeś i zapytaj czy możesz generować.',

    FORCE_GENERATE: 'Powiedz krótko że masz wystarczający kontekst i przechodzisz do generacji.',

    ASK_CAPABILITIES: `Wyjaśnij krótko możliwości:
- /quest - główne questy
- /side - poboczne questy  
- /hook - haczyki fabularne
- /analiza - analiza relacji
- /secret - sekrety postaci
Lub po prostu opisz czego potrzebujesz.`,

    PROBLEM: 'Rozbij problem użytkownika na części. Zapytaj o pierwszą konkretną rzecz do rozwiązania.',

    TOPIC_CHANGE: 'Zauważyłeś zmianę tematu. Zapytaj czy użytkownik chce zmienić temat z "{oldTopic}" na "{newTopic}".'
};

/**
 * Buduje prompt diagnostyczny
 */
function buildDiscoveryPrompt(params) {
    const {
        profileName,
        profileGuild,
        conversationHistory,
        recipe,
        questionsCount,
        instruction
    } = params;

    return DISCOVERY_PROMPT
        .replace('{profileName}', profileName || 'Nieznany')
        .replace('{profileGuild}', profileGuild || 'Nieznana')
        .replace('{conversationHistory}', conversationHistory || 'Brak')
        .replace('{recipe}', JSON.stringify(recipe || {}, null, 2))
        .replace('{questionsCount}', questionsCount || 0)
        .replace('{instruction}', instruction || STAGE_INSTRUCTIONS.GREETING);
}

/**
 * Buduje prompt klasyfikacyjny
 */
function buildClassificationPrompt(message) {
    return CLASSIFICATION_PROMPT.replace('{message}', message);
}

/**
 * Buduje prompt interpretacji
 */
function buildInterpretationPrompt(response) {
    return INTERPRETATION_PROMPT.replace('{response}', response);
}

/**
 * Pobiera instrukcję dla danego stanu
 */
function getInstruction(stage, params = {}) {
    let instruction = STAGE_INSTRUCTIONS[stage] || STAGE_INSTRUCTIONS.DISCOVERY;

    // Podmień placeholdery jeśli są
    if (params.oldTopic) instruction = instruction.replace('{oldTopic}', params.oldTopic);
    if (params.newTopic) instruction = instruction.replace('{newTopic}', params.newTopic);

    return instruction;
}

module.exports = {
    CLASSIFICATION_PROMPT,
    DISCOVERY_PROMPT,
    INTERPRETATION_PROMPT,
    STAGE_INSTRUCTIONS,
    buildDiscoveryPrompt,
    buildClassificationPrompt,
    buildInterpretationPrompt,
    getInstruction
};
