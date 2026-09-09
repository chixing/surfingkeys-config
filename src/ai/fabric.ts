export interface FabricPattern {
  name: string;
  description: string;
}

const CACHE_PREFIX = 'sk_fabric:v3:main:';
const INDEX_KEY = `${CACHE_PREFIX}index`;
const BODY_MAX_AGE = 24 * 60 * 60 * 1000;
const BASE_URL = 'https://raw.githubusercontent.com/danielmiessler/fabric/main/data/patterns/';

function readCache(key: string): unknown {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const oldKey = localStorage.key(i);
      if (oldKey?.startsWith('sk_fabric:') && !oldKey.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(oldKey);
      }
    }
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Blocked or full storage must not prevent using Fabric.
  }
}

function requestText(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    api.RUNTIME('request', { url: BASE_URL + path }, (res: { text?: string; error?: string }) => {
      if (res?.error) reject(new Error(res.error));
      else resolve(res?.text ?? '');
    });
  });
}

export function readFabricIndex(): FabricPattern[] {
  const cached = readCache(INDEX_KEY);
  if (!Array.isArray(cached)) return [];
  const names = new Set<string>();
  if (
    !cached.every((entry) => {
      if (
        !entry ||
        typeof entry.name !== 'string' ||
        !/^[a-zA-Z0-9_-]+$/.test(entry.name) ||
        typeof entry.description !== 'string' ||
        names.has(entry.name)
      )
        return false;
      names.add(entry.name);
      return true;
    })
  )
    return [];
  return cached;
}

/** Refresh failures leave the last usable catalog untouched. */
export async function refreshFabricIndex(): Promise<FabricPattern[] | null> {
  try {
    const markdown = await requestText('pattern_explanations.md');
    const patterns = [...markdown.matchAll(/^\d+\. \*\*([a-zA-Z0-9_-]+)\*\*: (.+)\r?$/gm)]
      .map((match) => ({ name: match[1], description: match[2].trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (patterns.length < 200 || new Set(patterns.map((pattern) => pattern.name)).size !== patterns.length) {
      return null;
    }
    if (JSON.stringify(patterns) !== JSON.stringify(readFabricIndex())) writeCache(INDEX_KEY, patterns);
    return patterns;
  } catch {
    return null;
  }
}

export async function fetchFabricPattern(name: string): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error(`Invalid Fabric pattern: ${name}`);
  const key = `${CACHE_PREFIX}body:${name}`;
  const cached = readCache(key) as { text?: unknown; fetchedAt?: unknown } | null;
  const stale = typeof cached?.text === 'string' && cached.text.trim() ? cached.text : '';
  if (
    stale &&
    typeof cached?.fetchedAt === 'number' &&
    Number.isFinite(cached.fetchedAt) &&
    cached.fetchedAt <= Date.now() &&
    Date.now() - cached.fetchedAt < BODY_MAX_AGE
  )
    return stale;

  try {
    const text = await requestText(`${name}/system.md`);
    // Keep Fabric instructions verbatim, apart from the trailing input section.
    const prompt = text.split(/^#\s*INPUT/im, 1)[0].trim();
    if (!prompt) throw new Error('Empty pattern body');
    writeCache(key, { text: prompt, fetchedAt: Date.now() });
    return prompt;
  } catch (error) {
    if (stale) return stale;
    throw new Error(
      `Fabric pattern "${name}" failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
