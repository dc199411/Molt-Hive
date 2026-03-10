# 🧠 Molt Hive — Complete Documentation

Get from zero to a fully autonomous agent in under 5 minutes.

---

## 1. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/molt-hive.git
cd molt-hive
```

## 2. Install Dependencies
```bash
npm install
```

## 3. Set Up Your LLM
```bash
cp .env.example .env
```
Open `.env` and paste your key for **one** provider:
- **Groq** (free tier): `VITE_GROQ_API_KEY=gsk_...` — get at [console.groq.com](https://console.groq.com)
- **Ollama** (fully offline): No key needed — just run `ollama serve`
- **OpenAI/Anthropic/Mistral**: Paid keys work too

## 4. Launch

### Web UI (recommended)
```bash
npm start
```
Opens at `http://localhost:5173`. Runs both the dev server and tool server.

### CLI (no UI needed)
```bash
node cli.js                              # Interactive REPL
node cli.js "create a todo app"          # Single task (auto mode, 20 iterations)
node cli.js --forever "research topic"   # Runs until stopped
node cli.js --setup                      # Re-run setup wizard
node cli.js --reset                      # Clear all data
```
The CLI stores data in `~/.molthive/` and executes tools directly — no server needed.

## 5. Setup Wizard (3 steps)
1. **Name your hive** → Synapse, Atlas, Nexus, Forge…
2. **Connect LLM** → Select provider, model, paste key, hit Test Connection
3. **First agent** → Name it, pick a role, click Launch

---

## 6. Agent Modes

| Mode | Button | Behavior |
|------|--------|----------|
| 💬 CHAT | Click toggle | Single response, no tools |
| 🤖 AUTO | Click toggle | Loops up to 20 iterations with tool calls |
| ♾️ FOREVER | Click toggle | Runs indefinitely until you hit STOP |

Click the mode button in the chat footer to cycle through modes.

**Forever mode features:**
- Checkpoints every 10 iterations (shown in chat)
- Auto-prunes context to prevent overflow
- 1s cooldown between iterations (prevents API hammering)
- Stops after 3 consecutive errors
- Hit STOP at any time

---

## 7. Available Tools (9)

| Tool | What It Does |
|------|-------------|
| `shell_execute` | Run any terminal command |
| `file_read` | Read file contents |
| `file_write` | Write/create files |
| `file_list` | List directory contents |
| `web_search` | Search DuckDuckGo (free, no key) |
| `web_fetch` | Fetch any URL |
| `code_execute` | Run JavaScript or Python |
| `npm_install` | Install npm packages dynamically |
| `http_request` | Call any API (GET, POST, PUT, DELETE) |

---

## 8. Memory System

| Tier | What | When |
|------|------|------|
| **HOT** | Last 8 messages verbatim | Always in context |
| **WARM** | Auto-compressed summaries (~120 tokens) | When HOT fills |
| **COLD** | Crystallized patterns (permanent) | When agent writes `CRYSTALLIZE:` |

Context stays **fixed**. Knowledge grows **infinitely**.

---

## 9. Skills System

Skills live in the `skills/` folder. Each skill is a directory with a `SKILL.md` file:

```
skills/
├── web-research/SKILL.md       ← Search + read web pages
├── code-project/SKILL.md       ← Scaffold, edit, build projects
├── git-workflow/SKILL.md       ← Stage, commit, push, branch
├── api-integration/SKILL.md    ← REST calls, auth, blockchain RPCs
├── data-analysis/SKILL.md      ← JS/Python data processing
├── deployment/SKILL.md         ← Build, serve, Docker, Vercel
└── _template/SKILL.md          ← Copy this to create a new skill
```

### SKILL.md Format

Every skill file has YAML frontmatter + markdown body:

```markdown
---
name: my-skill
description: When to use this skill and what it does
---

# My Skill

## Overview
What this skill does.

## Steps
1. First thing the agent should do
2. Second thing

## Actions

### Action Name
‍```
TOOL_CALL: tool_name {"param": "value"}
‍```

## Notes
- Important details
```

### How to Add a Skill (User)

1. Copy `skills/_template/` and rename it:
   ```bash
   cp -r skills/_template skills/my-new-skill
   ```
2. Edit `skills/my-new-skill/SKILL.md` with your instructions
3. Restart the server (or it picks up changes next time `/api/skills` is called)

That's it — the agent will see your new skill in its next session.

### How the Agent Creates Skills

The agent can create new skills autonomously using its `file_write` tool:

```
TOOL_CALL: file_write {
  "path": "skills/crypto-wallet/SKILL.md",
  "content": "---\nname: crypto-wallet\ndescription: Create and manage crypto wallets\n---\n\n# Crypto Wallet\n\n## Steps\n1. Install ethers.js\n2. Generate wallet\n..."
}
```

The agent can also use these shorthand directives:
- `CREATE_SKILL: name` followed by a description and body
- `LEARN_SKILL: name | description` — auto-generates a basic SKILL.md

### How Skills Load into the Agent

1. Server reads `skills/` folder → `GET /api/skills`
2. `skills.js` fetches the list and formats a summary
3. System prompt includes skill names + descriptions
4. Agent references skills when choosing tool sequences

---

## 10. Spawning Sub-Agents

Click **+ SPAWN AGENT** in the sidebar. Each agent gets:
- Its own name, role, and color
- Shared access to all WARM and COLD memory
- Independent HOT context (last 8 messages)
- Ability to SIGNAL other agents directly

---

## 11. Deploying

### Self-hosted (recommended)
```bash
npm install
npm start   # Runs both Vite + tool server
```

### Docker (full agent + server)
```bash
docker build -t molt-hive .
docker run -p 3001:3001 molt-hive
```

### Vercel / Netlify (frontend only, no tools)
```bash
npm run build
# Deploy dist/ folder
```

---

## 12. Project Structure

```
molt-hive/
├── server.js                   ← Tool server (Express, port 3001)
├── cli.js                      ← CLI entry point (REPL + task + forever)
├── skills/                     ← Skill definitions (one folder per skill)
│   ├── web-research/SKILL.md
│   ├── code-project/SKILL.md
│   ├── ...
│   └── _template/SKILL.md
├── src/
│   ├── App.jsx                 ← Root shell, agentic loop wiring
│   ├── llm.js                  ← LLM provider abstraction
│   ├── storage.js              ← localStorage persistence
│   ├── engine/
│   │   ├── agentLoop.js        ← Autonomous loop (chat/auto/forever)
│   │   ├── tools.js            ← Tool definitions for system prompt
│   │   ├── toolRunner.js       ← Server bridge + TOOL_CALL parsing
│   │   ├── skills.js           ← Skills loader (reads from server)
│   │   ├── memory.js           ← HOT/WARM/COLD memory
│   │   ├── signals.js          ← Inter-agent signal bus
│   │   ├── evolution.js        ← Agent evolution + molts
│   │   ├── systemPrompt.js     ← Dynamic prompt builder
│   │   └── agentManager.js     ← Agent lifecycle
│   └── components/             ← React UI (7 components)
├── .env.example
├── Dockerfile
└── package.json
```

---

*Your autonomous AI agent with infinite memory, tool access, self-learning skills, and hivemind capabilities — up and running in 5 minutes.* ⭐
