import { FABRIC_COMMIT } from './fabric-index';

/**
 * Fabric patterns are sent verbatim. They carry their own OUTPUT INSTRUCTIONS and
 * their own counts, so prepending BASE_RULES would silently reinterpret those specs
 * ("counts are upper bounds") rather than support them.
 *
 * The `v2` segment is a cache schema version: bump it whenever the stored text is
 * derived differently, so entries cached by an older build are discarded even though
 * FABRIC_COMMIT has not moved.
 */
const CACHE_PREFIX = `sk_fabric:v2:${FABRIC_COMMIT}:`;

export async function fetchFabricPattern(name: string): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error(`Invalid Fabric pattern: ${name}`);
  const key = CACHE_PREFIX + name;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const oldKey = localStorage.key(i);
      if (oldKey?.startsWith('sk_fabric:') && !oldKey.startsWith(CACHE_PREFIX))
        localStorage.removeItem(oldKey);
    }
  } catch {
    // Storage can be unavailable on the host page; fetching still works.
  }

  try {
    const text = await new Promise<string>((resolve, reject) => {
      api.RUNTIME(
        'request',
        {
          url: `https://raw.githubusercontent.com/danielmiessler/fabric/${FABRIC_COMMIT}/data/patterns/${name}/system.md`,
        },
        (res: { text?: string; error?: string }) => {
          if (res?.error) reject(new Error(res.error));
          else resolve(res?.text ?? '');
        },
      );
    });
    const prompt = text.split(/^#\s*INPUT/im, 1)[0].trim();
    if (!prompt) throw new Error('Empty pattern body');
    try {
      localStorage.setItem(key, prompt);
    } catch {
      // A full or blocked cache must not prevent using the prompt.
    }
    return prompt;
  } catch (error) {
    throw new Error(
      `Fabric pattern "${name}" failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
