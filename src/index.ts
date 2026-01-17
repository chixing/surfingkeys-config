/**
 * SurfingKeys Configuration - Main Entry Point
 */

import { CONFIG } from './config';
import { AiSelector } from './ai/selector';
import * as utils from './utils';
import { registerKeyMappings } from './keymaps/register';
import { initializeSiteAutomations } from './automations';
import { registerSearchEngines } from './search/engines';
import { applyTheme } from './theme/apply';

// Export for debugging
(window as any).__CONFIG__ = CONFIG;
(window as any).__utils__ = utils;

const aiSelector = new AiSelector(CONFIG);

registerKeyMappings(aiSelector);
initializeSiteAutomations(CONFIG);
registerSearchEngines();
applyTheme(CONFIG);

console.log('[SurfingKeys] TypeScript configuration loaded');
