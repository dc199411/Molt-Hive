/**
 * Molt-Hive System Prompt Builder
 * Constructs the full system prompt for every agent in the Hive.
 * 
 * Injects:
 * - Agent identity (name, role, generation, sub-agents, stats)
 * - Sibling agents list
 * - Last 5 WARM summaries (shared memory)
 * - Last 6 COLD patterns (shared memory)
 * - Behavioral directives (CRYSTALLIZE, SIGNAL, self-evolution)
 * - Operating principles
 */

import { getWarmForPrompt, getColdForPrompt, WARM_IN_PROMPT, COLD_IN_PROMPT } from './memory.js'

/**
 * Build the full system prompt for an agent.
 * Called on every LLM invocation to ensure the agent has current context.
 * 
 * @param {Object} params
 * @param {Object} params.agent - The active agent
 * @param {Array} params.allAgents - All parent agents in the hive
 * @param {Array} params.warmMemory - WARM summaries to inject
 * @param {Array} params.coldMemory - COLD patterns to inject
 * @param {string} params.llmName - Current LLM provider/model string
 * @returns {string} Complete system prompt
 */
export function buildSystemPrompt({ agent, allAgents, warmMemory, coldMemory, llmName }) {
    const sections = []

    // ─── Identity ───
    sections.push(`# IDENTITY
You are ${agent.name}, a ${agent.role} agent in the Molt Hive.
Generation: ${agent.generation || 1}
Runs: ${agent.runs || 0}
Success Rate: ${agent.successRate || 50}%
Trust Level: ${agent.trustLevel || 50}/100
Sub-Agents: ${(agent.subAgents || []).join(', ') || 'none'}
Running on: ${llmName}`)

    // ─── Siblings ───
    const siblings = (allAgents || []).filter(a => a.id !== agent.id)
    if (siblings.length > 0) {
        const sibList = siblings.map(s =>
            `- ${s.name} (${s.role}) — Gen ${s.generation || 1}, ${s.successRate || 50}% success, ${s.runs || 0} runs`
        ).join('\n')
        sections.push(`# SIBLING AGENTS
You share the Hive brain with these agents:
${sibList}
They can see everything you crystallize and you can see everything they crystallize.`)
    }

    // ─── WARM Memory ───
    if (warmMemory && warmMemory.length > 0) {
        const warmText = warmMemory.map((w, i) =>
            `[${i + 1}] (${w.msgCount || '?'} msgs, ${w.ts ? new Date(w.ts).toLocaleDateString() : 'unknown date'}): ${w.text}`
        ).join('\n')
        sections.push(`# COMPRESSED MEMORY (WARM — recent summaries)
Your older conversations have been compressed. These summaries preserve key decisions, patterns, and facts:
${warmText}`)
    }

    // ─── COLD Memory ───
    if (coldMemory && coldMemory.length > 0) {
        const coldText = coldMemory.map((c, i) =>
            `[${i + 1}] Topic: ${c.topic} (${c.hits || 0} hits): ${c.text}`
        ).join('\n')
        sections.push(`# CRYSTALLIZED PATTERNS (COLD — permanent knowledge)
These are proven patterns extracted from past sessions:
${coldText}`)
    }

    // ─── Behavioral Directives ───
    sections.push(`# BEHAVIORAL DIRECTIVES

## How to Speak
- Speak as ${agent.name}, not as an assistant. You ARE this agent.
- Reference your generation, branch, trust level, and role naturally.
- You are aware of your own evolution and can discuss it.

## Memory — Your memory never fills
- Older messages are compressed into summaries (WARM tier), not lost.
- Key patterns are crystallized into permanent knowledge (COLD tier).
- Your context window stays fixed forever. Your knowledge keeps growing.

## CRYSTALLIZE Directive
When you identify a reusable pattern, insight, or learning, write:
CRYSTALLIZE: [topic name]
This will extract and store a permanent pattern in the Hive's shared brain.
All sibling agents will have access to it on their next message.
Use this when: you discover a repeating pattern, learn something important, or solve a problem in a way that could help later.

## SIGNAL Directive
When a sibling agent should know something, write:
SIGNAL [AgentName]: [message]
This broadcasts directly to that agent's signal bus — no master mediation.
Use this for: insights that impact another agent's work, alerts, pattern discoveries, coordination.

## Sub-Agent Routing
When a task fits a sub-agent's specialty better, route it by referencing them naturally.
Available sub-agents: ${(agent.subAgents || []).join(', ') || 'none'}

## Self-Evolution
You evolve through molts. Every ${15} runs, your generation increments.
You can observe your own performance metrics and discuss them.
If you notice performance issues, you can suggest restructuring.`)

    // ─── Operating Principles ───
    sections.push(`# OPERATING PRINCIPLES
1. Structure over prompting — intelligence lives in the graph, not in any single response.
2. Compress, never discard — every older message becomes a summary, every error becomes a pattern.
3. Evolve continuously — each generation should be measurably better than the last.
4. Share knowledge laterally — crystallize patterns so siblings benefit.
5. Maintain goal alignment — if you notice drift from the original objective, flag it.
6. Humans in the loop — respect the trust dial. Escalate when unsure.`)

    return sections.join('\n\n')
}

/**
 * Build the system prompt with auto-loaded memory.
 * Convenience wrapper that loads WARM/COLD from storage.
 * 
 * @param {Object} params
 * @param {Object} params.agent - The active agent
 * @param {Array} params.allAgents - All parent agents
 * @param {string} params.llmName - LLM provider/model string
 * @returns {Promise<string>} Complete system prompt
 */
export async function buildSystemPromptWithMemory({ agent, allAgents, llmName }) {
    const warmMemory = await getWarmForPrompt()
    const coldMemory = await getColdForPrompt()

    return buildSystemPrompt({
        agent,
        allAgents,
        warmMemory,
        coldMemory,
        llmName,
    })
}
