// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    CENTRAL AGENT MODEL CONFIGURATION                        ║
// ║                                                                              ║
// ║  SECTION 1 — MODEL REGISTRY : add / remove model definitions here           ║
// ║  SECTION 2 — AGENT MAP      : assign any registry model to any agent        ║
// ║                                                                              ║
// ║  To switch providers: change the values in SECTION 2 only.                  ║
// ║  No other file needs to change.                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { ChatOpenAI } from "@langchain/openai";
// import { ChatAnthropic } from "@langchain/anthropic"; // npm install @langchain/anthropic

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = "openai" /* | "anthropic" */;

interface ModelDef {
  provider: Provider;
  /** Exact model ID as accepted by the provider's API */
  model: string;
  /** Name of the env-var that holds the API key */
  apiKeyEnv: string;
  temperature?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — MODEL REGISTRY
//  Add a new entry here for every model you want to use anywhere in the app.
//  Key convention: "<provider>/<short-name>"
// ═════════════════════════════════════════════════════════════════════════════

const MODEL_REGISTRY = {

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  "openai/gpt-4o": {
    provider: "openai",
    model: "gpt-4o",
    apiKeyEnv: "OPENAI_API_KEY",
    temperature: 0.7,
  },
  "openai/gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY",
    temperature: 0.7,
  },
  "openai/o4-mini": {
    provider: "openai",
    model: "o4-mini",
    apiKeyEnv: "OPENAI_API_KEY",
    temperature: 1,
  },

  // ── Anthropic (add: npm install @langchain/anthropic + ANTHROPIC_API_KEY) ───
  // "anthropic/claude-sonnet-4-6": {
  //   provider: "anthropic",
  //   model: "claude-sonnet-4-6-20251101",
  //   apiKeyEnv: "ANTHROPIC_API_KEY",
  //   temperature: 0.7,
  // },
  // "anthropic/claude-haiku-4-5": {
  //   provider: "anthropic",
  //   model: "claude-haiku-4-5-20251001",
  //   apiKeyEnv: "ANTHROPIC_API_KEY",
  //   temperature: 0.7,
  // },

} satisfies Record<string, ModelDef>;

type ModelKey = keyof typeof MODEL_REGISTRY;

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — AGENT → MODEL ASSIGNMENTS
//
//  ┌─────────────────────────────────────────────────────────────────────────┐
//  │  TO SWITCH TO OPENAI: change every value below to an "openai/..." key  │
//  │  and set OPENAI_API_KEY in your .env file. That's it.                  │
//  └─────────────────────────────────────────────────────────────────────────┘
//
//  Change any value to a key from MODEL_REGISTRY above.
//  TypeScript will error if you use a key that doesn't exist there.
// ═════════════════════════════════════════════════════════════════════════════

const AGENT_MODEL_MAP = {
  // ── Chat agents ─────────────────────────────────────────────────────────────
  // Orchestrators — call sub-agents, compile complex tool schemas
  memoryAgent:         "openai/gpt-4o",
  mainResearcherAgent: "openai/gpt-4o",
  researcherAgent:     "openai/gpt-4o",

  // Workers — leaf nodes, high call volume
  plannerAgent:        "openai/gpt-4o-mini",
  multiQueryAgent:     "openai/gpt-4o-mini",
  librarianAgent:      "openai/gpt-4o-mini",
  retrieverAgent:      "openai/gpt-4o-mini",

  // ── Report generation (summary, study guide, mindmap, FAQ, briefing) ────────
  reportsModel:        "openai/gpt-4o-mini",

  // ── Utility (title generation, rephrase, translate, autocomplete, etc.) ─────
  utilityModel:        "openai/gpt-4o-mini",

} satisfies Record<string, ModelKey>;

// ─── Factory ──────────────────────────────────────────────────────────────────

function buildModel(def: ModelDef) {
  const apiKey = process.env[def.apiKeyEnv];
  if (!apiKey) throw new Error(`Missing env var: ${def.apiKeyEnv}`);

  switch (def.provider) {
    case "openai":
      return new ChatOpenAI({ model: def.model, temperature: def.temperature ?? 0.7, apiKey });

    // case "anthropic":
    //   return new ChatAnthropic({ model: def.model, temperature: def.temperature ?? 0.7, apiKey });

    default:
      throw new Error(`Unknown provider: ${(def as any).provider}`);
  }
}

// Singleton cache — each unique ModelKey is instantiated at most once.
const _cache = new Map<ModelKey, ReturnType<typeof buildModel>>();

function getModel(key: ModelKey) {
  if (!_cache.has(key)) {
    _cache.set(key, buildModel(MODEL_REGISTRY[key]));
  }
  return _cache.get(key)!;
}

// Lazy model getter — never throws at module load time.
function agentModel(agent: keyof typeof AGENT_MODEL_MAP) {
  try {
    return getModel(AGENT_MODEL_MAP[agent]);
  } catch {
    return null as any;
  }
}

// ─── Per-agent exports ────────────────────────────────────────────────────────
// Each agent/pipeline file imports its own named export.
// Swapping a model = edit AGENT_MODEL_MAP above, nothing else.

export const memoryAgentModel         = agentModel("memoryAgent");
export const mainResearcherAgentModel = agentModel("mainResearcherAgent");
export const researcherAgentModel     = agentModel("researcherAgent");
export const plannerAgentModel        = agentModel("plannerAgent");
export const multiQueryAgentModel     = agentModel("multiQueryAgent");
export const librarianAgentModel      = agentModel("librarianAgent");
export const retrieverAgentModel      = agentModel("retrieverAgent");

/** Used by summary, study guide, mindmap, FAQ, and briefing generation. */
export const reportsModel             = agentModel("reportsModel");

/** Used by title generation, rephrase, translate, autocomplete, and other utility calls. */
export const utilityModel             = agentModel("utilityModel");
