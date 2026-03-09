# 🧠 Molt Hive — Task Board

> Live task tracking. Updated automatically by agents and scan cycles.

---

## 🔴 CRITICAL

*(no critical tasks)*

---

## 🟠 HIGH

- [ ] Configure `.env` with your API key before first launch
- [ ] Test with at least one LLM provider to verify connectivity

---

## 🟡 MEDIUM

- [ ] Add custom project context to `MASTER_PROMPT.md` (bottom section)
- [ ] Review and customize trust dial thresholds in `evolution.js`
- [ ] Configure Ollama if planning offline use

---

## 🟢 LOW

- [ ] Customize sub-agent list per parent agent role
- [ ] Adjust memory compression thresholds (`HOT_LIMIT`, `COMPRESS_AT`)
- [ ] Add custom agent roles beyond the default 6

---

## ✅ Completed

- [x] Phase 1: Foundation (storage.js, llm.js, index.jsx, index.html)
- [x] Phase 2: Agent Engine (memory.js, signals.js, evolution.js, systemPrompt.js, agentManager.js)
- [x] Phase 3: UI Components (8 components + App.jsx root shell)
- [x] Phase 4: Documentation (MASTER_PROMPT.md, agents.md, implementation.md, tasks.md, WALKTHROUGH.md)
- [x] Build config: package.json, vite.config.js, .env.example, .gitignore, Dockerfile
- [x] npm install — passes
- [x] npm run build — passes

---

## 🔍 Discovered During Scans

*(no scan findings yet)*

---

*This file is a living document. Agents update it after every task completion or scan discovery.*
