/**
 * Molt-Hive Agentic Loop
 * The autonomous execution engine — plan → act → observe → repeat.
 * 
 * Supports three modes:
 * - CHAT:   Single LLM call, no tool loop (maxIterations = 1)
 * - AUTO:   Loop up to 20 iterations, then stop
 * - FOREVER: Loop indefinitely until user stops or agent says TASK_COMPLETE
 * 
 * Forever mode features:
 * - Periodic checkpoints (every 10 iterations) with progress reports
 * - Context window management (prunes loopMessages to prevent overflow)
 * - Automatic memory compression during long runs
 * - Heartbeat callbacks so the UI stays updated
 * - Graceful pause/resume/stop
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
const FOREVER_MAX = Infinity
const DEFAULT_MAX_TOOL_CALLS_PER_TURN = 5
const CHECKPOINT_INTERVAL = 10          // Report progress every N iterations
const MAX_LOOP_MESSAGES = 30            // Keep loop context manageable
const FOREVER_COOLDOWN_MS = 1000        // 1s pause between forever iterations (rate limiting)

/**
 * Run the agentic loop for a task.
 * 
 * @param {Object} params
 * @param {string} params.task - The user's task/message
 * @param {Object} params.agent - The active agent
 * @param {Array} params.allAgents - All agents in the hive
 * @param {Object} params.llmCfg - {provider, apiKey, model}
 * @param {Array} params.conversationHistory - Recent messages for context
 * @param {Object} params.callbacks - UI callback functions
 * @param {Function} params.callbacks.onThinking - (iteration) called when thinking
 * @param {Function} params.callbacks.onToolCall - (toolName, params) called pre-execution
 * @param {Function} params.callbacks.onToolResult - (toolName, result) called post-execution
 * @param {Function} params.callbacks.onMessage - (text, tags) called with agent text
 * @param {Function} params.callbacks.onComplete - (summary) called on TASK_COMPLETE
 * @param {Function} params.callbacks.onNeedsHuman - (question) called on NEEDS_HUMAN
 * @param {Function} params.callbacks.onError - (error) called on error
 * @param {Function} params.callbacks.onCheckpoint - (checkpoint) periodic progress report
 * @param {Function} params.callbacks.shouldContinue - () returns false to stop
 * @param {number|string} [params.maxIterations] - Max iterations (number or 'forever')
 * @returns {Promise<{success: boolean, iterations: number, summary?: string, toolCalls: number}>}
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
        onCheckpoint = () => { },
        shouldContinue = () => true,
    } = callbacks

    // Resolve maxIterations — 'forever' or Infinity = no limit
    const isForever = maxIterations === 'forever' || maxIterations === Infinity
    const iterLimit = isForever ? FOREVER_MAX : maxIterations

    // Build conversation context for the loop
    const loopMessages = [...conversationHistory]
    let iteration = 0
    let totalToolCalls = 0
    let consecutiveErrors = 0
    const startTime = Date.now()

    while (iteration < iterLimit) {
        // ── Check if cancelled ──
        if (!shouldContinue()) {
            const summary = `Stopped by user after ${iteration} iterations, ${totalToolCalls} tool calls, ${formatElapsed(startTime)}`
            onMessage(`⏹ ${summary}`, ['stopped'])
            return { success: false, iterations: iteration, toolCalls: totalToolCalls, summary }
        }

        iteration++
        onThinking(iteration)

        // ── Forever mode: checkpoint + cooldown ──
        if (isForever && iteration > 1) {
            // Cooldown to prevent API hammering
            await sleep(FOREVER_COOLDOWN_MS)

            // Periodic checkpoint
            if (iteration % CHECKPOINT_INTERVAL === 0) {
                const checkpoint = {
                    iteration,
                    toolCalls: totalToolCalls,
                    elapsed: formatElapsed(startTime),
                    loopMessageCount: loopMessages.length,
                }
                onCheckpoint(checkpoint)

                // Inject a checkpoint reminder into the conversation
                loopMessages.push({
                    role: 'user',
                    content: `[CHECKPOINT — iteration ${iteration}, ${totalToolCalls} tool calls, running for ${checkpoint.elapsed}]
Continue working on the original task. If you have completed the task, write TASK_COMPLETE: [summary]. If you need human input, write NEEDS_HUMAN: [question]. Otherwise, continue with the next step.`,
                })
            }

            // Prune loop messages to prevent context overflow
            if (loopMessages.length > MAX_LOOP_MESSAGES) {
                // Keep first 2 messages (original context) + last 20
                const head = loopMessages.slice(0, 2)
                const tail = loopMessages.slice(-20)
                loopMessages.length = 0
                loopMessages.push(
                    ...head,
                    { role: 'user', content: `[Context trimmed — keeping latest ${tail.length} messages. You are on iteration ${iteration}. Continue working on the original task.]` },
                    ...tail
                )
            }
        }

        try {
            // Build system prompt with tools + forever mode hint
            const systemPrompt = await buildSystemPromptWithMemory({
                agent,
                allAgents,
                llmName: `${llmCfg.provider} / ${llmCfg.model}`,
                includeTool: true,
            })

            // Add forever mode context to system prompt
            const foreverHint = isForever
                ? `\n\n# FOREVER MODE ACTIVE
You are running in continuous autonomous mode (iteration ${iteration}, ${totalToolCalls} tool calls so far).
Rules:
- Keep working until your task is truly complete, then write TASK_COMPLETE
- Every ~10 iterations, briefly summarize your progress
- If you get stuck or need user guidance, write NEEDS_HUMAN
- CRYSTALLIZE important findings as you discover them
- Do NOT repeat the same actions — check results and adapt`
                : ''

            // Call the LLM
            const reply = await llmCall({
                provider: llmCfg.provider,
                apiKey: llmCfg.apiKey,
                model: llmCfg.model,
                system: systemPrompt + foreverHint,
                messages: loopMessages,
                maxTokens: 2000,
            })

            // Reset error counter on success
            consecutiveErrors = 0

            // ── TASK_COMPLETE ──
            if (isTaskComplete(reply)) {
                const summary = getTaskCompleteSummary(reply)
                const cleanText = cleanReplyText(reply)
                if (cleanText) onMessage(cleanText, ['task complete'])
                onComplete(summary || `Completed in ${iteration} iterations, ${totalToolCalls} tool calls, ${formatElapsed(startTime)}`)
                return { success: true, iterations: iteration, toolCalls: totalToolCalls, summary }
            }

            // ── NEEDS_HUMAN ──
            if (needsHumanInput(reply)) {
                const question = getHumanQuestion(reply)
                const cleanText = cleanReplyText(reply)
                if (cleanText) onMessage(cleanText)
                onNeedsHuman(question || 'The agent needs your input to continue.')
                return { success: false, iterations: iteration, toolCalls: totalToolCalls, summary: 'Waiting for human input', paused: true, question }
            }

            // ── TOOL_CALL ──
            if (hasToolCalls(reply)) {
                const toolCalls = parseToolCalls(reply)
                const cleanText = cleanReplyText(reply)
                if (cleanText) onMessage(cleanText)

                let toolCallsThisTurn = 0
                for (const call of toolCalls) {
                    if (toolCallsThisTurn >= DEFAULT_MAX_TOOL_CALLS_PER_TURN) break

                    onToolCall(call.tool, call.params)
                    const result = await executeTool(call.tool, call.params)
                    totalToolCalls++
                    toolCallsThisTurn++
                    onToolResult(call.tool, result)

                    const resultText = formatToolResult(call.tool, result.result || result, result.success)
                    loopMessages.push({ role: 'assistant', content: reply })
                    loopMessages.push({ role: 'user', content: resultText })
                }
                continue
            }

            // ── Plain text response ──
            const crystalTopics = reply.match(/CRYSTALLIZE:\s*(.+)/gi)
            const signalMatches = reply.match(/SIGNAL\s+\[?\w+\]?\s*:/gi)
            const tags = []
            if (crystalTopics) tags.push('crystallized')
            if (signalMatches) tags.push('signal sent')

            onMessage(reply, tags.length > 0 ? tags : undefined)

            // In forever mode, plain text doesn't stop the loop — add it to context and keep going
            if (isForever) {
                loopMessages.push({ role: 'assistant', content: reply })
                loopMessages.push({
                    role: 'user',
                    content: 'Continue with the task. Use tools to make progress. If done, write TASK_COMPLETE: [summary].',
                })
                continue
            }

            // In normal mode, plain text = done
            return { success: true, iterations: iteration, toolCalls: totalToolCalls, summary: 'Responded directly' }

        } catch (error) {
            consecutiveErrors++
            onError(error.message || String(error))

            // If too many consecutive errors, bail out
            if (consecutiveErrors >= 3) {
                const summary = `Stopped after ${consecutiveErrors} consecutive errors at iteration ${iteration}`
                onMessage(`⚠ ${summary}. Last error: ${error.message}`, ['error'])
                return { success: false, iterations: iteration, toolCalls: totalToolCalls, summary }
            }

            // In forever mode, recover from errors gracefully
            if (isForever || iteration > 1) {
                loopMessages.push({
                    role: 'user',
                    content: `ERROR (attempt ${consecutiveErrors}/3): ${error.message}. Try a different approach. If the task cannot be completed, write TASK_COMPLETE with what you accomplished.`,
                })
                continue
            }

            // First iteration in non-forever mode: fail immediately
            return { success: false, iterations: iteration, toolCalls: totalToolCalls, summary: error.message }
        }
    }

    // Max iterations reached (only in non-forever mode)
    const summary = `Completed ${iteration} iterations, ${totalToolCalls} tool calls, ${formatElapsed(startTime)}`
    onMessage(`⚠ Reached maximum iterations (${maxIterations}). ${summary}`)
    return { success: false, iterations: iteration, toolCalls: totalToolCalls, summary }
}

/**
 * Single tool call (not a loop).
 */
export async function singleToolCall(toolName, params) {
    return await executeTool(toolName, params)
}

// ─── Helpers ───
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function formatElapsed(startTime) {
    const seconds = Math.floor((Date.now() - startTime) / 1000)
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
}
