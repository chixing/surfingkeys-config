/**
 * Prompt catalog types, loading, and formatting for the Multi-AI dialog.
 */

export type PromptCategory = 'standards' | 'explain' | 'research' | 'decision' | 'thariq' | 'felix';
export type PromptTier = 'short' | 'long';

export interface PromptTemplate {
  value: string;
  label: string;
  category: PromptCategory;
  description: string;
  tier: PromptTier;
  tags?: string[];
  context?: 'page' | 'conversation';
  source?: { author: string; url: string };
}

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  standards: 'Standards',
  explain: 'Explain',
  research: 'Research',
  decision: 'Decision',
  thariq: 'Thariq',
  felix: 'Felix',
};

export const PROMPT_CATEGORY_ORDER: PromptCategory[] = [
  'standards',
  'explain',
  'research',
  'decision',
  'thariq',
  'felix',
];

/** Reject a malformed catalog as a whole rather than silently hiding broken entries. */
export function parsePromptTemplates(text: string): PromptTemplate[] {
  const catalog: unknown = JSON.parse(text);
  if (!Array.isArray(catalog)) throw new Error('Expected a JSON array of templates');
  const isText = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
  catalog.forEach((item: unknown, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Invalid template at index ${index}`);
    const template = item as Record<string, unknown>;
    const source = template.source as Record<string, unknown> | null | undefined;
    if (
      !isText(template.label) ||
      !isText(template.value) ||
      typeof template.description !== 'string' ||
      !PROMPT_CATEGORY_ORDER.includes(template.category as PromptCategory) ||
      (template.tier !== 'short' && template.tier !== 'long') ||
      (template.tags !== undefined && (!Array.isArray(template.tags) || !template.tags.every(isText))) ||
      (template.context !== undefined &&
        template.context !== 'page' &&
        template.context !== 'conversation') ||
      (source !== undefined &&
        (!source || typeof source !== 'object' || !isText(source.author) || !isText(source.url)))
    ) {
      throw new Error(`Invalid template at index ${index}`);
    }
    if (source) {
      const url = new URL(source.url as string);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error(`Invalid source URL at index ${index}`);
      }
    }
  });
  return catalog as PromptTemplate[];
}

/** Fetch via the extension background so the current page's CSP does not block the catalog. */
export function loadPromptTemplates(catalogUrl: string): Promise<PromptTemplate[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Template request timed out')), 10000);
    try {
      const url = new URL(catalogUrl);
      if (url.protocol !== 'https:') throw new Error('Template URL must use HTTPS');
      url.searchParams.set('_sk', String(Date.now()));
      api.RUNTIME('request', { url: url.href }, (response) => {
        clearTimeout(timer);
        try {
          if (response?.error) throw new Error(String(response.error));
          if (typeof response?.text !== 'string') throw new Error('No template response');
          resolve(parsePromptTemplates(response.text));
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

/** The page a selection came from, attached so the model can reach the surrounding context. */
export interface PageContext {
  url: string;
  title: string;
}

/** Render the PAGE block, or an empty string when there is no usable context. */
function formatPageContext(page: PageContext | null): string {
  if (!page?.url) return '';
  const title = page.title ? `Title: ${page.title}\n` : '';
  return (
    `--- PAGE ---\n${title}URL: ${page.url}\n` +
    'The SOURCE below is an excerpt I selected from this page. ' +
    'Open the URL if you need the surrounding context.\n\n'
  );
}

/** Combine user query, template, and page context for tab URLs. */
export function formatCombinedQuery(
  query: string,
  promptTemplate: string,
  page: PageContext | null = null,
): string {
  const instructions = promptTemplate.trim();
  const pageBlock = formatPageContext(page);
  if (!instructions) return pageBlock ? `${pageBlock}--- SOURCE ---\n${query}` : query;
  return `--- INSTRUCTIONS ---\n${instructions}\n\n${pageBlock}--- SOURCE ---\n${query}`;
}

/** Lowercase haystack for template list filtering. */
export function templateSearchHaystack(template: PromptTemplate): string {
  return [
    template.label,
    template.description,
    PROMPT_CATEGORY_LABELS[template.category],
    template.category,
    template.tier,
    template.context ?? '',
    template.source?.author ?? '',
    ...(template.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
}
