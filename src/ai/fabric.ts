import { FABRIC_COMMIT } from './fabric-index';
import { BASE_RULES } from './templates';

export async function fetchFabricPattern(name: string): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error(`Invalid Fabric pattern: ${name}`);
  const prefix = `sk_fabric:${FABRIC_COMMIT}:`;
  const key = prefix + name;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const oldKey = localStorage.key(i);
      if (oldKey?.startsWith('sk_fabric:') && !oldKey.startsWith(prefix)) localStorage.removeItem(oldKey);
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
    const body = text.split(/^#\s*INPUT/im, 1)[0].trim();
    if (!body) throw new Error('Empty pattern body');
    const prompt = `${BASE_RULES}\n\n${body}`;
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
