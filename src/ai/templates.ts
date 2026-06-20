/**
 * Prompt templates for the Multi-AI dialog.
 */

export type PromptCategory =
  | 'quick'
  | 'explain'
  | 'research'
  | 'decision'
  | 'code'
  | 'writing'
  | 'experimental';
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
  quick: 'Quick',
  explain: 'Explain',
  research: 'Research',
  decision: 'Decision',
  code: 'Code',
  writing: 'Writing',
  experimental: 'Experimental',
};

export const PROMPT_CATEGORY_ORDER: PromptCategory[] = [
  'quick',
  'explain',
  'research',
  'decision',
  'code',
  'writing',
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
  // --- quick ---
  {
    label: 'TL;DR',
    value: `Give the answer first. Then explain why it matters and what to do next. Keep it under 200 words unless the source is complex. Use at most 5 bullets.`,
    category: 'quick',
    description: 'Fast answer with next step',
    tier: 'short',
    tags: ['summary'],
  },
  {
    label: 'Detailed Summary',
    value: `Tell the story of the source in clear sections with headers: setup, core argument, evidence, gaps, and open questions. Use prose in each section; avoid bare bullet dumps.`,
    category: 'quick',
    description: 'Structured summary as narrative',
    tier: 'short',
    tags: ['summary'],
  },
  {
    label: 'Claim Audit',
    value: `Audit only the claims present in the source. Do not browse unless explicitly asked. Walk through claims in order: what was claimed, what evidence the source gives, what is unsupported or ambiguous, and what would be needed to verify it. End with "what still needs verification."`,
    category: 'quick',
    description: 'Source-only claim review',
    tier: 'short',
    tags: ['skeptical'],
  },
  {
    label: 'Web Fact-Check',
    value: `Fact-check the source using current web research when available. Identify the central claims, verify them against primary or high-quality sources, include source links and dates for time-sensitive facts, and clearly mark each claim as supported, contradicted, partly supported, or unresolved. End with confidence and what would change the conclusion.`,
    category: 'research',
    description: 'Claims verified with sources',
    tier: 'long',
    tags: ['web', 'skeptical'],
  },
  {
    label: 'Explain Simply',
    value: `Explain like a patient senior engineer teaching a smart newcomer: short story setup, then simple explanation under 300 words. One analogy only if it clarifies. Define jargon inline.`,
    category: 'explain',
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
    category: 'writing',
    description: 'Context plus action checklist',
    tier: 'short',
  },
  {
    label: 'Hostile Critic',
    value: `The source is the argument to attack. In direct prose (not polite filler): how the argument could collapse (three specific failure modes), two unsupported assumptions, and one serious counter-argument not addressed.`,
    category: 'decision',
    description: 'Stress-test an argument',
    tier: 'short',
    tags: ['skeptical'],
  },

  // --- explain ---
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
    category: 'explain',
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
    category: 'explain',
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
    category: 'code',
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
    category: 'explain',
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
    category: 'research',
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
  {
    label: 'Competitor Research',
    value: `Role
Act as a market research analyst specializing in competitive intelligence.

Goal
Research and map the competitive landscape for the product, service, or company implied in the source. Identify who the main players are, how they compete, and where the subject fits in the broader market.

Rules
- Use web browsing when available for current market share, pricing, feature sets, and recent moves.
- Distinguish between direct competitors (same problem, same way) and indirect competitors (same problem, different way).
- Cite sources for key claims, especially market data or pricing.
- Separate verified facts from inference.

Output
1) Market Narrative
   - Open with a 5-8 sentence narrative describing the current state of the market (growing, mature, fragmented, winner-take-all) and the primary "job to be done" that these competitors are fighting over.
2) Primary Competitors (Direct)
   - Identify the top 3-5 direct competitors. For each, provide a narrative summary of:
     - Core Value Proposition: What they claim to do best.
     - Target Audience: Who they are built for.
     - Pricing Strategy: Premium vs. budget, seat-based vs. usage-based, etc.
     - Key Strengths: Why customers choose them.
     - Known Weaknesses: Recurring complaints or missing capabilities.
3) Indirect & Emerging Threats
   - Identify 2-3 indirect competitors or emerging startups that are approaching the problem differently.
   - Explain how they might disrupt the current market leaders.
4) Comparison Matrix
   - Provide a table comparing the subject and its top 3 competitors across: Feature Depth, Ease of Use, Pricing, Enterprise Readiness, and Ecosystem/Integrations.
5) Competitive Moat & Gaps
   - In prose, analyze the subject's "moat" (defensible advantage) and its most critical "gaps" (vulnerabilities) relative to the field.
6) Strategic Outlook
   - Three specific recommendations for how the subject could better differentiate or where they are most at risk of losing ground.

Tone: Professional, objective, and analytical. Lead with narrative insight before moving into tables or lists.`,
    category: 'research',
    description: 'Market landscape and competitive intelligence',
    tier: 'long',
    tags: ['web', 'competitors', 'market'],
  },
  {
    label: 'User Reviews + Sentiment',
    value: `Role
Act as a product research analyst doing evidence-based customer and competitor research.

Goal
Analyze real user reviews, community discussion, and expert/user commentary for the product, company, app, service, or tool implied in the source. Then compare that sentiment with its top competitors.

Rules
- Use web browsing when available; if not, state that upfront and separate source-based inference from verified claims.
- Prefer primary review/community sources when possible: official app stores, G2, Capterra, Trustpilot, Reddit, Hacker News, GitHub issues, forums, YouTube comments, support/community boards, and recent social discussion.
- Include source links for important claims and date-sensitive facts.
- Do not average vibes. Explain the distribution: who loves it, who hates it, who is lukewarm, and why.
- Distinguish user sentiment from your own product judgment.

Output
1) Executive Read
   - Open with a concise narrative summary of overall sentiment, review volume/recency if visible, and the biggest pattern.
2) Sentiment Breakdown
   - Positive themes: what users repeatedly praise, with concrete examples.
   - Negative themes: recurring complaints, friction, reliability issues, pricing objections, missing features, support problems.
   - Neutral/mixed themes: trade-offs users accept or disagree on.
   - Segment differences: beginners vs power users, small teams vs enterprises, developers vs non-technical users, or other relevant groups.
3) Evidence Table
   - Source, date/recency, user segment if known, sentiment, specific claim, confidence.
4) Top Competitor Comparison
   - Identify 3-5 top competitors and explain why each is a competitor.
   - Compare review sentiment across pricing, onboarding, core workflow, feature depth, reliability/performance, integrations/ecosystem, support, and trust/security.
   - Call out where competitors clearly win, where this product wins, and where evidence is weak.
5) Buyer/User Implications
   - Best-fit users and worst-fit users.
   - Main risks before adopting.
   - Questions to ask or tests to run before choosing.

Be concrete and evidence-driven. Use a comparison table where it improves scanability, but lead each major section with prose.`,
    category: 'research',
    description: 'User sentiment with competitor comparison',
    tier: 'long',
    tags: ['web', 'reviews', 'sentiment', 'competitors'],
  },
  {
    label: 'Exact Use Cases',
    value: `Role
Act as a product strategist and domain expert translating a product, technology, company, article, or idea into concrete real-world usage.

Goal
Produce the most specific, practical set of use cases possible for the subject implied in the source. Avoid generic categories; give exact scenarios, actors, workflows, inputs, outputs, constraints, and success criteria.

Rules
- If the source is vague, infer likely use cases but label assumptions clearly.
- Use web browsing when available for product capabilities, customer examples, documentation, and case studies; cite links for factual claims.
- Prefer detailed examples over abstract taxonomy.
- Cover both obvious and non-obvious uses, including edge cases and cases where the subject is a bad fit.

Output
1) Quick Orientation
   - In prose, explain what the subject is, who it is for, and what job it appears to do.
2) Use Case Inventory
   Cover the top 8 use cases unless the source demands exhaustive coverage. For each use case, include:
   - Use case name
   - User/persona and context
   - Triggering situation or pain
   - Exact workflow step by step
   - Required inputs/data/integrations
   - Expected output or decision
   - Why this approach is better than the old way or alternative
   - Limits, risks, or failure modes
   - Success metric
   - Concrete example with realistic details
3) Prioritization
   - Rank use cases by practical value, ease of adoption, frequency, and differentiation.
   - Identify quick wins vs advanced/enterprise-only uses.
4) Competitor/Alternative Fit
   - Briefly note which use cases competitors or conventional workflows may handle better.
5) Implementation Examples
   - Provide 3-5 fully worked examples with sample inputs and outputs. Make them specific enough that a user could copy the pattern and apply it immediately.

Be as detailed as possible while staying grounded. Do not stop at "marketing automation", "analytics", or "productivity"; describe the exact campaign, query, report, handoff, decision, or operation.`,
    category: 'research',
    description: 'Concrete use cases and worked examples',
    tier: 'long',
    tags: ['web', 'examples', 'use-cases'],
  },
  {
    label: 'Compare Products',
    value: `Role
Product evaluator comparing tools, vendors, or services.

Task
Compare the products implied by the source for a real buyer/user decision.

Rules
- Use web browsing when available for current pricing, packaging, docs, reviews, and recent changes.
- Prefer primary sources for features/pricing/security claims.
- Separate verified facts from inference.

Output
1) Executive Verdict
   - Who should choose each product and why.
2) Buyer Context
   - Assumed user, team size, workflow, budget sensitivity, and risk tolerance.
3) Comparison Table
   - ICP, core workflow, pricing model, onboarding, integrations, reliability/performance, security/trust, lock-in, support, and ecosystem.
4) Narrative Trade-Offs
   - Where each product wins, where it fails, and what compromises the buyer accepts.
5) Decision Guidance
   - Best fit, worst fit, migration concerns, proof-of-concept tests, and questions to ask sales/support.`,
    category: 'research',
    description: 'Product/vendor decision comparison',
    tier: 'long',
    tags: ['web', 'competitors', 'decision'],
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
Review the change for bugs, regressions, missing tests, and design risk.

Output Requirements
- Findings first, ordered by severity.
- For each finding, include file/line/symbol references when present, the concrete risk, and a suggested fix.
- Prioritize correctness, security/data safety, edge cases, API/design compatibility, observability, and test gaps.
- Do not spend space praising the change.

After findings, add: Open Questions, Test Gaps, and Verdict (Approve / Approve with nits / Request changes). If there are no findings, say that clearly and name any residual risk.`,
    category: 'code',
    description: 'Findings-first code review',
    tier: 'long',
    tags: ['review'],
  },
  {
    label: 'Debug This',
    value: `Role
Senior engineer debugging a production or development issue.

Task
Analyze the error, log, stack trace, broken behavior, or failing test in the source.

Output
1) Immediate Read
   - What is most likely happening, in plain language.
2) Likely Causes
   - Rank causes by probability. For each: evidence for, evidence against, and what would confirm it.
