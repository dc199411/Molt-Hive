# MOLT HIVE — CURSOR BUILD PROMPT
# Paste this entire file into Cursor as your project prompt.
# Cursor will build the complete system from scratch based on everything below.

---

## WHAT YOU ARE BUILDING

You are building **Molt Hive** — a groundbreaking multi-parent self-evolving agent system.
It must be simpler to launch than any existing agent framework, fully production-ready,
LLM-agnostic, and include a complete working frontend. No backend required to get started.

This system was designed through an extended design session. Every architectural decision
below is intentional. Build it exactly as specified.

---

## THE CORE THESIS

The intelligence lives in the graph and the memory structure — not in any particular model.
Swap any LLM underneath (Anthropic, OpenAI, Groq, Mistral, Ollama local/offline).
The agents, their memory, their learned patterns, and their evolving task graphs survive
any model change completely intact.

---

## THREE BREAKTHROUGH ARCHITECTURAL INNOVATIONS

### 1. Three-Tier Infinite Memory — Context Never Fills, Knowledge Never Stops

```
HOT    → Last 8 messages verbatim. Always in context. Fixed cost forever.
WARM   → Auto-compressed summaries (~120 tokens each). Fires when HOT fills.
COLD   → Crystallized pure patterns. Keyword-retrieved. Never injected raw.
```

- Context window is FIXED SIZE FOREVER regardless of conversation length
- When HOT fills (8 messages), oldest 6 are automatically compressed into a WARM summary
  via an async LLM call (non-blocking, fires in background)
- When agents write `CRYSTALLIZE: [topic]` in a reply, extract + store a structured cold pattern
- System prompt always injects: last 5 WARM summaries + last 6 COLD patterns
- Total context cost never grows. Knowledge accumulated: infinite.

### 2. Hive — Multiple Parent Agents Sharing One Brain

- Each parent agent is a specialized master (Research, Engineering, Strategy, Creative, etc.)
- Each has its own chat history, task graph, generation number, success rate
- ALL parents read from and write to the same shared WARM + COLD memory
- When one parent learns something → every sibling knows it on their next message
- Spawn new parents mid-session — they immediately inherit the full shared brain
- Inter-agent signals: when agents write `SIGNAL [AgentName]: [message]` it broadcasts to siblings

### 3. Self-Restructuring Task Graphs (Molt)

- Each agent runs on a directed workflow graph
- The graph rewrites itself based on runtime performance signals
- Shedding failing nodes, promoting strong paths, merging redundant hops
- Shadow branches evaluate in parallel before any change goes live
- Rollback to any prior generation instantly
- This is NOT fine-tuning (weight updates) — it is structural self-improvement

---

## ELEVEN ACTIVE SYSTEMS

Build all eleven. Each should be represented in the UI.

### Original Seven
1. **Human-in-the-Loop Calibration** — Trust dial 0–100. Actions below threshold run automatically. Actions above threshold require human confirmation. Each action class has a configurable minimum trust level.

2. **Evaluation Agent (Eval)** — Structurally isolated from all task agents. Runs blind tests with known outputs. Scores independently. FAIL = immediate graph audit. Cannot be influenced by task agent success metrics — prevents metric gaming.

3. **Rollback & Branching** — Every molt creates a shadow branch running in parallel. Shadow branches evaluate for 20+ runs. Any prior generation can be restored instantly. Inflight tasks complete on old graph before transition.

4. **Goal Drift Detection** — Drift score 0–100 measures divergence between original goal anchor and current optimization target. Alert at 30. Intervention at 40. Re-anchor command resets drift and broadcasts original objective to all sub-agents.

5. **Task Decomposition Intelligence** — Tasks auto-decompose into sub-tasks routed to best-fit sub-agent by historical performance. Eval always runs last as independent auditor.

6. **Inter-Agent Communication (Signal Bus)** — Lateral communication without master mediation. Coder insights reach Research directly. Typed signals: pattern / directive / alert / molt.

7. **Memory & Pattern Library (Scar Tissue)** — Persistent cross-session patterns. Every error, restructure, refactor, insight stored with confidence scores, hit frequency, agent attribution.

### New Four (Breakthrough Features)
8. **Agent Genome (Portable DNA)** — Export entire agent learned state as `.json`: graph topology, scar tissue, trust envelope, signal patterns, drift history, generation number. Import any Genome to deploy a battle-tested configuration instantly.

