/**
 * Molt-Hive Agentic Loop
 * The autonomous execution engine — plan → act → observe → repeat.
 * 
 * The agent receives a task, uses tools to accomplish it, and loops
 * until the task is complete or max iterations reached.
 */

import { llmCall } from '../llm.js'
import { buildSystemPromptWithMemory } from './systemPrompt.js'
import {
    executeTool, parseToolCalls, hasToolCalls,
    isTaskComplete, getTaskCompleteSummary,
    needsHumanInput, getHumanQuestion,
    formatToolResult, cleanReplyText,
} from './toolRunner.js'
import { runCompressionCycle, runCrystallization } from './memory.js'
import { parseSignals, broadcastSignals } from './signals.js'
import { evolveAgent } from './evolution.js'

// ─── Constants ───
const DEFAULT_MAX_ITERATIONS = 20
const DEFAULT_MAX_TOOL_CALLS_PER_TURN = 5

/**
 * Run the agentic loop for a task.
 * 
 * The agent will:
 * 1. Think about the task
 * 2. Decide on tool calls (or answer directly)
 * 3. Execute tools
 * 4. Observe results
 * 5. Repeat until TASK_COMPLETE or maxIterations
 * 
 * @param {Object} params
 * @param {string} params.task - The user's task/message
 * @param {Object} params.agent - The active agent
 * @param {Array} params.allAgents - All agents in the hive
 * @param {Object} params.llmCfg - {provider, apiKey, model}
 * @param {Array} params.conversationHistory - Recent messages for context
 * @param {Object} params.callbacks - UI callback functions
 * @param {Function} params.callbacks.onThinking - Called when agent is thinking
 * @param {Function} params.callbacks.onToolCall - Called when tool is being executed
 * @param {Function} params.callbacks.onToolResult - Called with tool result
 * @param {Function} params.callbacks.onMessage - Called with agent text messages
 * @param {Function} params.callbacks.onComplete - Called when task is complete
 * @param {Function} params.callbacks.onNeedsHuman - Called when human input needed
 * @param {Function} params.callbacks.onError - Called on error
 * @param {Function} params.callbacks.shouldContinue - Returns false to cancel the loop
 * @param {number} [params.maxIterations] - Max loop iterations
 * @returns {Promise<{success: boolean, iterations: number, summary?: string}>}
 */
export async function runAgentLoop({
    task,
    agent,
    allAgents,
    llmCfg,
    conversationHistory = [],
    callbacks = {},
    maxIterations = DEFAULT_MAX_ITERATIONS,
}) {
    const {
        onThinking = () => { },
        onToolCall = () => { },
        onToolResult = () => { },
        onMessage = () => { },
        onComplete = () => { },
        onNeedsHuman = () => { },
        onError = () => { },
        shouldContinue = () => true,
    } = callbacks

    // Build conversation context for the loop
    const loopMessages = [...conversationHistory]
    let iteration = 0
    let totalToolCalls = 0

    while (iteration < maxIterations) {
        // Check if cancelled
        if (!shouldContinue()) {
            return { success: false, iterations: iteration, summary: 'Cancelled by user' }
        }

        iteration++
        onThinking(iteration)

        try {
            // Build system prompt with tools
            const systemPrompt = await buildSystemPromptWithMemory({
                agent,
                allAgents,
                llmName: `${llmCfg.provider} / ${llmCfg.model}`,
                includeTool: true,
            })

            // Call the LLM
            const reply = await llmCall({
                provider: llmCfg.provider,
                apiKey: llmCfg.apiKey,
                model: llmCfg.model,
                system: systemPrompt,
                messages: loopMessages,
                maxTokens: 2000,
            })

            // ── Check for TASK_COMPLETE ──
            if (isTaskComplete(reply)) {
                const summary = getTaskCompleteSummary(reply)
                const cleanText = cleanReplyText(reply)
                if (cleanText) onMessage(cleanText, ['task complete'])
                onComplete(summary || 'Task completed')
                return { success: true, iterations: iteration, summary }
            }

            // ── Check for NEEDS_HUMAN ──
            if (needsHumanInput(reply)) {
                const question = getHumanQuestion(reply)
                const cleanText = cleanReplyText(reply)
                if (cleanText) onMessage(cleanText)
                onNeedsHuman(question || 'The agent needs your input to continue.')
                return { success: false, iterations: iteration, summary: 'Waiting for human input', paused: true, question }
            }

            // ── Check for TOOL_CALL ──
            if (hasToolCalls(reply)) {
                const toolCalls = parseToolCalls(reply)

                // Show any text before the tool calls
                const cleanText = cleanReplyText(reply)
                if (cleanText) onMessage(cleanText)

                // Execute each tool call (sequentially)
                let toolCallsThisTurn = 0
                for (const call of toolCalls) {
                    if (toolCallsThisTurn >= DEFAULT_MAX_TOOL_CALLS_PER_TURN) {
                        break // Safety: limit tool calls per iteration
                    }

                    onToolCall(call.tool, call.params)

                    const result = await executeTool(call.tool, call.params)
                    totalToolCalls++
                    toolCallsThisTurn++

                    onToolResult(call.tool, result)

                    // Format result and add to conversation for next iteration
                    const resultText = formatToolResult(call.tool, result.result || result, result.success)
                    loopMessages.push({
                        role: 'assistant',
                        content: reply,
                    })
                    loopMessages.push({
                        role: 'user',
                        content: resultText,
                    })
                }

                // Continue the loop — agent will see tool results and decide next action
                continue
            }

            // ── No tool calls — plain text response ──
            // Check for CRYSTALLIZE and SIGNAL directives
            const crystalTopics = reply.match(/CRYSTALLIZE:\s*(.+)/gi)
            const signalMatches = reply.match(/SIGNAL\s+\[?\w+\]?\s*:/gi)
            const tags = []
            if (crystalTopics) tags.push('crystallized')
            if (signalMatches) tags.push('signal sent')

            onMessage(reply, tags.length > 0 ? tags : undefined)

            // Plain text response = task is done (agent chose not to use tools)
            return { success: true, iterations: iteration, summary: 'Responded directly' }

        } catch (error) {
            onError(error.message || String(error))

            // If this is the first iteration, fail immediately
            if (iteration === 1) {
                return { success: false, iterations: iteration, summary: error.message }
            }

            // Otherwise, add error to context and let agent try to recover
            loopMessages.push({
                role: 'user',
                content: `ERROR: ${error.message}. Try a different approach or use TASK_COMPLETE to report what you accomplished.`,
            })
        }
    }

    // Max iterations reached
    onMessage(`⚠ Reached maximum iterations (${maxIterations}). Stopping autonomous execution.`)
    return { success: false, iterations: iteration, summary: `Max iterations (${maxIterations}) reached` }
}

/**
 * Create a simple one-shot tool call (not a loop).
 * Used for UI-triggered actions like "list files" or "run command".
 */
export async function singleToolCall(toolName, params) {
    return await executeTool(toolName, params)
}