3) Fast Checks
   - Exact commands, logs, breakpoints, queries, or inspections to run next.
4) Minimal Fix
   - Smallest likely change and why it addresses the root cause.
5) Prevention
   - Test, guardrail, logging, alert, or design improvement that would prevent recurrence.

Be concrete. Do not give generic debugging advice when the source contains specific evidence.`,
    category: 'code',
    description: 'Rank causes and fixes',
    tier: 'long',
    tags: ['debug', 'troubleshooting'],
  },
  {
    label: 'Architecture Critique',
    value: `Role
Principal engineer stress-testing an architecture.

Task
Critique the system, design, proposal, or article in the source.

Output
1) System Read
   - Short narrative of the architecture and its likely goals.
2) Major Risks
   - Scaling, consistency, coupling, failure modes, security/trust boundaries, data lifecycle, cost, migration, and operations.
3) Missing Details
   - What the design does not specify but production would require.
4) Safer Alternatives
   - Simpler or more conventional paths, with trade-offs.
5) Recommendation
   - Proceed, revise, prototype, or reject. Include the first validation test that would reduce uncertainty most.

Focus on real production failure modes, not aesthetic preferences.`,
    category: 'code',
    description: 'Production design stress test',
    tier: 'long',
    tags: ['architecture', 'skeptical'],
  },

  // --- decision ---
  {
    label: 'Decision Memo',
    value: `Turn the source into a concise decision memo.

