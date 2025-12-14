/**
 * Unit Tests for prompt-builder.js
 * Tests validation functions and prompt building
 */

const {
    validatePromptInput,
    validateProfile,
    PROMPT_LIMITS,
    buildPrompt,
    getCommandInstruction,
    detectStyleFromProfile
} = require('../src/prompts/prompt-builder');

describe('Prompt Validation', () => {
    describe('validatePromptInput', () => {
        test('should reject null input', () => {
            const result = validatePromptInput(null);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Brak');
        });

        test('should reject undefined input', () => {
            const result = validatePromptInput(undefined);
            expect(result.valid).toBe(false);
        });

        test('should reject non-string input', () => {
            const result = validatePromptInput(123);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('tekstem');
        });

        test('should reject too short input', () => {
            const result = validatePromptInput('ab');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('krótki');
        });

        test('should reject too long input', () => {
            const longText = 'a'.repeat(PROMPT_LIMITS.MAX_CUSTOM_PROMPT + 1);
            const result = validatePromptInput(longText);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('długi');
        });

        test('should accept valid input', () => {
            const result = validatePromptInput('Opisz postać Gomeza');
            expect(result.valid).toBe(true);
            expect(result.text).toBe('Opisz postać Gomeza');
        });

        test('should trim whitespace', () => {
            const result = validatePromptInput('  test prompt  ');
            expect(result.valid).toBe(true);
            expect(result.text).toBe('test prompt');
        });

        test('should remove null bytes', () => {
            const result = validatePromptInput('test\x00prompt');
            expect(result.valid).toBe(true);
            expect(result.text).toBe('testprompt');
        });

        test('should respect custom maxLength', () => {
            const result = validatePromptInput('12345678901', 10);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('10');
        });
    });

    describe('validateProfile', () => {
        test('should reject null profile', () => {
            const result = validateProfile(null);
            expect(result.valid).toBe(false);
        });

        test('should reject empty object', () => {
            const result = validateProfile({});
            expect(result.valid).toBe(false);
            expect(result.error).toContain('wymaganych danych');
        });

        test('should accept profile with name', () => {
            const result = validateProfile({ 'Imie postaci': 'Gomez' });
            expect(result.valid).toBe(true);
        });

        test('should accept profile with description', () => {
            const result = validateProfile({ 'O postaci': 'Magnat kopalni' });
            expect(result.valid).toBe(true);
        });

        test('should reject profile with too long field', () => {
            const result = validateProfile({
                'Imie postaci': 'Gomez',
                'O postaci': 'a'.repeat(PROMPT_LIMITS.MAX_PROFILE_FIELD + 1)
            });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('przekracza limit');
        });
    });
});

describe('Command Instructions', () => {
    test('should return instruction for main_quest', () => {
        const instruction = getCommandInstruction('main_quest');
        expect(instruction).toContain('GŁÓWNY QUEST');
    });

    test('should return instruction for summarize', () => {
        const instruction = getCommandInstruction('summarize');
        expect(instruction).toContain('3 zdania');
    });

    test('should return default for unknown command', () => {
        const instruction = getCommandInstruction('unknown_command');
        expect(instruction).toBeTruthy();
    });

    test('should return summarize fallback for custom command (empty string is falsy)', () => {
        const instruction = getCommandInstruction('custom');
        // Note: custom returns '' but || operator causes fallback to summarize
        expect(instruction).toContain('Podsumuj');
    });
});

describe('Style Detection', () => {
    test('should detect political style from keyword szpieg', () => {
        const profile = { 'O postaci': 'Szpieg i sabotażysta' };
        const style = detectStyleFromProfile(profile);
        expect(style).toBe('political');
    });

    test('should detect mystical style from keyword magia', () => {
        const profile = { 'O postaci': 'Studiuję magię i rytuały' };
        const style = detectStyleFromProfile(profile);
        expect(style).toBe('mystical');
    });

    test('should default to personal style when no keywords match', () => {
        const profile = { 'O postaci': 'Zwykły górnik kopie rudę' };
        const style = detectStyleFromProfile(profile);
        expect(style).toBe('personal');
    });
});

describe('PROMPT_LIMITS', () => {
    test('should have MIN_LENGTH defined', () => {
        expect(PROMPT_LIMITS.MIN_LENGTH).toBeGreaterThan(0);
    });

    test('should have MAX_CUSTOM_PROMPT defined', () => {
        expect(PROMPT_LIMITS.MAX_CUSTOM_PROMPT).toBeGreaterThan(1000);
    });

    test('should have MAX_PROFILE_FIELD defined', () => {
        expect(PROMPT_LIMITS.MAX_PROFILE_FIELD).toBeGreaterThan(100);
    });
});
