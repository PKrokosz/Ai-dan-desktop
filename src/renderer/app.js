
import * as AppModules from './modules/index.js';
window.AppModules = AppModules;

import { state } from './modules/state.js';
import { STEPS, QUICK_ACTIONS, PERSONALITY_PROMPTS, SLASH_COMMANDS, COMMAND_LABELS } from './modules/config.js';
import { stepTemplates } from './modules/step-templates.js';

window.state = state;

Object.assign(window, AppModules);

// Wire up circular dependencies (renderStep in ui-helpers)
if (AppModules.setRenderStep && AppModules.renderStep) {
  AppModules.setRenderStep(AppModules.renderStep);
}

const thinkingStyle = document.createElement('style');
thinkingStyle.textContent = `
  .thinking-collapsed {
      margin: 12px 0;
      border: none;
  }
  .thinking-summary {
      cursor: pointer;
      color: #9ca3af;
      font-size: 13px;
      padding: 4px 0;
      list-style: none;
  }
  .thinking-summary::-webkit-details-marker {
      display: none;
  }
  .thinking-details {
      padding: 12px;
      margin-top: 8px;
      background: rgba(255, 255, 255, 0.03);
      border-left: 2px solid #4b5563;
      color: #9ca3af;
      font-size: 12px;
      font-style: italic;
      white-space: pre-wrap;
  }
  
  .thinking-live {
      color: #fbbf24;
      font-size: 13px;
      padding: 8px 0;
      animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
  }
`;
document.head.appendChild(thinkingStyle);

const messageAnimStyle = document.createElement('style');
messageAnimStyle.textContent = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .chat-message { animation: fadeSlideIn 0.3s ease-out; }
  
  .edge-nav-arrow {
    position: fixed; right: 0; top: 50%; transform: translateY(-50%);
    background: linear-gradient(90deg, transparent, rgba(180,130,50,0.5));
    padding: 30px 10px 30px 30px; cursor: pointer; border-radius: 8px 0 0 8px;
    opacity: 0.3; transition: all 0.2s; font-size: 24px; color: var(--gold-bright); z-index: 1000;
  }
  .edge-nav-arrow:hover {
    opacity: 1; background: linear-gradient(90deg, transparent, rgba(180,130,50,0.8)); padding-right: 15px;
  }
  
  .log-toggle-mini {
    position: fixed; bottom: 20px; left: 20px; width: 32px; height: 32px;
    background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 4px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    opacity: 0.5; transition: opacity 0.2s; z-index: 2000; font-size: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .log-toggle-mini:hover { opacity: 1; border-color: var(--gold); }
  
  #btnRunAI {
      background-color: var(--gold-dark); border: 1px solid var(--gold); color: var(--text-primary);
      transition: all 0.2s ease; opacity: 1 !important;
  }
  #btnRunAI:hover { background-color: var(--gold); box-shadow: 0 0 10px rgba(180, 130, 50, 0.3); }
  #btnRunAI:active { transform: scale(0.95); }

  .chat-spacer {
    height: 150px; width: 100%; display: flex; align-items: center; justify-content: center;
    color: var(--text-dim); opacity: 0.3; font-size: 11px; letter-spacing: 2px;
  }
  .chat-spacer::before { content: '•••'; }
  
  .ai-input-bar { transition: opacity 0.5s ease, transform 0.5s ease; }
  
  /* Global Input Width Fix */
  .ai-input-container {
      max-width: 900px;
      margin: 0 auto;
      left: 0; 
      right: 0;
  }
  
  /* Match Feed Width to Input */
  .ai-feed {
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
  }
