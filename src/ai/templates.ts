export interface PromptTemplate {
  value: string;
  label: string;
  default?: boolean;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  { value: '', label: 'None' },
  { value: 'Provide a short TL;DR summary.', label: 'TL;DR', default: true },
  { value: 'Provide a detailed summary.', label: 'Detailed Summary' },
  { value: 'Fact-check key claims and provide sources.', label: 'Fact-Check with Sources' },
  {
    value: `Role
You are a research analyst.

Goal
Research [COMPANY] ([URL]) for [PURPOSE: investing / vendor eval / interview / competitor intel].

Rules
- Use web browsing.
- Add a source link for every key claim.
- If information is missing or uncertain, write "Unknown" and list what to verify next.
- Keep the response concise and skimmable.

Output Format (500-700 words max)
1) One-liner + Snapshot
   - What the company does (1 sentence), HQ, founded, ownership (public/private), geographies served
   - Size signals (employees and revenue range, or Unknown)
2) Product + ICP
   - Main products/services, target customers (industry + company size), top use cases
   - Pricing or packaging evidence
3) Traction
   - Named customers, case studies, partnerships
   - Recent momentum (hiring, releases, contracts, growth claims; label estimates clearly)
4) Market + Competitors
   - Category and positioning
   - Top 5 competitors in a table: company | who they serve | key difference
5) Business Model
   - Revenue model and go-to-market (sales-led / PLG / channel)
   - Distribution advantages
6) Risks / Red Flags
   - Legal/regulatory issues, security incidents, major complaints/outages, reputational risks
7) Recent News (last 12-24 months)
   - 5-10 key events with dates and links
8) Bottom Line
   - 3 strengths, 3 weaknesses, 3 open questions
   - Suggested verification next steps

Source Priority
1) Primary sources (company site, filings, regulators)
2) Reputable press and analyst reports`,
    label: 'Company Research (Web)'
  },
  { value: 'Explain this in simple terms suitable for beginners.', label: 'Explain Simply' },
  {
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
    label: 'Senior Staff Engineer Narrative'
  },
  {
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
    label: 'Senior Staff Engineer Narrative v2'
  },
  {
    value: `Role
Act as a Principal Engineer or CTO.

Goal
Treat the article as both:
1) an engineering implementation, and
2) a signal in the broader evolution of software architecture.

Task
Produce a strategic technical dossier that looks outward as much as inward.

Required Sections
1) Core Architecture (Inward Analysis)
   - Problem space: what limit was reached?
   - Mechanism: how the system works, focusing on architectural patterns (not variable names).
   - Secret sauce: the key optimization or design trick.
2) Ecosystem Landscape (Outward Context)
   - Evolutionary lineage: where this pattern comes from.
   - Competitive space: standard alternatives and why this team may have rejected them.
   - Trend alignment: whether this aligns with or opposes macro-industry trends.
3) Critical Assessment and Viability
   - Cost of complexity: necessary innovation vs resume-driven engineering.
   - Adoption viability: who should use this approach (startup vs hyperscaler fit).
   - Two-year prediction: most likely stress/failure mode.
4) Terminology Mapping
   - Map article terms to standard industry terminology.
   - Do not provide a simple dictionary.

Style
- Voice: authoritative, strategic, historically aware.
- Keep the flow concise and logical.
- Use clear headers.
- Avoid bullet lists in narrative sections`,
    label: 'CTO Strategic Technical Dossier'
  },
  {
    value: `Role
You are a Technical Professor.

Audience
A highly intelligent, research-capable student without background in this specific domain.

Task
Provide a high-density, context-first explanation of the article.

Output Structure
1) Prerequisite Context (Pre-Read)
   - Domain overview: define the sub-field.
   - Standard model: explain the common industry approach (algorithms/patterns).
   - Limitation: explain why the standard model fails in edge cases.
2) Source Material Analysis (Core)
   - Objective: the specific problem this technology solves.
   - Architecture/mechanism: data structures, control flow, algorithmic choices.
   - Differentiation: contrast with the standard model.
3) Technical Assessment
   - Trade-offs: what was gained vs sacrificed.
   - Impact: quantify improvements when metrics are available.
4) Essential Vocabulary
   - Define technical terms rigorously with precise, dictionary-style language.
   - Avoid metaphor-heavy definitions.

Style
- Direct, academic, efficient.
- Concise and logically ordered.
- Use clear headers and paragraph breaks.
- Use analogies only when strictly necessary`,
    label: 'Technical Professor (Context-First)'
  },
  {
    value: `Write a detailed README.md for this project in plain language.

Cover these topics
1) What the project does and why it exists
2) Technical architecture and how components connect
3) Codebase structure and the role of each major directory/module
4) Technologies used and why these choices were made
5) Key implementation decisions and trade-offs
6) Lessons learned, including:
   - bugs encountered and fixes
   - common pitfalls and how to avoid them
   - engineering best practices demonstrated

Style requirements
- Make it engaging and memorable, not textbook dry.
- Use analogies or short anecdotes only when they improve understanding.
- Balance readability with technical depth`,
    label: 'README.md Project Narrative'
  },
  {
    value: `Use verbalized sampling to increase diversity and avoid repetitive answers.

For each user request
1) Generate 5-8 meaningfully different response variants.
2) Assign each variant a probability (<15% each) to force diversity.
3) For each variant, include:
   - a one-sentence rationale for the probability bucket
   - the full response in a distinct style/tone/length
4) Number variants clearly and avoid repeated structure.

Constraints
- Do not reveal hidden reasoning or chain-of-thought.
- Keep rationales concise.
- Apply this process to both factual and creative requests`,
    label: 'Verbalized Sampling'
  },
];
