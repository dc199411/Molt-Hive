#!/usr/bin/env node

/**
 * Molt CLI — Full-featured command-line interface for Molt Hive
 * 
 * Commands:
 *   molt start                          Setup wizard + interactive REPL
 *   molt chat                           Interactive chat (REPL)
 *   molt run "task description"         Run a single task (auto mode, 20 iterations)
 *   molt run --forever "task"           Run a task in forever mode
 *   molt spawn <name> [role]            Spawn a new agent
 *   molt status                         Show hive status
 *   molt agents                         List all agents
 *   molt skills                         List loaded skills
 *   molt reset                          Reset all data
 *   molt config                         Show current configuration
 *   molt config set <key> <value>       Update configuration
 *   molt help                           Show help
 * 
 * Environment:
 *   Reads .env for API keys (same as web UI)
 *   Persists memory to ~/.molthive/ (file-based storage)
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─── Colors ───
const CLR = {
    reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
    cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
    red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
    white: '\x1b[37m',
}
const c = (color, text) => `${color}${text}${CLR.reset}`

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

// ─── File-based storage ───
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

// ─── LLM Call ───
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

    if (provider === 'ollama') {
        const ollamaUrl = process.env.VITE_OLLAMA_URL || loadEnv().VITE_OLLAMA_URL || 'http://localhost:11434'
        const r = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages], stream: false }),
        })
        const data = await r.json()
        return data.message?.content || ''
    }

    const endpoint = ENDPOINTS[provider]
    if (!endpoint) throw new Error(`Unknown provider: ${provider}`)

    const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
    })
    const data = await r.json()
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
    return data.choices?.[0]?.message?.content || ''
}

// ─── Tool Execution ───
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
                if (params.append) {
                    const existing = existsSync(resolve(params.path)) ? readFileSync(resolve(params.path), 'utf-8') : ''
                    writeFileSync(resolve(params.path), existing + (params.content || ''))
                } else {
                    writeFileSync(resolve(params.path), params.content || '')
                }
                return { success: true, result: { path: resolve(params.path), action: params.append ? 'appended' : 'written' } }
            }
            case 'file_list': {
                const dir = resolve(params.path || '.')
                const items = readdirSync(dir).filter(n => n !== 'node_modules' && n !== '.git')
                    .map(n => { try { return { name: n, type: statSync(join(dir, n)).isDirectory() ? 'directory' : 'file' } } catch { return null } })
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

// ─── Parse tool calls ───
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

// ─── System Prompt ───
function buildPrompt(agent, tools = true) {
    let p = `# IDENTITY\nYou are ${agent.name}, a ${agent.role} agent in the Molt Hive.\nGeneration: ${agent.generation || 1} | Runs: ${agent.runs || 0}\n`
    if (tools) {
        p += `\n# TOOLS\nYou have these tools available. To use one, write:\nTOOL_CALL: tool_name {"param": "value"}\n\n`
        p += `shell_execute — Run a shell command. Params: command (required), cwd (optional)\n`
        p += `file_read — Read a file. Params: path (required)\n`
        p += `file_write — Write a file. Params: path (required), content (required), append (optional)\n`
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

// ─── Setup Wizard ───
async function runSetup() {
    const env = loadEnv()
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const ask = (q) => new Promise(r => rl.question(q, r))

    console.log(c(CLR.yellow, '\n⚙ Molt Hive Setup\n'))

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

    const config = { provider, apiKey, model, agentName, agentRole }
    fileSet('config', config)
    if (!fileGet('agent')) fileSet('agent', { name: agentName, role: agentRole, generation: 1, runs: 0 })

    rl.close()
    console.log(c(CLR.green, `\n✓ ${agentName} (${agentRole}) ready on ${provider}/${model}\n`))
    return config
}

// ─── Agentic Loop ───
async function agentLoop(config, agent, history, task, maxIter = 20) {
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
                if (clean) console.log(`\n${c(CLR.cyan, `${agent.name}:`)} ${clean}`)
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
                if (clean) console.log(`${c(CLR.cyan, agent.name + ':')} ${clean}`)

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

        if (isForever) await new Promise(r => setTimeout(r, 1000))
        if (isForever && iteration % 10 === 0) console.log(c(CLR.yellow, `  📍 Checkpoint: iteration ${iteration}`))
    }

    // Save
    agent.runs = (agent.runs || 0) + 1
    fileSet('agent', agent)
    history.push({ role: 'user', content: task })
    if (history.length > 50) history.splice(0, history.length - 50)
    fileSet('history', history)
}

// ─── Commands ───
const COMMANDS = {
    help: showHelp,
    start: cmdStart,
    chat: cmdChat,
    run: cmdRun,
    spawn: cmdSpawn,
    status: cmdStatus,
    agents: cmdAgents,
    skills: cmdSkills,
    config: cmdConfig,
    reset: cmdReset,
    version: cmdVersion,
}

function showHelp() {
    console.log(`
${c(CLR.cyan, '🧠 Molt')} ${c(CLR.dim, '— Autonomous AI Agent CLI')}

${c(CLR.bold, 'Setup & Launch:')}
  ${c(CLR.white, 'molt start')}                          Setup wizard → interactive chat
  ${c(CLR.white, 'molt chat')}                           Interactive chat (REPL)

${c(CLR.bold, 'Task Execution:')}
  ${c(CLR.white, 'molt run "your task"')}                Run a task (auto mode, 20 iterations)
  ${c(CLR.white, 'molt run --forever "your task"')}      Run a task continuously until done

${c(CLR.bold, 'Agent Management:')}
  ${c(CLR.white, 'molt spawn <name> [role]')}            Spawn a new agent into the hive
  ${c(CLR.white, 'molt agents')}                         List all agents
  ${c(CLR.white, 'molt status')}                         Show full hive status

${c(CLR.bold, 'Configuration:')}
  ${c(CLR.white, 'molt config')}                         Show current config
  ${c(CLR.white, 'molt config set provider groq')}       Change provider
  ${c(CLR.white, 'molt config set model gpt-4o')}        Change model
  ${c(CLR.white, 'molt config set apiKey sk-...')}       Set API key

${c(CLR.bold, 'Other:')}
  ${c(CLR.white, 'molt skills')}                         List loaded skills
  ${c(CLR.white, 'molt reset')}                          Reset all data
  ${c(CLR.white, 'molt version')}                        Show version
  ${c(CLR.white, 'molt help')}                           Show this help

${c(CLR.bold, 'REPL Commands')} (inside molt chat):
  /run <task>       Run a task in auto mode
  /forever <task>   Run in forever mode
  /spawn <n> [r]    Spawn an agent
  /status           Show hive status
  /agents           List agents
  /skills           List skills
  /quit             Exit
`)
}

async function cmdStart() {
    console.log(`\n${c(CLR.cyan, '🧠 Molt')} ${c(CLR.dim, 'v1.0.0')}\n`)
    let config = fileGet('config')
    if (!config) {
        config = await runSetup()
    } else {
        console.log(c(CLR.green, `✓ Hive configured: ${config.agentName} on ${config.provider}/${config.model}\n`))
    }
    await startREPL(config)
}

async function cmdChat() {
    console.log(`\n${c(CLR.cyan, '🧠 Molt')} ${c(CLR.dim, 'v1.0.0')}\n`)
    const config = requireConfig()
    await startREPL(config)
}

async function cmdRun() {
    const args = process.argv.slice(3)
    const forever = args.includes('--forever')
    const task = args.filter(a => !a.startsWith('--')).join(' ').trim()

    if (!task) {
        console.log(c(CLR.red, 'Usage: molt run "your task description"'))
        console.log(c(CLR.dim, '  Add --forever for continuous mode'))
        process.exit(1)
    }

    console.log(`\n${c(CLR.cyan, '🧠 Molt')} ${c(CLR.dim, forever ? '♾️ forever mode' : '🤖 auto mode')}\n`)
    const config = requireConfig()
    const agent = fileGet('agent', { name: config.agentName || 'Atlas', role: config.agentRole || 'Generalist', generation: 1, runs: 0 })
    const history = fileGet('history', [])

    console.log(`${c(CLR.cyan, agent.name)} running: ${c(CLR.white, task)}\n`)
    await agentLoop(config, agent, history, task, forever ? Infinity : 20)
}

function cmdSpawn() {
    const name = process.argv[3]
    const role = process.argv.slice(4).join(' ') || 'Generalist'

    if (!name) {
        console.log(c(CLR.red, 'Usage: molt spawn <name> [role]'))
        console.log(c(CLR.dim, '\nAvailable roles: Generalist, Research, Engineering, Strategy, Creative, Analysis'))
        process.exit(1)
    }

    const agents = fileGet('agents', [])
    agents.push({
        name, role, generation: 1, runs: 0,
        createdAt: new Date().toISOString(),
    })
    fileSet('agents', agents)
    console.log(c(CLR.green, `\n✓ Spawned "${name}" (${role})`))
    console.log(c(CLR.dim, `  Total agents: ${agents.length + 1} (including primary)\n`))
}

function cmdStatus() {
    const config = fileGet('config')
    const agent = fileGet('agent')
    const agents = fileGet('agents', [])
    const history = fileGet('history', [])

    console.log(`\n${c(CLR.cyan, '🧠 Molt Hive — Status')}\n`)

    if (!config) {
        console.log(c(CLR.yellow, '  Not configured yet. Run: molt start\n'))
        process.exit(0)
    }

    // Config
    console.log(`  ${c(CLR.bold, '┌─ Configuration')}`)
    console.log(`  │  Provider:  ${c(CLR.white, config.provider)}`)
    console.log(`  │  Model:     ${c(CLR.white, config.model)}`)
    console.log(`  │  API Key:   ${config.apiKey ? c(CLR.green, '✓ set') : c(CLR.red, '✗ missing')}`)
    console.log(`  │`)

    // Primary agent
    console.log(`  ${c(CLR.bold, '├─ Primary Agent')}`)
    console.log(`  │  Name:      ${c(CLR.cyan, agent?.name || 'not set')}`)
    console.log(`  │  Role:      ${agent?.role || 'not set'}`)
    console.log(`  │  Gen:       ${agent?.generation || 1}`)
    console.log(`  │  Runs:      ${agent?.runs || 0}`)
    console.log(`  │`)

    // Spawned agents
    if (agents.length > 0) {
        console.log(`  ${c(CLR.bold, `├─ Spawned Agents (${agents.length})`)}`)
        agents.forEach((a, i) => {
            const last = i === agents.length - 1
            console.log(`  │  ${c(CLR.cyan, a.name)} (${a.role}) · Gen ${a.generation || 1} · ${a.runs || 0} runs`)
        })
        console.log(`  │`)
    }

    // Memory
    console.log(`  ${c(CLR.bold, '└─ Memory')}`)
    console.log(`     History:   ${history.length} messages`)
    console.log(`     Data dir:  ${c(CLR.dim, DATA_DIR)}`)
    console.log('')
}

function cmdAgents() {
    const agent = fileGet('agent')
    const agents = fileGet('agents', [])

    console.log(`\n${c(CLR.cyan, '🧠 Molt Hive — Agents')}\n`)

    if (agent) {
        console.log(`  ${c(CLR.green, '●')} ${c(CLR.cyan, agent.name)} ${c(CLR.dim, `(${agent.role})`)} — Gen ${agent.generation || 1} · ${agent.runs || 0} runs ${c(CLR.yellow, '[primary]')}`)
    }

    if (agents.length > 0) {
        agents.forEach(a => {
            console.log(`  ${c(CLR.blue, '○')} ${c(CLR.cyan, a.name)} ${c(CLR.dim, `(${a.role})`)} — Gen ${a.generation || 1} · ${a.runs || 0} runs`)
        })
    }

    if (!agent && agents.length === 0) {
        console.log(c(CLR.yellow, '  No agents yet. Run: molt start'))
    }

    console.log(`\n  ${c(CLR.dim, `Total: ${(agent ? 1 : 0) + agents.length} agent(s)`)}\n`)
}

function cmdSkills() {
    const skillsDir = join(__dirname, 'skills')

    console.log(`\n${c(CLR.cyan, '🧠 Molt Hive — Skills')}\n`)

    if (!existsSync(skillsDir)) {
        console.log(c(CLR.yellow, '  No skills directory found.\n'))
        process.exit(0)
    }

    const folders = readdirSync(skillsDir).filter(f => {
        if (f.startsWith('.')) return false
        try { return statSync(join(skillsDir, f)).isDirectory() } catch { return false }
    })

    if (folders.length === 0) {
        console.log(c(CLR.yellow, '  No skills installed.\n'))
        process.exit(0)
    }

    folders.forEach(folder => {
        const skillFile = join(skillsDir, folder, 'SKILL.md')
        let desc = ''
        if (existsSync(skillFile)) {
            const content = readFileSync(skillFile, 'utf-8')
            const descMatch = content.match(/description:\s*(.+)/i)
            desc = descMatch ? descMatch[1].trim() : ''
        }
        const isTemplate = folder === '_template'
        const icon = isTemplate ? '📋' : '🔧'
        console.log(`  ${icon} ${c(CLR.white, folder)}${desc ? c(CLR.dim, ` — ${desc}`) : ''}${isTemplate ? c(CLR.dim, ' (template)') : ''}`)
    })

    console.log(`\n  ${c(CLR.dim, `${folders.length} skill(s) in ${skillsDir}`)}\n`)
}

function cmdConfig() {
    const subArgs = process.argv.slice(3)

    // molt config set <key> <value>
    if (subArgs[0] === 'set' && subArgs.length >= 3) {
        const key = subArgs[1]
        const value = subArgs.slice(2).join(' ')
        const config = fileGet('config')
        if (!config) {
            console.log(c(CLR.red, 'No config found. Run: molt start'))
            process.exit(1)
        }
        const validKeys = ['provider', 'model', 'apiKey', 'agentName', 'agentRole']
        if (!validKeys.includes(key)) {
            console.log(c(CLR.red, `Invalid key: ${key}`))
            console.log(c(CLR.dim, `Valid keys: ${validKeys.join(', ')}`))
            process.exit(1)
        }
        config[key] = value
        fileSet('config', config)
        console.log(c(CLR.green, `\n✓ Set ${key} = ${key === 'apiKey' ? '***' : value}\n`))
        return
    }

    // molt config (show)
    const config = fileGet('config')
    if (!config) {
        console.log(c(CLR.yellow, '\nNo config found. Run: molt start\n'))
        process.exit(0)
    }

    console.log(`\n${c(CLR.cyan, '🧠 Molt Hive — Configuration')}\n`)
    console.log(`  provider:   ${c(CLR.white, config.provider)}`)
    console.log(`  model:      ${c(CLR.white, config.model)}`)
    console.log(`  apiKey:     ${config.apiKey ? c(CLR.green, '✓ set (' + config.apiKey.slice(0, 8) + '...)') : c(CLR.red, '✗ not set')}`)
    console.log(`  agentName:  ${c(CLR.white, config.agentName || 'Atlas')}`)
    console.log(`  agentRole:  ${c(CLR.white, config.agentRole || 'Generalist')}`)
    console.log(`\n  ${c(CLR.dim, 'Change: molt config set <key> <value>')}\n`)
}

function cmdReset() {
    try { rmSync(DATA_DIR, { recursive: true, force: true }) } catch { }
    console.log(c(CLR.green, '\n✓ Hive reset. All data cleared.\n'))
}

function cmdVersion() {
    console.log(`${c(CLR.cyan, '🧠 Molt')} ${c(CLR.dim, 'v1.0.0')}`)
}

// ─── Config guard ───
function requireConfig() {
    const config = fileGet('config')
    if (!config) {
        console.log(c(CLR.red, 'Not configured. Run: molt start\n'))
        process.exit(1)
    }
    return config
}

// ─── Interactive REPL ───
async function startREPL(config) {
    const agent = fileGet('agent', { name: config.agentName || 'Atlas', role: config.agentRole || 'Generalist', generation: 1, runs: 0 })
    const history = fileGet('history', [])

    console.log(`${c(CLR.cyan, agent.name)} (${agent.role}) · Gen ${agent.generation} · ${config.provider}/${config.model}`)
    console.log(c(CLR.dim, 'Type a message, /run <task>, /forever <task>, /help, or /quit\n'))

    const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: c(CLR.cyan, '❯ ') })
    rl.prompt()

    rl.on('line', async (line) => {
        const text = line.trim()
        if (!text) { rl.prompt(); return }

        // REPL commands
        if (text === '/quit' || text === '/exit') { rl.close(); process.exit(0) }
        if (text === '/help') {
            console.log(c(CLR.dim, `
  /run <task>       Run task in auto mode (20 iterations)
  /forever <task>   Run task continuously
  /spawn <n> [r]    Spawn a new agent
  /agents           List agents
  /status           Show hive status
  /skills           List skills
  /config           Show config
  /quit             Exit
`))
            rl.prompt(); return
        }
        if (text.startsWith('/run ')) { await agentLoop(config, agent, history, text.slice(5), 20); rl.prompt(); return }
        if (text.startsWith('/forever ')) { await agentLoop(config, agent, history, text.slice(9), Infinity); rl.prompt(); return }
        if (text === '/status') { cmdStatus(); rl.prompt(); return }
        if (text === '/agents') { cmdAgents(); rl.prompt(); return }
        if (text === '/skills') { cmdSkills(); rl.prompt(); return }
        if (text === '/config') { cmdConfig(); rl.prompt(); return }
        if (text.startsWith('/spawn ')) {
            const parts = text.slice(7).trim().split(/\s+/)
            const name = parts[0]
            const role = parts.slice(1).join(' ') || 'Generalist'
            if (!name) { console.log(c(CLR.red, 'Usage: /spawn <name> [role]')); rl.prompt(); return }
            const agents = fileGet('agents', [])
            agents.push({ name, role, generation: 1, runs: 0, createdAt: new Date().toISOString() })
            fileSet('agents', agents)
            console.log(c(CLR.green, `✓ Spawned "${name}" (${role})`))
            rl.prompt(); return
        }

        // Regular chat message → auto mode
        await agentLoop(config, agent, history, text, 20)
        rl.prompt()
    })

    rl.on('close', () => { console.log(c(CLR.dim, '\nGoodbye.')); process.exit(0) })
}

// ─── Main Router ───
async function main() {
    const cmd = process.argv[2]?.toLowerCase()

    // No args → show help
    if (!cmd) { showHelp(); process.exit(0) }

    // Known commands
    if (COMMANDS[cmd]) {
        await COMMANDS[cmd]()
        return
    }

    // Unknown command — treat as a task if it doesn't look like a flag
    if (!cmd.startsWith('-')) {
        // Could be a task string: molt "create a REST API"
        const task = process.argv.slice(2).filter(a => !a.startsWith('--')).join(' ').trim()
        if (task) {
            console.log(`\n${c(CLR.cyan, '🧠 Molt')} ${c(CLR.dim, '🤖 auto mode')}\n`)
            const config = requireConfig()
            const agent = fileGet('agent', { name: config.agentName || 'Atlas', role: config.agentRole || 'Generalist', generation: 1, runs: 0 })
            const history = fileGet('history', [])
            await agentLoop(config, agent, history, task, 20)
            return
        }
    }

    console.log(c(CLR.red, `Unknown command: ${cmd}`))
    console.log(c(CLR.dim, 'Run molt help for usage.\n'))
    process.exit(1)
}

main().catch(e => { console.error(c(CLR.red, `Fatal: ${e.message}`)); process.exit(1) })
