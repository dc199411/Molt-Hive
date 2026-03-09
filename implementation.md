# 🧠 Molt Hive — Implementation Log

> Architecture overview, design decisions, and change log.

---

## System Overview

Molt Hive is a React+Vite single-page application that runs entirely in the browser. No backend required. The agent intelligence lives in `src/engine/` — the UI in `src/components/` is the interface layer.

**Architecture: Agent-First**
```
src/engine/           ← THE BRAIN
├── memory.js         Three-tier HOT/WARM/COLD memory
├── signals.js        Inter-agent signal bus
├── evolution.js      Molt, generations, trust, genome
├── systemPrompt.js   Dynamic system prompt builder
└── agentManager.js   Agent CRUD + shared hive state

src/components/       ← THE FACE
├── LaunchScreen.jsx  3-step onboarding
├── TopBar.jsx        Status bar
├── Sidebar.jsx       Agent list + spawn
├── ChatArea.jsx      Messages + input
├── MemoryPanel.jsx   WARM/COLD display
├── NetworkPanel.jsx  SVG graph + signals
├── SpawnModal.jsx    New agent creation
└── styles.js         Design tokens

src/App.jsx           ← THE WIRING (engine → UI)
src/llm.js            ← LLM BRIDGE (5 providers)
src/storage.js        ← PERSISTENCE (localStorage)
```

---

## Memory Architecture

```
┌─────────────────────────────────────────────┐
│              CONTEXT WINDOW                  │
│  ┌──────────────────────────────────────┐   │
│  │  WARM (5 summaries, ~120 tokens each)│   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  COLD (6 crystallized patterns)      │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  HOT (last 8 messages verbatim)      │   │
│  └──────────────────────────────────────┘   │
│              [FIXED SIZE FOREVER]            │
└─────────────────────────────────────────────┘
Knowledge: ∞     Context cost: FIXED
```

---

## Storage Keys

| Key | Contents |
|-----|----------|
| `hive-config` | Provider, model, hive name |
| `hive-agents` | All parent agent objects |
| `hive-chats` | Chat history per agent `{agentId: [messages]}` |
| `hive-rawhist` | Raw message history per agent (compression trigger) |
| `hive-warm` | Compressed memory summaries (shared) |
| `hive-cold` | Crystallized patterns (shared) |
| `hive-signals` | Inter-agent signal bus |

---

## Change Log

| Date | Change | Agent/Author | Files |
|------|--------|-------------|-------|
| 2026-03-09 | Initial build: Phase 1-3 (foundation + engine + UI) | Build | all src/ files |
| 2026-03-09 | Phase 4: Documentation | Build | MASTER_PROMPT.md, agents.md, implementation.md, tasks.md, WALKTHROUGH.md |

---

## Known Issues

| ID | Severity | Description | Status |
|----|---------|-------------|--------|
| — | — | No known issues at initial build | — |

---

## Architecture Decisions

### ADR-001: Three-Tier Memory over Vector DB
**Decision**: Use HOT/WARM/COLD compressed memory instead of vector database for context.
**Rationale**: No external dependencies. Works offline. LLM summaries are richer than embeddings. Fixed context cost with infinite knowledge accumulation.

### ADR-002: Modular Component Architecture
**Decision**: Break the UI into separate component files under `src/components/` with the engine in `src/engine/`.
**Rationale**: Agent-first architecture separates the brain from the interface. Easier to maintain, test, and extend. Each component is focused and reusable.

### ADR-003: LLM in Browser
**Decision**: All LLM calls happen directly from the browser. No backend proxy.
**Rationale**: Zero backend required. Fork-and-deploy immediately. Any user can be running in under 20 minutes. Trade-off: API keys are visible in browser dev tools (acceptable for personal/dev use, documented in .env.example).

---

*This file is a living document. Updated after every significant change.*
