# 🧠 Molt Hive

> **Your autonomous AI agent with infinite memory, tool execution, self-learning skills, and hivemind capabilities.**
> Fork → install → `npm start`. Running in under 5 minutes.

---

## What Is Molt Hive?

Molt Hive is a fully autonomous AI agent that can **research, code, deploy, call APIs, browse the web, and learn new skills** — all on its own. Give it a task, pick a mode, and let it work.

- **💬 Chat Mode** — Talk to it like ChatGPT, but with persistent memory
- **🤖 Auto Mode** — Give it a task; it uses tools in a loop until it's done
- **♾️ Forever Mode** — Runs continuously on long research/building tasks until you stop it

Works with **5 LLM providers** (Anthropic, OpenAI, Groq, Mistral, Ollama) and includes both a **web UI** and a **CLI**.

### How is this different from other agents?

| | **Other Agents** | **Molt Hive** |
|--|---|---|
| **Memory** | Context window only | 3-tier infinite (HOT/WARM/COLD) |
| **Skills** | User-defined only | Self-learning + user-defined |
| **Setup** | 30-60 min | < 5 min |
| **Forever mode** | ❌ | ✅ Runs indefinitely |
| **Multi-agent** | Complex routing | Shared brain, lateral signals |
| **Self-evolution** | ❌ | Generations, molts, shadow branches |

---

## Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- An API key (Anthropic/OpenAI/Groq/Mistral) **or** [Ollama](https://ollama.ai) for fully offline use

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/molt-hive.git
cd molt-hive
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Open `.env` and add **one** API key:

```env
# Pick ONE provider:
VITE_GROQ_API_KEY=gsk_...        # Free tier at console.groq.com
VITE_ANTHROPIC_API_KEY=sk-ant-...  # Best reasoning
VITE_OPENAI_API_KEY=sk-...         # GPT-4o
VITE_MISTRAL_API_KEY=...           # Mistral Large
# Ollama: no key needed, just run `ollama serve`
```

### 3. Launch

#### Web UI (recommended)
```bash
npm start
```
Opens at `http://localhost:5173`. Runs both the frontend and the tool server.

#### CLI
```bash
molt start    # Setup wizard → interactive chat
```

Or without global install:
```bash
node cli.js start
npm run cli -- start
```

### 4. Setup Wizard (Web UI — 3 clicks)

1. **Name your hive** — Synapse, Atlas, Nexus, anything
2. **Connect LLM** — Provider, model, API key, Test Connection
3. **Create first agent** — Name, role, Launch

**You're running.** Give your agent a task.

---

## CLI Reference

The `molt` command is the full CLI for Molt Hive. Install globally with `npm link`, or use `node cli.js` directly.

### Setup & Launch

```bash
molt start                          # Setup wizard → interactive REPL
molt chat                           # Jump straight to interactive chat
```

### Task Execution

```bash
molt run "create a REST API"        # Auto mode — runs up to 20 iterations
molt run --forever "research AI"    # Forever mode — runs until done or stopped
```

### Agent Management

```bash
molt spawn Scout Research           # Spawn a new agent with name and role
molt spawn Echo Creative            # Roles: Generalist, Research, Engineering,
                                    #        Strategy, Creative, Analysis
molt agents                         # List all agents with stats
molt status                         # Full hive status (config, agents, memory)
```

### Configuration

```bash
molt config                         # Show current config
molt config set provider groq       # Switch LLM provider
molt config set model gpt-4o        # Switch model
molt config set apiKey sk-...       # Update API key
```

### Other

```bash
molt skills                         # List loaded skills with descriptions
molt reset                          # Reset all data (clean slate)
molt version                        # Show version
molt help                           # Show all commands
```

### Interactive REPL Commands

Inside `molt chat` or `molt start`:

```
/run <task>         Run a task in auto mode
/forever <task>     Run a task in forever mode
/spawn <name> [r]   Spawn a new agent
/agents             List all agents
/status             Show hive status
/skills             List skills
/config             Show config
/quit               Exit
```

Data is stored in `~/.molthive/` and persists across sessions.

---

## Tools (9 built-in)

The agent can use these tools autonomously. In auto/forever mode, it chains them together to complete complex tasks.

| Tool | What It Does |
|------|-------------|
| `shell_execute` | Run any terminal command |
| `file_read` | Read a file |
| `file_write` | Write/create files and directories |
| `file_list` | List directory contents |
| `web_search` | Search DuckDuckGo (free, no key) |
| `web_fetch` | Fetch any URL content |
| `code_execute` | Run JavaScript or Python code |
| `npm_install` | Install npm packages on the fly |
| `http_request` | Call any API (GET, POST, PUT, DELETE) |

**Example tasks the agent can handle:**
- "Create an Express API with 3 endpoints"
- "Research the latest Bitcoin price and build a tracker"
- "Set up a Solana wallet and check the balance"
- "Scrape headlines from Hacker News and save to a file"

---

## Skills System

Skills teach the agent **how** to do things. Each skill is a folder with a `SKILL.md` file:

```
skills/
├── web-research/SKILL.md       ← How to search and read web pages
├── code-project/SKILL.md       ← How to scaffold and build projects
├── git-workflow/SKILL.md       ← How to use git
├── api-integration/SKILL.md    ← How to call APIs
├── data-analysis/SKILL.md      ← How to process data with code
├── deployment/SKILL.md         ← How to build and deploy
└── _template/SKILL.md          ← Copy this to create your own
```

### Adding Your Own Skills

