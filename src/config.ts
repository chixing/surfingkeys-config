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
  theme: Theme;
}

export const CONFIG: Config = {
  scrollStep: 120,
  hintAlign: "left",
  omnibarMaxResults: 20,
  historyMUOrder: false,
  delayMs: 1500,
  theme: {
    font: "'Monaco', 'Consolas', 'Courier New', monospace",
    fontSize: "16px",
    colors: {
      fg: "#cdd6f4",
      bg: "#1e1e2e",
      bgDark: "#181825",
      border: "#313244",
      mainFg: "#89b4fa",
      accentFg: "#a6e3a1",
      infoFg: "#cba6f7",
      select: "#45475a"
    }
  }
};

// Apply basic settings to SurfingKeys
Object.assign(settings, {
  scrollStepSize: CONFIG.scrollStep,
  hintAlign: CONFIG.hintAlign,
  omnibarMaxResults: CONFIG.omnibarMaxResults,
  historyMUOrder: CONFIG.historyMUOrder,
});

export const AI_SERVICES = {
  CHATGPT: 'ChatGPT',
  DOUBAO: 'Doubao',
  ALICE: 'Alice (Yandex)',
  CLAUDE: 'Claude',
  GEMINI: 'Gemini',
  PERPLEXITY: 'Perplexity',
  PERPLEXITY_RESEARCH: 'Perplexity Research',
  GROK: 'Grok'
} as const;

export type AIServiceName = typeof AI_SERVICES[keyof typeof AI_SERVICES];
