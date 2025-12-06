/**
 * Profile Merge Module
 * Aggregates outputs from all 6 AI-processed lanes into unified profile
 * Based on reduce_profile_from_lanes from original workflow
 */

const logger = require('../shared/logger');
const { getTraceId } = require('../shared/tracing');
const { toArray, uniq, isBlank, coalesce } = require('../shared/helpers');

/**
 * Merge results from all lanes into a unified character profile
 * @param {Object[]} laneResults - Array of lane processing results
 * @returns {Object} Unified profile
 */
function mergeProfile(laneResults) {
    const traceId = getTraceId();
    logger.info('Merging profile from lanes', { traceId, laneCount: laneResults.length });

    // Initialize accumulator with empty structure
    const acc = {
        core_identity: {
            character_name: null,
            status_class: null,
            current_group_band: null,
            home_region: null,
            short_description: null,
            keywords: []
        },
        biography_and_traits: {
            key_past_events: [],
            survival_skills_methods: null,
            personal_goals_short_term: [],
            personal_goals_long_term: [],
            regional_lore_knowledge: []
        },
        mechanical_links: {
            declared_skills: [],
            declared_weaknesses: [],
            phobias_or_triggers: []
        },
        narrative_hooks: {
            major_conflicts: [],
            potential_story_arcs: [],
            specific_quests_tasks: []
        },
        relationships: {
            allies_friends: [],
            enemies_antagonists: [],
            neutral_contacts: []
        }
    };

    /**
     * Merge source object into destination, skipping blank values
     */
    function mergeNoBlank(dst, src) {
        if (!src || typeof src !== 'object') return;

        for (const [key, val] of Object.entries(src)) {
            if (val == null) continue;

            if (Array.isArray(val)) {
                if (!Array.isArray(dst[key])) dst[key] = [];
                dst[key] = dst[key].concat(val);
            } else if (typeof val === 'object') {
                if (!dst[key] || typeof dst[key] !== 'object') dst[key] = {};
                mergeNoBlank(dst[key], val);
            } else if (!isBlank(val)) {
                dst[key] = coalesce(dst[key], val);
            }
        }
    }

    // Process each lane result
    for (const item of laneResults) {
        let data = item.result || item.output || item;

        // Handle nested response structures from LLM
        if (data?.response?.generations?.[0]?.[0]?.text) {
            try {
                data = JSON.parse(data.response.generations[0][0].text);
            } catch (e) {
                logger.warn('Failed to parse nested LLM response', { traceId });
            }
        }

        // Merge each section
        if (data.core_identity) {
            // Handle keywords specially - always concat arrays
            if (data.core_identity.keywords) {
                acc.core_identity.keywords = acc.core_identity.keywords.concat(
                    toArray(data.core_identity.keywords)
                );
                delete data.core_identity.keywords;
            }
            mergeNoBlank(acc.core_identity, data.core_identity);
        }

        if (data.biography_and_traits) {
            mergeNoBlank(acc.biography_and_traits, data.biography_and_traits);
        }

        if (data.mechanical_links) {
            mergeNoBlank(acc.mechanical_links, data.mechanical_links);
        }

        if (data.narrative_hooks) {
            // Concat arrays for hooks
            if (data.narrative_hooks.major_conflicts) {
                acc.narrative_hooks.major_conflicts = acc.narrative_hooks.major_conflicts.concat(
                    toArray(data.narrative_hooks.major_conflicts)
                );
            }
            if (data.narrative_hooks.potential_story_arcs) {
                acc.narrative_hooks.potential_story_arcs = acc.narrative_hooks.potential_story_arcs.concat(
                    toArray(data.narrative_hooks.potential_story_arcs)
                );
            }
            if (data.narrative_hooks.specific_quests_tasks) {
                acc.narrative_hooks.specific_quests_tasks = acc.narrative_hooks.specific_quests_tasks.concat(
                    toArray(data.narrative_hooks.specific_quests_tasks)
                );
            }
        }

        if (data.relationships) {
            if (data.relationships.allies_friends) {
                acc.relationships.allies_friends = acc.relationships.allies_friends.concat(
                    toArray(data.relationships.allies_friends)
                );
            }
            if (data.relationships.enemies_antagonists) {
                acc.relationships.enemies_antagonists = acc.relationships.enemies_antagonists.concat(
                    toArray(data.relationships.enemies_antagonists)
                );
            }
            if (data.relationships.neutral_contacts) {
                acc.relationships.neutral_contacts = acc.relationships.neutral_contacts.concat(
                    toArray(data.relationships.neutral_contacts)
                );
            }
        }
    }

    // Post-process: deduplicate arrays
    acc.core_identity.keywords = uniq(acc.core_identity.keywords);
    acc.biography_and_traits.key_past_events = uniq(acc.biography_and_traits.key_past_events);
    acc.biography_and_traits.personal_goals_short_term = uniq(acc.biography_and_traits.personal_goals_short_term);
    acc.biography_and_traits.personal_goals_long_term = uniq(acc.biography_and_traits.personal_goals_long_term);
    acc.mechanical_links.declared_skills = uniq(acc.mechanical_links.declared_skills);
    acc.mechanical_links.declared_weaknesses = uniq(acc.mechanical_links.declared_weaknesses);
    acc.narrative_hooks.major_conflicts = uniq(acc.narrative_hooks.major_conflicts.map(c =>
        typeof c === 'string' ? c : c?.title || JSON.stringify(c)
    ));

    logger.info('Profile merged successfully', {
        traceId,
        characterName: acc.core_identity.character_name,
        keywordsCount: acc.core_identity.keywords.length,
        relationsCount: acc.relationships.allies_friends.length + acc.relationships.enemies_antagonists.length
    });

    return acc;
}