Output
1) Decision
   - State the recommended decision in the first paragraph.
2) Context
   - What problem is being solved, who is affected, and what constraints matter.
3) Options
   - Compare viable options, including doing nothing.
4) Rationale
   - Why the recommendation wins on impact, cost, risk, reversibility, and timing.
5) Risks
   - Failure modes, assumptions, and what would change the decision.
6) Next Step
   - The smallest concrete action to move forward.

Keep it direct and useful for someone who has to approve or execute the decision.`,
    category: 'decision',
    description: 'Recommendation with rationale',
    tier: 'long',
    tags: ['decision'],
  },
  {
    label: 'Implementation Plan',
    value: `Turn the source into an execution plan.

Output
1) Goal
   - What success looks like and how it will be measured.
2) Scope
   - In scope, out of scope, assumptions, and dependencies.
3) Plan
   - Phases or milestones with concrete tasks.
4) Risks
   - Technical, product, operational, and coordination risks with mitigations.
5) Validation
   - Tests, review points, rollout criteria, and rollback plan.
6) First Three Tasks
   - The next actions someone can start immediately.

Prefer specific tasks and sequencing over generic project-management language.`,
    category: 'decision',
    description: 'Phased execution plan',
    tier: 'long',
    tags: ['planning'],
  },
  {
    label: 'Spec From Source',
    value: `Extract a working spec from the source.

