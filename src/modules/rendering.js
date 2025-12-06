/**
 * HTML Rendering Module
 * Generates dark gothic themed HTML cards for character profiles
 * Based on rendering nodes from original workflow
 */

const fs = require('fs');
const path = require('path');
const logger = require('../shared/logger');
const { getTraceId } = require('../shared/tracing');
const config = require('../shared/config');

/**
 * Dark gothic CSS (embedded)
 */
const GOTHIC_CSS = `
<style>
:root {
  --bg-dark: #0e0c09;
  --bg-panel: linear-gradient(180deg, rgba(184,138,43,0.05), transparent 50%), #15120e;
  --text: #f2e5b5;
  --text-muted: #d6c48a;
  --gold: #b88a2b;
  --gold-bright: #f4d95f;
  --border: rgba(244,217,95,0.25);
  --shadow: 0 8px 32px rgba(0,0,0,0.5);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
  background: var(--bg-dark); 
  color: var(--text); 
  font-family: 'Segoe UI', system-ui, sans-serif;
  line-height: 1.6;
  padding: 40px;
}
.card {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: var(--shadow);
}
.card-title {
  font-size: 1.5em;
  color: var(--gold-bright);
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}
.section { margin-bottom: 20px; }
.section-title {
  font-size: 1.1em;
  color: var(--gold);
  margin-bottom: 10px;
}
.value { color: var(--text-muted); }
.tag {
  display: inline-block;
  background: rgba(184,138,43,0.2);
  color: var(--gold);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.85em;
  margin: 3px;
}
.quest-card {
  background: rgba(0,0,0,0.3);
  border-left: 3px solid var(--gold);
  padding: 15px;
  margin: 10px 0;
  border-radius: 0 8px 8px 0;
}
.quest-title { color: var(--gold-bright); font-weight: 600; }
.missing-item {
  background: rgba(200,50,50,0.15);
  border-left: 3px solid #c94a4a;
  padding: 10px 15px;
  margin: 8px 0;
  border-radius: 0 6px 6px 0;
  color: #f2a5a5;
}
.relation {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.relation-name { color: var(--gold-bright); min-width: 120px; }
.relation-desc { color: var(--text-muted); font-size: 0.9em; }
ul { list-style: none; }
li { padding: 5px 0; padding-left: 20px; position: relative; }
li::before { content: '▹'; position: absolute; left: 0; color: var(--gold); }
</style>
`;

/**
 * Render character profile as HTML card
 */
