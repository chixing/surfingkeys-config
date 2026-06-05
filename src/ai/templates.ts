/**
 * Prompt templates for the Multi-AI dialog.
 */

export type PromptCategory = 'meta' | 'article' | 'research' | 'code' | 'utility' | 'experimental';
export type PromptTier = 'short' | 'long';

export interface PromptTemplate {
  value: string;
  label: string;
  category: PromptCategory;
  description: string;
  tier: PromptTier;
  tags?: string[];
  default?: boolean;
}

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  meta: 'Quick',
  article: 'Article',
  research: 'Research',
  code: 'Code',
  utility: 'Utility',
  experimental: 'Experimental',
};

export const PROMPT_CATEGORY_ORDER: PromptCategory[] = [
  'meta',
  'article',
  'research',
  'code',
  'utility',
  'experimental',
];

/** Combine user query and template for tab URLs. */
export function formatCombinedQuery(query: string, promptTemplate: string): string {
  const instructions = promptTemplate.trim();
  if (!instructions) return query;
  return `--- INSTRUCTIONS ---\n${instructions}\n\n--- SOURCE ---\n${query}`;
}

/** Lowercase haystack for template list filtering. */
export function templateSearchHaystack(template: PromptTemplate): string {
  return [
    template.label,
    template.description,
    PROMPT_CATEGORY_LABELS[template.category],
    template.category,
    template.tier,
    ...(template.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // --- meta ---
  {
    label: 'Custom',
    value: '',
    category: 'meta',
    description: 'Send only your query (no extra instructions)',
    tier: 'short',
    default: true,
  },
  {
    label: 'TL;DR',
    value: 'Provide a short TL;DR summary in 5-8 bullet points or a tight paragraph.',
    category: 'meta',
    description: 'Fast skim summary',
    tier: 'short',
    tags: ['summary'],
  },
  {
    label: 'Detailed Summary',
    value:
      'Provide a detailed summary with clear section headers. Cover main claims, evidence, and open questions.',
    category: 'meta',
    description: 'Structured longer summary',
    tier: 'short',
    tags: ['summary'],
  },
  {
    label: 'Fact-Check',
    value: 'Fact-check key claims and provide sources. Flag uncertain claims explicitly.',
    category: 'meta',
    description: 'Verify claims with citations',
    tier: 'short',
    tags: ['skeptical'],
  },
  {
    label: 'Explain Simply',
    value:
      'Explain this in simple terms suitable for beginners. Stay under 300 words. Use one short analogy only if it helps.',
    category: 'meta',
    description: 'Beginner-friendly, capped length',
    tier: 'short',
  },
  {
    label: 'Action Items',
    value: `Extract actionable output from the source material.

Include:
1) Decisions made (or implied)
2) Action items with owner if stated (otherwise "Unassigned")
3) Deadlines or dates mentioned
4) Open questions and blockers
5) A one-line "if you only do three things" priority list

Use a checklist format. Be concise.`,
    category: 'meta',
    description: 'Decisions, tasks, blockers',
    tier: 'short',
  },
  {
    label: 'Hostile Critic',
    value: `Act as a Hostile Critic. The user's message under --- SOURCE --- is the argument, draft, or position to attack.

Requirements:
- Point out three specific ways the argument could collapse.
- List two assumptions made without evidence.
- Provide one counter-argument not considered.

Tone: precise, not polite.`,
    category: 'meta',
    description: 'Stress-test an argument',
    tier: 'short',
    tags: ['skeptical'],
  },

  // --- article ---
  {
    label: 'Senior Staff Engineer Narrative',
    value: `Role
Act as a Senior Staff Engineer and System Architect.

Audience
An engineer who is new to this domain but has strong general technical literacy.

Task
Analyze the article and explain it as a technical narrative.

Output Requirements
- Start with a concise TL;DR at the top.
- Main body must be prose/story form (no bullet-point summary style).
- Use precise technical vocabulary, and define each technical term on first use.

Cover These Sections
1) Technical Narrative
   - Describe the initial system state and constraints (bottlenecks, scaling limits, consistency issues).
   - Explain why each major architectural choice was made.
   - Highlight friction points during implementation and how they were resolved.
   - End with impact on performance, throughput, reliability, or operations.
2) Engineering Glossary (Integrated)
   - Identify and define all technical terms, acronyms, and domain-specific concepts from the article.
   - Keep definitions technically precise.
   - Integrate definitions naturally into prose or a dedicated section with the same professional tone.
3) Broader Engineering Context
   - Explain where this approach fits relative to industry norms.
   - Discuss implied technical debt and future-proofing concerns.
   - Describe ripple effects on the surrounding stack`,
    category: 'article',
    description: 'Technical narrative with integrated glossary',
    tier: 'long',
    tags: ['architecture', 'narrative'],
  },
  {
    label: 'Senior Staff Engineer Narrative v2',
    value: `Role
You are a Senior Staff Engineer and System Architect.

Audience
A technically literate peer who is new to this specific domain.

Task
Provide a critical, narrative-driven architectural analysis.

Output Format
1) Technical Narrative (why + how)
   - Reverse-engineer the decision process, not just features.
   - Start with constraints: CPU, I/O, organizational scaling, etc.
   - Explain the pivot: core trade-offs and why this design won.
   - Describe implementation reality: race conditions, migrations, custom sharding, or other hard edges.
2) Domain-Specific Glossary
   - Define only domain-specific jargon, novel acronyms, or non-standard term usage.
   - Do not define baseline terms like latency or container.
   - Structured list is allowed for this section only.
3) Senior Engineer Critique
   - Classify the approach as standard/boring vs novel/bleeding-edge.
   - Identify what the article leaves unsaid.
   - Predict the most likely next failure point.

Style
- Sections 1 and 3 must be prose/narrative.
- Section 2 can be structured for scanability.
- Use peer-to-peer, high-bandwidth language`,
    category: 'article',
    description: 'Narrative analysis with senior critique',
    tier: 'long',
    tags: ['architecture', 'narrative', 'critique'],
  },
  {
    label: 'Article · Strategic',
    value: `Role
Act as a Principal Engineer or CTO.

Goal
Treat the source as an engineering implementation and a signal in the evolution of software architecture.

Sections
1) Core Architecture — problem limit reached, mechanism/patterns (not variable names), key design trick
2) Ecosystem Landscape — lineage, standard alternatives rejected, macro trend alignment
3) Critical Assessment — complexity cost, who should adopt (startup vs hyperscaler), two-year failure prediction
4) Terminology Mapping — map source terms to standard industry terms (not a dictionary)

Style: authoritative, concise headers; avoid bullets in narrative sections.`,
    category: 'article',
    description: 'CTO-level strategic dossier',
    tier: 'long',
    tags: ['architecture'],
  },
  {
    label: 'Article · Deep Teach',
    value: `Role
Act as a Technical Professor.

Audience
A strong engineer without background in this specific sub-domain.

Structure
1) Prerequisite Context — sub-field overview, standard industry model, where it breaks down
2) Source Analysis — problem solved, mechanism (data/control flow), differentiation vs standard model
3) Technical Assessment — trade-offs; quantify impact when metrics exist
4) Essential Vocabulary — rigorous definitions; minimal metaphors

Style: direct, academic, efficient.`,
    category: 'article',
    description: 'Context-first deep explanation',
    tier: 'long',
  },
  {
    label: 'Article · Design Doc',
    value: `Role
Principal Engineer producing an internal design-doc seed from the source.

Sections
1) TL;DR (3-5 sentences)
2) System Decomposition — components, responsibilities, sync/async patterns, trust boundaries
3) Data & Control Flow — end-to-end path; idempotency, retries, backpressure
4) Implementation — data models, patterns (CQRS, sharding, etc.), operational mechanisms
5) Operations — scaling, latency/throughput, observability
6) Text Diagram — indentation + arrows

If details are missing, label explicit assumptions.`,
    category: 'article',
    description: 'Reverse-engineer architecture',
    tier: 'long',
    tags: ['architecture'],
  },
  {
    label: 'Industry Comparison',
    value: `Role
Staff Engineer comparing this approach to industry norms.

Sections
1) TL;DR (3-5 sentences)
2) Problem Class (OLTP, stream processing, orchestration, etc.)
3) Common Approaches (2-3 stacks + trade-offs)
4) Direct Comparison — consistency, latency, throughput, ops complexity, cost, lock-in, fault tolerance; mark better/worse/different per row
5) Fit Criteria — when to use vs conventional approach
6) Long-Term — lock-in, migration, maintenance

Be explicit and comparative.`,
    category: 'article',
    description: 'vs typical industry solutions',
    tier: 'long',
  },
  {
    label: 'Hype vs Evidence',
    value: `Role
Skeptical Principal Engineer reviewing vendor/marketing technical content.

Sections
1) TL;DR (3-5 sentences)
2) Claims vs Evidence — quote/paraphrase each major claim; evidence quality (strong/weak/absent)
3) Hidden Assumptions — workload, scale/environment, operational maturity
4) Missing Details — failure modes, consistency, cost, benchmark methodology
5) Pragmatic Take — POC-worthy? questions for a deep-dive

Tone: neutral, evidence-driven; no marketing language.`,
    category: 'article',
    description: 'Separate hype from proof',
    tier: 'long',
    tags: ['skeptical'],
  },

  // --- research ---
  {
    label: 'Company Research',
    value: `Role
Research analyst.

Goal
Research the company implied in the source (infer company name and URL from --- SOURCE ---; if missing, state Unknown and list what to verify).

Purpose default: vendor evaluation unless the source states otherwise.

Rules
- Use web browsing when available.
- If browsing is unavailable, say so upfront and rely on --- SOURCE --- plus clearly labeled inference.
- Source link for every key claim when possible.
- Missing data: write "Unknown" + verification step.

Output (500-700 words max)
1) One-liner + Snapshot (HQ, founded, ownership, geographies, size signals)
2) Product + ICP
3) Traction
4) Market + Competitors (top 5 table)
5) Business Model
6) Risks / Red Flags
7) Recent News (12-24 months, dated)
8) Bottom Line (3 strengths, 3 weaknesses, 3 open questions)

Source priority: primary filings/site, then reputable press.`,
    category: 'research',
    description: 'Company diligence brief',
    tier: 'long',
    tags: ['web'],
  },

  // --- code ---
  {
    label: 'README · Project',
    value: `Write a detailed README.md for the project described in the source.

If the source is not a codebase/repo, say what is missing and summarize what can be inferred.

Cover:
1) What it does and why it exists
2) Architecture and component connections
3) Directory/module roles
4) Tech choices and rationale
5) Key trade-offs
6) Lessons learned (bugs, pitfalls, practices)

Style: engaging, readable, technically deep.`,
    category: 'code',
    description: 'README from repo/docs',
    tier: 'long',
  },
  {
    label: 'Code / PR Review',
    value: `Role
Senior engineer doing a code or PR review on the source (diff, snippet, or description).

Sections
1) Summary (what changed and intent)
2) Correctness & edge cases
3) API/design & maintainability
4) Security & data handling
5) Tests & observability gaps
6) Verdict: Approve / Approve with nits / Request changes — with top 3 must-fix items

Be specific; reference lines or symbols when present in the source.`,
    category: 'code',
    description: 'Review diff or snippet',
    tier: 'long',
  },

  // --- utility ---
  {
    label: 'Compare A vs B',
    value: `The source contains two items to compare (label them A and B; if unclear, infer split from headings or "vs" language).

For each dimension: summarize A, summarize B, declare winner or "trade-off".

Dimensions (at minimum):
- Goal/fit
- Complexity
- Performance/scalability
- Operational burden
- Risk
- Recommendation for a small team vs a large org

End with a one-paragraph recommendation.`,
    category: 'utility',
    description: 'Side-by-side comparison',
    tier: 'short',
  },
  {
    label: 'Steelman + Verdict',
    value: `For the position or proposal in the source:

1) Steelman — strongest good-faith version (prose)
2) Key weaknesses — 3-5 bullets
3) Verdict — support / oppose / conditional, with conditions
4) What would change your mind

Be fair before critical.`,
    category: 'utility',
    description: 'Best case, then judgment',
    tier: 'short',
  },
  {
    label: 'Email / Reply',
    value: `Draft a professional email or comment reply to the thread/content in the source.

Requirements:
- Match the appropriate tone (reply to manager, peer, customer, or public comment)
- Be concise; lead with the answer
- Bullet action items if any
- Offer a clear next step or ask one focused question if needed

Output only the draft (no meta commentary).`,
    category: 'utility',
    description: 'Reply draft',
    tier: 'short',
  },
  {
    label: 'Translate + Tone',
    value: `Translate the source into the target language implied by the user query (if none stated, use English).

Rules:
- Preserve technical terms, code, URLs, and numbers
- Keep tone: professional and direct unless the source is casual
- After the translation, add a 2-line "Term notes" section only for ambiguous terms

Output: translation first, then term notes.`,
    category: 'utility',
    description: 'Translate preserving jargon',
    tier: 'short',
  },

  // --- experimental ---
  {
    label: 'Verbalized Sampling',
    value: `Use verbalized sampling to increase diversity and avoid repetitive answers.

For the request in --- SOURCE ---:
1) Generate 5-8 meaningfully different response variants.
2) Assign each variant a probability (<15% each).
3) Per variant: one-sentence rationale for the probability + full response in distinct style/length.
4) Number variants; avoid repeated structure.

Do not reveal hidden chain-of-thought. Keep rationales concise.`,
    category: 'experimental',
    description: 'Multiple diverse variants (experimental)',
    tier: 'long',
    tags: ['experimental'],
  },
];