1. Copy the template:
   ```bash
   cp -r skills/_template skills/my-skill
   ```
2. Edit `skills/my-skill/SKILL.md`:
   ```markdown
   ---
   name: my-skill
   description: When to use this skill
   ---
   # My Skill
   ## Steps
   1. Do this with `web_search`
   2. Then do that with `file_write`
   ## Actions
   ### Example Action
   TOOL_CALL: tool_name {"param": "value"}
   ```
3. Restart the server — the agent will see it on the next session

### Agent Self-Learning

The agent can **create its own skills** during autonomous work. When it writes:
```
CREATE_SKILL: crypto-wallet
description: How to create and manage crypto wallets
---
# Crypto Wallet
## Steps
...
---
```

A new `skills/crypto-wallet/SKILL.md` is automatically created. The agent remembers the skill across sessions.

---

## Memory System

| Tier | What | When |
|------|------|------|
| **HOT** | Last 8 messages verbatim | Always in context |
| **WARM** | Auto-compressed summaries (~120 tokens) | When HOT fills |
| **COLD** | Crystallized patterns (permanent) | When agent writes `CRYSTALLIZE:` |

Context stays **fixed forever**. Knowledge grows **infinitely**. What your agent learned in session 1 is still available in session 1000.

---

## Agent Modes

Click the mode toggle in the chat to cycle:

| Mode | Button | Behavior |
|------|--------|----------|
| 💬 CHAT | Click toggle | Single response, no tools |
| 🤖 AUTO | Click toggle | Loops up to 20 iterations with tools |
| ♾️ FOREVER | Click toggle | Runs indefinitely until you hit STOP |

**Forever mode features:**
- Checkpoints every 10 iterations
- Auto-prunes context to prevent overflow
- 1s cooldown between iterations
- Stops after 3 consecutive errors
- Hit STOP at any time

---

## Multi-Agent Hive

Click **+ Spawn Agent** in the sidebar. Each new agent gets:
- Its own name, role, and personality
- Shared access to all WARM and COLD memory
- Independent HOT context
- Ability to signal other agents: `SIGNAL [AgentName]: [message]`

All agents share one brain. When one crystallizes a pattern, all siblings see it.

---

## Project Structure

```
molt-hive/
├── server.js                   ← Tool server (Express, port 3001)
├── cli.js                      ← CLI (REPL + task + forever mode)
├── skills/                     ← Skill definitions (SKILL.md files)
├── src/
│   ├── App.jsx                 ← Root shell + agentic loop wiring
│   ├── llm.js                  ← 5 LLM providers
│   ├── storage.js              ← Persistent storage adapter
│   └── engine/
│       ├── agentLoop.js        ← Autonomous loop (chat/auto/forever)
│       ├── tools.js            ← 9 tool definitions
│       ├── toolRunner.js       ← TOOL_CALL parser + server bridge
│       ├── skills.js           ← Skills loader (reads from skills/)
│       ├── memory.js           ← HOT/WARM/COLD memory engine
│       ├── signals.js          ← Inter-agent signal bus
│       ├── evolution.js        ← Generations, molts, drift, trust
│       ├── systemPrompt.js     ← Dynamic prompt builder
│       └── agentManager.js     ← Agent lifecycle management
├── .env.example
├── Dockerfile
└── package.json
```

---

## Documentation

| File | What It Covers |
|------|---------------|
| [**WALKTHROUGH.md**](WALKTHROUGH.md) | Complete setup guide, CLI usage, skills system, deployment |
| [**MASTER_PROMPT.md**](MASTER_PROMPT.md) | Agent system prompt — all 11 systems, behavioral directives, operating principles |
| [**CURSOR_PROMPT.md**](CURSOR_PROMPT.md) | Memory architecture deep dive, error scanning loop |
| [**skills/_template/SKILL.md**](skills/_template/SKILL.md) | Template for creating new skills |

---

## LLM Providers

| Provider | Key Env Var | Notes |
|----------|-------------|-------|
| **Anthropic** | `VITE_ANTHROPIC_API_KEY` | Best reasoning (Claude 3.5) |
| **OpenAI** | `VITE_OPENAI_API_KEY` | GPT-4o |
| **Groq** | `VITE_GROQ_API_KEY` | Fastest inference, [free tier](https://console.groq.com) |
| **Mistral** | `VITE_MISTRAL_API_KEY` | Mistral Large |
| **Ollama** | No key needed | Fully offline, run `ollama serve` |

---

## Deployment

### Self-hosted (recommended)
```bash
npm install && npm start
```

### Docker
```bash
docker build -t molt-hive .
docker run -p 3001:3001 -e VITE_GROQ_API_KEY=your-key molt-hive
```

### Static (Vercel/Netlify — no tools)
```bash
npm run build
# Deploy dist/ folder
```

---

## Troubleshooting

**"Connection failed" on LLM test**
- Check your API key in `.env` and ensure it has credits
- For Ollama: `ollama serve` must be running. Add `OLLAMA_ORIGINS=*` if CORS errors

**Tools not working**
- Make sure the tool server is running (it starts automatically with `npm start`)
- Check port 3001 is not in use: `netstat -ano | findstr :3001`

**CLI not finding API key**
- The CLI reads `.env` from the current directory. Run from the project root
- Or run `node cli.js --setup` to configure directly

---

## Contributing

1. Fork the repo
2. `git checkout -b feature/your-feature`
3. Make changes, test with `npm run build`
4. Open a PR

---

## License

MIT — fork it, ship it, build on it.

---

*Star ⭐ if Molt Hive is useful to you.*
