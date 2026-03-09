# 🧠 Molt Hive — Setup Walkthrough

Get from zero to a running AI agent hive in under 20 minutes.

---

## 1. Fork the Repo
Click the **Fork** button on the GitHub repo page. This creates your own copy you can customize freely.

## 2. Clone It
```bash
git clone https://github.com/YOUR_USERNAME/molt-hive.git
cd molt-hive
```

## 3. Install Dependencies
```bash
npm install
```
Takes about 30 seconds. Installs React, Vite, and nothing else — Molt Hive has minimal dependencies by design.

## 4. Set Up Your LLM
Copy the environment template and add your API key:
```bash
cp .env.example .env
```
Open `.env` and paste your key for any **one** provider. You only need one. For fully offline use, skip this — Ollama needs no key.

## 5. Launch
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. You'll see the Molt Hive launch screen.

## 6. Name Your Hive
Type a name — Synapse, Atlas, Nexus, Forge, anything. This is the identity your agent network shares. It's displayed in the top bar and used in agent prompts.

## 7. Connect Your LLM
Select your provider from the grid (Anthropic, OpenAI, Groq, Mistral, or Ollama). Choose a model from the dropdown. Paste your API key. Hit **Test Connection** — green means you're ready. For Ollama, just make sure `ollama serve` is running.

## 8. Meet Your First Agent
Name your first parent agent and pick a role (Generalist is great for starting). Hit **Launch**. The agent joins the Hive at Generation 1 with fresh memory. Say "hello" — it will respond as itself, aware of its role and capabilities.

## 9. Spawn a Second Agent
Click **+ Spawn Agent** in the sidebar. Give it a name and a different role (e.g., Research or Engineering). It instantly inherits all WARM and COLD memory from the Hive. Switch between agents by clicking their names in the sidebar.

## 10. Understanding Memory
Open the **◈ Memory** panel on the right. You'll see:
- **Context budget**: HOT messages (last 8 verbatim) — green bar fills as you chat
- **Warm tab**: Auto-compressed summaries of older conversations (~120 tokens each)
- **Crystals tab**: Permanently extracted patterns from CRYSTALLIZE directives

Your context window stays fixed. Your knowledge grows infinitely.

## 11. Triggering a Crystallize
Ask your agent: *"What patterns should we preserve from this conversation?"* or *"Crystallize any key insights from what we just discussed."* When the agent writes `CRYSTALLIZE: [topic]`, the system extracts a structured pattern and stores it in COLD memory. You'll see a purple **crystallized** chip appear on that message.

## 12. Cross-Agent Signals
With 2+ agents, your agents can signal each other. When an agent writes `SIGNAL [AgentName]: [message]`, it appears instantly in the **⊕ Network** panel's signal feed. Switch to the target agent's chat — they'll have access to the signal in their context.

## 13. Deploying to Production
Pick your platform:
- **Vercel**: `npm install -g vercel && vercel` — add env vars in dashboard
- **Netlify**: `npm run build` → drag `dist/` folder to netlify.com/drop
- **Docker**: `docker build -t molt-hive . && docker run -p 80:80 molt-hive`

## 14. Reading Your Living Docs
Three files are maintained as the Hive runs:
- **agents.md** — Who is running, what generation, what success rate
- **implementation.md** — Architecture changes, decisions, scan results
- **tasks.md** — Priority task board, auto-updated by agent activity

You can edit these files directly — agents will read the current state on their next message.

---

*That's it. You're running a self-evolving agent hive with infinite memory.* ⭐