9. **Predictive Molt** — Models historical signal trajectories to forecast when a molt will be needed BEFORE pressure builds. Pre-stages candidate mutations. High-risk predictions surfaced proactively.

10. **Federated Scar Sharing** — Multiple Hive instances contribute anonymized patterns to a shared network. Learn from every error any other deployment has encountered — without sharing raw data.

11. **Counterfactual Simulation** — Before any restructure executes, simulate the counterfactual on last N tasks. Task-by-task score comparison. Confidence-weighted verdict. Every molt is a proven hypothesis before it runs.

---

## PROJECT STRUCTURE TO BUILD

```
molt-hive/
├── src/
│   ├── App.jsx              ← Full Molt Hive UI (see UI spec below)
│   ├── index.jsx            ← React entry point
│   ├── llm.js               ← LLM bridge — all providers
│   └── storage.js           ← Storage adapter
├── public/
│   └── index.html
├── MASTER_PROMPT.md         ← Full agent system prompt (see spec below)
├── agents.md                ← Auto-updated agent registry
├── implementation.md        ← Architecture + change log
├── tasks.md                 ← Live task board
├── WALKTHROUGH.md           ← Setup guide
├── .env.example             ← Environment variable template
├── package.json
├── vite.config.js
├── Dockerfile
├── .gitignore
└── README.md
```

---

## src/llm.js — LLM BRIDGE SPECIFICATION

Support these five providers with a single unified `llmCall()` function:

```javascript
// Providers to support:
const PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
    url: 'https://api.anthropic.com/v1/messages',
    fmt: 'anthropic',       // custom format
    keyHeader: 'x-api-key',
    local: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    url: 'https://api.openai.com/v1/chat/completions',
    fmt: 'openai',
    keyHeader: 'Authorization',  // prefix with "Bearer "
    local: false,
  },
  {
    id: 'groq',
    name: 'Groq',
    models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'llama3-8b-8192'],
    url: 'https://api.groq.com/openai/v1/chat/completions',
    fmt: 'openai',
    keyHeader: 'Authorization',
    local: false,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'open-mistral-7b'],
    url: 'https://api.mistral.ai/v1/chat/completions',
    fmt: 'openai',
    keyHeader: 'Authorization',
    local: false,
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    models: ['llama3.2', 'mistral', 'codellama', 'phi3', 'deepseek-r1', 'gemma2'],
    url: null,   // resolved from env: VITE_OLLAMA_URL + '/api/chat'
    fmt: 'ollama',
    keyHeader: null,
    local: true, // no API key needed
  },
]

// Main function signature:
export async function llmCall({ provider, apiKey, model, system, messages, maxTokens = 900 })
// Returns: Promise<string>  — the model's reply text

// Also export:
export async function testConnection({ provider, apiKey, model })
// Returns: { ok: boolean, latency: number, error?: string }

export function getEnvKey(providerId)
// Returns env var value for provider if set, else ''
```

Handle each fmt:
- `anthropic`: POST to URL, headers include `x-api-key` and `anthropic-version: 2023-06-01` and `anthropic-dangerous-direct-browser-access: true`, body: `{model, max_tokens, system, messages}`
- `openai`: POST to URL, headers include `Authorization: Bearer {key}`, body: `{model, max_tokens, messages: [{role:"system", content:system}, ...messages]}`
- `ollama`: POST to `VITE_OLLAMA_URL/api/chat`, no auth, body: `{model, stream:false, messages: [{role:"system",...}, ...messages]}`

---

## src/storage.js — STORAGE ADAPTER SPECIFICATION

Unified async key-value interface. Uses `localStorage` in production browser.
Must also work with `window.storage` API (used in Claude artifacts) when available.

```javascript
export const db = {
  async get(key, defaultValue),   // returns parsed value or defaultValue
  async set(key, value),          // serializes and stores
  async del(key),                 // removes key
  async keys(prefix),             // returns array of matching keys
  async clearAll(),               // removes all molt-hive keys
}
```

Storage keys used by the app (prefix with `molthive:` internally):
- `hive-config`   — provider/model/hive configuration
- `hive-agents`   — all parent agent objects
- `hive-chats`    — full chat history per agent `{ [agentId]: [messages] }`
- `hive-rawhist`  — raw message history per agent (for compression trigger)
- `hive-warm`     — compressed memory summaries array
- `hive-cold`     — crystallized patterns array
- `hive-signals`  — inter-agent signal bus array

