# Architecture

Molt Hive is built around three breakthrough innovations that together create a self-evolving multi-agent system.

## System Overview

```
┌─────────────────────────────────────────────────┐
│                  WEB UI (React)                 │
│   Chat · Agent Tree · Plans · Soul · Scheduler  │
├─────────────────────────────────────────────────┤
│              CLI (molt command)                  │
│   chat · run · spawn · status · config · skills │
├───────────────┬─────────────────────────────────┤
│  Agent Loop   │         Tool Server (Express)    │
│  ┌─────────┐  │  ┌──────┐ ┌──────┐ ┌─────────┐ │
│  │ Plan    │  │  │Shell │ │File  │ │Web      │ │
│  │ Act     │  │  │Exec  │ │Read/ │ │Search/  │ │
│  │ Observe │  │  │      │ │Write │ │Fetch    │ │
│  │ Repeat  │  │  └──────┘ └──────┘ └─────────┘ │
│  └─────────┘  │  ┌──────┐ ┌──────┐ ┌─────────┐ │
│               │  │Code  │ │NPM   │ │HTTP     │ │
│               │  │Exec  │ │Install│ │Request  │ │
│               │  └──────┘ └──────┘ └─────────┘ │
├───────────────┴─────────────────────────────────┤
│              ENGINE LAYER                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Agent Mgr │ │Memory    │ │Evolution Engine  │ │
│  │+ Children│ │HOT/WARM/ │ │Molt · Drift ·    │ │
│  │          │ │COLD +    │ │Trust · Genome    │ │
│  │          │ │Scoping   │ │                  │ │
│  ├──────────┤ ├──────────┤ ├──────────────────┤ │
│  │Signal Bus│ │Soul      │ │Task Planner      │ │
│  │Agent↔    │ │System    │ │.plan.md files    │ │
│  │Agent     │ │Identity  │ │Step tracking     │ │
│  ├──────────┤ ├──────────┤ ├──────────────────┤ │
│  │Scheduler │ │Task Queue│ │Skills Engine     │ │
│  │Cron jobs │ │Persistent│ │SKILL.md files    │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────┤
│              LLM BRIDGE (7+ Providers)           │
│  Anthropic · OpenAI · Groq · Mistral            │
│  Gemini · Deepseek · Ollama · Custom            │
└─────────────────────────────────────────────────┘
```

## Three Breakthrough Innovations

### 1. Three-Tier Infinite Memory

```
HOT    → Last 8 messages verbatim. Always in context. Fixed cost forever.
WARM   → Auto-compressed summaries (~120 tokens each). Fires when HOT fills.
COLD   → Crystallized pure patterns. Keyword-retrieved. Never injected raw.
```

Context window is **FIXED SIZE FOREVER** regardless of conversation length. Knowledge accumulated is **INFINITE**.

Memory scoping adds three access levels:
- **Global** — Shared across ALL agents (default WARM/COLD)
- **Family** — Shared between a parent and its children only
- **Private** — Accessible only to the owning agent

### 2. Multi-Agent Hive Brain

All agents share the same WARM + COLD memory. When one agent learns something, every sibling knows it on the next message.

**Agent Hierarchy:**
```
Parent Agent (Atlas - Strategy)
├── Child Agent (Scout - Research)
├── Child Agent (Echo - Engineering)
└── Child Agent (Muse - Creative)
```

Parents spawn children for sub-tasks. Children report back. Parents synthesize results.

### 3. Self-Restructuring (Molt)

Each agent evolves through generations. Every 15 runs, performance is evaluated. Shadow branches test mutations before going live. Rollback to any prior generation instantly.

## Key Modules

| Module | File | Purpose |
|--------|------|---------|
| Agent Manager | `src/engine/agentManager.js` | Agent CRUD, hierarchy, hive state |
| Child Agent | `src/engine/childAgent.js` | Parent→child spawning, delegation |
| Agent Loop | `src/engine/agentLoop.js` | Autonomous plan→act→observe cycle |
| Memory | `src/engine/memory.js` | HOT/WARM/COLD + scoping |
| Soul | `src/engine/soul.js` | Self-evolving agent identity |
| Signals | `src/engine/signals.js` | Inter-agent communication |
| Evolution | `src/engine/evolution.js` | Generations, drift, trust, molt |
| Task Planner | `src/engine/taskPlanner.js` | .plan.md generation and tracking |
| Task Queue | `src/engine/taskQueue.js` | Persistent task queue with checkpoint |
| Scheduler | `src/engine/scheduler.js` | Cron-style recurring tasks |
| Skills | `src/engine/skills.js` | Self-learning skill system |
| System Prompt | `src/engine/systemPrompt.js` | Dynamic prompt builder |
| LLM Bridge | `src/llm.js` | 7+ provider unified interface |
| Tool Server | `server.js` | Express API for tool execution |

## Data Flow

1. **User message** → Agent Loop receives task
2. **System prompt built** — Identity + soul + memory + tools + skills + children + directives
3. **LLM call** — Sent to configured provider via unified bridge
4. **Reply parsed** — Extract tool calls, signals, crystallize, spawn, soul update, plan step directives
5. **Actions executed** — Tools run via server, children spawned, soul updated, plan advanced
6. **Memory compressed** — If HOT overflows, oldest messages → WARM summary
7. **Evolution tracked** — Success rate, drift, generation advancement
8. **Loop continues** — Until TASK_COMPLETE, NEEDS_HUMAN, or iteration limit