function renderProfileCard(profile) {
    const name = profile.core_identity?.character_name || 'Nieznana postać';
    const description = profile.core_identity?.short_description || '';
    const keywords = profile.core_identity?.keywords || [];
    const region = profile.core_identity?.home_region || '';
    const status = profile.core_identity?.status_class || '';

    const pastEvents = profile.biography_and_traits?.key_past_events || [];
    const goalsShort = profile.biography_and_traits?.personal_goals_short_term || [];
    const goalsLong = profile.biography_and_traits?.personal_goals_long_term || [];

    const skills = profile.mechanical_links?.declared_skills || [];
    const weaknesses = profile.mechanical_links?.declared_weaknesses || [];

    const allies = profile.relationships?.allies_friends || [];
    const enemies = profile.relationships?.enemies_antagonists || [];

    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>${name} - Profil Postaci</title>
  ${GOTHIC_CSS}
</head>
<body>
  <div class="card">
    <h1 class="card-title">⚔️ ${name}</h1>
    
    ${description ? `<p class="value" style="font-size: 1.1em; margin-bottom: 20px;">${description}</p>` : ''}
    
    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
      ${status ? `<div class="tag">🏛️ ${status}</div>` : ''}
      ${region ? `<div class="tag">📍 ${region}</div>` : ''}
    </div>
    
    ${keywords.length > 0 ? `
    <div class="section">
      <div class="section-title">Słowa kluczowe</div>
      <div>${keywords.map(k => `<span class="tag">${k}</span>`).join('')}</div>
    </div>
    ` : ''}
    
    ${pastEvents.length > 0 ? `
    <div class="section">
      <div class="section-title">📜 Historia</div>
      <ul>${pastEvents.map(e => `<li>${typeof e === 'string' ? e : e.title || JSON.stringify(e)}</li>`).join('')}</ul>
    </div>
    ` : ''}
    
    ${goalsShort.length > 0 || goalsLong.length > 0 ? `
    <div class="section">
      <div class="section-title">🎯 Cele</div>
      ${goalsShort.length > 0 ? `<p style="color: var(--text-muted);">Krótkoterminowe:</p><ul>${goalsShort.map(g => `<li>${typeof g === 'string' ? g : g.title || JSON.stringify(g)}</li>`).join('')}</ul>` : ''}
      ${goalsLong.length > 0 ? `<p style="color: var(--text-muted); margin-top: 10px;">Długoterminowe:</p><ul>${goalsLong.map(g => `<li>${typeof g === 'string' ? g : g.title || JSON.stringify(g)}</li>`).join('')}</ul>` : ''}
    </div>
    ` : ''}
    
    ${skills.length > 0 ? `
    <div class="section">
      <div class="section-title">⚡ Umiejętności</div>
      <div>${skills.map(s => `<span class="tag">${s}</span>`).join('')}</div>
    </div>
    ` : ''}
    
    ${weaknesses.length > 0 ? `
    <div class="section">
      <div class="section-title">💔 Słabości</div>
      <ul>${weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
    </div>
    ` : ''}
    
    ${allies.length > 0 ? `
    <div class="section">
      <div class="section-title">🤝 Sojusznicy</div>
      ${allies.map(a => `
        <div class="relation">
          <span class="relation-name">${typeof a === 'string' ? a : a.name || 'Nieznany'}</span>
          <span class="relation-desc">${typeof a === 'object' && a.description ? a.description : ''}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${enemies.length > 0 ? `
    <div class="section">
      <div class="section-title">⚔️ Wrogowie</div>
      ${enemies.map(e => `
        <div class="relation">
          <span class="relation-name">${typeof e === 'string' ? e : e.name || 'Nieznany'}</span>
          <span class="relation-desc">${typeof e === 'object' && e.description ? e.description : ''}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Render quests as HTML card
 */
function renderQuestsCard(profile, quests = []) {
    const name = profile.core_identity?.character_name || 'Nieznana postać';
    const allQuests = quests.length > 0
        ? quests
        : (profile.narrative_hooks?.specific_quests_tasks || []);

    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>${name} - Questy</title>
  ${GOTHIC_CSS}
</head>
<body>
  <div class="card">
    <h1 class="card-title">📋 Questy dla: ${name}</h1>
    
    ${allQuests.length > 0 ? allQuests.map((q, i) => `
      <div class="quest-card">
        <div class="quest-title">${i + 1}. ${q.quest_name || q.title || 'Quest'}</div>
        <p class="value" style="margin: 10px 0;">${q.description || q.synopsis || ''}</p>
        ${q.potential_reward ? `<div class="tag">🎁 ${q.potential_reward}</div>` : ''}
      </div>
    `).join('') : '<p class="value">Brak questów do wyświetlenia.</p>'}
  </div>
</body>
</html>`;
}

/**
 * Save all HTML cards to output folder
 */
async function saveCards(profile, quests = []) {
    const traceId = getTraceId();
    const outputDir = path.resolve(config.output.path);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const characterName = (profile.core_identity?.character_name || 'unknown')
        .replace(/[^a-zA-Z0-9ąęóżźćńłśĄĘÓŻŹĆŃŁŚ]/g, '_')
        .toLowerCase();
    const timestamp = Date.now();

    // Save profile card
    const profilePath = path.join(outputDir, `${characterName}_profile_${timestamp}.html`);
    fs.writeFileSync(profilePath, renderProfileCard(profile), 'utf-8');
    logger.info('Profile card saved', { traceId, path: profilePath });

    // Save quests card
    const questsPath = path.join(outputDir, `${characterName}_quests_${timestamp}.html`);
    fs.writeFileSync(questsPath, renderQuestsCard(profile, quests), 'utf-8');
    logger.info('Quests card saved', { traceId, path: questsPath });

    // Save raw JSON
    const jsonPath = path.join(outputDir, `${characterName}_data_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ profile, quests }, null, 2), 'utf-8');
    logger.info('JSON data saved', { traceId, path: jsonPath });

    return {
        profilePath,
        questsPath,
        jsonPath,
        outputDir
    };
}

module.exports = {
    renderProfileCard,
    renderQuestsCard,
    saveCards
};
