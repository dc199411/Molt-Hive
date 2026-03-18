/**
 * Molt-Hive Tool Server
 * Express server providing tool execution endpoints.
 * Agents call tools via POST /api/tools/execute.
 * 
 * Tools: shell_execute, file_read, file_write, file_list,
 *        web_search, web_fetch, code_execute, npm_install
 */

import express from 'express'
import cors from 'cors'
import { execSync, exec } from 'child_process'
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs'
import { join, resolve, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.TOOL_SERVER_PORT || 3001

// ─── Configuration ───
const CONFIG = {
    maxCommandTimeout: 60000, // 60s max for shell commands
    maxFileSize: 5 * 1024 * 1024, // 5MB max file read
    maxOutputLength: 50000, // 50k chars max output
    workingDir: process.env.TOOL_WORKING_DIR || process.cwd(),
}

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'molt-hive-tools',
        version: '1.0.0',
        workingDir: CONFIG.workingDir,
        tools: Object.keys(TOOLS),
    })
})

// ─── List Tools ───
app.post('/api/tools/list', (req, res) => {
    const toolList = Object.entries(TOOLS).map(([name, tool]) => ({
        name,
        description: tool.description,
        parameters: tool.parameters,
    }))
    res.json({ tools: toolList })
})

// ─── Execute Tool ───
app.post('/api/tools/execute', async (req, res) => {
    const { tool, params } = req.body

    if (!tool || !TOOLS[tool]) {
        return res.status(400).json({
            success: false,
            error: `Unknown tool: ${tool}. Available: ${Object.keys(TOOLS).join(', ')}`,
        })
    }

    console.log(`[Tool] Executing: ${tool}`, JSON.stringify(params).slice(0, 200))

    try {
        const result = await TOOLS[tool].execute(params || {})
        console.log(`[Tool] ${tool} completed successfully`)
        res.json({ success: true, result })
    } catch (error) {
        console.error(`[Tool] ${tool} failed:`, error.message)
        res.json({
            success: false,
            error: error.message || String(error),
        })
    }
})

