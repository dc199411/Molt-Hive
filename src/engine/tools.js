/**
 * Molt-Hive Tool Registry
 * Client-side tool definitions matching the server tools.
 * Used by the system prompt builder and agentic loop to know what tools are available.
 */

/**
 * Tool definitions — descriptions and parameters for the system prompt.
 * The actual execution happens on the server via toolRunner.js.
 */
export const TOOL_DEFINITIONS = [
    {
        name: 'shell_execute',
        description: 'Execute a shell/terminal command. Use for running scripts, git operations, building projects, starting services, or any terminal operation.',
        parameters: {
            command: { type: 'string', required: true, description: 'The command to run' },
            cwd: { type: 'string', required: false, description: 'Working directory (optional)' },
            timeout: { type: 'number', required: false, description: 'Timeout in ms (default 30000)' },
        },
        examples: [
            'TOOL_CALL: shell_execute {"command": "ls -la"}',
            'TOOL_CALL: shell_execute {"command": "git status"}',
            'TOOL_CALL: shell_execute {"command": "npm run build"}',
        ],
        risk: 'high',
    },
    {
        name: 'file_read',
        description: 'Read the contents of a file. Use to inspect code, configs, logs, or any text file.',
        parameters: {
            path: { type: 'string', required: true, description: 'File path (relative or absolute)' },
        },
        examples: [
            'TOOL_CALL: file_read {"path": "package.json"}',
            'TOOL_CALL: file_read {"path": "src/App.jsx"}',
        ],
        risk: 'low',
    },
    {
        name: 'file_write',
        description: 'Write content to a file. Creates the file and parent directories if needed. Use to create scripts, configs, code files, or any text file.',
        parameters: {
            path: { type: 'string', required: true, description: 'File path' },
            content: { type: 'string', required: true, description: 'Content to write' },
            append: { type: 'boolean', required: false, description: 'Append instead of overwrite (default false)' },
        },
        examples: [
            'TOOL_CALL: file_write {"path": "hello.txt", "content": "Hello World"}',
            'TOOL_CALL: file_write {"path": "scripts/deploy.sh", "content": "#!/bin/bash\\nnpm run build"}',
        ],
        risk: 'medium',
    },
    {
        name: 'file_list',
        description: 'List files and directories. Use to understand project structure or find files.',
        parameters: {
            path: { type: 'string', required: false, description: 'Directory path (default: working dir)' },
            recursive: { type: 'boolean', required: false, description: 'List recursively (default false)' },
        },
        examples: [
            'TOOL_CALL: file_list {"path": "src", "recursive": true}',
        ],
        risk: 'low',
    },
    {
        name: 'web_search',
        description: 'Search the web to find information, documentation, tutorials, APIs, or solutions. No API key needed.',
        parameters: {
            query: { type: 'string', required: true, description: 'Search query' },
            maxResults: { type: 'number', required: false, description: 'Max results (default 5)' },
        },
        examples: [
            'TOOL_CALL: web_search {"query": "how to create ethereum wallet with ethers.js"}',
            'TOOL_CALL: web_search {"query": "express rate limiting best practices"}',
        ],
        risk: 'low',
    },
    {
        name: 'web_fetch',
        description: 'Fetch content from a URL. Use to read documentation, API docs, tutorials, or any web page.',
        parameters: {
            url: { type: 'string', required: true, description: 'URL to fetch' },
            maxLength: { type: 'number', required: false, description: 'Max content length (default 20000)' },
        },
        examples: [
            'TOOL_CALL: web_fetch {"url": "https://docs.ethers.org/v6/getting-started/"}',
        ],
        risk: 'low',
    },
    {
        name: 'code_execute',
        description: 'Execute JavaScript or Python code and get the output. Use for calculations, data processing, testing snippets, or running scripts.',
        parameters: {
            code: { type: 'string', required: true, description: 'Code to execute' },
            language: { type: 'string', required: false, description: '"javascript" (default) or "python"' },
        },
        examples: [
            'TOOL_CALL: code_execute {"code": "console.log(2 + 2)"}',
            'TOOL_CALL: code_execute {"code": "import math; print(math.pi)", "language": "python"}',
        ],
        risk: 'high',
    },
    {
        name: 'npm_install',
        description: 'Install npm packages dynamically. Use when you need a library that is not yet installed (e.g. ethers for crypto, axios for HTTP).',
        parameters: {
            packages: { type: 'string', required: true, description: 'Space-separated package names' },
            dev: { type: 'boolean', required: false, description: 'Install as devDependency' },
        },
        examples: [
            'TOOL_CALL: npm_install {"packages": "ethers"}',
            'TOOL_CALL: npm_install {"packages": "axios cheerio"}',
        ],
        risk: 'medium',
    },
    {
        name: 'http_request',
        description: 'Make HTTP requests to any API. Use for interacting with REST APIs, blockchain RPCs, webhooks, or any HTTP endpoint.',
        parameters: {
            method: { type: 'string', required: false, description: 'GET, POST, PUT, DELETE (default GET)' },
            url: { type: 'string', required: true, description: 'Full URL' },
            headers: { type: 'object', required: false, description: 'Request headers' },
            body: { type: 'object', required: false, description: 'Request body (for POST/PUT)' },
        },
        examples: [
            'TOOL_CALL: http_request {"method": "GET", "url": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"}',
            'TOOL_CALL: http_request {"method": "POST", "url": "https://mainnet.infura.io/v3/YOUR_KEY", "body": {"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}}',
        ],
        risk: 'medium',
    },
]

/**
 * Get tool definitions formatted for the system prompt.
 */
export function getToolPromptBlock() {
    return TOOL_DEFINITIONS.map(tool => {
        const params = Object.entries(tool.parameters)
            .map(([name, p]) => `  - ${name}: ${p.type}${p.required ? ' (required)' : ' (optional)'} — ${p.description}`)
            .join('\n')
        return `### ${tool.name}
${tool.description}
Parameters:
${params}
Example: ${tool.examples[0]}`
    }).join('\n\n')
}

/**
 * Get tool names as a simple list.
 */
export function getToolNames() {
    return TOOL_DEFINITIONS.map(t => t.name)
}

/**
 * Get a specific tool definition by name.
 */
export function getToolDef(name) {
    return TOOL_DEFINITIONS.find(t => t.name === name) || null
}
