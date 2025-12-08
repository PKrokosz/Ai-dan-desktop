const fs = require('fs');
const path = require('path');
const logger = require('../shared/logger');

class SessionService {
    constructor() {
        this.sessionsDir = path.join(process.cwd(), 'data', 'sessions');
        this.currentSession = null;
        this.ensureDir();
    }

    ensureDir() {
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    startnewSession(profileName) {
        const sessionId = `session-${Date.now()}`;
        this.currentSession = {
            id: sessionId,
            profileName: profileName,
            startTime: Date.now(),
            messages: [], // { role: 'user'|'ai', content: '', timestamp: number }
            entities: {}, // { "Name": { type: 'npc', description: '...' } }
            knowledge_graph: [], // { entity, type, relation, target? }
            summary: '', // Auto-generated session summary
            metadata: {}
        };
        this.saveSession();
        logger.info('New session started', { sessionId, profileName });
        return this.currentSession;
    }

    addMessage(role, content) {
        if (!this.currentSession) return;

        const msg = {
            role,
            content,
            timestamp: Date.now()
        };
        this.currentSession.messages.push(msg);

        // Simple Entity Extraction (Heuristic)
        // If AI mentions a proper noun that isn't in entities, maybe flag it?
        // For now, we will perform a simple check for capitalized words > 3 chars
        // distinct from start of sentence. This is very basic.
        // A better approach would be to have a dedicated 'extract_entities' LLM call.

        this.saveSession();
    }

    // Explicitly add an entity (e.g. from a specific tool call)
    addEntity(name, type, description) {
        if (!this.currentSession) return;

        if (!this.currentSession.entities[name]) {
            this.currentSession.entities[name] = { type, description, firstSeen: Date.now() };
        } else {
            // Update description
            this.currentSession.entities[name].description += ` | ${description}`;
        }
        this.saveSession();
    }

    // Add a relation to the Knowledge Graph
    addRelation(entity, type, relation, target = null) {
        if (!this.currentSession) return;

        const rel = { entity, type, relation, target, timestamp: Date.now() };
        this.currentSession.knowledge_graph.push(rel);
        logger.info('Relation added to knowledge graph', rel);
        this.saveSession();
    }

    // Update session summary (can be called by LLM)
    updateSummary(summary) {
        if (!this.currentSession) return;
        this.currentSession.summary = summary;
        this.saveSession();
    }

    saveSession() {
        if (!this.currentSession) return;
        const filePath = path.join(this.sessionsDir, `${this.currentSession.id}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(this.currentSession, null, 2));
        } catch (e) {
            logger.error('Failed to save session', e);
        }
    }

    loadSession(sessionId) {
        const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
        if (fs.existsSync(filePath)) {
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                this.currentSession = JSON.parse(data);
                return this.currentSession;
            } catch (e) {
                logger.error('Failed to load session', e);
            }
        }
        return null;
    }

    getCurrentContext() {
        if (!this.currentSession) return "";

        // Session summary (if available)
        const summary = this.currentSession.summary
            ? `### PODSUMOWANIE SESJI ###\n${this.currentSession.summary}\n\n`
            : '';

        // Return structured summary of current entities
        const entities = Object.entries(this.currentSession.entities)
            .map(([name, data]) => `- ${name} (${data.type}): ${data.description}`)
            .join('\n');

        // Knowledge Graph relations
        const relations = (this.currentSession.knowledge_graph || [])
            .map(r => `- ${r.entity} (${r.type}) → ${r.relation}${r.target ? ` → ${r.target}` : ''}`)
            .join('\n');

        // Return last N messages
        const recentHistory = this.currentSession.messages.slice(-5)
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        return `${summary}### POPRZEDNIE WYDARZENIA ###\n${recentHistory}\n\n### WYKRYTE BYTY ###\n${entities}\n\n### RELACJE ###\n${relations}\n\n`;
    }
}

module.exports = new SessionService();