// ═══════════════════════════════════════════════════════════════
//  TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const TOOLS = {

    // ─── Shell Execute ───
    shell_execute: {
        description: 'Execute a shell command and return the output. Use for any terminal operation.',
        parameters: {
            command: 'string — the command to run',
            cwd: 'string (optional) — working directory',
            timeout: 'number (optional) — timeout in ms (default 30000)',
        },
        async execute({ command, cwd, timeout = 30000 }) {
            if (!command) throw new Error('command is required')
            const workDir = cwd ? resolve(cwd) : CONFIG.workingDir

            try {
                const output = execSync(command, {
                    cwd: workDir,
                    timeout: Math.min(timeout, CONFIG.maxCommandTimeout),
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024,
                    shell: true,
                })
                return {
                    stdout: (output || '').slice(0, CONFIG.maxOutputLength),
                    exitCode: 0,
                    cwd: workDir,
                }
            } catch (error) {
                return {
                    stdout: (error.stdout || '').slice(0, CONFIG.maxOutputLength),
                    stderr: (error.stderr || error.message || '').slice(0, CONFIG.maxOutputLength),
                    exitCode: error.status || 1,
                    cwd: workDir,
                }
            }
        },
    },

    // ─── File Read ───
    file_read: {
        description: 'Read the contents of a file.',
        parameters: {
            path: 'string — file path (absolute or relative to working dir)',
        },
        async execute({ path: filePath }) {
            if (!filePath) throw new Error('path is required')
            const fullPath = resolve(CONFIG.workingDir, filePath)

            const stat = statSync(fullPath)
            if (stat.size > CONFIG.maxFileSize) {
                throw new Error(`File too large: ${stat.size} bytes (max ${CONFIG.maxFileSize})`)
            }

            const content = readFileSync(fullPath, 'utf-8')
            return {
                content: content.slice(0, CONFIG.maxOutputLength),
                path: fullPath,
                size: stat.size,
            }
        },
    },

    // ─── File Write ───
    file_write: {
        description: 'Write content to a file. Creates the file and parent directories if they don\'t exist.',
        parameters: {
            path: 'string — file path',
            content: 'string — content to write',
            append: 'boolean (optional) — append instead of overwrite',
        },
        async execute({ path: filePath, content, append = false }) {
            if (!filePath) throw new Error('path is required')
            if (content === undefined) throw new Error('content is required')

            const fullPath = resolve(CONFIG.workingDir, filePath)
            const dir = dirname(fullPath)

            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true })
            }

            if (append) {
                const existing = existsSync(fullPath) ? readFileSync(fullPath, 'utf-8') : ''
                writeFileSync(fullPath, existing + content, 'utf-8')
            } else {
                writeFileSync(fullPath, content, 'utf-8')
            }

            return {
                path: fullPath,
                bytes: Buffer.byteLength(content),
                action: append ? 'appended' : 'written',
            }
        },
    },

    // ─── File List ───
    file_list: {
        description: 'List files and directories in a path.',
        parameters: {
            path: 'string (optional) — directory path (defaults to working dir)',
            recursive: 'boolean (optional) — list recursively',
        },
        async execute({ path: dirPath, recursive = false }) {
            const fullPath = resolve(CONFIG.workingDir, dirPath || '.')

            function listDir(dir, depth = 0) {
                const items = []
                const entries = readdirSync(dir)

                for (const entry of entries) {
                    if (entry === 'node_modules' || entry === '.git') continue
                    const entryPath = join(dir, entry)
                    try {
                        const stat = statSync(entryPath)
                        items.push({
                            name: entry,
                            type: stat.isDirectory() ? 'directory' : 'file',
                            size: stat.isFile() ? stat.size : undefined,
                        })
                        if (recursive && stat.isDirectory() && depth < 3) {
                            const children = listDir(entryPath, depth + 1)
                            items.push(...children.map(c => ({
                                ...c,
                                name: `${entry}/${c.name}`,
                            })))
                        }
                    } catch { /* skip inaccessible */ }
                }
                return items
            }

            const items = listDir(fullPath)
            return { path: fullPath, items, count: items.length }
        },
    },

    // ─── Web Search ───
    web_search: {
        description: 'Search the web using DuckDuckGo. Returns summarized results. No API key needed.',
        parameters: {
            query: 'string — search query',
            maxResults: 'number (optional) — max results to return (default 5)',
        },
        async execute({ query, maxResults = 5 }) {
            if (!query) throw new Error('query is required')

            // Use DuckDuckGo HTML API (no key needed)
            const encodedQuery = encodeURIComponent(query)
            const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`

            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'MoltHive/1.0 (Agent Research Tool)',
                    },
                })
                const html = await response.text()

                // Parse results from HTML
                const results = []
                const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
                const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

                let match
                while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
                    const snippetMatch = snippetRegex.exec(html)
                    results.push({
                        url: match[1],
                        title: match[2].replace(/<[^>]*>/g, '').trim(),
                        snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '',
                    })
                }

                // Fallback: if HTML parsing fails, use the instant answer API
                if (results.length === 0) {
                    const apiUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1`
                    const apiResp = await fetch(apiUrl)
                    const apiData = await apiResp.json()

                    if (apiData.AbstractText) {
                        results.push({
                            url: apiData.AbstractURL || '',
                            title: apiData.Heading || query,
                            snippet: apiData.AbstractText,
                        })
                    }
                    if (apiData.RelatedTopics) {
                        for (const topic of apiData.RelatedTopics.slice(0, maxResults - results.length)) {
                            if (topic.Text) {
                                results.push({
                                    url: topic.FirstURL || '',
                                    title: topic.Text.slice(0, 80),
                                    snippet: topic.Text,
                                })
                            }
                        }
                    }
                }

                return { query, results, count: results.length }
            } catch (error) {
                throw new Error(`Web search failed: ${error.message}`)
            }
        },
    },

    // ─── Web Fetch ───
    web_fetch: {
        description: 'Fetch content from a URL. Returns the text/HTML content.',
        parameters: {
            url: 'string — URL to fetch',
            maxLength: 'number (optional) — max content length (default 20000)',
        },
        async execute({ url, maxLength = 20000 }) {
            if (!url) throw new Error('url is required')

            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'MoltHive/1.0 (Agent Research Tool)',
                        'Accept': 'text/html,application/json,text/plain,*/*',
                    },
                    signal: AbortSignal.timeout(15000),
                })

                const contentType = response.headers.get('content-type') || ''
                let content

                if (contentType.includes('json')) {
                    const json = await response.json()
                    content = JSON.stringify(json, null, 2)
                } else {
                    content = await response.text()
                    // Strip HTML tags for readability
                    if (contentType.includes('html')) {
                        content = content
                            .replace(/<script[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                    }
                }

                return {
                    url,
                    status: response.status,
                    contentType,
                    content: content.slice(0, maxLength),
                    truncated: content.length > maxLength,
                }
            } catch (error) {
                throw new Error(`Fetch failed: ${error.message}`)
            }
        },
    },

    // ─── Code Execute ───
    code_execute: {
        description: 'Execute JavaScript or Python code and return the output.',
        parameters: {
            code: 'string — code to execute',
            language: 'string (optional) — "javascript" (default) or "python"',
        },
        async execute({ code, language = 'javascript' }) {
            if (!code) throw new Error('code is required')

            if (language === 'python') {
                try {
                    const output = execSync(`python -c ${JSON.stringify(code)}`, {
                        timeout: 30000,
                        encoding: 'utf-8',
                        cwd: CONFIG.workingDir,
                    })
                    return { output: output.slice(0, CONFIG.maxOutputLength), language }
                } catch (error) {
                    return {
                        output: (error.stdout || '').slice(0, CONFIG.maxOutputLength),
                        error: (error.stderr || error.message).slice(0, 5000),
                        language,
                    }
                }
            }

            // JavaScript — execute via Node
            try {
                const wrappedCode = `
          const __result = (async () => { ${code} })();
          __result.then(r => { if(r !== undefined) console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2)); })
                 .catch(e => { console.error(e.message); process.exit(1); });
        `
                const output = execSync(`node -e ${JSON.stringify(wrappedCode)}`, {
                    timeout: 30000,
                    encoding: 'utf-8',
                    cwd: CONFIG.workingDir,
                })
                return { output: output.slice(0, CONFIG.maxOutputLength), language }
            } catch (error) {
                return {
                    output: (error.stdout || '').slice(0, CONFIG.maxOutputLength),
                    error: (error.stderr || error.message).slice(0, 5000),
                    language,
                }
            }
        },
    },

    // ─── NPM Install ───
    npm_install: {
        description: 'Install npm packages. Use this to add any capability the agent needs.',
        parameters: {
            packages: 'string — space-separated package names (e.g. "ethers axios")',
            dev: 'boolean (optional) — install as devDependency',
        },
        async execute({ packages, dev = false }) {
            if (!packages) throw new Error('packages is required')

            const flag = dev ? '--save-dev' : '--save'
            const command = `npm install ${flag} ${packages}`

            try {
                const output = execSync(command, {
                    cwd: CONFIG.workingDir,
                    timeout: 120000, // 2 min for installs
                    encoding: 'utf-8',
                    shell: true,
                })
                return {
                    installed: packages,
                    output: output.slice(0, 5000),
                    command,
                }
            } catch (error) {
                throw new Error(`npm install failed: ${error.stderr || error.message}`)
            }
        },
    },

    // ─── HTTP Request ───
    http_request: {
        description: 'Make an HTTP request to any API. Supports GET, POST, PUT, DELETE with headers and body.',
        parameters: {
            method: 'string — HTTP method (GET, POST, PUT, DELETE)',
            url: 'string — full URL',
            headers: 'object (optional) — request headers',
            body: 'object or string (optional) — request body',
        },
        async execute({ method = 'GET', url, headers = {}, body }) {
            if (!url) throw new Error('url is required')

            const opts = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                signal: AbortSignal.timeout(30000),
            }

            if (body && method !== 'GET') {
                opts.body = typeof body === 'string' ? body : JSON.stringify(body)
            }

            try {
                const response = await fetch(url, opts)
                const contentType = response.headers.get('content-type') || ''
                let data

                if (contentType.includes('json')) {
                    data = await response.json()
                } else {
                    data = await response.text()
                }

                return {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    data: typeof data === 'string' ? data.slice(0, CONFIG.maxOutputLength) : data,
                }
            } catch (error) {
                throw new Error(`HTTP request failed: ${error.message}`)
            }
        },
    },
}

