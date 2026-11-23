/**
 * SurfingKeys Configuration - Main Entry Point
 */

import { CONFIG, applySettings } from './config';
import { AiSelector } from './ai/selector';
import * as utils from './utils';
import { registerKeyMappings } from './keymaps/register';
import { initializeSiteAutomations } from './automations';
import { registerSearchEngines } from './search/engines';
import { applyTheme } from './theme/apply';
import { showReadyBadge } from './theme/readyBadge';
import { keepFrontendDetachedWhenIdle } from './frontendDetach';

// Export for debugging
(window as any).__CONFIG__ = CONFIG;
(window as any).__utils__ = utils;

const aiSelector = new AiSelector(CONFIG);

applySettings();
registerKeyMappings(aiSelector);
initializeSiteAutomations(CONFIG);
registerSearchEngines();
applyTheme(CONFIG);
keepFrontendDetachedWhenIdle();
showReadyBadge(CONFIG.theme);

console.log('[SurfingKeys] TypeScript configuration loaded');
