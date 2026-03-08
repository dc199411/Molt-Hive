# 🧠 Molt Hive

> **The self-evolving, LLM-agnostic multi-agent system with infinite compressed memory.**
> Fork → configure → launch. Production-ready in under 10 minutes.

---

## GitHub Repository Description

```
Multi-parent self-evolving agent system. Infinite compressed memory, LLM-agnostic (Anthropic · OpenAI · Groq · Mistral · Ollama), production frontend included. Fork and launch in 10 minutes.
```

---

## What Is Molt Hive?

Molt Hive is a new kind of agent system built around three ideas nobody else has shipped together:

**1. Memory that never fills.** Most agent systems either lose context or hit token limits. Molt uses a three-tier memory architecture — HOT (live context), WARM (auto-compressed summaries), COLD (crystallized patterns) — so the context window stays fixed forever while knowledge accumulates without limit. What your agents learned in session 1 is still available in session 1000.

**2. Multiple parent agents sharing one brain.** Spawn as many specialized parent agents as you need — Research, Engineering, Strategy, Creative. Each has its own chat, its own task graph, its own evolution path. All of them read from and write to the same shared memory. When one agent crystallizes a pattern, every sibling knows it on their next message.

**3. Self-restructuring graphs.** Each agent runs on a directed workflow graph that rewrites itself based on runtime performance. Failing nodes get shed. Strong paths get promoted. Shadow branches evaluate in parallel before any change goes live. This is structural self-improvement — not fine-tuning, not prompting — the architecture evolves.

The intelligence lives in the graph. The LLM underneath is swappable. Use Anthropic, OpenAI, Groq, Mistral, or run fully offline with Ollama — the memory, patterns, and agent evolution carry over unchanged.

---

## Feature Overview

| System | What It Does |
|--------|-------------|
| 🔁 **Three-Tier Memory** | HOT/WARM/COLD — context fixed, knowledge infinite |
| 🌐 **Hive Network** | Multiple parents, one shared brain |
| 🧬 **Self-Restructuring Graphs** | Agents rewrite their own workflow topology |
| 🔌 **LLM Agnostic** | Anthropic, OpenAI, Groq, Mistral, Ollama (local/offline) |
| 👤 **Human-in-the-Loop** | Trust dial 0–100, per-action autonomy thresholds |
| 🔬 **Eval Agent** | Structurally isolated blind testing — prevents metric gaming |
| ⎇ **Rollback & Branching** | Shadow branches, instant rollback to any prior generation |
| 🎯 **Goal Drift Detection** | Measures + corrects divergence from original objective |
| ⊕ **Task Decomposition** | Auto-splits tasks across best-fit sub-agents |
| ↗ **Signal Bus** | Lateral agent-to-agent communication without master mediation |
| 📚 **Pattern Library** | Persistent scar tissue — error patterns survive all sessions |
| 🧬 **Agent Genome** | Export/import full agent DNA as portable `.json` |
| 🔮 **Predictive Molt** | Forecasts graph stress before it builds |
| ⊛ **Federated Memory** | Learn from other Hive instances anonymously |
| ⊘ **Counterfactual Sim** | Every restructure is a proven hypothesis before it runs |

---

## Quick Start — Production in 10 Minutes

