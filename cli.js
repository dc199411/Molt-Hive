#!/usr/bin/env node

/**
 * Molt-Hive CLI
 * Run Molt-Hive as a command-line agent without the web UI.
 * 
 * Usage:
 *   npx molt-hive                     # Interactive chat mode
 *   npx molt-hive "create a todo app" # Single task (auto mode)
 *   npx molt-hive --forever "research quantum computing and write a report"
 *   npx molt-hive --setup             # Re-run setup wizard
 *   npx molt-hive --reset             # Reset all data
 * 
 * Environment:
 *   Reads .env for API keys (same as web UI)
 *   Persists memory to ~/.molthive/ (file-based storage)
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─── Load .env ───
function loadEnv() {
    const envPath = join(process.cwd(), '.env')
    if (!existsSync(envPath)) return {}
    const env = {}
    readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const match = line.match(/^(\w+)\s*=\s*(.+)$/)
        if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
    })
    return env
}

// ─── File-based storage (for CLI, replaces localStorage) ───
const DATA_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.molthive')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

function fileGet(key, fallback = null) {
    const fp = join(DATA_DIR, `${key}.json`)
    if (!existsSync(fp)) return fallback
    try { return JSON.parse(readFileSync(fp, 'utf-8')) } catch { return fallback }
}
function fileSet(key, value) {
    writeFileSync(join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2))
}

// ─── LLM Call (simplified for CLI) ───
async function llmCall({ provider, apiKey, model, system, messages, maxTokens = 2000 }) {
    const ENDPOINTS = {
        anthropic: 'https://api.anthropic.com/v1/messages',
        openai: 'https://api.openai.com/v1/chat/completions',
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        mistral: 'https://api.mistral.ai/v1/chat/completions',
    }

    if (provider === 'anthropic') {
        const r = await fetch(ENDPOINTS.anthropic, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
        })
        const data = await r.json()
        if (data.error) throw new Error(data.error.message)
        return data.content?.[0]?.text || ''
    }

    // OpenAI-compatible (OpenAI, Groq, Mistral)
    const endpoint = ENDPOINTS[provider]
    if (!endpoint) {
        if (provider === 'ollama') {
            const ollamaUrl = process.env.VITE_OLLAMA_URL || 'http://localhost:11434'
            const r = await fetch(`${ollamaUrl}/api/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages], stream: false }),
            })
            const data = await r.json()
            return data.message?.content || ''
        }
        throw new Error(`Unknown provider: ${provider}`)
    }

    const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
    })
    const data = await r.json()
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
    return data.choices?.[0]?.message?.content || ''
}

// ─── Tool Execution (direct, no server needed for CLI) ───
async function executeTool(name, params) {
    try {
        switch (name) {
            case 'shell_execute': {
                try {
                    const out = execSync(params.command, {
                        cwd: params.cwd || process.cwd(), timeout: params.timeout || 30000,
                        encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, shell: true,
                    })
                    return { success: true, result: { stdout: out?.slice(0, 30000), exitCode: 0 } }
                } catch (e) {
                    return { success: true, result: { stdout: e.stdout?.slice(0, 30000) || '', stderr: e.stderr?.slice(0, 5000) || e.message, exitCode: e.status || 1 } }
                }
            }
            case 'file_read': {
                const content = readFileSync(resolve(params.path), 'utf-8')
                return { success: true, result: { content: content.slice(0, 30000) } }
            }
            case 'file_write': {
                const dir = dirname(resolve(params.path))
                if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
                writeFileSync(resolve(params.path), params.content || '')
                return { success: true, result: { path: resolve(params.path), action: params.append ? 'appended' : 'written' } }
            }
            case 'file_list': {
                const { readdirSync: rd, statSync: st } = await import('fs')
                const dir = resolve(params.path || '.')
                const items = rd(dir).filter(n => n !== 'node_modules' && n !== '.git')
                    .map(n => { try { return { name: n, type: st(join(dir, n)).isDirectory() ? 'directory' : 'file' } } catch { return null } })
                    .filter(Boolean)
                return { success: true, result: { items, count: items.length } }
            }
            case 'web_search': {
                const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(params.query)}&format=json&no_html=1`
                const r = await fetch(url)
                const data = await r.json()
                const results = []
                if (data.AbstractText) results.push({ title: data.Heading, snippet: data.AbstractText, url: data.AbstractURL })
                for (const t of (data.RelatedTopics || []).slice(0, (params.maxResults || 5) - results.length)) {
                    if (t.Text) results.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL || '' })
                }
                return { success: true, result: { results, count: results.length } }
            }
            case 'web_fetch': {
                const r = await fetch(params.url, { headers: { 'User-Agent': 'MoltHive/1.0' }, signal: AbortSignal.timeout(15000) })
                let content = await r.text()
                content = content.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                return { success: true, result: { content: content.slice(0, params.maxLength || 20000), url: params.url } }
            }
            case 'code_execute': {
                const lang = params.language || 'javascript'
                if (lang === 'python') {
                    try { const out = execSync(`python -c ${JSON.stringify(params.code)}`, { timeout: 30000, encoding: 'utf-8' }); return { success: true, result: { output: out } } }
                    catch (e) { return { success: true, result: { output: e.stdout || '', error: e.stderr || e.message } } }
                }
                try { const out = execSync(`node -e ${JSON.stringify(params.code)}`, { timeout: 30000, encoding: 'utf-8' }); return { success: true, result: { output: out } } }
                catch (e) { return { success: true, result: { output: e.stdout || '', error: e.stderr || e.message } } }
            }
            case 'npm_install': {
                const cmd = `npm install ${params.dev ? '--save-dev' : '--save'} ${params.packages}`
                try { const out = execSync(cmd, { cwd: process.cwd(), timeout: 120000, encoding: 'utf-8', shell: true }); return { success: true, result: { installed: params.packages, output: out.slice(0, 3000) } } }
                catch (e) { return { success: false, error: e.stderr || e.message } }
            }
            case 'http_request': {
                const opts = { method: params.method || 'GET', headers: { 'Content-Type': 'application/json', ...(params.headers || {}) }, signal: AbortSignal.timeout(30000) }
                if (params.body && params.method !== 'GET') opts.body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body)
                const r = await fetch(params.url, opts)
                const ct = r.headers.get('content-type') || ''
                const data = ct.includes('json') ? await r.json() : await r.text()
                return { success: true, result: { status: r.status, data: typeof data === 'string' ? data.slice(0, 30000) : data } }
            }
            default: return { success: false, error: `Unknown tool: ${name}` }
        }
    } catch (e) { return { success: false, error: e.message } }
}

// ─── Parse tool calls from reply ───
function parseToolCalls(reply) {
    const calls = []
    const regex = /TOOL_CALL:\s*(\w+)\s*(\{[\s\S]*?\})/gi
    let m
    while ((m = regex.exec(reply)) !== null) {
        try { calls.push({ tool: m[1].trim(), params: JSON.parse(m[2].trim()) }) }
        catch { try { calls.push({ tool: m[1].trim(), params: JSON.parse(m[2].replace(/\n/g, '\\n')) }) } catch { } }
    }
    return calls
}

function formatResult(name, result, success) {
    if (!success) return `TOOL_RESULT [${name}] ERROR: ${result.error || 'Unknown error'}`
    const d = result.result || result
    let s
    if (typeof d === 'string') s = d
    else if (d.stdout) s = d.stdout + (d.stderr ? `\nSTDERR: ${d.stderr}` : '')
    else if (d.content) s = d.content
    else if (d.output) s = d.output
    else if (d.items) s = d.items.map(i => `${i.type === 'directory' ? '📁' : '📄'} ${i.name}`).join('\n')
    else if (d.results) s = d.results.map((r, i) => `[${i + 1}] ${r.title}\n    ${r.snippet}`).join('\n\n')
    else s = JSON.stringify(d, null, 2)
    if (s && s.length > 15000) s = s.slice(0, 15000) + '\n... [truncated]'
    return `TOOL_RESULT [${name}] SUCCESS:\n${s}`
}

// ─── Build System Prompt ───
function buildPrompt(agent, tools = true) {
    let p = `# IDENTITY\nYou are ${agent.name}, a ${agent.role} agent in the Molt Hive.\nGeneration: ${agent.generation || 1} | Runs: ${agent.runs || 0}\n`
    if (tools) {
        p += `\n# TOOLS\nYou have these tools available. To use one, write:\nTOOL_CALL: tool_name {"param": "value"}\n\n`
        p += `shell_execute — Run a shell command. Params: command (required), cwd (optional)\n`
        p += `file_read — Read a file. Params: path (required)\n`
        p += `file_write — Write a file. Params: path (required), content (required)\n`
        p += `file_list — List directory. Params: path (optional), recursive (optional)\n`
        p += `web_search — Search the web. Params: query (required)\n`
        p += `web_fetch — Fetch a URL. Params: url (required)\n`
        p += `code_execute — Run JS or Python. Params: code (required), language (optional)\n`
        p += `npm_install — Install npm packages. Params: packages (required)\n`
        p += `http_request — HTTP request. Params: method, url (required), headers, body\n\n`
        p += `When done with a multi-step task, write: TASK_COMPLETE: [summary]\n`
        p += `If you need human input, write: NEEDS_HUMAN: [question]\n`
        p += `If you don't know how to do something, SEARCH THE WEB FIRST.\n`
    }
    p += `\n# DIRECTIVES\n- ACT, don't just talk.\n- Research first if unsure.\n- Compress, never discard.\n- Share knowledge. CRYSTALLIZE: [topic] to save patterns.\n`
    return p
}

// ─── Colors ───
const CLR = {
    reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
    cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
    red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
}
const c = (color, text) => `${color}${text}${CLR.reset}`

// ─── Main ───
async function main() {
    const args = process.argv.slice(2)
    const flags = { forever: args.includes('--forever'), setup: args.includes('--setup'), reset: args.includes('--reset'), help: args.includes('--help') }
    const taskArg = args.filter(a => !a.startsWith('--')).join(' ').trim()

    // Help
    if (flags.help) {
        console.log(`
${c(CLR.cyan, '🧠 Molt-Hive CLI')}

${c(CLR.bold, 'Usage:')}
  npx molt-hive                          Interactive chat
  npx molt-hive "your task"              Single task (auto mode, 20 iterations)
  npx molt-hive --forever "your task"    Continuous mode (runs until stopped)
  npx molt-hive --setup                  Re-run setup
  npx molt-hive --reset                  Reset all data

${c(CLR.bold, 'Environment:')}
  Reads .env for API keys. Stores data in ~/.molthive/
  Supports: Anthropic, OpenAI, Groq, Mistral, Ollama
`)
        process.exit(0)
    }

    // Reset
    if (flags.reset) {
        const { rmSync } = await import('fs')
        try { rmSync(DATA_DIR, { recursive: true, force: true }) } catch { }
        console.log(c(CLR.green, '✓ Hive reset. All data cleared.'))
        process.exit(0)
    }

    console.log(`\n${c(CLR.cyan, '🧠 Molt-Hive CLI')} ${c(CLR.dim, 'v1.0.0')}\n`)

    const env = loadEnv()
    let config = fileGet('config')

    // Setup
    if (!config || flags.setup) {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const ask = (q) => new Promise(r => rl.question(q, r))

        console.log(c(CLR.yellow, '⚙ Setup\n'))

        // Provider
        const providers = ['anthropic', 'openai', 'groq', 'mistral', 'ollama']
        console.log('LLM Providers:')
        providers.forEach((p, i) => console.log(`  ${i + 1}. ${p}${p === 'groq' ? ' (free tier)' : p === 'ollama' ? ' (local, free)' : ''}`))
        const pi = parseInt(await ask('\nSelect provider (1-5): ')) - 1
        const provider = providers[Math.max(0, Math.min(pi, 4))]

        let apiKey = ''
        if (provider !== 'ollama') {
            const envKey = `VITE_${provider.toUpperCase()}_API_KEY`
            apiKey = env[envKey] || ''
            if (!apiKey) apiKey = await ask(`API key for ${provider}: `)
        }

        // Model
        const defaultModels = {
            anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o',
            groq: 'llama-3.3-70b-versatile', mistral: 'mistral-large-latest', ollama: 'llama3.2',
        }
        const model = (await ask(`Model (default: ${defaultModels[provider]}): `)).trim() || defaultModels[provider]

        // Agent
        const agentName = (await ask('Agent name (default: Atlas): ')).trim() || 'Atlas'
        const agentRole = (await ask('Agent role (default: Generalist): ')).trim() || 'Generalist'

        config = { provider, apiKey, model, agentName, agentRole }
        fileSet('config', config)
        if (!fileGet('agent')) fileSet('agent', { name: agentName, role: agentRole, generation: 1, runs: 0 })

        rl.close()
        console.log(c(CLR.green, `\n✓ ${agentName} (${agentRole}) ready on ${provider}/${model}\n`))
    }

    const agent = fileGet('agent', { name: config.agentName || 'Atlas', role: config.agentRole || 'Generalist', generation: 1, runs: 0 })
    const history = fileGet('history', [])

    // ─── Agentic loop ───
    async function agentLoop(task, maxIter = 20) {
        const messages = [...history.slice(-8)]
        messages.push({ role: 'user', content: task })
        let iteration = 0
        const isForever = maxIter === Infinity

        while (iteration < maxIter) {
            iteration++
            process.stdout.write(c(CLR.dim, `  [iter ${iteration}] `))

            // Context pruning
            if (messages.length > 30) {
                const head = messages.slice(0, 2)
                const tail = messages.slice(-20)
                messages.length = 0
                messages.push(...head, { role: 'user', content: `[Context trimmed. Iteration ${iteration}. Continue.]` }, ...tail)
            }

            try {
                const reply = await llmCall({
                    provider: config.provider, apiKey: config.apiKey, model: config.model,
                    system: buildPrompt(agent, true) + (isForever ? '\n# FOREVER MODE: Keep working until truly done, then TASK_COMPLETE.' : ''),
                    messages, maxTokens: 2000,
                })

                // TASK_COMPLETE
                if (/TASK_COMPLETE:/i.test(reply)) {
                    const summary = reply.match(/TASK_COMPLETE:\s*([\s\S]*?)(?:\n\n|\n?$)/i)?.[1]?.trim()
                    const clean = reply.replace(/TASK_COMPLETE:[\s\S]*/i, '').trim()
                    if (clean) console.log(`\n${c(agent.color || CLR.cyan, `${agent.name}:`)} ${clean}`)
                    console.log(c(CLR.green, `\n✓ Task complete: ${summary || 'Done'}`))
                    console.log(c(CLR.dim, `  ${iteration} iterations`))
                    break
                }

                // NEEDS_HUMAN
                if (/NEEDS_HUMAN:/i.test(reply)) {
                    const q = reply.match(/NEEDS_HUMAN:\s*([\s\S]*?)(?:\n\n|\n?$)/i)?.[1]?.trim()
                    console.log(c(CLR.yellow, `\n🤚 Agent needs input: ${q}`))
                    const rl2 = createInterface({ input: process.stdin, output: process.stdout })
                    const answer = await new Promise(r => rl2.question(c(CLR.cyan, '> '), r))
                    rl2.close()
                    messages.push({ role: 'assistant', content: reply })
                    messages.push({ role: 'user', content: answer })
                    continue
                }

                // TOOL_CALL
                const calls = parseToolCalls(reply)
                if (calls.length > 0) {
                    const clean = reply.replace(/TOOL_CALL:\s*\w+\s*\{[\s\S]*?\}/gi, '').trim()
                    if (clean) console.log(`${c(agent.color || CLR.cyan, agent.name + ':')} ${clean}`)

                    for (const call of calls.slice(0, 5)) {
                        process.stdout.write(c(CLR.magenta, `  ⚡ ${call.tool} `))
                        process.stdout.write(c(CLR.dim, JSON.stringify(call.params).slice(0, 60) + '\n'))
                        const result = await executeTool(call.tool, call.params)
                        const resultText = formatResult(call.tool, result, result.success)
                        const preview = resultText.slice(0, 200).replace(/\n/g, ' ')
                        console.log(c(result.success ? CLR.green : CLR.red, `    ${result.success ? '✓' : '✗'} `) + c(CLR.dim, preview))
                        messages.push({ role: 'assistant', content: reply })
                        messages.push({ role: 'user', content: resultText })
                    }
                    continue
                }

                // Plain text
                console.log(`\n${c(CLR.cyan, agent.name + ':')} ${reply}\n`)
                if (!isForever) break
                messages.push({ role: 'assistant', content: reply })
                messages.push({ role: 'user', content: 'Continue. Use tools. If done, TASK_COMPLETE.' })

            } catch (err) {
                console.log(c(CLR.red, `  ⚠ Error: ${err.message}`))
                if (iteration === 1 && !isForever) break
                messages.push({ role: 'user', content: `ERROR: ${err.message}. Try differently.` })
            }

            // Forever cooldown
            if (isForever) await new Promise(r => setTimeout(r, 1000))
            // Checkpoint
            if (isForever && iteration % 10 === 0) console.log(c(CLR.yellow, `  📍 Checkpoint: iteration ${iteration}`))
        }

        // Save
        agent.runs = (agent.runs || 0) + 1
        fileSet('agent', agent)
        history.push({ role: 'user', content: task })
        if (history.length > 50) history.splice(0, history.length - 50)
        fileSet('history', history)
    }

    // ─── Run mode ───
    if (taskArg) {
        // Single task or forever task
        await agentLoop(taskArg, flags.forever ? Infinity : 20)
        process.exit(0)
    }

    // Interactive REPL
    console.log(`${c(CLR.cyan, agent.name)} (${agent.role}) · Gen ${agent.generation} · ${config.provider}/${config.model}`)
    console.log(c(CLR.dim, 'Type a message or task. Ctrl+C to exit.\n'))

    const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: c(CLR.cyan, '> ') })
    rl.prompt()
    rl.on('line', async (line) => {
        const text = line.trim()
        if (!text) { rl.prompt(); return }
        if (text === '/quit' || text === '/exit') { rl.close(); process.exit(0) }
        if (text === '/forever') { console.log(c(CLR.yellow, 'Type your task for forever mode:')); rl.prompt(); return }
        if (text.startsWith('/forever ')) { await agentLoop(text.slice(9), Infinity); rl.prompt(); return }
        await agentLoop(text, 20)
        rl.prompt()
    })
    rl.on('close', () => { console.log(c(CLR.dim, '\nGoodbye.')); process.exit(0) })
}

main().catch(e => { console.error(c(CLR.red, `Fatal: ${e.message}`)); process.exit(1) })
