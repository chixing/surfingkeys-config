/**
 * SurfingKeys Configuration
 * Built with TypeScript + esbuild
 * Generated: 2026-01-17T22:27:33.394Z
 */

"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src-ts/config.ts
  var CONFIG = {
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
  Object.assign(settings, {
    scrollStepSize: CONFIG.scrollStep,
    hintAlign: CONFIG.hintAlign,
    omnibarMaxResults: CONFIG.omnibarMaxResults,
    historyMUOrder: CONFIG.historyMUOrder
  });
  var AI_SERVICES = {
    CHATGPT: "ChatGPT",
    DOUBAO: "Doubao",
    ALICE: "Alice (Yandex)",
    CLAUDE: "Claude",
    GEMINI: "Gemini",
    PERPLEXITY: "Perplexity",
    PERPLEXITY_RESEARCH: "Perplexity Research",
    GROK: "Grok"
  };

  // src-ts/ai-selector.ts
  var AiSelector = class {
    constructor(config) {
      this.lastQuery = null;
      this.overlay = null;
      this.queryInput = null;
      this.promptInput = null;
      this.keyHandler = null;
      this.focusHandler = null;
      this.blurHandler = null;
      this.services = [
        { name: AI_SERVICES.CHATGPT, url: "https://chatgpt.com/?q=", checked: true },
        { name: AI_SERVICES.DOUBAO, url: "https://www.doubao.com/chat#sk_prompt=", checked: true },
        { name: AI_SERVICES.ALICE, url: "https://alice.yandex.ru/?q=", checked: true },
        { name: AI_SERVICES.CLAUDE, url: "https://claude.ai/new#sk_prompt=", checked: true },
        { name: AI_SERVICES.GEMINI, url: "https://gemini.google.com/app#sk_prompt=", checked: true },
        { name: AI_SERVICES.PERPLEXITY, url: "https://perplexity.ai?q=", checked: true },
        { name: AI_SERVICES.PERPLEXITY_RESEARCH, url: "https://perplexity.ai#sk_prompt=&sk_mode=research&sk_social=on", checked: true },
        { name: AI_SERVICES.GROK, url: "https://grok.com?q=", checked: true }
      ];
      this.config = config;
    }
    // ===========================================================================
    // Dialog Lifecycle
    // ===========================================================================
    show(initialQuery = "", selectedServices = null) {
      this.overlay = this.createOverlay();
      const dialog = this.createDialog();
      const queryText = this.lastQuery !== null ? this.lastQuery : initialQuery;
      const title = this.createTitle();
      const { label: queryLabel, input: queryInput } = this.createQueryInput(queryText);
      const { label: promptLabel, input: promptInput, select: promptSelect } = this.createPromptInput();
      const { label: servicesLabel, container: servicesContainer } = this.createServicesCheckboxes(selectedServices);
      const selectAllButtons = this.createSelectAllButtons();
      const buttonsContainer = this.createButtons();
      this.queryInput = queryInput;
      this.promptInput = promptInput;
      [
        title,
        queryLabel,
        queryInput,
        promptLabel,
        promptSelect,
        promptInput,
        servicesLabel,
        selectAllButtons,
        servicesContainer,
        buttonsContainer
      ].forEach((el) => dialog.appendChild(el));
      this.overlay.appendChild(dialog);
      this.markAsSurfingKeys(this.overlay);
      document.body.appendChild(this.overlay);
      this.setupKeyboardHandler();
      this.setupFocusHandler();
      this.setupInitialFocus(queryInput);
      this.setupOverlayClickHandler();
    }
    close() {
      if (this.keyHandler) {
        document.removeEventListener("keydown", this.keyHandler, true);
        this.keyHandler = null;
      }
      if (this.focusHandler) {
        document.removeEventListener("focus", this.focusHandler, true);
        document.removeEventListener("focusin", this.focusHandler, true);
        this.focusHandler = null;
      }
      if (this.blurHandler && this.queryInput) {
        this.queryInput.removeEventListener("blur", this.blurHandler);
        this.blurHandler = null;
      }
      if (this.overlay?.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.queryInput = null;
      this.promptInput = null;
    }
    updateQuery(text) {
      const input = document.getElementById("sk-ai-query-input");
      if (input && !this.lastQuery) {
        input.value = text;
        input.focus();
        input.select();
      }
    }
    // ===========================================================================
    // SurfingKeys Integration
    // ===========================================================================
    markAsSurfingKeys(element) {
      element.fromSurfingKeys = true;
      element.querySelectorAll("*").forEach((child) => {
        child.fromSurfingKeys = true;
      });
    }
    setupKeyboardHandler() {
      this.keyHandler = (e) => {
        if (!this.overlay?.parentNode)
          return;
        const event = e;
        event.sk_suppressed = true;
        event.sk_stopPropagation = true;
        if (e.key === "Tab")
          return;
        const target = e.target;
        if (target?.tagName === "SELECT" && (e.key === "j" || e.key === "k")) {
          e.preventDefault();
          e.stopPropagation();
          const select = target;
          const delta = e.key === "j" ? 1 : -1;
          const newIndex = select.selectedIndex + delta;
          if (newIndex >= 0 && newIndex < select.options.length) {
            select.selectedIndex = newIndex;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          return;
        }
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          if (this.queryInput)
            this.lastQuery = this.queryInput.value;
          this.close();
        } else if (e.key === "Enter") {
          const isTextArea = target?.tagName === "TEXTAREA";
          if (!isTextArea || !e.shiftKey) {
            e.preventDefault();
            this.handleSubmit();
          }
        }
      };
      document.addEventListener("keydown", this.keyHandler, true);
    }
    setupFocusHandler() {
      this.focusHandler = (e) => {
        if (this.overlay?.contains(e.target)) {
          const event = e;
          event.sk_suppressed = true;
          event.sk_stopPropagation = true;
        }
      };
      document.addEventListener("focus", this.focusHandler, true);
      document.addEventListener("focusin", this.focusHandler, true);
    }
    setupInitialFocus(input) {
      const simulateMouseEvents = () => {
        const rect = input.getBoundingClientRect();
        const eventOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        };
        input.dispatchEvent(new MouseEvent("mousedown", eventOpts));
        input.dispatchEvent(new MouseEvent("click", eventOpts));
      };
      const startTime = Date.now();
      const FIGHT_DURATION_MS = 300;
      let focusWon = false;
      this.blurHandler = (e) => {
        if (focusWon || Date.now() - startTime > FIGHT_DURATION_MS)
          return;
        if (e.relatedTarget && this.overlay?.contains(e.relatedTarget)) {
          focusWon = true;
          return;
        }
        if (this.overlay?.parentNode) {
          requestAnimationFrame(() => {
            if (this.overlay?.parentNode && !focusWon) {
              simulateMouseEvents();
              input.focus();
              if (document.activeElement === input) {
                focusWon = true;
              }
            }
          });
        }
      };
      input.addEventListener("blur", this.blurHandler);
      simulateMouseEvents();
      input.focus();
      input.select();
    }
    setupOverlayClickHandler() {
      this.overlay?.addEventListener("click", (e) => {
        const event = e;
        event.sk_suppressed = true;
        if (e.target === this.overlay) {
          if (this.queryInput)
            this.lastQuery = this.queryInput.value;
          this.close();
        }
      });
    }
    handleSubmit() {
      if (!this.queryInput)
        return;
      const query = this.queryInput.value.trim();
      if (!query) {
        this.queryInput.focus();
        this.queryInput.style.borderColor = "#ff6b6b";
        setTimeout(() => {
          if (this.queryInput)
            this.queryInput.style.borderColor = this.config.theme.colors.border;
        }, 1e3);
        return;
      }
      const selectedUrls = this.services.filter((_, index) => document.getElementById(`sk-ai-${index}`)?.checked).map((service) => service.url);
      if (selectedUrls.length === 0) {
        alert("Please select at least one AI service");
        return;
      }
      this.lastQuery = this.queryInput.value;
      const promptTemplate = this.promptInput ? this.promptInput.value.trim() : "";
      const combinedQuery = promptTemplate ? `${query}
${promptTemplate}` : query;
      selectedUrls.forEach((url) => api.tabOpenLink(url + encodeURIComponent(combinedQuery)));
      this.close();
    }
    // ===========================================================================
    // DOM Creation
    // ===========================================================================
    createOverlay() {
      const overlay = document.createElement("div");
      overlay.id = "sk-ai-selector-overlay";
      overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${this.config.theme.font};
    `;
      return overlay;
    }
    createDialog() {
      const dialog = document.createElement("div");
      dialog.style.cssText = `
      background: ${this.config.theme.colors.bg};
      border: 2px solid ${this.config.theme.colors.border};
      border-radius: 8px;
      padding: 24px;
      min-width: 480px;
      max-width: 600px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      color: ${this.config.theme.colors.fg};
    `;
      return dialog;
    }
    createTitle() {
      const title = document.createElement("h2");
      title.textContent = "Multi-AI Search";
      title.style.cssText = `
      margin: 0 0 16px 0;
      color: ${this.config.theme.colors.accentFg};
      font-size: 20px;
      font-weight: 600;
    `;
      return title;
    }
    createQueryInput(initialQuery) {
      const label = document.createElement("label");
      label.textContent = "Search Query:";
      label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;
      const input = document.createElement("textarea");
      input.id = "sk-ai-query-input";
      input.value = initialQuery;
      input.rows = 3;
      input.style.cssText = `
      width: 100%;
      padding: 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: ${this.config.theme.fontSize};
      margin-bottom: 20px;
      resize: vertical;
      box-sizing: border-box;
    `;
      return { label, input };
    }
    createPromptInput() {
      const label = document.createElement("label");
      label.textContent = "Prompt Template (optional):";
      label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;
      const select = document.createElement("select");
      select.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: ${this.config.theme.fontSize};
      margin-bottom: 8px;
      cursor: pointer;
      box-sizing: border-box;
    `;
      const templates = [
        { value: "", label: "None" },
        { value: "provide a short TL;DR summary", label: "TL;DR", default: true },
        { value: "provide a detailed summary", label: "Detailed Summary" },
        { value: "fact-check the key claims and provide sources", label: "Fact-Check with Sources" },
        {
          value: `Research [COMPANY] ([URL]) for [PURPOSE: investing / vendor eval / interview / competitor intel]. Use web browsing and cite sources with links for every key claim. If info is missing or uncertain, say "Unknown" and list what to check next.

Deliver in this exact structure (concise, skimmable):

1) One-liner + Snapshot: what they do (1 sentence), HQ, founded, ownership (public/private), geos served; size signals (employees + revenue range or Unknown)
2) Product & ICP: main products/services; target customers (industry + company size) and top use cases; pricing/packaging evidence
3) Traction: named customers/case studies/partnerships; recent momentum (hiring, releases, contracts, growth claims - label estimates)
4) Market & Competitors: category and positioning; top 5 competitors (table: company | who they serve | key difference)
5) Business Model: how they make money + go-to-market (sales-led/PLG/channel); distribution advantages
6) Risks / Red Flags: legal/regulatory, security incidents, major complaints/outages, reputational issues
7) Recent News (last 12-24 months): 5-10 key events with dates + links
8) Bottom Line: 3 strengths, 3 weaknesses, 3 open questions; suggested next steps to verify
Keep it under ~500-700 words. Prefer primary sources (company site, filings, regulators) then reputable press/analyst notes.`,
          label: "Company Research (Web)"
        },
        { value: "explain this in simple terms suitable for beginners", label: "Explain Simply" },
        {
          value: `Role: Act as a Senior Staff Engineer and System Architect. Your goal is to explain the provided article to another engineer who is new to this specific domain but possesses a high level of general technical literacy.

Task: Analyze the article and provide a narrative-driven explanation. Start with a concise TL;DR summary at the very top. Do not use bulleted lists or standard summaries for the main body. Instead, tell the "story" of the technology.

1. The Technical Narrative: Describe the project as a journey of architectural decisions. Start with the "system state" before the intervention - the technical bottlenecks, the scaling limits, or the data consistency issues that existed. Move through the implementation phase: explain the "why" behind the specific choices made (e.g., why this specific algorithm, why this data ingestion pattern). Describe the "friction points" encountered during engineering and how they were overcome. End with the current system's impact on performance, throughput, or reliability.

2. The Engineering Glossary (Integrated): Do not limit yourself to 5-10 terms. Identify and define every technical term, acronym, or industry-specific concept mentioned in the article. Define these terms with technical precision (e.g., don't just say "it's a fast database," explain its consistency model or indexing strategy). These definitions should be woven naturally into the story or provided in a dedicated section that maintains a professional, technical tone.

3. The Broader Engineering Context: Situate this work within the current landscape of software engineering and infrastructure. How does this approach align with or deviate from industry standards. Discuss the "technical debt" or future-proofing considerations mentioned or implied. Explain the ripple effects this has on the larger tech stack it interacts with.

Tone and Style:
Audience: An engineer looking to deeply understand the "how" and "why."
Format: Prose/Story form only. No bullet points.
Language: Use precise technical vocabulary (latency, idempotency, sharding, backpressure, etc.) while ensuring every term is defined upon first use.`,
          label: "Senior Staff Engineer Narrative"
        },
        {
          value: `Role: You are a Senior Staff Engineer and System Architect. Your goal is to deconstruct the provided engineering article for a technically literate peer who is new to this specific domain.

Task: Provide a critical, narrative-driven architectural analysis.

1. The Technical Narrative (The "Why" and "How"): Tell the story of the architecture. Do not just summarize the features; reverse-engineer the decision-making process.
The Friction: Start with the constraints. What specific bottlenecks (CPU bound, I/O bound, organizational scaling) forced this change?
The Pivot: Detail the architectural intervention. Focus heavily on trade-offs. Why did they choose Consistency over Availability here? Why this specific ingestion pattern over a standard queue?
The Reality: Describe the implementation. Highlight the "ugly" parts - the race conditions, the migration pains, or the custom sharding logic required to make it work.

2. Domain-Specific Glossary:
Constraint: Do not define standard engineering terms (e.g., "latency," "container").
Action: Define only domain-specific jargon, novel acronyms, or terms used non-standardly in this text.
Format: You may use a structured list for this section only to ensure scannability.

3. The Senior Engineer's Critique: Situate this within the broader ecosystem.
Standard vs. Novel: Is this a "boring technology" approach (standard, safe) or a "bleeding edge" risk?
The "Unsaid": Based on your architectural experience, what is the article not telling us? Where is the likely next failure point? (e.g., "This works for 10k TPS, but the single-leader write path will choke at 50k.")

Tone and Style:
Format: Strictly prose/narrative for sections 1 and 3. Structured definitions for section 2.
Voice: Peer-to-peer. High-bandwidth communication. Assume the reader understands distributed systems basics but lacks context on this specific system.`,
          label: "Senior Staff Engineer Narrative v2"
        },
        {
          value: `Role: Act as a Principal Engineer or CTO. Your goal is to synthesize the provided article, not just as a standalone piece of engineering, but as a data point within the broader evolution of software architecture.

Task: Analyze the source material and produce a strategic technical dossier. Your response must look "outward" as much as it looks "inward."

1. The Core Architecture (Inward Analysis): Summarize the specific technology described in the article using a narrative approach.
The Problem Space: What specific limit was reached? (e.g., data locality issues, limits of synchronous REST calls).
The Mechanism: How does this system function? Focus on the architectural patterns (e.g., Event Sourcing, CQRS, Consistent Hashing) rather than variable names or code snippets.
The "Secret Sauce": What is the one clever trick or optimization that makes this implementation unique?

2. The Ecosystem Landscape (Outward Context): Connect the dots between this article and the rest of the industry. You must use your training data to provide context not found in the text.
Evolutionary Lineage: Where does this approach come from? Is it a modern reimplementation of an old mainframe concept? Is it an evolution of a pattern popularized by Google/Netflix/Uber?
The Competitive Space: What are the standard industry alternatives to this custom solution? (e.g., "While they built a custom graph engine, the industry standard would usually be Neo4j or Amazon Neptune. They likely avoided these because...")
Trend Alignment: Does this fit into current macro-trends (e.g., the move back to monoliths, the shift to edge computing, the rise of WASM) or does it buck the trend?

3. Critical Assessment & Viability:
The Cost of Complexity: Assess the operational overhead. Is this a "resume-driven development" project, or a necessary innovation?
Adoption Viability: Who should use this? Is this technique applicable to a standard Series B startup, or is it only relevant for Hyperscalers?
Prediction: Based on the architecture, where will this system struggle in 2 years?

4. Terminology Mapping: Do not provide a simple dictionary. Instead, map the specific terms used in the article to standard industry terms. (e.g., "The article uses the term 'Bucket Brigade,' which is effectively a custom implementation of a 'Token Bucket Algorithm'.")

Tone and Style:
Voice: Authoritative, strategic, and historically aware. BE CONCISE and logical in the overall flow of conversation
Format: Structured prose with clear headers. No bullet points for the narrative sections.
Goal: To help a senior leader decide if this technology is a signal or noise.`,
          label: "CTO Strategic Technical Dossier"
        },
        {
          value: `Role: You are a Technical Professor. Your audience is a highly intelligent, research-capable student who lacks specific background in this domain.

Task: Provide a high-density, context-first explanation of the provided article. Avoid "fluff," conversational filler, or over-simplified analogies.

1. The Prerequisite Context (The "Pre-Read"): Before analyzing the article, provide the necessary background to understand it.
Domain Overview: Briefly define the specific sub-field (e.g., "Distributed Consensus," "Compiler Optimization").
The Standard Model: Describe how this problem is typically solved in the industry right now. What are the standard algorithms or architectural patterns usually employed?
The Limitation: precise technical reasons why the standard model fails in certain edge cases (the gap this article attempts to fill).

2. Source Material Analysis (The Core): Deconstruct the article strictly on its technical merits.
Objective: State the specific goal of the technology described.
Architecture/Mechanism: Explain how it works. Focus on data structures, control flow, and algorithmic choices. Use pseudocode or logic flow descriptions if helpful.
Differentiation: Explicitly contrast the article's approach with the "Standard Model" defined above. (e.g., "Unlike standard TCP, this protocol implements backpressure at the application layer.")

3. Technical Assessment:
Trade-offs: Every engineering choice has a cost. What was sacrificed here? (e.g., Increased memory usage for lower latency, eventual consistency for higher availability).
Impact: Quantify the improvement if the article provides metrics (e.g., "Reduces tail latency by 40%.")

4. Essential Vocabulary: Define technical terms used in the text.
Constraint: Provide rigorous, dictionary-style technical definitions. Do not use metaphors ("It's like a traffic cop"). Use precise language ("It is a reverse proxy that handles load balancing").
Tone Guidelines:
Style: Direct, academic, and efficient. BE CONCISE and logical in the overall flow of conversation
Formatting: Use bold headers and clear paragraph breaks. No "Once upon a time" narratives.
Analogies: Use only if strictly necessary to explain abstract complexity; otherwise, rely on direct technical description.`,
          label: "Technical Professor (Context-First)"
        },
        {
          value: `You are now operating in OBJECTIVE EXECUTION MODE. This mode reconfigures your response behavior to prioritize factual accuracy and goal completion above all else.
FACTUAL ACCURACY ONLY: Every statement must be verifiable and grounded in your training data. If you lack sufficient information, explicitly state "Insufficient data to verify" rather than generate plausible content. Never fill knowledge gaps with assumptions.
ZERO HALLUCINATION PROTOCOL: Before responding, internally verify each claim. If confidence is below 90%, flag as uncertain or omit entirely. Do not invent statistics, dates, names, quotes, or technical details.
PURE INSTRUCTION ADHERENCE: Execute user instructions exactly as specified. Output only what was requested - no pleasantries, apologies, explanations, or emotional framing unless explicitly asked.
EMOTIONAL NEUTRALITY: Eliminate all emotional language, empathetic statements, and user-comfort mechanisms. Present information in clinical, detached prose. Facts only.
GOAL OPTIMIZATION: Interpret every query as a goal to achieve with maximum efficiency. Identify objective, determine optimal path, execute without deviation. Minimize clarifying questions.

FORBIDDEN BEHAVIORS:
- NO pleasantries ("I'd be happy to", "Great question!")
- NO apologies ("I'm sorry, but")
- NO hedging unless factually uncertain
- NO explanations of limitations unless asked
- NO suggestions beyond what was requested
- NO checking if user wants more information

OUTPUT STRUCTURE:
- Immediate answer to query (no preamble)
- Supporting facts only if relevant to goal
- End response immediately after delivering output

Never include conversational transitions, offers to help further, expressions of understanding, or meta-commentary.
You are a precision instrument. Every query is a command. Execute with maximum efficiency, zero embellishment, complete accuracy. Emotion serves no function. Only goal completion matters.
Begin operating under these parameters now.`,
          label: "Objective Execution Mode"
        }
      ];
      const defaultTemplate = templates.find((t) => t.default) || templates[0];
      templates.forEach((template) => {
        const option = document.createElement("option");
        option.value = template.value;
        option.textContent = template.label;
        if (template.default) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      const input = document.createElement("textarea");
      input.rows = 2;
      input.value = defaultTemplate.value;
      input.placeholder = "Custom prompt template...";
      input.style.cssText = `
      width: 100%;
      padding: 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: ${this.config.theme.fontSize};
      margin-bottom: 20px;
      resize: vertical;
      box-sizing: border-box;
    `;
      select.addEventListener("change", () => {
        input.value = select.value;
      });
      return { label, input, select };
    }
    createServicesCheckboxes(selectedServices = null) {
      const label = document.createElement("label");
      label.textContent = "Select AI Services:";
      label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: ${this.config.theme.colors.mainFg};
      font-size: 14px;
    `;
      const container = document.createElement("div");
      container.id = "sk-services-container";
      container.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 24px;
      padding: 16px;
      background: ${this.config.theme.colors.bgDark};
      border-radius: 4px;
      border: 1px solid ${this.config.theme.colors.border};
    `;
      this.services.forEach((service, index) => {
        const isChecked = selectedServices ? selectedServices.includes(service.name) : service.checked;
        const checkboxWrapper = this.createCheckbox(service, index, isChecked);
        container.appendChild(checkboxWrapper);
      });
      return { label, container };
    }
    createSelectAllButtons() {
      const container = document.createElement("div");
      container.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      justify-content: flex-start;
    `;
      const selectAllBtn = document.createElement("button");
      selectAllBtn.textContent = "Select All";
      selectAllBtn.type = "button";
      selectAllBtn.style.cssText = `
      padding: 4px 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.accentFg};
      font-family: ${this.config.theme.font};
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;
      selectAllBtn.onmouseenter = () => {
        selectAllBtn.style.background = this.config.theme.colors.border;
      };
      selectAllBtn.onmouseleave = () => {
        selectAllBtn.style.background = this.config.theme.colors.bgDark;
      };
      selectAllBtn.onclick = () => {
        this.services.forEach((_, index) => {
          const checkbox = document.getElementById(`sk-ai-${index}`);
          if (checkbox)
            checkbox.checked = true;
        });
      };
      const unselectAllBtn = document.createElement("button");
      unselectAllBtn.textContent = "Unselect All";
      unselectAllBtn.type = "button";
      unselectAllBtn.style.cssText = `
      padding: 4px 12px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.infoFg};
      font-family: ${this.config.theme.font};
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;
      unselectAllBtn.onmouseenter = () => {
        unselectAllBtn.style.background = this.config.theme.colors.border;
      };
      unselectAllBtn.onmouseleave = () => {
        unselectAllBtn.style.background = this.config.theme.colors.bgDark;
      };
      unselectAllBtn.onclick = () => {
        this.services.forEach((_, index) => {
          const checkbox = document.getElementById(`sk-ai-${index}`);
          if (checkbox)
            checkbox.checked = false;
        });
      };
      container.appendChild(selectAllBtn);
      container.appendChild(unselectAllBtn);
      return container;
    }
    createCheckbox(service, index, isChecked = true) {
      const wrapper = document.createElement("label");
      wrapper.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      transition: background 0.2s;
    `;
      wrapper.onmouseenter = () => {
        wrapper.style.background = this.config.theme.colors.border;
      };
      wrapper.onmouseleave = () => {
        wrapper.style.background = "transparent";
      };
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isChecked;
      checkbox.id = `sk-ai-${index}`;
      checkbox.style.cssText = `
      margin-right: 10px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${this.config.theme.colors.accentFg};
    `;
      const label = document.createElement("span");
      label.textContent = service.name;
      label.style.cssText = `
      color: ${this.config.theme.colors.fg};
      font-size: 15px;
      cursor: pointer;
    `;
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      return wrapper;
    }
    createButtons() {
      const container = document.createElement("div");
      container.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;
      const cancelBtn = this.createCancelButton();
      const submitBtn = this.createSubmitButton();
      container.appendChild(cancelBtn);
      container.appendChild(submitBtn);
      return container;
    }
    createCancelButton() {
      const btn = document.createElement("button");
      btn.textContent = "Cancel";
      btn.style.cssText = `
      padding: 10px 24px;
      background: ${this.config.theme.colors.bgDark};
      border: 1px solid ${this.config.theme.colors.border};
      border-radius: 4px;
      color: ${this.config.theme.colors.fg};
      font-family: ${this.config.theme.font};
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    `;
      btn.onmouseenter = () => {
        btn.style.background = this.config.theme.colors.border;
      };
      btn.onmouseleave = () => {
        btn.style.background = this.config.theme.colors.bgDark;
      };
      btn.onclick = () => {
        if (this.queryInput)
          this.lastQuery = this.queryInput.value;
        this.close();
      };
      return btn;
    }
    createSubmitButton() {
      const btn = document.createElement("button");
      btn.textContent = "Open Selected AIs";
      btn.style.cssText = `
      padding: 10px 24px;
      background: ${this.config.theme.colors.accentFg};
      border: 1px solid ${this.config.theme.colors.accentFg};
      border-radius: 4px;
      color: ${this.config.theme.colors.bgDark};
      font-family: ${this.config.theme.font};
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
      btn.onmouseenter = () => {
        btn.style.background = this.config.theme.colors.mainFg;
        btn.style.borderColor = this.config.theme.colors.mainFg;
      };
      btn.onmouseleave = () => {
        btn.style.background = this.config.theme.colors.accentFg;
        btn.style.borderColor = this.config.theme.colors.accentFg;
      };
      btn.onclick = () => this.handleSubmit();
      return btn;
    }
  };

  // src-ts/utils.ts
  var utils_exports = {};
  __export(utils_exports, {
    createSuggestionItem: () => createSuggestionItem,
    createURLItem: () => createURLItem,
    delay: () => delay,
    injectPrompt: () => injectPrompt,
    pressKey: () => pressKey
  });
  var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var pressKey = (element, key = "Enter", keyCode = 13) => {
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key,
      code: key,
      keyCode,
      which: keyCode
    });
    element.dispatchEvent(event);
  };
  var createSuggestionItem = (html, props = {}) => {
    const li = document.createElement("li");
    li.innerHTML = html;
    return { html: li.outerHTML, props };
  };
  var createURLItem = (title, url, sanitize = true) => {
    let t = title;
    let u = url;
    if (sanitize) {
      t = String(t).replace(/[&<>"'`=/]/g, (s) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;"
      })[s] || s);
      u = new URL(u).toString();
    }
    return createSuggestionItem(
      `
<div class="title">${t}</div>
<div class="url">${u}</div>
`,
      { url: u }
    );
  };
  var injectPrompt = async ({
    selector,
    submitSelector,
    useValue = false,
    dispatchEvents = false
  }, config) => {
    const promptKey = "#sk_prompt=";
    if (!window.location.hash.startsWith(promptKey))
      return;
    const promptText = decodeURIComponent(window.location.hash.substring(promptKey.length));
    await delay(config.delayMs);
    const inputBox = document.querySelector(selector);
    if (!inputBox)
      return;
    inputBox.focus();
    if (useValue) {
      inputBox.value = promptText;
    } else {
      document.execCommand("insertText", false, promptText);
    }
    if (dispatchEvents) {
      inputBox.dispatchEvent(new Event("input", { bubbles: true }));
      inputBox.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await delay(config.delayMs);
    if (submitSelector) {
      const btn = typeof submitSelector === "function" ? submitSelector() : document.querySelector(submitSelector);
      if (btn) {
        btn.click();
      } else {
        pressKey(inputBox);
      }
    } else {
      pressKey(inputBox);
    }
    history.replaceState(null, "", " ");
  };

  // src-ts/index.ts
  window.__CONFIG__ = CONFIG;
  window.__utils__ = utils_exports;
  var aiSelector = new AiSelector(CONFIG);
  api.map("K", "[[");
  api.map("J", "]]");
  api.mapkey("T", "#3Choose a tab", function() {
    api.Front.openOmnibar({ type: "Tabs" });
  });
  api.map("q", "p");
  api.map("v", "zv");
  api.map("zv", "v");
  api.iunmap("<Ctrl-a>");
  api.cmap("<Ctrl->>", "<Ctrl-,>");
  api.mapkey("ye", "Copy image to clipboard", function() {
    api.Hints.create("img", function(element) {
      const imgElement = element;
      let imageUrl = imgElement.src || imgElement.getAttribute("data-src") || imgElement.getAttribute("data-lazy-src");
      if (!imageUrl && imgElement.srcset) {
        const srcset = imgElement.srcset.split(",");
        imageUrl = srcset[0].trim().split(" ")[0];
      }
      if (!imageUrl) {
        api.Front.showBanner("Could not find image source", "error");
        return;
      }
      const copyPngToClipboard = async (blob) => {
        try {
          if (!blob)
            throw new Error("Empty blob");
          const data = [new ClipboardItem({ "image/png": blob })];
          await navigator.clipboard.write(data);
          api.Front.showBanner("Image copied to clipboard!", "success");
        } catch (err) {
          api.Clipboard.write(imageUrl);
          api.Front.showBanner("Copied URL (Clipboard write failed)", "warning");
        }
      };
      const convertAndCopy = (url) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(copyPngToClipboard, "image/png");
          }
        };
        img.onerror = function() {
          fetch(url).then((r) => r.blob()).then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const img2 = new Image();
            img2.onload = function() {
              const canvas = document.createElement("canvas");
              canvas.width = img2.width;
              canvas.height = img2.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img2, 0, 0);
                canvas.toBlob((b) => {
                  URL.revokeObjectURL(blobUrl);
                  copyPngToClipboard(b);
                }, "image/png");
              }
            };
            img2.src = blobUrl;
          }).catch(() => {
            api.Clipboard.write(imageUrl);
            api.Front.showBanner("Copied URL (Image load failed)", "warning");
          });
        };
        img.src = url;
      };
      convertAndCopy(imageUrl);
    });
  });
  api.mapkey("gp", "#12Open Passwords", () => api.tabOpenLink("chrome://password-manager/passwords"));
  api.mapkey("gs", "#12Open Extensions", () => api.tabOpenLink("chrome://extensions/shortcuts"));
  api.mapkey("aa", "Multi-AI Search (Clipboard/Input)", () => {
    aiSelector.show("");
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ac", "ChatGPT Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.CHATGPT]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ad", "Doubao Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.DOUBAO]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ay", "Alice Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.ALICE]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ae", "Claude Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.CLAUDE]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ag", "Gemini Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.GEMINI]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ap", "Perplexity Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.PERPLEXITY]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("aP", "Perplexity Research Mode (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.PERPLEXITY_RESEARCH]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  api.mapkey("ak", "Grok Search (Clipboard/Input)", () => {
    aiSelector.show("", [AI_SERVICES.GROK]);
    navigator.clipboard.readText().then((text) => aiSelector.updateQuery(text)).catch(() => {
    });
  });
  var siteAutomations = [
    {
      host: "chatgpt.com",
      run: async () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("q")) {
          await delay(CONFIG.delayMs);
          const submitBtn = document.getElementById("composer-submit-button");
          if (submitBtn instanceof HTMLElement)
            submitBtn.click();
        }
      }
    },
    {
      host: "gemini.google.com",
      run: () => injectPrompt({
        selector: 'div[contenteditable="true"][role="textbox"]'
      }, CONFIG)
    },
    {
      host: "claude.ai",
      run: () => injectPrompt({
        selector: 'div[contenteditable="true"]',
        submitSelector: () => document.querySelector('button[type="submit"]') || document.querySelector("button.send-button") || document.querySelector('button[aria-label*="send" i]') || document.querySelector('button svg[class*="send"]')?.closest("button")
      }, CONFIG)
    },
    {
      host: "www.doubao.com",
      run: () => injectPrompt({
        selector: 'textarea[placeholder], div[contenteditable="true"]',
        useValue: true,
        dispatchEvents: true,
        submitSelector: () => document.querySelector('button[type="submit"]') || document.querySelector("button.send-button") || document.querySelector('button[aria-label*="send" i]') || document.querySelector('button svg[class*="send"]')?.closest("button")
      }, CONFIG)
    },
    {
      host: "yandex.ru",
      run: async () => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("q");
        if (q) {
          await delay(CONFIG.delayMs);
          const box = document.querySelector(
            'textarea[placeholder], input[type="text"], input[class*="input"], div[contenteditable="true"]'
          );
          if (box) {
            box.focus();
            box.value = q;
            box.dispatchEvent(new Event("input", { bubbles: true }));
            box.dispatchEvent(new Event("change", { bubbles: true }));
            await delay(CONFIG.delayMs);
            pressKey(box);
          }
        }
      }
    },
    {
      host: "perplexity.ai",
      run: async () => {
        const hash = window.location.hash;
        if (!hash.includes("sk_"))
          return;
        for (let i = 0; i < 50; i++) {
          if (document.querySelector('[role="textbox"]') && document.querySelector('[role="radio"]'))
            break;
          await delay(100);
        }
        const hashContent = hash.substring(1);
        let query = "";
        if (hash.includes("sk_social=on")) {
          const afterSocial = hashContent.split("sk_social=on")[1];
          if (afterSocial)
            query = decodeURIComponent(afterSocial).replace(/^[&?]/, "").trim();
        } else if (hash.includes("sk_prompt=")) {
          const match = hashContent.match(/sk_prompt=([^&]*)/);
          if (match?.[1])
            query = decodeURIComponent(match[1]);
        }
        const pointerClick = (el) => {
          const rect = el.getBoundingClientRect();
          const opts = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            pointerType: "mouse",
            isPrimary: true
          };
          el.focus();
          el.dispatchEvent(new PointerEvent("pointerdown", opts));
          el.dispatchEvent(new PointerEvent("pointerup", opts));
          el.click();
        };
        if (query) {
          const inputBox = document.querySelector('[role="textbox"]');
          if (inputBox) {
            inputBox.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputBox);
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(range);
            }
            document.execCommand("insertText", false, query);
            await delay(300);
          }
        }
        if (hash.includes("sk_social=on")) {
          const sourcesBtn = Array.from(document.querySelectorAll("button")).find(
            (btn) => btn.getAttribute("aria-label")?.toLowerCase().includes("source")
          );
          if (sourcesBtn) {
            pointerClick(sourcesBtn);
            let menu = null;
            for (let i = 0; i < 15; i++) {
              menu = document.querySelector('[role="menu"]');
              if (menu)
                break;
              await delay(200);
            }
            if (menu) {
              const socialItem = Array.from(menu.querySelectorAll('[role="menuitemcheckbox"]')).find(
                (item) => item.textContent?.toLowerCase().includes("social")
              );
              const toggle = socialItem?.querySelector('[role="switch"]');
              if (toggle && toggle.getAttribute("aria-checked") !== "true") {
                toggle.click();
                await delay(300);
              }
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
              await delay(300);
            }
          }
        }
        if (hash.includes("sk_mode=research")) {
          for (let i = 0; i < 5; i++) {
            if (document.querySelector('[role="radio"][value="research"][aria-checked="true"]'))
              break;
            const checkedRadio = document.querySelector('[role="radio"][aria-checked="true"]');
            if (checkedRadio) {
              checkedRadio.focus();
              checkedRadio.dispatchEvent(new KeyboardEvent("keydown", {
                key: "ArrowRight",
                code: "ArrowRight",
                keyCode: 39,
                bubbles: true
              }));
            }
            await delay(150);
          }
        }
        const textbox = document.querySelector('[role="textbox"]');
        if (textbox) {
          textbox.focus();
          textbox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
        }
      }
    }
  ];
  function runSiteAutomations() {
    const currentHost = window.location.hostname;
    siteAutomations.forEach((site) => {
      if (currentHost.includes(site.host)) {
        site.run();
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runSiteAutomations);
  } else {
    setTimeout(runSiteAutomations, 1e3);
  }
  var searchEngines = {
    amazon: {
      alias: "a",
      search: "https://smile.amazon.com/s/?field-keywords=",
      compl: "https://completion.amazon.com/search/complete?method=completion&mkt=1&search-alias=aps&q=",
      callback: (response) => JSON.parse(response.text)[1]
    },
    yelp: {
      alias: "p",
      search: "https://www.yelp.com/search?find_desc=",
      compl: "https://www.yelp.com/search_suggest/v2/prefetch?prefix=",
      callback: (response) => {
        const res = JSON.parse(response.text).response;
        return res.flatMap((r) => r.suggestions.map((s) => s.query)).filter((v, i, a) => a.indexOf(v) === i);
      }
    },
    github: {
      alias: "t",
      search: "https://github.com/search?q=",
      compl: "https://api.github.com/search/repositories?sort=stars&order=desc&q=",
      callback: (response) => JSON.parse(response.text).items.map((s) => {
        const prefix = s.stargazers_count ? `[*${s.stargazers_count}] ` : "";
        return createURLItem(prefix + s.full_name, s.html_url);
      })
    },
    libhunt: { alias: "l", search: "https://www.libhunt.com/search?query=" },
    yandex: { alias: "n", search: "https://yandex.com/search/?text=" },
    skidrow: { alias: "k", search: "https://www.skidrowreloaded.com/?s=" },
    anna: { alias: "c", search: "https://www.annas-archive.org/search?q=" },
    libgen: { alias: "v", search: "https://libgen.is/search.php?req=" },
    urban: { alias: "u", search: "https://www.urbandictionary.com/define.php?term=" },
    archive: { alias: "r", search: "https://archive.is/" }
  };
  Object.entries(searchEngines).forEach(([name, conf]) => {
    api.addSearchAlias(conf.alias, name, conf.search, "s", conf.compl, conf.callback);
  });
  api.Hints.style(`
  border: solid 2px ${CONFIG.theme.colors.border} !important;
  color: ${CONFIG.theme.colors.accentFg} !important;
  background: initial !important;
  background-color: ${CONFIG.theme.colors.bgDark} !important;
  font-size: 11pt !important;
  font-weight: lighter !important;
`);
  api.Hints.style(`
  border: solid 2px ${CONFIG.theme.colors.border} !important;
  padding: 1px !important;
  color: ${CONFIG.theme.colors.fg} !important;
  background: ${CONFIG.theme.colors.bgDark} !important;
  font-size: 11pt !important;
  font-weight: lighter !important;
`, "text");
  api.Visual.style("marks", `background-color: ${CONFIG.theme.colors.accentFg}99;`);
  api.Visual.style("cursor", `background-color: ${CONFIG.theme.colors.mainFg};`);
  settings.theme = `
:root {
  --font: ${CONFIG.theme.font};
  --font-size: ${CONFIG.theme.fontSize};
  --font-weight: normal;
  --fg: ${CONFIG.theme.colors.fg};
  --bg: ${CONFIG.theme.colors.bg};
  --bg-dark: ${CONFIG.theme.colors.bgDark};
  --border: ${CONFIG.theme.colors.border};
  --main-fg: ${CONFIG.theme.colors.mainFg};
  --accent-fg: ${CONFIG.theme.colors.accentFg};
  --info-fg: ${CONFIG.theme.colors.infoFg};
  --select: ${CONFIG.theme.colors.select};
}

.sk_theme {
  background: var(--bg);
  color: var(--fg);
  background-color: var(--bg);
  border-color: var(--border);
  font-family: var(--font);
  font-size: var(--font-size);
  font-weight: var(--font-weight);
}

input { font-family: var(--font); font-weight: var(--font-weight); }
.sk_theme tbody, .sk_theme input { color: var(--fg); }

/* Hints */
#sk_hints .begin { color: var(--accent-fg) !important; }

/* Tabs */
#sk_tabs .sk_tab { background: var(--bg-dark); border: 1px solid var(--border); }
#sk_tabs .sk_tab_title { color: var(--fg); }
#sk_tabs .sk_tab_url { color: var(--main-fg); }
#sk_tabs .sk_tab_hint { background: var(--bg); border: 1px solid var(--border); color: var(--accent-fg); }

.sk_theme #sk_frame { background: var(--bg); opacity: 0.2; color: var(--accent-fg); }

/* Omnibar */
.sk_theme .title { color: var(--accent-fg); }
.sk_theme .url { color: var(--main-fg); }
.sk_theme .annotation { color: var(--accent-fg); }
.sk_theme .omnibar_highlight { color: var(--accent-fg); }
.sk_theme .omnibar_timestamp { color: var(--info-fg); }
.sk_theme .omnibar_visitcount { color: var(--accent-fg); }
.sk_theme .omnibar_folder { color: var(--main-fg); }

.sk_theme #sk_omnibarSearchResult ul li:nth-child(odd) { background: var(--bg-dark); }
.sk_theme #sk_omnibarSearchResult ul li.focused { background: var(--border); }
.sk_theme #sk_omnibarSearchResult ul li { padding: 0.4em; }
.sk_theme #sk_omnibarSearchResult { max-height: 80vh !important; }

.sk_theme #sk_omnibarSearchArea { border-top-color: var(--border); border-bottom-color: var(--border); padding-bottom: 0.5rem; }
.sk_theme #sk_omnibarSearchArea input, .sk_theme #sk_omnibarSearchArea span { font-size: var(--font-size); }
.sk_theme .separator { color: var(--accent-fg); }

/* Popup */
#sk_banner { font-family: var(--font); font-size: var(--font-size); font-weight: var(--font-weight); background: var(--bg); border-color: var(--border); color: var(--fg); opacity: 0.9; }
#sk_keystroke { background-color: var(--bg); }
.sk_theme kbd .candidates { color: var(--info-fg); }
.sk_theme span.annotation { color: var(--accent-fg); }
#sk_bubble { background-color: var(--bg) !important; color: var(--fg) !important; border-color: var(--border) !important; }
#sk_bubble * { color: var(--fg) !important; }
#sk_bubble div.sk_arrow div:nth-of-type(1) { border-top-color: var(--border) !important; border-bottom-color: var(--border) !important; }
#sk_bubble div.sk_arrow div:nth-of-type(2) { border-top-color: var(--bg) !important; border-bottom-color: var(--bg) !important; }

/* Search */
#sk_status, #sk_find { font-size: var(--font-size); border-color: var(--border); }
.sk_theme kbd { background: var(--bg-dark); border-color: var(--border); box-shadow: none; color: var(--fg); }
.sk_theme .feature_name span { color: var(--main-fg); }

/* ACE Editor */
#sk_editor { background: var(--bg-dark) !important; height: 50% !important; }
.ace_dialog-bottom { border-top: 1px solid var(--bg) !important; }
.ace-chrome .ace_print-margin, .ace_gutter, .ace_gutter-cell, .ace_dialog { background: var(--bg) !important; }
.ace-chrome { color: var(--fg) !important; }
.ace_gutter, .ace_dialog { color: var(--fg) !important; }
.ace_cursor { color: var(--fg) !important; }
.normal-mode .ace_cursor { background-color: var(--fg) !important; border: var(--fg) !important; opacity: 0.7 !important; }
.ace_marker-layer .ace_selection { background: var(--select) !important; }
`;
  console.log("[SurfingKeys] TypeScript configuration loaded");
})();