### Prerequisites
- Node.js 18+ 
- npm or yarn
- One of: an API key (Anthropic/OpenAI/Groq/Mistral) **or** [Ollama](https://ollama.ai) installed locally for fully offline use

### 1. Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/molt-hive.git
cd molt-hive
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and add your API key for whichever provider you want to use. You only need one.

```env
# Choose ONE provider — leave the rest blank

# Anthropic (recommended for best reasoning)
VITE_ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Groq (fastest inference, free tier available)
VITE_GROQ_API_KEY=gsk_...

# Mistral
VITE_MISTRAL_API_KEY=...

# Ollama — no key needed, just make sure Ollama is running
# See: https://ollama.ai/download
VITE_OLLAMA_URL=http://localhost:11434
```

> **Running fully offline?** Install [Ollama](https://ollama.ai), run `ollama pull llama3.2`, leave `.env` as-is. Molt Hive will connect automatically.

### 4. Launch

```bash
npm run dev
```

Open `http://localhost:5173` — you'll see the Molt Hive launch screen.

### 5. Launch Your Hive (in the UI — 3 steps, ~60 seconds)

**Step 1 — Name your Hive**
Give your hive a name: Synapse, Atlas, Nexus, Forge — anything. This is the top-level name for your agent network.

**Step 2 — Connect your LLM**
Select your provider, choose a model, paste your API key, hit "Test Connection." Green = ready. For Ollama, no key needed — just select it.

**Step 3 — Name your first parent agent**
Give it a name and pick a specialization (Generalist, Research, Engineering, Strategy, Creative, Analysis). Hit "Launch."

**You're running.** Chat with your first agent. Spawn siblings. Watch the memory build.

---

## Production Deployment

### Option A: Vercel (Recommended — 2 minutes)

```bash
npm install -g vercel
vercel
```

When prompted, add your environment variables via the Vercel dashboard or CLI:

```bash
vercel env add VITE_ANTHROPIC_API_KEY
```

Done. Your Hive is live at `https://your-project.vercel.app`.

### Option B: Netlify

```bash
npm run build
# Drag the `dist/` folder to netlify.com/drop
# Add env vars in Site Settings → Environment Variables
```

### Option C: Docker

```bash
docker build -t molt-hive .
docker run -p 3000:3000 \
  -e VITE_ANTHROPIC_API_KEY=your-key \
  molt-hive
```

### Option D: Static Build (any host)

```bash
npm run build
# Upload contents of dist/ to any static host (S3, GitHub Pages, Cloudflare Pages, etc.)
```

### Option E: Self-Hosted with HTTPS (VPS)

```bash
npm run build
npm install -g serve
serve -s dist -l 3000
# Point your reverse proxy (nginx/caddy) at port 3000
```

---

## Project Structure

```
molt-hive/
├── src/
│   ├── App.jsx              ← Main Molt Hive UI (full single-file component)
│   ├── index.jsx            ← React entry point
│   ├── storage.js           ← Storage adapter (browser ↔ server)
│   └── llm.js               ← LLM bridge (all providers)
├── public/
│   └── index.html
├── MASTER_PROMPT.md         ← Full agent system prompt — use to initialize any session
├── agents.md                ← Live agent registry (auto-updated by agents)
├── implementation.md        ← Architecture & change log (auto-updated)
├── tasks.md                 ← Live task board (auto-updated)
├── WALKTHROUGH.md           ← This file — complete setup & usage guide
├── .env.example             ← Environment variable template
├── package.json
├── vite.config.js
├── Dockerfile
└── README.md
```

---

## Memory Architecture (How It Works)

This is the core technical innovation. Understanding it takes 2 minutes and changes how you think about agent context.

```
┌─────────────────────────────────────────────────────────┐
│                    CONTEXT WINDOW                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  WARM MEMORY (injected into system prompt)      │    │
│  │  Auto-compressed summaries · ~120 tokens each   │    │
│  │  Last 5 summaries always included               │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  COLD MEMORY (keyword-retrieved patterns)       │    │
│  │  Crystallized pure insights · never raw         │    │
│  │  Last 6 patterns relevant to current topic      │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  HOT MEMORY (last 8 messages verbatim)          │    │
│  │  Always in context · never compressed           │    │
│  │  Rolls: oldest → compressed to WARM             │    │
│  └─────────────────────────────────────────────────┘    │
│                  [FIXED SIZE FOREVER]                    │
└─────────────────────────────────────────────────────────┘

Knowledge accumulated: ∞ (grows without limit)
Context cost:          FIXED (never grows)
```

**What happens as you chat:**
1. Messages enter HOT tier (verbatim, last 8)
2. When HOT fills, oldest 6 messages are compressed to ~120-token summary → WARM
3. When agents write `CRYSTALLIZE: [topic]`, a pure pattern is extracted → COLD
4. Context window stays the same size. Forever. The knowledge doesn't.

---

## Spawning Multiple Parent Agents

Each parent agent is a specialized master. They share memory but operate independently.

**In the UI:**
1. Click `+ Spawn Agent` in the sidebar
2. Name the agent
3. Pick a specialization
4. Done — it immediately has access to all WARM + COLD memory the hive has built

**Recommended hive configurations:**

*Small hive (2 agents)*
```
Atlas   — Generalist (primary chat / orchestration)
Iris    — Research (deep research tasks)
```

*Engineering hive (3 agents)*
```
Forge   — Engineering (primary coder)
Scout   — Research (context / documentation)
Lens    — Analysis (review / audit)
```

*Full hive (4+ agents)*
```
Nexus   — Strategy (high-level planning)
Forge   — Engineering (implementation)
Scout   — Research (information)
Echo    — Creative (content / communications)
```

**Cross-agent communication:** When any agent writes `SIGNAL [AgentName]: [message]` in a reply, that message appears instantly in the target agent's signal bus. No master mediation. No routing delay.

---

## The MASTER_PROMPT.md File

`MASTER_PROMPT.md` is the full system prompt for every agent in the Hive. It contains:

- Complete description of what's being built
- All 11 system descriptions
- Agent behavioral directives
- The error/bug/vulnerability scanning loop
- Living documentation update protocols (agents.md, implementation.md, tasks.md)
- Production deployment checklist
- Core operating principles

**How to use it:**
- It is automatically injected into every agent's system prompt via `src/llm.js`
- You can edit it to customize your Hive's behavior, goals, and constraints
- Add project-specific context at the bottom under `## PROJECT CONTEXT`
- Agents read it every session — it is the Hive's constitution

**Add your project context:**
At the bottom of `MASTER_PROMPT.md`, add a section like:

```markdown
## PROJECT CONTEXT

We are building: [your project description]
Tech stack: [your stack]
Current priority: [what to focus on]
Constraints: [any constraints]
```

Every agent in your Hive will know this on every message.

---

## Living Documentation Files

These three files are maintained by the agents themselves. You can read them anytime to see the current state of your system.

### `agents.md` — Agent Registry
Who is running, what generation, what success rate, when they last evolved, what they've scanned.

### `implementation.md` — Architecture & Change Log  
Every significant change logged: what changed, why, which agent made it, what the scan found, what patterns were crystallized.

### `tasks.md` — Live Task Board
Critical → High → Medium → Low → Backlog. Automatically updated when tasks are completed or when the error scan loop discovers new issues.

**You can edit these files directly.** Agents will read the current state and respond accordingly. Add a task to `tasks.md` by hand — the agents will pick it up.

---

## Error Handling & Scan Loop

Every time an agent performs a code-related task, the scanning loop runs automatically:

1. **Syntax check** — parse errors, malformed structures, broken references
2. **Logic scan** — infinite loops, unhandled promises, race conditions  
3. **Security scan** — hardcoded secrets, XSS vectors, exposed endpoints, dependency CVEs
4. **Performance scan** — N+1 patterns, memory leaks, blocking async operations
5. **Type safety** — null access, type coercions, undefined references
6. **Dependency check** — unresolved imports, circular deps, deprecated APIs

**Severity levels:**
- `CRITICAL` → blocks commit, immediate human escalation
- `HIGH` → added to tasks.md, continues with flag
- `MEDIUM` → logged to implementation.md
- `LOW` → accumulated in scar tissue for pattern analysis

Results are automatically logged to all three living documentation files.

---

## LLM Provider Guide

### Anthropic (Best Reasoning)
```env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```
Recommended models:
- `claude-opus-4-5` — highest capability, best for complex multi-step reasoning
- `claude-sonnet-4-5` — best balance of speed and capability (default)
- `claude-haiku-4-5` — fastest, lowest cost, good for high-frequency tasks

### OpenAI
```env
VITE_OPENAI_API_KEY=sk-...
```
Recommended models: `gpt-4o` (best), `gpt-4o-mini` (fast/cheap)

### Groq (Fastest Inference)
```env
VITE_GROQ_API_KEY=gsk_...
```
Free tier available at [console.groq.com](https://console.groq.com).
Recommended: `llama-3.1-70b-versatile`

### Mistral
```env
VITE_MISTRAL_API_KEY=...
```
Recommended: `mistral-large-latest`

### Ollama (Fully Offline / Local)
No API key needed. Install Ollama, pull a model, run.

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull models (pick one or more)
ollama pull llama3.2        # General purpose, fast
ollama pull mistral         # Strong reasoning
ollama pull codellama       # Best for coding tasks
ollama pull deepseek-r1     # Strong at analysis
ollama pull phi3            # Lightweight, very fast

# Run Ollama
ollama serve
```

Then in Molt Hive UI: select Ollama as provider, pick your model, leave API key blank.

**You can mix providers per agent.** Run Anthropic for your Strategy agent and Ollama locally for your Research agent — each agent's LLM config is stored independently.

---

## Customization Guide

### Change the default sub-agents
In `src/App.jsx`, find the `firstAgent` initialization and edit the `subAgents` array:
```javascript
subAgents: ["Research", "Coder", "Writer", "Eval"]
// Change to whatever fits your use case:
subAgents: ["Data", "Analyst", "Reporter", "Reviewer"]
```

### Adjust memory compression thresholds
In `src/App.jsx`:
```javascript
const HOT_LIMIT   = 8;  // Messages kept verbatim in context
const COMPRESS_AT = 6;  // Compress oldest N when HOT fills
```
Increase `HOT_LIMIT` for more verbatim context (higher token cost).
Decrease for tighter context management.

### Modify the trust dial defaults
In `src/App.jsx`, find `TRUST_ACTIONS` and edit the `min` values for each action to match your autonomy preferences.

### Add custom agent roles
Edit the role options in the `LaunchScreen` and `SpawnModal` components:
```javascript
// Find this array and add your roles:
["Generalist","Research","Engineering","Strategy","Creative","Analysis","YOUR_ROLE"]
```

### Customize the system prompt per deployment
Add a `## PROJECT CONTEXT` section at the bottom of `MASTER_PROMPT.md`. This is injected into every agent system prompt automatically.

---

## Environment Variables Reference

```env
# ── LLM PROVIDERS (add key for any provider you want to use) ──
VITE_ANTHROPIC_API_KEY=          # sk-ant-...
VITE_OPENAI_API_KEY=             # sk-...
VITE_GROQ_API_KEY=               # gsk_...
VITE_MISTRAL_API_KEY=            # your mistral key
VITE_OLLAMA_URL=http://localhost:11434  # Ollama server URL

# ── STORAGE (optional — defaults to localStorage) ──
VITE_STORAGE_TYPE=local          # local | server | redis
VITE_STORAGE_URL=                # Server storage URL if using server mode

# ── FEDERATION (optional — defaults to off) ──
VITE_FEDERATION_ENABLED=false    # Enable shared scar pattern network
VITE_FEDERATION_URL=             # Your federation endpoint

# ── APP CONFIG ──
VITE_APP_NAME=Molt Hive          # Customize the app name
VITE_DEFAULT_PROVIDER=anthropic  # Default provider on fresh install
```

---

## API Reference (for server-side integration)

If you want to connect Molt Hive to a backend or use it programmatically:

### LLM Bridge (`src/llm.js`)
```javascript
import { llmCall } from './llm.js'

const response = await llmCall({
  provider: 'anthropic',       // anthropic | openai | groq | mistral | ollama
  apiKey: 'sk-ant-...',
  model: 'claude-sonnet-4-5',
  system: 'You are...',
  messages: [
    { role: 'user', content: 'Hello' }
  ]
})
// response → string
```

### Storage Adapter (`src/storage.js`)
```javascript
import { db } from './storage.js'

await db.set('my-key', { any: 'data' })
const data = await db.get('my-key', defaultValue)
await db.del('my-key')
```

---

## Troubleshooting

**"Connection failed" on LLM test**
- Anthropic/OpenAI/Groq/Mistral: double-check your API key, ensure it has credits
- Ollama: make sure `ollama serve` is running in a separate terminal
- CORS error on Ollama: add `OLLAMA_ORIGINS=*` to your Ollama environment

**Messages not persisting after refresh**
- Check that your browser allows localStorage (not in private/incognito mode)
- If deploying to a host that restricts storage, configure `VITE_STORAGE_TYPE=server`

**Context feels like it's losing memory**
- This is expected behavior — messages older than the HOT limit are compressed, not lost
- Open the Memory panel (◈ Memory tab) to see your warm summaries and cold patterns
- The agent has access to all of it via the system prompt — it just looks different

**Agent not crystallizing patterns**
- Agents crystallize when they write `CRYSTALLIZE:` in a response
- Prompt them explicitly: "Crystallize any key patterns from this session"
- Or ask directly: "What patterns should we preserve from what we just built?"

**"SIGNAL" not reaching sibling agents**
- You must have 2+ agents spawned
- Switch to the target agent's chat tab to see the signal in their context
- Signals appear in the Hive Network panel's signal feed for all agents

---

## Roadmap

- [ ] Server-side memory persistence (PostgreSQL / Redis adapter)
- [ ] Shared federation network (opt-in pattern sharing between Hive deployments)
- [ ] Agent Genome marketplace (share + import battle-tested agent configurations)
- [ ] Webhook support (trigger agents from external events)
- [ ] Mobile-optimized UI
- [ ] CLI launcher (`molt new`, `molt spawn`, `molt status`)
- [ ] Multi-user Hive (team-shared agents with role-based access)
- [ ] Voice input integration
- [ ] Native desktop app (Tauri wrapper)

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run the scan loop: agents will automatically check for issues when you describe your changes
5. Update `tasks.md` and `implementation.md` with what you changed
6. Open a PR with a clear description

**Before submitting a PR:**
- [ ] No hardcoded API keys anywhere
- [ ] `tasks.md` updated
- [ ] `implementation.md` change log entry added
- [ ] Tested with at least one provider (Ollama works offline, no key needed)
- [ ] No breaking changes to the `MASTER_PROMPT.md` format

---

## License

MIT — fork it, ship it, build on it.

---

## Credits

Molt Hive was designed around the insight that agent intelligence should live in structure, not in any single model. The three-tier memory architecture, hive network, and self-restructuring graphs are original designs built to solve real limitations in existing agent frameworks.

---

## One More Thing

The best way to understand Molt Hive is to run it. Fork it, launch it in 10 minutes, and ask your first agent to explain its own architecture. It will.

```
git clone https://github.com/YOUR_USERNAME/molt-hive.git
cd molt-hive && npm install && npm run dev
```

---

*Star ⭐ the repo if Molt Hive is useful to you. Issues and PRs welcome.*
