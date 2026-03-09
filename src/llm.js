/**
 * Molt-Hive LLM Bridge
 * Unified interface for 5 LLM providers: Anthropic, OpenAI, Groq, Mistral, Ollama.
 * Single llmCall() function handles all format differences.
 * Full error handling with user-facing error messages.
 */

/**
 * Provider registry — all supported LLM providers.
 */
export const PROVIDERS = [
    {
        id: 'anthropic',
        name: 'Anthropic',
        models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
        url: 'https://api.anthropic.com/v1/messages',
        fmt: 'anthropic',
        keyHeader: 'x-api-key',
        local: false,
        color: '#d97706',
    },
    {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        url: 'https://api.openai.com/v1/chat/completions',
        fmt: 'openai',
        keyHeader: 'Authorization',
        local: false,
        color: '#10b981',
    },
    {
        id: 'groq',
        name: 'Groq',
        models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'llama3-8b-8192'],
        url: 'https://api.groq.com/openai/v1/chat/completions',
        fmt: 'openai',
        keyHeader: 'Authorization',
        local: false,
        color: '#f97316',
    },
    {
        id: 'mistral',
        name: 'Mistral',
        models: ['mistral-large-latest', 'mistral-medium-latest', 'open-mistral-7b'],
        url: 'https://api.mistral.ai/v1/chat/completions',
        fmt: 'openai',
        keyHeader: 'Authorization',
        local: false,
        color: '#6366f1',
    },
    {
        id: 'ollama',
        name: 'Ollama (local)',
        models: ['llama3.2', 'mistral', 'codellama', 'phi3', 'deepseek-r1', 'gemma2'],
        url: null, // resolved from env
        fmt: 'ollama',
        keyHeader: null,
        local: true,
        color: '#64748b',
    },
]

/**
 * Get the environment variable key for a provider, if set.
 * @param {string} providerId - Provider ID (e.g. 'anthropic')
 * @returns {string} The env var value or empty string
 */
export function getEnvKey(providerId) {
    const envMap = {
        anthropic: 'VITE_ANTHROPIC_API_KEY',
        openai: 'VITE_OPENAI_API_KEY',
        groq: 'VITE_GROQ_API_KEY',
        mistral: 'VITE_MISTRAL_API_KEY',
    }

    const varName = envMap[providerId]
    if (!varName) return ''

    try {
        return import.meta.env?.[varName] || ''
    } catch {
        return ''
    }
}

/**
 * Get the Ollama base URL from environment.
 */
function getOllamaUrl() {
    try {
        return import.meta.env?.VITE_OLLAMA_URL || 'http://localhost:11434'
    } catch {
        return 'http://localhost:11434'
    }
}

/**
 * Find a provider by ID.
 */
export function getProvider(providerId) {
    return PROVIDERS.find(p => p.id === providerId) || null
}

/**
 * Build the request for Anthropic's API format.
 */
function buildAnthropicRequest({ model, system, messages, maxTokens, apiKey }) {
    return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: {
            model,
            max_tokens: maxTokens,
            system,
            messages: messages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
            })),
        },
    }
}

/**
 * Build the request for OpenAI-compatible APIs (OpenAI, Groq, Mistral).
 */
