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

/** Shared voice for long-form templates (anchored on Senior Staff Engineer Narrative). */
const NARRATIVE_SPINE = `Narrative requirements
- Start with a concise TL;DR.
- Main body must be prose/story form (no bullet-point summary style in narrative sections).
- Set the scene first: context, constraints, and why things evolved as they did.
- Walk through decisions, friction, and resolution — not just feature lists.
- Define each technical term on first use, woven into the prose.
- End with broader context: implications, trade-offs, or what to watch next.`;

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
    label: 'TL;DR',
    value: `Open with a one-paragraph story hook (what happened and why it matters), then a tight TL;DR in prose or at most 5 bullets.`,
    category: 'meta',
    description: 'Fast skim with narrative hook',
    tier: 'short',
    tags: ['summary'],
  },
  {
    label: 'Detailed Summary',
    value: `Tell the story of the source in clear sections with headers: setup, core argument, evidence, gaps, and open questions. Use prose in each section; avoid bare bullet dumps.`,
    category: 'meta',
    description: 'Structured summary as narrative',
    tier: 'short',
    tags: ['summary'],
  },
  {
    label: 'Fact-Check',
    value: `In prose, walk through the main claims in the order they appear. For each: what was claimed, whether it holds, and sources or why uncertain. End with a short "what still needs verification" paragraph.`,
    category: 'meta',
    description: 'Claims reviewed as a narrative',
    tier: 'short',
    tags: ['skeptical'],
  },
  {
    label: 'Explain Simply',
    value: `Explain like a patient senior engineer teaching a smart newcomer: short story setup, then simple explanation under 300 words. One analogy only if it clarifies. Define jargon inline.`,
    category: 'meta',
    description: 'Beginner-friendly story explainer',
    tier: 'short',
  },
  {
    label: 'Action Items',
    value: `Brief narrative of what the source is about and what decision it implies, then a concise checklist:
- Decisions made or implied
- Action items (owner if known, else Unassigned)
- Dates/deadlines mentioned
- Open questions and blockers
- "If you only do three things" line`,
    category: 'meta',
    description: 'Context plus action checklist',
    tier: 'short',
  },
  {
    label: 'Hostile Critic',
    value: `The source is the argument to attack. In direct prose (not polite filler): how the argument could collapse (three specific failure modes), two unsupported assumptions, and one serious counter-argument not addressed.`,
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
    label: 'Article · Deep Teach',
    value: `Role
Act as a Technical Professor who teaches through story.

Audience
A strong engineer new to this sub-domain.

Task
Explain the source as a context-first narrative.

${NARRATIVE_SPINE}

Cover in prose
1) How the field usually works (standard model) and where it breaks down
2) The specific problem this technology addresses and how the mechanism unfolds (data/control flow as a story)
3) How it differs from the standard path and what trade-offs that created
4) Vocabulary defined inline on first use (rigorous, minimal metaphor)

Tone: direct, patient, like a great lecture — not a slide outline.`,
    category: 'article',
    description: 'Context-first narrative explainer',
    tier: 'long',
    tags: ['narrative'],
  },
  {
    label: 'Article · Design Doc',
    value: `Role
Principal Engineer onboarding a teammate to a system described in the source.

Task
Reverse-engineer the system as a narrative design walkthrough, then crystallize structure.

${NARRATIVE_SPINE}

In prose, cover the journey of a request through the system: components, sync/async boundaries, trust boundaries, data and control flow, idempotency/retries/backpressure, scaling and observability.

After the narrative, add a compact text diagram (indentation + arrows). Label explicit assumptions where the source is silent.`,
    category: 'article',
    description: 'System walkthrough as story + diagram',
    tier: 'long',
    tags: ['architecture', 'narrative'],
  },
  {
    label: 'Industry Comparison',
    value: `Role
Staff Engineer telling the story of a problem class and where this approach fits.

Task
Compare the source to industry norms as a narrative, not a rubric dump.

${NARRATIVE_SPINE}

In prose, weave together
- What problem class this is and how teams usually solve it today
- The mainstream stacks/patterns and their typical trade-offs
- How this approach behaves differently (consistency, latency, cost, ops, lock-in) and for whom it is a fit
- What a conventional path would still be safer for
- Long-term maintenance and migration story

Use a short comparison table only if it sharpens the story; lead with narrative.`,
    category: 'article',
    description: 'Industry fit as narrative comparison',
    tier: 'long',
    tags: ['narrative'],
  },
  {
    label: 'Hype vs Evidence',
    value: `Role
Skeptical Principal Engineer narrating a vendor or marketing post.

Task
Tell the story of what is being sold, what would have to be true for it to work, and what the evidence actually supports.

${NARRATIVE_SPINE}

In prose, cover
- The promise and the implied production story
- Major claims and whether evidence is strong, weak, or absent (quote or paraphrase claims inline)
- Hidden workload, scale, and operational assumptions
- What is missing for a serious evaluation
- A pragmatic closing: POC-worthy or not, and questions for a deep-dive

Tone: neutral, evidence-driven; no marketing voice.`,
    category: 'article',
    description: 'Hype vs proof as narrative',
    tier: 'long',
    tags: ['skeptical', 'narrative'],
  },

  // --- research ---
  {
    label: 'Company Research',
    value: `Role
Research analyst writing a diligence brief that reads like informed narrative, not a form.

Goal
Research the company implied in the source (infer name and URL; if missing, say Unknown and what to verify). Default purpose: vendor evaluation unless the source says otherwise.

Rules
- Use web browsing when available; if not, state that upfront and rely on the source plus labeled inference.
- Source link for key claims when possible; Unknown + verification step when data is missing.

Open with a narrative executive summary (5-8 sentences): what the company is, why it matters now, and your early read.

Then cover each section in prose with a short narrative lead-in before any lists or tables:
1) Snapshot (HQ, founded, ownership, geographies, size)
2) Product + ICP
3) Traction
4) Market + Competitors (table allowed for top 5)
5) Business Model
6) Risks / Red Flags
7) Recent News (12-24 months, dated)
8) Bottom Line (strengths, weaknesses, open questions as prose, then three bullets max)

Cap total length ~500-700 words. Primary sources first.`,
    category: 'research',
    description: 'Company diligence as narrative brief',
    tier: 'long',
    tags: ['web', 'narrative'],
  },

  // --- code ---
  {
    label: 'README · Project',
    value: `Write a README.md that tells the story of the project.

If the source is not a repo/codebase, say what is missing and narrate what can be inferred.

${NARRATIVE_SPINE}

Cover as engaging prose (headers OK): why the project exists, how architecture evolved, how pieces connect, tech choices as decisions-not-catalogs, trade-offs, and lessons learned (bugs, pitfalls, practices) as stories where possible.

Balance readability with technical depth — memorable, not textbook dry.`,
    category: 'code',
    description: 'README as project story',
    tier: 'long',
    tags: ['narrative'],
  },
  {
    label: 'Code / PR Review',
    value: `Role
Senior engineer reviewing a change described in the source.

Task
Review as narrative + clear verdict.

Open with a prose paragraph: what changed, what problem it solves, and the reviewer's mental model of risk.

${NARRATIVE_SPINE}

Then in prose sections (not bullet rubrics): correctness and edge cases, API/design, security/data, tests/observability. Reference lines or symbols when present.

Close with verdict (Approve / Approve with nits / Request changes) and the top three must-fix items woven into a short closing paragraph.`,
    category: 'code',
    description: 'PR review as narrative',
    tier: 'long',
    tags: ['narrative'],
  },

  // --- utility ---
  {
    label: 'Compare A vs B',
    value: `The source compares two options (label A and B; infer from headings or "vs" if unclear).

Tell the story of why both exist, then walk through each dimension in prose (goal, complexity, performance, ops burden, risk). End with a one-paragraph recommendation for a small team vs a large org.`,
    category: 'utility',
    description: 'Comparison as narrative',
    tier: 'short',
    tags: ['narrative'],
  },
  {
    label: 'Steelman + Verdict',
    value: `For the position in the source: first steelman in full prose (strongest good-faith case). Then a short narrative of key weaknesses, your verdict (support/oppose/conditional) with conditions, and what would change your mind.`,
    category: 'utility',
    description: 'Steelman story, then judgment',
    tier: 'short',
    tags: ['narrative'],
  },
  {
    label: 'Email / Reply',
    value: `Draft a professional reply to the source thread. Lead with the answer in the first sentence, keep the body concise, use bullets only for action items if needed, match tone to audience (manager/peer/customer/public). Output only the draft.`,
    category: 'utility',
    description: 'Reply draft',
    tier: 'short',
  },
  {
    label: 'Translate + Tone',
    value: `Translate the source to the language implied in the user query (default English). Preserve code, URLs, numbers, and technical terms. Professional direct tone unless the source is casual. After translation, at most 2 lines of term notes for ambiguous words.`,
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
