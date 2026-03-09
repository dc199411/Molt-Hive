/**
 * Molt-Hive Tool Runner
 * Client-side bridge to the tool server.
 * Parses TOOL_CALL directives from LLM output and executes them via the server.
 */

const SERVER_URL = '/api'

/**
 * Check if the tool server is reachable.
 * @returns {Promise<{ok: boolean, tools?: string[], error?: string}>}
 */
export async function checkServerHealth() {
    try {
        const response = await fetch(`${SERVER_URL}/health`, {
            signal: AbortSignal.timeout(5000),
        })
        if (!response.ok) throw new Error(`Status ${response.status}`)
        const data = await response.json()
        return { ok: true, tools: data.tools, workingDir: data.workingDir }
    } catch (error) {
        return { ok: false, error: error.message }
    }
}

/**
 * Execute a tool on the server.
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} params - Tool parameters
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function executeTool(toolName, params) {
    try {
        const response = await fetch(`${SERVER_URL}/tools/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: toolName, params }),
            signal: AbortSignal.timeout(120000), // 2 min timeout for long operations
        })

        const data = await response.json()
        return data
    } catch (error) {
        return {
            success: false,
            error: `Tool execution failed: ${error.message}`,
        }
    }
}

/**
 * Parse TOOL_CALL directives from an LLM reply.
 * 
 * Format: TOOL_CALL: tool_name {"param": "value"}
 * 
 * @param {string} reply - The LLM's reply text
 * @returns {Array<{tool: string, params: Object, raw: string}>}
 */
export function parseToolCalls(reply) {
    if (!reply) return []

    const calls = []
    // Match: TOOL_CALL: tool_name followed by JSON
    const regex = /TOOL_CALL:\s*(\w+)\s*(\{[\s\S]*?\})/gi
    let match

    while ((match = regex.exec(reply)) !== null) {
        const toolName = match[1].trim()
        const rawParams = match[2].trim()

        try {
            const params = JSON.parse(rawParams)
            calls.push({
                tool: toolName,
                params,
                raw: match[0],
            })
        } catch (e) {
            // Try to fix common JSON issues
            try {
                // Handle unescaped newlines in JSON strings
                const fixed = rawParams.replace(/\n/g, '\\n').replace(/\t/g, '\\t')
                const params = JSON.parse(fixed)
                calls.push({ tool: toolName, params, raw: match[0] })
            } catch {
                console.warn(`[ToolRunner] Failed to parse params for ${toolName}:`, rawParams)
            }
        }
    }

    return calls
}

/**
 * Check if a reply contains any tool calls.
 */
export function hasToolCalls(reply) {
    return /TOOL_CALL:\s*\w+\s*\{/i.test(reply || '')
}

/**
 * Check if a reply signals task completion.
 * Format: TASK_COMPLETE: [summary]
 */
export function isTaskComplete(reply) {
    return /TASK_COMPLETE:/i.test(reply || '')
}

/**
 * Extract the task completion summary.
 */
export function getTaskCompleteSummary(reply) {
    const match = (reply || '').match(/TASK_COMPLETE:\s*([\s\S]*?)(?:\n\n|\n?$)/i)
    return match ? match[1].trim() : null
}

/**
 * Check if a reply needs human input.
 * Format: NEEDS_HUMAN: [question]
 */
export function needsHumanInput(reply) {
    return /NEEDS_HUMAN:/i.test(reply || '')
}

/**
 * Extract the human input question.
 */
export function getHumanQuestion(reply) {
    const match = (reply || '').match(/NEEDS_HUMAN:\s*([\s\S]*?)(?:\n\n|\n?$)/i)
    return match ? match[1].trim() : null
}

/**
 * Format a tool result for injection back into the conversation.
 * This becomes the next message the LLM sees after a tool call.
 */
export function formatToolResult(toolName, result, success) {
    if (!success) {
        return `TOOL_RESULT [${toolName}] ERROR: ${result.error || 'Unknown error'}`
    }

    // Format result based on type
    let formatted
    if (typeof result === 'string') {
        formatted = result
    } else if (result.content) {
        formatted = result.content
    } else if (result.output) {
        formatted = result.output
    } else if (result.stdout) {
        formatted = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : '')
    } else if (result.results) {
        // Web search results
        formatted = result.results.map((r, i) =>
            `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.snippet}`
        ).join('\n\n')
    } else if (result.items) {
        // File list
        formatted = result.items.map(i =>
            `${i.type === 'directory' ? '📁' : '📄'} ${i.name}${i.size ? ` (${i.size}b)` : ''}`
        ).join('\n')
    } else {
        formatted = JSON.stringify(result, null, 2)
    }

    // Truncate very long results
    if (formatted.length > 15000) {
        formatted = formatted.slice(0, 15000) + '\n... [truncated]'
    }

    return `TOOL_RESULT [${toolName}] SUCCESS:\n${formatted}`
}

/**
 * Extract clean text from a reply, removing tool calls.
 */
export function cleanReplyText(reply) {
    if (!reply) return ''
    return reply
        .replace(/TOOL_CALL:\s*\w+\s*\{[\s\S]*?\}/gi, '')
        .replace(/TASK_COMPLETE:\s*[\s\S]*?(?:\n\n|\n?$)/gi, '')
        .replace(/NEEDS_HUMAN:\s*[\s\S]*?(?:\n\n|\n?$)/gi, '')
        .trim()
}