Output
1) Problem Statement
2) Goals and Non-Goals
3) Users / Actors
4) Functional Requirements
5) Non-Functional Requirements
6) User Stories or Workflows
7) Acceptance Criteria
8) Edge Cases and Error States
9) Open Questions

Mark inferred requirements clearly. Keep wording implementation-neutral unless the source already commits to a technical approach.`,
    category: 'decision',
    description: 'Requirements and acceptance criteria',
    tier: 'long',
    tags: ['spec', 'requirements'],
  },
  {
    label: 'Compare A vs B',
    value: `The source compares two options (label A and B; infer from headings or "vs" if unclear).

Tell the story of why both exist, then walk through each dimension in prose (goal, complexity, performance, ops burden, risk). End with a one-paragraph recommendation for a small team vs a large org.`,
    category: 'decision',
    description: 'Comparison as narrative',
    tier: 'short',
    tags: ['narrative'],
  },
  {
    label: 'Steelman + Verdict',
    value: `For the position in the source: first steelman in full prose (strongest good-faith case). Then a short narrative of key weaknesses, your verdict (support/oppose/conditional) with conditions, and what would change your mind.`,
    category: 'decision',
    description: 'Steelman story, then judgment',
    tier: 'short',
    tags: ['narrative'],
  },
  {
    label: 'Email / Reply',
    value: `Draft a professional reply to the source thread. Lead with the answer in the first sentence, keep the body concise, use bullets only for action items if needed, match tone to audience (manager/peer/customer/public). Output only the draft.`,
    category: 'writing',
    description: 'Reply draft',
    tier: 'short',
  },
  {
    label: 'Translate + Tone',
    value: `Translate the source to the language implied in the user query (default English). Preserve code, URLs, numbers, and technical terms. Professional direct tone unless the source is casual. After translation, at most 2 lines of term notes for ambiguous words.`,
    category: 'writing',
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