If localStorage fills, automatically prune oldest WARM summaries (keep 5) and retry.

---

## src/App.jsx — FULL UI SPECIFICATION

Single React component file. All styles inline (no CSS files, no Tailwind, no UI libraries).
Only dependency: React. Uses `llm.js` and `storage.js` imports.

### Design System

```javascript
const C = {
  bg:      '#05070f',    // deepest background
  surface: '#090d18',    // panels, sidebar
  card:    '#0d1220',    // message bubbles, cards
  border:  'rgba(56,189,248,0.1)',
  borderB: 'rgba(56,189,248,0.22)',
  sky:     '#38bdf8',    // primary accent
  skyD:    'rgba(56,189,248,0.35)',
  text:    '#e0eaf8',
  textD:   'rgba(224,234,248,0.58)',
  textF:   'rgba(224,234,248,0.22)',
  green:   '#34d399',
  red:     '#f87171',
  amber:   '#fbbf24',
  purple:  '#a78bfa',
  teal:    '#2dd4bf',
  rose:    '#fb7185',
  indigo:  '#818cf8',
}

// Font stacks (loaded via Google Fonts or system fallbacks)
const FM = "'JetBrains Mono','Fira Code','Courier New',monospace"  // mono: labels, code, tags
const FS = "'Georgia','Times New Roman',serif"  // serif: body text, agent replies
```

### Memory constants
```javascript
const HOT_LIMIT   = 8   // messages kept verbatim
const COMPRESS_AT = 6   // compress oldest N when HOT fills
```

### Agent identity
Each parent agent gets a color and icon from rotating arrays:
```javascript
const AGENT_COLORS = ['#38bdf8','#34d399','#a78bfa','#fbbf24','#2dd4bf','#fb7185']
const AGENT_ICONS  = ['◈','⊕','⟁','⊗','⎇','⊘']
```

### CSS Animations (inject via `<style>` tag in component)
```css
@keyframes mh-pulse  { 0%,100%{opacity:.35} 50%{opacity:1} }
@keyframes mh-blink  { 0%,100%{opacity:1}   50%{opacity:0} }
@keyframes mh-fadein { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
@keyframes mh-scan   { 0%{left:-30%} 100%{left:110%} }
@keyframes mh-orbit  {
  0%   { transform: rotate(0deg) translateX(28px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
```

### App States
1. **Not launched** → show `<LaunchScreen/>`
2. **Launched** → show main layout

On mount, load all persisted state from `db`. If `hive-config` + `hive-agents` exist → skip LaunchScreen.

### LaunchScreen Component — 3 Steps

**Step 1 — Name the Hive**
- Large centered layout with animated logo (M letter, 3 orbiting colored dots)
- Text input for hive name, placeholder: "e.g. Synapse, Atlas, Nexus, Forge…"
- Subtext explaining the concept in 2 sentences
- Button → Step 2