`;
document.head.appendChild(messageAnimStyle);

const laneStyles = document.createElement('style');
laneStyles.textContent = `
  .lanes-progress { margin-bottom: 20px; }
  .lane-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .lane-indicator { font-size: 14px; }
  .lane-name { flex: 1; }
  .lane-status { font-size: 12px; color: var(--text-dim); }
  .lane-item.processing .lane-indicator::before { content: '◐'; color: var(--gold); }
  .lane-item.done .lane-indicator::before { content: '✓'; color: var(--success); }
  .lane-item.done .lane-status { color: var(--success); }
  tr.selected { background: var(--gold-glow) !important; }
  
  .model-hint { font-size: 11px; color: var(--text-dim); margin-top: 4px; }
  .model-categories { margin-top: 20px; }
  .model-category { margin-bottom: 15px; }
  .model-category-header {
    display: flex; align-items: center; gap: 8px; padding: 10px; cursor: pointer;
    background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-subtle);
  }
  .model-category-header:hover { background: var(--bg-hover); }
  .model-category-header .arrow { transition: transform 0.2s; }
  .model-category-header.open .arrow { transform: rotate(90deg); }
  .model-category-title { flex: 1; font-weight: 500; }
  .model-category-count { font-size: 11px; color: var(--text-dim); }
  .model-category-body { display: none; padding: 10px 0 0 20px; }
  .model-category-body.open { display: block; }
  .model-item {
    display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin: 4px 0;
    background: var(--bg-dark); border-radius: 6px; font-size: 13px;
  }
  .model-item-name { flex: 1; }
  .model-item-sizes { font-size: 11px; color: var(--text-dim); }
  .model-item-tags { display: flex; gap: 4px; }
  .model-tag {
    font-size: 9px; padding: 2px 6px; background: var(--gold-glow); color: var(--gold); border-radius: 4px;
  }
  .model-item-btn { 
    padding: 4px 10px; font-size: 11px; background: var(--bg-panel); border: 1px solid var(--border-subtle);
    color: var(--text-muted); border-radius: 4px; cursor: pointer;
  }
  .model-item-btn:hover { background: var(--gold); color: var(--bg-dark); }
  .model-item-btn.installed { background: var(--success); color: white; border-color: var(--success); }
  
  .search-suggestions {
    position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-panel);
    border: 1px solid var(--border); border-radius: 8px; max-height: 300px;
    overflow-y: auto; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .suggestion-item {
    padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between;
    align-items: center; border-bottom: 1px solid var(--border-subtle);
  }
  .suggestion-item:last-child { border-bottom: none; }
  .suggestion-item:hover { background: var(--bg-hover); }
  .suggestion-item.no-results { color: var(--text-dim); justify-content: center; cursor: default; }
  .suggestion-name { font-weight: 500; color: var(--text-primary); }
  .suggestion-meta { font-size: 11px; color: var(--text-dim); }
  
  .tag-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .tag-btn {
    padding: 4px 10px; font-size: 11px; background: var(--bg-dark); border: 1px solid var(--border-subtle);
    color: var(--text-muted); border-radius: 12px; cursor: pointer; transition: all 0.2s;
  }
  .tag-btn:hover { background: var(--gold-glow); border-color: var(--gold); color: var(--gold); }
  .tag-btn:active { transform: scale(0.95); }
  
  .ai-section {
    margin-bottom: 20px; padding: 15px; background: var(--bg-dark);
    border-radius: 8px; border: 1px solid var(--border-subtle);
  }
  .ai-section-title {
    color: var(--gold-soft); font-size: 13px; font-weight: 500; margin: 0 0 12px 0;
    display: flex; align-items: center; gap: 6px;
  }
  .ai-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .ai-btn {
    padding: 8px 14px; font-size: 12px; background: var(--bg-panel); border: 1px solid var(--border);
    color: var(--text-muted); border-radius: 6px; cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }
  .ai-btn:hover:not(:disabled) { background: var(--gold-glow); border-color: var(--gold); color: var(--gold-bright); }
  .ai-btn:active:not(:disabled) { transform: scale(0.97); }
  .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .ai-result-panel {
    background: var(--bg-dark); border: 1px solid var(--gold-glow); border-radius: 8px; padding: 15px;
  }
  .ai-result-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
    padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle);
  }
  .ai-result-actions { display: flex; gap: 8px; }
  .ai-result-content {
    font-size: 13px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;
    max-height: 400px; overflow-y: auto;
  }
  .btn-sm { padding: 5px 10px; font-size: 11px; }
  
  .spinner {
    width: 30px; height: 30px; border: 3px solid var(--border); border-top-color: var(--gold);
    border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .ai-message:hover .ai-message-actions { opacity: 1 !important; }

  .character-overlay {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 400px; max-height: 80vh; background: var(--bg-panel); border: 1px solid var(--gold);
    border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.7); z-index: 1000;
    display: flex; flex-direction: column; overflow: hidden; resize: both;
  }
  .overlay-header {
    padding: 10px 15px; background: var(--bg-dark); border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;
  }
  .overlay-title {
    font-weight: bold; color: var(--gold-bright); font-size: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .overlay-close {
    cursor: pointer; color: var(--text-dim); font-size: 16px; transition: color 0.2s;
  }
  .overlay-close:hover { color: var(--gold); }
  .overlay-content {
    padding: 15px; overflow-y: auto; font-size: 13px; line-height: 1.6; color: var(--text-primary);
  }
  .overlay-section { margin-bottom: 15px; }
  .overlay-section h4 {
    margin: 0 0 5px 0; color: var(--gold-soft); font-size: 12px; text-transform: uppercase;
    border-bottom: 1px solid var(--border-subtle); padding-bottom: 2px;
  }
  
  .char-link {
    color: var(--gold); cursor: pointer; border-bottom: 1px dashed var(--gold-soft); transition: all 0.2s;
  }
  .char-link:hover {
    color: var(--gold-bright); background: rgba(255, 215, 0, 0.1); border-bottom-style: solid;
  }
  .source-link { cursor: pointer; transition: color 0.2s; }
  .source-link:hover { color: var(--gold-bright) !important; text-decoration: underline; }
`;
document.head.appendChild(laneStyles);


if (AppModules.init) {
  AppModules.init();
} else {
  console.error("AppModules.init not found! Check imports.");
}
