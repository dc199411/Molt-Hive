# 🧠 Molt Hive — Setup Walkthrough

Get from zero to a fully autonomous agent in under 20 minutes.

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
```bash
npm start
```
This runs **both** the Vite dev server (port 5173) and the tool server (port 3001). Open `http://localhost:5173`.

## 5. Setup Wizard (3 steps)
1. **Name your hive** → Synapse, Atlas, Nexus, Forge…
2. **Connect LLM** → Select provider, model, paste key, hit Test Connection
3. **First agent** → Name it, pick a role, click Launch

## 6. Using Your Agent

### Chat Mode (💬)
Type messages. Agent responds like a normal AI but with persistent memory.

### Autonomous Mode (🤖 AUTO)
Give the agent a **task**. It will:
- Research how to do it (web search)
- Install any needed packages
- Write code, create files, run commands
- Loop automatically until the task is complete
- Show each tool execution as a collapsible block in chat

**Example tasks:**
- "Create an Express API server with 3 endpoints"
- "Research the latest Bitcoin price and create a price tracker script"
- "Set up a Solana wallet and check the balance"
- "Build a Python script that scrapes headlines from Hacker News"

### Spawning More Agents
Click **+ SPAWN AGENT** in the sidebar. New agents instantly inherit all shared memory.

## 7. Available Tools (9)

| Tool | What It Does |
|------|-------------|
| `shell_execute` | Run terminal commands |
| `file_read` / `file_write` / `file_list` | Filesystem access |
| `web_search` | Search the web (DuckDuckGo, free) |
| `web_fetch` | Fetch any URL |
| `code_execute` | Run JavaScript or Python |
| `npm_install` | Install npm packages dynamically |
| `http_request` | Call any API (GET, POST, PUT, DELETE) |

## 8. Memory System

| Tier | What | When |
|------|------|------|
| **HOT** | Last 8 messages verbatim | Always in context |
| **WARM** | Auto-compressed summaries (~120 tokens) | When HOT fills |
| **COLD** | Crystallized patterns (permanent) | When agent writes `CRYSTALLIZE:` |

Context stays **fixed**. Knowledge grows **infinitely**.

## 9. Adding Custom Skills

Skills are reusable tool chains. Edit `src/engine/skills.js` to add your own:

```javascript
{
  name: 'my_custom_skill',
  description: 'What this skill does',
  triggers: ['trigger word 1', 'trigger word 2'],
  steps: [
    { tool: 'web_search', paramTemplate: { query: '{{topic}}' } },
    { tool: 'code_execute', paramTemplate: { code: '{{script}}' } },
  ],
  category: 'custom',
}
```

Or let the agent learn skills automatically — when it successfully completes a task using multiple tools, ask it to:
```
Crystallize this workflow as a reusable skill.
LEARN_SKILL: skill_name | description | triggers: word1, word2
```

## 10. Deploying

### Vercel / Netlify (frontend only)
```bash
npm run build
# Deploy dist/ folder
```

### Docker (full agent + server)
```bash
docker build -t molt-hive .
docker run -p 3001:3001 molt-hive
```

### Self-hosted (recommended)
```bash
npm install
npm start   # Runs both Vite + tool server
```

---

*That's it. You're running an autonomous AI agent with infinite memory, tool access, and hivemind capabilities.* ⭐
