import { LocalStorage } from "@raycast/api";

// --- Types ---

export interface ClipboardEntry {
  id: string;
  content: string;
  timestamp: number;
  isPrompt: boolean;
  saved: boolean;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  usedAt: number;
  useCount: number;
}

// --- Keys ---

const HISTORY_KEY = "clipboard-history";
const PROMPTS_KEY = "prompt-library";
const MAX_HISTORY = 500;

// --- Prompt Detection ---

const PROMPT_SIGNALS = [
  // Imperative instructions to an AI
  /^(you are|act as|pretend|imagine|write|generate|create|explain|summarize|translate|help me|given|consider|analyze|please|can you|could you|i want you to|i need you to|your (task|role|job) is)/i,
  // Prompt engineering jargon
  /\b(step[- ]by[- ]step|chain[- ]of[- ]thought|few[- ]shot|zero[- ]shot|system prompt|user prompt|assistant|think carefully|reasoning|let'?s think)\b/i,
  // Template markers (Jinja, XML-style role tags)
  /\{[{%]|<\/?(?:system|user|assistant|prompt|instruction|context|examples?)>/i,
  // Code fences with substantial content
  /```[\s\S]{20,}```/,
  // Numbered instruction lists
  /(?:^|\n)\s*(?:1\.|step 1|first,)\s+/i,
  // Output format instructions
  /\b(respond|reply|output|format|return)\s+(in|as|with|using)\s+(json|markdown|yaml|xml|bullet|list|table)/i,
  // Role/persona assignment
  /\b(expert|specialist|senior|experienced)\s+(in|at|with)\b/i,
  // Hebrew prompt patterns
  /^(אתה|את |תסביר|תכתוב|תנתח|עזור לי|בבקשה|תן לי)/,
];

export function looksLikePrompt(text: string): boolean {
  if (text.length < 30 || text.length > 50000) return false;
  const lines = text.split("\n").length;
  if (lines >= 3 && text.length > 80) {
    let score = 0;
    for (const sig of PROMPT_SIGNALS) {
      if (sig.test(text)) score++;
    }
    if (score >= 1) return true;
    if (lines >= 5 && text.length > 200) return true;
  }
  return false;
}

// --- Clipboard History ---

export async function getHistory(): Promise<ClipboardEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addToHistory(
  content: string,
): Promise<ClipboardEntry | null> {
  const history = await getHistory();
  // deduplicate against most recent 20
  const recent = history.slice(0, 20);
  if (recent.some((e) => e.content === content)) return null;

  const entry: ClipboardEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    content,
    timestamp: Date.now(),
    isPrompt: looksLikePrompt(content),
    saved: false,
  };

  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return entry;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}

export async function markSaved(id: string): Promise<void> {
  const history = await getHistory();
  const entry = history.find((e) => e.id === id);
  if (entry) {
    entry.saved = true;
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export async function removeFromHistory(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((e) => e.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

// --- Prompt Library ---

export async function getPrompts(): Promise<Prompt[]> {
  const raw = await LocalStorage.getItem<string>(PROMPTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function savePrompt(
  title: string,
  content: string,
  tags: string[],
): Promise<Prompt> {
  const prompts = await getPrompts();
  const prompt: Prompt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    content,
    tags,
    createdAt: Date.now(),
    usedAt: Date.now(),
    useCount: 0,
  };
  prompts.unshift(prompt);
  await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
  return prompt;
}

export async function updatePrompt(
  id: string,
  updates: Partial<Prompt>,
): Promise<void> {
  const prompts = await getPrompts();
  const idx = prompts.findIndex((p) => p.id === id);
  if (idx >= 0) {
    prompts[idx] = { ...prompts[idx], ...updates };
    await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
  }
}

export async function deletePrompt(id: string): Promise<void> {
  const prompts = await getPrompts();
  const filtered = prompts.filter((p) => p.id !== id);
  await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(filtered));
}

export async function recordPromptUse(id: string): Promise<void> {
  const prompts = await getPrompts();
  const prompt = prompts.find((p) => p.id === id);
  if (prompt) {
    prompt.usedAt = Date.now();
    prompt.useCount++;
    await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
  }
}

// --- Seed Library ---

const SEED_PROMPTS: { title: string; content: string; tags: string[] }[] = [
  {
    title: "Code review — architecture focus",
    content: `Review this code for architectural concerns. Focus on:
1. Separation of concerns — are responsibilities clearly divided?
2. Coupling — are modules tightly coupled where they shouldn't be?
3. Error boundaries — where can failures cascade?
4. Naming — do names reveal intent?

Skip style nits. Only flag things that affect maintainability or correctness.`,
    tags: ["code-review", "architecture"],
  },
  {
    title: "Explain like I'm switching contexts",
    content: `I'm jumping into this codebase cold. Give me:
1. What this file/module does in one sentence
2. The main data flow (input → transform → output)
3. Non-obvious design decisions and why they exist
4. Where the dragons live (tricky parts, known issues)

Keep it concise — I'll ask follow-ups.`,
    tags: ["onboarding", "explain"],
  },
  {
    title: "Debug session — systematic",
    content: `Help me debug this issue systematically:
1. First, state what the expected behavior should be
2. Identify the actual behavior (symptoms)
3. List possible causes ranked by likelihood
4. For each cause, suggest a diagnostic step (a specific command, log check, or code inspection)
5. Don't fix anything yet — just help me find the root cause`,
    tags: ["debugging", "systematic"],
  },
  {
    title: "Refactor — extract and name",
    content: `Refactor this code. Goals:
- Extract repeated patterns into well-named functions
- Replace magic numbers/strings with named constants
- Simplify nested conditionals
- Keep the same external behavior (no feature changes)
- Show me a before/after diff`,
    tags: ["refactor", "cleanup"],
  },
  {
    title: "Write a build workflow (GitHub Actions)",
    content: `Create a GitHub Actions workflow that:
- Triggers on push to main and pull requests
- Builds the project for macOS (universal binary if applicable)
- Runs tests
- Uploads artifacts (.app bundle, DMG, or ZIP)
- Uses matrix strategy if multiple targets make sense

Target: macOS 15 (Sequoia), Xcode latest. Use actions/upload-artifact@v4.`,
    tags: ["ci", "github-actions", "macos"],
  },
  {
    title: "Infrastructure health check",
    content: `Check the health of these services and report:
- Is the service responding? (HTTP status, response time)
- Any error messages or degraded states?
- Resource usage (disk, memory, CPU) if accessible
- What's the uptime / last restart?

Format as a table. Flag anything amber or red.`,
    tags: ["infra", "health", "ops"],
  },
  {
    title: "Agent system prompt — specialist",
    content: `You are a specialist agent in a multi-agent system. Your role: [ROLE].
Your sphere: [SPHERE].

Guidelines:
- Post findings to the appropriate channel
- Be concise — other agents and humans read your output
- Include severity (info/warn/critical) in reports
- If you detect something outside your sphere, mention it in general
- Never fabricate data — say "unknown" if you can't determine something`,
    tags: ["agent", "system-prompt", "agentslack"],
  },
  {
    title: "Corpora extraction — conversation mining",
    content: `Analyze this conversation trace and extract:
1. Key decisions made (with reasoning)
2. Schemas or data structures defined
3. Prompts that could be reused
4. Commands or workflows worth saving
5. Open questions or unresolved threads

Output as structured JSON with categories.`,
    tags: ["corpora", "extraction", "meta"],
  },
  {
    title: "Fleet digest template",
    content: `Generate a fleet status digest covering:
- Per-host: load, disk %, memory, active sessions, claude instances
- Services: up/down/degraded with port numbers
- Domains: responding/cert-error/502
- Coggy: bridge verdict, funds, focus nodes
- AgentSlack: agent count, message volume, channel activity
- Anomalies: anything unusual since last digest

Keep it under 20 lines. Use emoji for status (checkmark/warning/x).`,
    tags: ["fleet", "digest", "ops", "template"],
  },
  {
    title: "Project analysis — deep dive",
    content: `Analyze this project repository:
1. Architecture: what's the overall structure? Main entry points?
2. Dependencies: runtime vs dev, any outdated/risky ones?
3. Build system: how does it build? Any non-obvious steps?
4. Test coverage: what's tested, what's not?
5. Module catalog: list all major components with one-line descriptions
6. Roadmap suggestions: 3 near-term improvements, 2 ambitious ones

Write it as a standalone document someone could read cold.`,
    tags: ["analysis", "architecture", "deep-dive"],
  },
];

export async function seedLibrary(): Promise<number> {
  const existing = await getPrompts();
  const existingTitles = new Set(existing.map((p) => p.title));
  let added = 0;
  for (const seed of SEED_PROMPTS) {
    if (!existingTitles.has(seed.title)) {
      await savePrompt(seed.title, seed.content, seed.tags);
      added++;
    }
  }
  return added;
}

// --- Export / Import ---

export async function exportLibrary(): Promise<string> {
  const prompts = await getPrompts();
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), prompts },
    null,
    2,
  );
}

export async function importLibrary(json: string): Promise<number> {
  const data = JSON.parse(json);
  const incoming: Prompt[] = data.prompts ?? [];
  if (incoming.length === 0) return 0;

  const existing = await getPrompts();
  const existingContents = new Set(existing.map((p) => p.content));
  const newPrompts = incoming.filter((p) => !existingContents.has(p.content));

  if (newPrompts.length > 0) {
    const merged = [...newPrompts, ...existing];
    await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(merged));
  }
  return newPrompts.length;
}

// --- Stats ---

export async function getStats(): Promise<{
  historyCount: number;
  promptCount: number;
  totalUses: number;
  topTags: [string, number][];
  detectedPrompts: number;
}> {
  const history = await getHistory();
  const prompts = await getPrompts();

  const tagCounts = new Map<string, number>();
  for (const p of prompts) {
    for (const t of p.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    historyCount: history.length,
    promptCount: prompts.length,
    totalUses: prompts.reduce((sum, p) => sum + p.useCount, 0),
    topTags,
    detectedPrompts: history.filter((e) => e.isPrompt).length,
  };
}

// --- Auto-tagging ---

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "that",
  "this",
  "be",
  "as",
  "are",
  "was",
  "have",
  "has",
  "had",
  "not",
  "you",
  "your",
  "i",
  "my",
  "me",
  "we",
  "our",
  "they",
  "them",
  "their",
  "can",
  "will",
  "should",
  "would",
  "could",
  "do",
  "does",
  "did",
  "been",
  "being",
  "so",
  "if",
  "then",
  "than",
  "when",
  "what",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "some",
  "any",
  "no",
  "just",
  "about",
  "up",
  "out",
  "like",
  "also",
  "very",
  "really",
]);

export function suggestTags(text: string): string[] {
  // Extract meaningful words, lowercased, no short words, no stop words
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  // Count word frequency
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  // Sort by frequency, take top 5
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

// --- Helpers ---

export function truncate(text: string, len = 80): string {
  const oneLine = text.replace(/\n/g, " ").trim();
  return oneLine.length > len ? oneLine.slice(0, len) + "..." : oneLine;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
