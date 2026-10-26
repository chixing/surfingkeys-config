/**
 * Configuration and constants
 */

export interface ThemeColors {
  fg: string;
  bg: string;
  bgDark: string;
  border: string;
  mainFg: string;
  accentFg: string;
  infoFg: string;
  select: string;
}

export interface Theme {
  font: string;
  fontSize: string;
  colors: ThemeColors;
}

export interface Config {
  scrollStep: number;
  hintAlign: string;
  omnibarMaxResults: number;
  historyMUOrder: boolean;
  delayMs: number;
  promptTemplatesUrl: string;
  theme: Theme;
}

export const CONFIG: Config = {
  scrollStep: 120,
  hintAlign: 'left',
  omnibarMaxResults: 20,
  historyMUOrder: false,
  delayMs: 1500,
  promptTemplatesUrl:
    'https://gist.githubusercontent.com/chixing/82767d49380294ad7b298554e2c0e59b/raw/templates.json',
  theme: {
    font: "'Monaco', 'Consolas', 'Courier New', monospace",
    fontSize: '16px',
    colors: {
      fg: '#e6edf3',
      bg: '#0d1117',
      bgDark: '#161b22',
      border: '#30363d',
      mainFg: '#8b949e',
      accentFg: '#58a6ff',
      infoFg: '#a371f7',
      select: '#1f6feb66',
    },
  },
};

// Apply basic settings to SurfingKeys
export function applySettings(): void {
  Object.assign(settings, {
    scrollStepSize: CONFIG.scrollStep,
    hintAlign: CONFIG.hintAlign,
    omnibarMaxResults: CONFIG.omnibarMaxResults,
    historyMUOrder: CONFIG.historyMUOrder,
  });
}

export const AI_SERVICES = {
  CHATGPT: 'ChatGPT',
  DOUBAO: 'Doubao',
  CLAUDE: 'Claude',
  GEMINI: 'Gemini',
  PERPLEXITY: 'Perplexity',
  GROK: 'Grok',
} as const;

export type AIServiceName = (typeof AI_SERVICES)[keyof typeof AI_SERVICES];