function buildOpenAIRequest({ provider, model, system, messages, maxTokens, apiKey }) {
    const authValue = provider.keyHeader === 'Authorization'
        ? `Bearer ${apiKey}`
        : apiKey

    return {
        url: provider.url,
        headers: {
            'Content-Type': 'application/json',
            [provider.keyHeader]: authValue,
        },
        body: {
            model,
            max_tokens: maxTokens,
            messages: [
                { role: 'system', content: system },
                ...messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
        },
    }
}

/**
 * Build the request for Ollama's local API.
 */
function buildOllamaRequest({ model, system, messages }) {
    const baseUrl = getOllamaUrl()

    return {
        url: `${baseUrl}/api/chat`,
        headers: {
            'Content-Type': 'application/json',
        },
        body: {
            model,
            stream: false,
            messages: [
                { role: 'system', content: system },
                ...messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
        },
    }
}

/**
 * Extract the reply text from a provider's response.
 */
function extractReply(fmt, data) {
    if (fmt === 'anthropic') {
        if (data?.content?.[0]?.text) return data.content[0].text
        if (data?.content?.[0]?.value) return data.content[0].value
        throw new Error('Unexpected Anthropic response format')
    }

    if (fmt === 'openai') {
        if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content
        throw new Error('Unexpected OpenAI response format')
    }

    if (fmt === 'ollama') {
        if (data?.message?.content) return data.message.content
        throw new Error('Unexpected Ollama response format')
    }

    throw new Error(`Unknown format: ${fmt}`)
}

/**
 * Classify error for user-facing message.
 */
function classifyError(error, provider) {
    const msg = error?.message || String(error)
    const status = error?.status || 0

    if (status === 401 || msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid_api_key')) {
        return `Authentication failed for ${provider.name}. Check your API key.`
    }
    if (status === 403 || msg.includes('403')) {
        return `Access denied by ${provider.name}. Your API key may lack permissions.`
    }
    if (status === 429 || msg.includes('429') || msg.includes('rate_limit')) {
        return `Rate limit hit on ${provider.name}. Wait a moment and try again.`
    }
    if (status === 500 || status === 502 || status === 503) {
        return `${provider.name} server error (${status}). Try again in a moment.`
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('TypeError')) {
        if (provider.local) {
            return `Cannot reach Ollama at ${getOllamaUrl()}. Is 'ollama serve' running?`
        }
        return `Network error connecting to ${provider.name}. Check your connection.`
    }
    if (msg.includes('CORS') || msg.includes('cors')) {
        if (provider.local) {
            return `CORS error with Ollama. Set OLLAMA_ORIGINS=* in your Ollama environment.`
        }
        return `CORS error with ${provider.name}. This may be a browser restriction.`
    }
    return `${provider.name} error: ${msg}`
}

/**
 * Main LLM call function. Handles all providers through a unified interface.
 *
 * @param {Object} params
 * @param {string} params.provider - Provider ID ('anthropic', 'openai', 'groq', 'mistral', 'ollama')
 * @param {string} params.apiKey - API key (not needed for Ollama)
 * @param {string} params.model - Model name
 * @param {string} params.system - System prompt
 * @param {Array} params.messages - Message array [{role, content}]
 * @param {number} [params.maxTokens=900] - Max tokens in response
 * @returns {Promise<string>} The model's reply text
 */
export async function llmCall({ provider: providerId, apiKey, model, system, messages, maxTokens = 900 }) {
    const provider = getProvider(providerId)
    if (!provider) {
        throw new Error(`Unknown provider: ${providerId}`)
    }

    // Validate inputs
    if (!provider.local && !apiKey) {
        throw new Error(`API key required for ${provider.name}`)
    }
    if (!model) {
        throw new Error('Model name is required')
    }
    if (!messages || messages.length === 0) {
        throw new Error('At least one message is required')
    }

    // Build the request based on format
    let request
    switch (provider.fmt) {
        case 'anthropic':
            request = buildAnthropicRequest({ model, system, messages, maxTokens, apiKey })
            break
        case 'openai':
            request = buildOpenAIRequest({ provider, model, system, messages, maxTokens, apiKey })
            break
        case 'ollama':
            request = buildOllamaRequest({ model, system, messages })
            break
        default:
            throw new Error(`Unknown format: ${provider.fmt}`)
    }

    // Execute the request
    let response
    try {
        response = await fetch(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify(request.body),
        })
    } catch (fetchError) {
        throw new Error(classifyError(fetchError, provider))
    }

    // Handle HTTP errors
    if (!response.ok) {
        let errorData
        try {
            errorData = await response.json()
        } catch {
            errorData = { message: response.statusText }
        }

        const errorObj = new Error(
            errorData?.error?.message || errorData?.message || response.statusText
        )
        errorObj.status = response.status
        throw new Error(classifyError(errorObj, provider))
    }

    // Parse response
    let data
    try {
        data = await response.json()
    } catch (parseError) {
        throw new Error(`Failed to parse response from ${provider.name}: ${parseError.message}`)
    }

    // Extract reply text
    try {
        return extractReply(provider.fmt, data)
    } catch (extractError) {
        console.error('[MoltHive LLM] Unexpected response structure:', data)
        throw new Error(`${provider.name} returned an unexpected response format`)
    }
}

/**
 * Test the connection to a provider.
 *
 * @param {Object} params
 * @param {string} params.provider - Provider ID
 * @param {string} params.apiKey - API key
 * @param {string} params.model - Model to test with
 * @returns {Promise<{ok: boolean, latency: number, error?: string}>}
 */
export async function testConnection({ provider: providerId, apiKey, model }) {
    const start = performance.now()

    try {
        const reply = await llmCall({
            provider: providerId,
            apiKey,
            model,
            system: 'Respond with exactly: OK',
            messages: [{ role: 'user', content: 'Test connection. Reply with OK.' }],
            maxTokens: 10,
        })

        const latency = Math.round(performance.now() - start)
        return {
            ok: true,
            latency,
            reply: reply.slice(0, 50), // Truncate for display
        }
    } catch (error) {
        const latency = Math.round(performance.now() - start)
        return {
            ok: false,
            latency,
            error: error.message || String(error),
        }
    }
}
