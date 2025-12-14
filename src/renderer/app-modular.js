/**
 * Agent MG - Modular Entry Point (ES6 Modules)
 * @description Główny plik ładujący moduły ES6
 * Data migracji: 2025-12-12
 */

// ==============================
// Import Modules
// ==============================
import {
  state,
  QUICK_ACTIONS,
  PERSONALITY_PROMPTS,
  STEPS,
  SLASH_COMMANDS,
  COMMAND_LABELS,
  addLog,
  setProgress,
  setRenderStep,
  updateStepIndicators,
  updateStepTitle,
  getCurrentStep,
  stepTemplates,
  renderStep as uiRenderStep, // Import base render logic if needed, but we define orchestrator here
  init as runInit, // Import the real init function
  setupNavigationButtons,
  setupSidebarNavigation
} from './modules/index.js';

// Log successful module loading
console.log('✅ ES6 Modules loaded successfully');
addLog('info', '🎉 Moduły ES6 załadowane poprawnie');

// ==============================
// Global Exports (for onclick handlers)
// ==============================
window.state = state;
window.QUICK_ACTIONS = QUICK_ACTIONS;
window.PERSONALITY_PROMPTS = PERSONALITY_PROMPTS;
window.STEPS = STEPS;
window.SLASH_COMMANDS = SLASH_COMMANDS;
window.COMMAND_LABELS = COMMAND_LABELS;

// ==============================
// Main Render Function
// ==============================
function renderStep() {
  const step = getCurrentStep();
  const content = document.getElementById('stepContent');

  if (!content || !step) return;

  // Get template function from imported templates
  const templateFn = stepTemplates[step.key];
  if (templateFn) {
    content.innerHTML = templateFn();
  } else {
    content.innerHTML = `<p>Step ${step.key} not implemented</p>`;
  }

  // Update UI
  updateStepIndicators();
  updateStepTitle();

  // Update navigation buttons
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  if (btnPrev) btnPrev.disabled = state.currentStep <= 1;
  if (btnNext) btnNext.disabled = state.currentStep >= state.totalSteps;
}

// Register with ui-helpers so other modules can trigger re-render
setRenderStep(renderStep);

// ==============================
// Initialize
// ==============================
function bootstrap() {
  addLog('info', 'Agent MG uruchomiony (ES6 Modules)');

  // Setup navigation listeners using modular function
  setupNavigationButtons();
  setupSidebarNavigation();

  // Run the real initialization logic (IPC, Ollama, etc.)
  runInit();
}

// Run bootstrap when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Export for testing
export { renderStep, bootstrap };
