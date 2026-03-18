# Getting Started with Molt Hive

Molt Hive is a multi-parent self-evolving autonomous AI agent system. Set up in under 5 minutes.

## Prerequisites

- **Node.js** 18+ (`node --version`)
- At least one LLM API key (Anthropic, OpenAI, Groq, Mistral, Gemini, Deepseek) **or** Ollama running locally

## Quick Install

```bash
git clone https://github.com/your-org/molt-hive.git
cd molt-hive
npm install
cp .env.example .env   # Add your API keys
```

## Configure Your LLM

Edit `.env` with at least one API key:

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
VITE_GROQ_API_KEY=gsk_...
VITE_MISTRAL_API_KEY=...
VITE_GEMINI_API_KEY=AI...
VITE_DEEPSEEK_API_KEY=sk-...

# Or use Ollama (no key needed):
# VITE_OLLAMA_URL=http://localhost:11434
```

## Start Molt Hive

```bash
# Full stack (web UI + tool server)
npm start

# CLI only
molt setup        # Interactive setup wizard
molt chat "Hello" # Single message
```

## Your First Agent

1. Open `http://localhost:5173` in your browser
2. Select an LLM provider and enter your API key
3. Type a message — your first agent (Atlas, Generalist) is created automatically
4. Try: *"Research the top 5 JavaScript frameworks and create a comparison table"*

## Agent Modes

| Mode | Command | Behavior |
|------|---------|----------|
| Chat | `molt chat "msg"` | Single response, no tools |
| Auto | `molt run "task"` | Up to 20 iterations with tools |
| Forever | `molt run "task" --forever` | Runs until TASK_COMPLETE |

## What's Next?

- [Architecture](./architecture.md) — How the system works
- [Agents](./agents.md) — Agent types, hierarchy, lifecycle
- [Memory](./memory.md) — The 3-tier infinite memory system
- [Soul System](./soul.md) — Agent identity and self-evolution
- [Tools](./tools.md) — Available tools for agents
- [CLI Reference](./cli.md) — Full command reference
- [API Reference](./api.md) — Server endpoints
- [LLM Providers](./providers.md) — Supported providers + adding custom ones
