# LLM Providers

Molt Hive supports 7 LLM providers out of the box, with a registration system for adding custom providers.

## Built-in Providers

| Provider | Models | API Format | Local? |
|----------|--------|------------|--------|
| **Anthropic** | claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5 | Anthropic Messages | No |
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo | OpenAI Chat | No |
| **Groq** | llama-3.1-70b-versatile, mixtral-8x7b-32768, llama3-8b-8192 | OpenAI-compatible | No |
| **Mistral** | mistral-large-latest, mistral-medium-latest, open-mistral-7b | OpenAI-compatible | No |
| **Google Gemini** | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash | Gemini API | No |
| **Deepseek** | deepseek-chat, deepseek-reasoner | OpenAI-compatible | No |
| **Ollama** | llama3.2, mistral, codellama, phi3, deepseek-r1, gemma2 | Ollama API | Yes |

## Configuration

Set API keys in `.env`:

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
VITE_GROQ_API_KEY=gsk_...
VITE_MISTRAL_API_KEY=...
VITE_GEMINI_API_KEY=AI...
VITE_DEEPSEEK_API_KEY=sk-...
VITE_OLLAMA_URL=http://localhost:11434
```

## Adding a Custom Provider

Any OpenAI-compatible API can be added at runtime:

```javascript
import { registerProvider } from './src/llm.js'

registerProvider({
    id: 'together',
    name: 'Together AI',
    models: ['meta-llama/Llama-3-70b-chat-hf'],
    url: 'https://api.together.xyz/v1/chat/completions',
    fmt: 'openai',           // Use OpenAI-compatible format
    keyHeader: 'Authorization',
    local: false,
    color: '#e11d48',
})
```

## Supported API Formats

| Format | Used By | Description |
|--------|---------|-------------|
| `anthropic` | Anthropic | Messages API with `x-api-key` header |
| `openai` | OpenAI, Groq, Mistral, Deepseek, custom | Standard chat completions |
| `gemini` | Google Gemini | GenerateContent API with query param key |
| `ollama` | Ollama | Local chat API, no auth needed |

## Testing Connections

```javascript
import { testConnection } from './src/llm.js'

const result = await testConnection({
    provider: 'anthropic',
    apiKey: 'sk-ant-...',
    model: 'claude-sonnet-4-5',
})
// { ok: true, latency: 1200, reply: 'OK' }
```

## LLM Agnosticism

Molt Hive is fully LLM-agnostic. The intelligence lives in the **memory graph and structural topology** — not in any particular model. Swap any model and the agents, their learned patterns, their memory, and their evolving task graphs survive completely intact.