/**
 * Apply heuristic seeding for missing quests
 * Based on Heurystyczny seeder from original workflow
 */
function seedQuests(profile) {
    const traceId = getTraceId();
    const seeded = [];

    // From short-term goals
    toArray(profile.biography_and_traits?.personal_goals_short_term).forEach(goal => {
        const title = typeof goal === 'string' ? goal : (goal?.title || 'Cel krótkoterminowy');
        seeded.push({
            quest_name: `Zrób krok w stronę: ${title}`,
            description: 'Zadanie powiązane bezpośrednio z osobistym celem. Wymaga 1–2 konkretnych działań w obozie.',
            client: null,
            involved_factions: [],
            required_items: [],
            potential_reward: 'zaufanie / reputacja'
        });
    });

    // From conflicts
    toArray(profile.narrative_hooks?.major_conflicts).forEach(conflict => {
        const label = typeof conflict === 'string' ? conflict : (conflict?.title || 'Konflikt');
        seeded.push({
            quest_name: `Rozsupłaj konflikt: ${label}`,
            description: 'Zidentyfikuj strony sporu, zbierz świadectwa i zaproponuj rozwiązanie akceptowalne dla obu stron.',
            client: '[insert mediator or overseer]',
            involved_factions: [],
            required_items: [],
            potential_reward: 'spokój w sektorze / przychylność straży'
        });
    });

    // From enemies
    toArray(profile.relationships?.enemies_antagonists).forEach(enemy => {
        const name = typeof enemy === 'string' ? enemy : (enemy?.name || 'antagonista');
        seeded.push({
            quest_name: `Zmierzyć się z ${name} bez eskalacji`,
            description: 'Zdobądź informacje, szukaj świadków, znajdź sposób na ograniczenie szkód bez otwartej bójki.',
            client: '[insert guard or elder]',
            involved_factions: [],
            required_items: [],
            potential_reward: 'bezpieczeństwo / dostęp do zasobów'
        });
    });

    if (seeded.length > 0) {
        logger.info('Seeded heuristic quests', { traceId, count: seeded.length });

        if (!profile.narrative_hooks) {
            profile.narrative_hooks = {};
        }
        profile.narrative_hooks.specific_quests_tasks = (
            profile.narrative_hooks.specific_quests_tasks || []
        ).concat(seeded);
    }

    return profile;
}

module.exports = {
    mergeProfile,
    seedQuests
};