**Step 2 — Connect LLM**
- Grid of 5 provider buttons (2-column), each with provider name + color
- Ollama shows "offline · no key needed" subtitle
- Model dropdown (populated from selected provider's model list)
- API key password input (hidden for Ollama)
- "Test Connection" button → calls `testConnection()` → shows success/error result with latency
- Auto-fills key from env if `getEnvKey()` returns a value
- "Connect → First Agent" button → Step 3

**Step 3 — First Agent**
- Text input for agent name
- 6-button grid for role selection: Generalist / Research / Engineering / Strategy / Creative / Analysis
- "Launch [HIVE NAME]" button with glow effect

On launch: create first agent object, create init chat message welcoming to the hive, persist everything, set launched=true.

### Main Layout (after launch)

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR: ☰ HiveName · AgentName G[n]  ····  stats  [LLM badge] │
├──────────────┬──────────────────────────────┬───────────────────┤
│   SIDEBAR    │         CHAT                 │   RIGHT PANEL     │
│              │                              │                   │
│  Parent      │  Message history             │  [◈ Memory]       │
│  agent list  │  (scrollable)                │  [⊕ Network]      │
│              │                              │                   │
│  [+ Spawn]   │  ─────────────────────────── │                   │
│              │  Input area + send button    │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

**Top Bar** (44px height, `C.surface` bg):
- ☰ sidebar toggle button
- Animated green dot + hive name (italic serif)  
- Active agent name (monospace, agent color) + generation chip
- Stats row: agents count · warm count · crystals count · ctx X/8
- LLM badge: pulsing colored dot + "ProviderName / model-prefix"
- "reset" button (clears all storage, reloads)

**Sidebar** (220px, toggleable):
- "PARENT AGENTS" label
- List of `<AgentItem>` components — click to switch active agent
- `+ SPAWN AGENT` button at bottom

**AgentItem**: Shows agent icon (colored circle), name, role·generation, success%, run count.
Active agent has colored left border and slightly brighter bg.

**Chat area** (flex:1):
- Scrollable message list
- Each message: avatar circle (user="you"/indigo, system="⚙"/amber, agent=icon/agentColor)
- User messages: right-aligned, indigo tint, monospace font
- Agent messages: left-aligned, card bg, serif font, agent name label above
- System messages: amber tint for errors/notifications
- Thinking indicator: 3 pulsing dots while busy
- Auto-scroll to bottom on new messages
- Typewriter effect for streaming agent replies (character by character)
- Messages show optional `tags` array as small colored chips below text
  - Tags auto-added when: pattern crystallized (purple), signal sent (green), memory compressed (sky)

**Input area** (bottom of chat, `C.surface` bg):
- Textarea (2 rows) with agent-colored border
- Send button (↑) — colored when active, dimmed when disabled
- Footer: "↵ send · memory auto-compresses · context fixed · knowledge ∞" + ctx counter

**Right Panel — Memory Tab (`◈ Memory`)**:
- Context budget bar: HOT count / HOT_LIMIT with color (green→amber as it fills)
- Text: "Context fixed forever. X warm + Y crystals = ∞ knowledge."
- Two sub-tabs: `Warm (N)` and `Crystals (N)`
- Warm tab: reversed list of compressed summaries with "COMPRESSED" chip + "N msgs → ~120 tokens"
- Crystals tab: reversed list with topic chip + hits count + pattern text

**Right Panel — Network Tab (`⊕ Network`)**:
- Label: "HIVE NETWORK · N PARENTS · ONE BRAIN"
- SVG node graph: agents as colored circles positioned radially, connected by dashed lines
  - Central "◈" hub node when 2+ agents
  - Click a node to switch active agent
  - Active agent has glowing border
- Below graph: "RECENT SIGNALS" list showing from → to → message

**Spawn Modal** (centered overlay, backdrop blur):
- Agent name input (autofocus)
- Role grid (same 6 as launch)
- "SPAWN AGENT" + "CANCEL" buttons
- Enter key submits

### System Prompt Builder

```javascript
function buildSystemPrompt({ agent, allAgents, warmMemory, coldMemory, llmName }) {
  // Returns full system prompt string injecting:
  // - Agent identity (name, role, gen, sub-agents, stats)
  // - Sibling agents list
  // - Last 5 WARM summaries
  // - Last 6 COLD patterns
  // - Behavioral directives (speak as system, route to sub-agents, CRYSTALLIZE/SIGNAL syntax)
  // - Operating principles
}
```

Key directives to include in every system prompt:
- Speak as the agent itself, not as an assistant
- When identifying a reusable pattern: write `CRYSTALLIZE: [topic]`
- When a sibling should know something: write `SIGNAL [AgentName]: [message]`
- Route tasks to sub-agents by name
- Reference own generation, branch, trust level naturally
- "Your memory never fills — older context is compressed, not lost"

### Message Send Flow

```
1. User sends message
2. Append user message to chat (immediate)
3. Build hotMsgs = rawHist.slice(-HOT_LIMIT)
4. Call llmCall({ provider, apiKey, model, system: buildSystemPrompt(...), messages: hotMsgs })
5. On reply:
   a. Scan reply for CRYSTALLIZE: directive → crystallizePattern() async → add to cold memory
   b. Scan reply for SIGNAL [Name]: directive → add to hiveSignals
   c. Check if rawHist length > HOT_LIMIT + COMPRESS_AT → trigger background compression
   d. Evolve agent: runs++, success slightly adjusted, check if gen should increment (every 15 runs)
6. Append agent message to chat with stream:true (typewriter)
7. Add relevant tags (crystallized / signal sent / compressed)
8. Persist everything to storage
```

### Background Memory Compression

```javascript
async function compressMessages(msgs, llmCfg) {
  // Calls LLM with compression system prompt
  // System: "Compress the following into 2-3 dense sentences capturing decisions, 
  //          patterns, and key facts. Output only the summary."
  // Returns: { text, ts, msgCount }
  // On failure: returns placeholder summary (never throws)
}

async function crystallizePattern(topic, context, llmCfg) {
  // System: "Extract a single reusable insight. Format:
  //          PATTERN: [what] | APPLIES_WHEN: [trigger] | ACTION: [what to do]
  //          Max 40 words."
  // Returns: { text, topic, ts, hits: 0 }
}
```

---

## SYSTEM PROMPT (MASTER_PROMPT.md) TO CREATE

Create `MASTER_PROMPT.md` with these sections:

1. **WHAT WE ARE BUILDING** — Full description of Molt Hive
2. **SYSTEM ARCHITECTURE** — Three innovations, three-tier memory diagram
3. **AGENT ROLES** — Parent agents, sub-agent table, Eval isolation principle
4. **ELEVEN ACTIVE SYSTEMS** — All 11 described in full
5. **AGENT BEHAVIORAL DIRECTIVES** — CRYSTALLIZE, SIGNAL, self-evolution markers
6. **ERROR HANDLING & BUG/VULNERABILITY SCANNING LOOP** — The full loop specification:

```
LOOP: ERROR_SCAN_CYCLE
  FOR each changed file:
    1. SYNTAX CHECK — parse errors, broken references
    2. LOGIC SCAN — infinite loops, unhandled promises, race conditions
    3. SECURITY SCAN — hardcoded secrets, XSS, CORS, injection vectors, dep CVEs
    4. PERFORMANCE SCAN — N+1 patterns, memory leaks, blocking async ops
    5. TYPE SAFETY — null access, type coercions, undefined refs
    6. DEPENDENCY CHECK — unresolved imports, circular deps, deprecated APIs

  Severity matrix:
    CRITICAL → block commit, escalate to human
    HIGH     → add to tasks.md, continue with flag
    MEDIUM   → log to implementation.md
    LOW      → accumulate in scar tissue

  After all scans:
    UPDATE agents.md, tasks.md, implementation.md
    CRYSTALLIZE new patterns found
END LOOP
```

7. **LIVING DOCUMENTATION PROTOCOL** — Format specifications for agents.md, implementation.md, tasks.md
8. **PRODUCTION DEPLOYMENT CHECKLIST**
9. **OPERATING PRINCIPLES** — 6 core principles

---

## LIVING DOCUMENTATION FILES TO CREATE

### agents.md
Template with sections: Active Parent Agents, Sub-Agent Status table, Scan Cycles log, Evolution Log.
Includes note: "Updated automatically by agents after every spawn, molt, or scan cycle."

### implementation.md
Template with sections: System Overview, Architecture diagram, Memory Architecture diagram,
LLM Bridge description, Storage Keys table, Change Log, Known Issues, Architecture Decisions (ADRs).

Include these ADRs:
- ADR-001: Three-Tier Memory over Vector DB (rationale: no external deps, works offline, LLM summaries richer than embeddings)
- ADR-002: Single File Component (rationale: easier to fork, no import graph to trace)
- ADR-003: LLM in Browser (rationale: zero backend required, fork-and-deploy immediately)

### tasks.md
Template with sections: 🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM, 🟢 LOW, ✅ Completed, 🔍 Discovered During Scans.
Include initial HIGH task: "Configure .env with your API key before first launch"

---

## README.md SPECIFICATION

Must include:
- Title: `# 🧠 Molt Hive`
- Tagline block with GitHub repo description
- "What Is Molt Hive?" — 3-paragraph explanation of the core thesis
- Feature table (15 systems)
- **Quick Start — Production in 10 Minutes** (5 steps: fork/clone → install → env → launch → UI walkthrough)
- **Production Deployment** — 5 options: Vercel, Netlify, Docker, Static, Self-hosted VPS
- Project structure tree
- Memory architecture ASCII diagram (the HOT/WARM/COLD nested boxes)
- Spawning multiple parent agents section with 3 example hive configurations
- The MASTER_PROMPT.md section (how to use it, how to add project context)
- LLM Provider Guide (all 5, with Ollama install commands)
- Customization Guide (sub-agents, memory thresholds, trust dial, roles)
- Environment Variables Reference table
- Troubleshooting section
- Roadmap
- Contributing guide
- License: MIT

---

## WALKTHROUGH.md SPECIFICATION

Step-by-step guide for someone who has never used this before:

1. **Fork the repo** — button on GitHub
2. **Clone it** — one command
3. **Install** — `npm install`
4. **Set up your LLM** — choose a provider, get a key (or use Ollama offline), fill .env
5. **Launch** — `npm run dev`
6. **Name your hive** — what to type, why it matters
7. **Connect your LLM** — how to test the connection, what green means
8. **Meet your first agent** — what to say first, what it will do
9. **Spawn a second agent** — when to do this, how they share memory
10. **Understanding memory** — reading the memory panel, what WARM and COLD mean
11. **Triggering a crystallize** — how to ask your agent to extract patterns
12. **Cross-agent signals** — how to set them up, what the signal bus shows
13. **Deploying to production** — pick a platform, 3-step deploy
14. **Reading your living docs** — agents.md, tasks.md, implementation.md

Keep each step to 3–5 sentences max. Practical, not theoretical.

---

## package.json

```json
{
  "name": "molt-hive",
  "version": "1.0.0",
  "description": "Multi-parent self-evolving agent system with infinite compressed memory",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.1"
  }
}
```

---

## vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ollama': {
        target: process.env.VITE_OLLAMA_URL || 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      }
    }
  }
})
```

---

## .env.example

```env
# Add ONE provider key — leave the rest blank.
VITE_ANTHROPIC_API_KEY=
VITE_OPENAI_API_KEY=
VITE_GROQ_API_KEY=
VITE_MISTRAL_API_KEY=
VITE_OLLAMA_URL=http://localhost:11434
VITE_APP_NAME=Molt Hive
VITE_DEFAULT_PROVIDER=anthropic
```

---

## Dockerfile

Multi-stage build: Node 20 alpine builder → nginx:alpine server.
Nginx config with SPA routing (try_files → index.html).
Expose port 80.

---

## .gitignore

```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
```

---

## public/index.html

Minimal HTML5 boilerplate. Black background (#05070f). Full height/width body. Loads src/index.jsx as module script.

---

## src/index.jsx

```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)
```

---

## BUILD ORDER

Build files in this order to avoid import errors:

1. `src/storage.js`
2. `src/llm.js`
3. `src/index.jsx`
4. `public/index.html`
5. `src/App.jsx`  ← largest file, build last
6. `package.json`
7. `vite.config.js`
8. `.env.example`
9. `.gitignore`
10. `Dockerfile`
11. `MASTER_PROMPT.md`
12. `agents.md`
13. `implementation.md`
14. `tasks.md`
15. `WALKTHROUGH.md`
16. `README.md`

---

## QUALITY REQUIREMENTS

- Every file must be complete and functional with no TODOs or placeholder stubs
- The app must work immediately after `npm install && npm run dev` with a valid API key in .env
- No hardcoded API keys anywhere in the codebase
- All LLM calls must have proper error handling with user-facing error messages
- Memory compression must be non-blocking (async, does not block the UI)
- localStorage errors must be caught and handled gracefully (prune + retry)
- The UI must be fully responsive within a standard browser window
- All CSS animations must use the `mh-` prefix to avoid conflicts
- The typewriter effect must handle variable speed and call `onDone` when complete
- Inter-agent signals must update the network panel in real time

---

## VALIDATION CHECKLIST

Before considering the build complete, verify:

- [ ] `npm install` completes with no errors
- [ ] `npm run dev` starts without errors
- [ ] Launch screen appears at localhost:5173
- [ ] All 3 launch steps work and persist to storage
- [ ] Chat sends and receives with at least one provider
- [ ] Memory panel shows warm/cold tabs correctly
- [ ] Spawn modal creates a second agent
- [ ] Switching between agents shows different chat histories
- [ ] Hive network renders with correct node positions
- [ ] `npm run build` produces a working dist/ folder
- [ ] agents.md, implementation.md, tasks.md all exist and are properly formatted
- [ ] README.md covers all required sections
- [ ] MASTER_PROMPT.md includes the full scanning loop
- [ ] .env.example has all required variables
- [ ] No API keys in any committed file

---

*End of Cursor prompt. Build the complete Molt Hive system exactly as specified above.*