// ═══════════════════════════════════════════════════════════════
//  SKILLS ENDPOINT — reads skills/ folder
// ═══════════════════════════════════════════════════════════════

const SKILLS_DIR = join(CONFIG.workingDir, 'skills')

/**
 * Parse YAML frontmatter from a SKILL.md file.
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!match) return { meta: {}, body: content }
    const meta = {}
    match[1].split('\n').forEach(line => {
        const kv = line.match(/^(\w+):\s*(.+)$/)
        if (kv) meta[kv[1]] = kv[2].trim()
    })
    return { meta, body: match[2].trim() }
}

app.get('/api/skills', (req, res) => {
    try {
        if (!existsSync(SKILLS_DIR)) {
            return res.json({ skills: [], count: 0 })
        }

        const skills = []
        const entries = readdirSync(SKILLS_DIR)

        for (const entry of entries) {
            const skillPath = join(SKILLS_DIR, entry, 'SKILL.md')
            if (!existsSync(skillPath)) continue

            try {
                const content = readFileSync(skillPath, 'utf-8')
                const { meta, body } = parseFrontmatter(content)
                skills.push({
                    name: meta.name || entry,
                    description: meta.description || '',
                    body,
                    path: skillPath,
                })
            } catch { /* skip unreadable */ }
        }

        console.log(`[Skills] Loaded ${skills.length} skills from ${SKILLS_DIR}`)
        res.json({ skills, count: skills.length })
    } catch (error) {
        res.json({ skills: [], count: 0, error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
//  SCHEDULER ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/scheduler/tasks', async (req, res) => {
    try {
        // Dynamic import to keep server.js decoupled
        const { listScheduledTasks } = await import('./src/engine/scheduler.js')
        const tasks = await listScheduledTasks(req.query.agentId || null)
        res.json({ tasks, count: tasks.length })
    } catch (error) {
        res.json({ tasks: [], count: 0, error: error.message })
    }
})

app.post('/api/scheduler/create', async (req, res) => {
    try {
        const { scheduleTask } = await import('./src/engine/scheduler.js')
        const { agentId, cron, task, name } = req.body
        if (!agentId || !cron || !task) {
            return res.status(400).json({ error: 'agentId, cron, and task are required' })
        }
        const sched = await scheduleTask(agentId, cron, task, { name })
        res.json({ success: true, schedule: sched })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

app.post('/api/scheduler/pause', async (req, res) => {
    try {
        const { pauseScheduledTask } = await import('./src/engine/scheduler.js')
        const result = await pauseScheduledTask(req.body.taskId)
        res.json({ success: !!result, schedule: result })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

app.post('/api/scheduler/resume', async (req, res) => {
    try {
        const { resumeScheduledTask } = await import('./src/engine/scheduler.js')
        const result = await resumeScheduledTask(req.body.taskId)
        res.json({ success: !!result, schedule: result })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

app.post('/api/scheduler/cancel', async (req, res) => {
    try {
        const { cancelScheduledTask } = await import('./src/engine/scheduler.js')
        const result = await cancelScheduledTask(req.body.taskId)
        res.json({ success: !!result, schedule: result })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
//  TASK QUEUE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/tasks', async (req, res) => {
    try {
        const { getTaskHistory } = await import('./src/engine/taskQueue.js')
        const tasks = await getTaskHistory(req.query.agentId || null, req.query.activeOnly === 'true')
        res.json({ tasks, count: tasks.length })
    } catch (error) {
        res.json({ tasks: [], count: 0, error: error.message })
    }
})

app.post('/api/tasks/enqueue', async (req, res) => {
    try {
        const { enqueueTask } = await import('./src/engine/taskQueue.js')
        const { agentId, task, priority, mode, maxIterations } = req.body
        if (!agentId || !task) {
            return res.status(400).json({ error: 'agentId and task are required' })
        }
        const queued = await enqueueTask(agentId, task, { priority, mode, maxIterations })
        res.json({ success: true, task: queued })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

app.get('/api/tasks/resumable', async (req, res) => {
    try {
        const { getResumableTasks } = await import('./src/engine/taskQueue.js')
        const tasks = await getResumableTasks()
        res.json({ tasks, count: tasks.length })
    } catch (error) {
        res.json({ tasks: [], count: 0, error: error.message })
    }
})

// ═══════════════════════════════════════════════════════════════
//  AGENT HIERARCHY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/agents/tree', async (req, res) => {
    try {
        const { getAgentTree } = await import('./src/engine/agentManager.js')
        const tree = await getAgentTree()
        res.json({ tree })
    } catch (error) {
        res.json({ tree: [], error: error.message })
    }
})

app.get('/api/agents/:agentId/children', async (req, res) => {
    try {
        const { getChildren } = await import('./src/engine/childAgent.js')
        const children = await getChildren(req.params.agentId)
        res.json({ children, count: children.length })
    } catch (error) {
        res.json({ children: [], count: 0, error: error.message })
    }
})

// ─── Start Server ───
app.listen(PORT, () => {
    // Count skills
    let skillCount = 0
    try {
        if (existsSync(SKILLS_DIR)) {
            skillCount = readdirSync(SKILLS_DIR).filter(e => existsSync(join(SKILLS_DIR, e, 'SKILL.md'))).length
        }
    } catch { }

    console.log(`\n🧠 Molt-Hive Tool Server running on port ${PORT}`)
    console.log(`   Working directory: ${CONFIG.workingDir}`)
    console.log(`   Available tools: ${Object.keys(TOOLS).join(', ')}`)
    console.log(`   Skills loaded: ${skillCount} (from skills/)`)
    console.log(`   API endpoints: /api/health, /api/tools/*, /api/skills, /api/scheduler/*, /api/tasks/*, /api/agents/*`)
    console.log(`   Health: http://localhost:${PORT}/api/health\n`)

    // Start scheduler ticker (check for due tasks every 60s)
    setInterval(async () => {
        try {
            const { schedulerTick } = await import('./src/engine/scheduler.js')
            const dueTasks = await schedulerTick()
            if (dueTasks.length > 0) {
                console.log(`[Scheduler] ${dueTasks.length} task(s) due:`, dueTasks.map(t => t.name).join(', '))
            }
        } catch { /* scheduler optional */ }
    }, 60000)
})
