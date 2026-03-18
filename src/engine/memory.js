/**
 * Molt-Hive Memory Engine
 * Three-Tier Infinite Memory: HOT → WARM → COLD
 * 
 * HOT:  Last 8 messages verbatim. Always in context. Fixed cost.
 * WARM: Auto-compressed summaries (~120 tokens each). Fires when HOT fills.
 * COLD: Crystallized pure patterns. Keyword-retrieved. Never injected raw.
 * 
 * Context window: FIXED SIZE FOREVER.
 * Knowledge accumulated: INFINITE.
 */

import { db } from '../storage.js'
import { llmCall } from '../llm.js'

// ─── Memory Constants ───
export const HOT_LIMIT = 8       // messages kept verbatim in context
export const COMPRESS_AT = 6     // compress oldest N when HOT fills
export const MAX_WARM = 50       // max warm summaries before auto-prune
export const MAX_COLD = 100      // max cold patterns before auto-prune
export const WARM_IN_PROMPT = 5  // warm summaries injected into system prompt
export const COLD_IN_PROMPT = 6  // cold patterns injected into system prompt

/**
 * Get the HOT messages (last HOT_LIMIT from raw history).
 * These go directly to the LLM as the conversation.
 * 
 * @param {Array} rawHistory - Full raw message history for this agent
 * @returns {Array} Last HOT_LIMIT messages
 */
export function getHotMessages(rawHistory) {
    if (!Array.isArray(rawHistory)) return []
    return rawHistory.slice(-HOT_LIMIT)
}

/**
 * Check if compression should trigger.
 * Fires when raw history exceeds HOT_LIMIT + COMPRESS_AT.
 * 
 * @param {Array} rawHistory - Full raw message history
 * @returns {boolean}
 */
export function shouldCompress(rawHistory) {
    if (!Array.isArray(rawHistory)) return false
    return rawHistory.length > HOT_LIMIT + COMPRESS_AT
}

/**
 * Get the messages that need compression (oldest batch beyond HOT window).
 * 
 * @param {Array} rawHistory - Full raw message history
 * @returns {Array} Messages to compress
 */
export function getMessagesToCompress(rawHistory) {
    if (!Array.isArray(rawHistory)) return []
    // Take everything except the last HOT_LIMIT messages
    const excess = rawHistory.slice(0, -HOT_LIMIT)
    // Take the oldest COMPRESS_AT messages from the excess
    return excess.slice(0, COMPRESS_AT)
}

/**
 * Compress a batch of messages into a WARM summary using the LLM.
 * This runs ASYNC in the background — never blocks the UI.
 * On failure, returns a placeholder summary (never throws).
 * 
 * @param {Array} msgs - Messages to compress [{role, content}]
 * @param {Object} llmCfg - LLM configuration {provider, apiKey, model}
 * @returns {Promise<Object>} {text, ts, msgCount}
 */
export async function compressMessages(msgs, llmCfg) {
    const timestamp = new Date().toISOString()
    const msgCount = msgs.length

    try {
        const conversationText = msgs
            .map(m => `[${m.role}]: ${m.content}`)
            .join('\n')

        const summary = await llmCall({
            provider: llmCfg.provider,
            apiKey: llmCfg.apiKey,
            model: llmCfg.model,
            system: 'Compress the following conversation into 2-3 dense sentences capturing decisions, patterns, and key facts. Output only the summary, no preamble.',
            messages: [{ role: 'user', content: conversationText }],
            maxTokens: 200,
        })

        return {
            text: summary.trim(),
            ts: timestamp,
            msgCount,
        }
    } catch (error) {
        console.warn('[MoltHive Memory] Compression failed, using placeholder:', error.message)

        // Never throw — return a placeholder summary
        const preview = msgs
            .slice(0, 3)
            .map(m => m.content.slice(0, 40))
            .join(' | ')

        return {
            text: `[Auto-summary of ${msgCount} messages] ${preview}...`,
            ts: timestamp,
            msgCount,
            placeholder: true,
        }
    }
}

/**
 * Crystallize a pattern from agent output into a COLD memory entry.
 * Called when an agent writes "CRYSTALLIZE: [topic]" in a reply.
 * 
 * @param {string} topic - The topic to crystallize
 * @param {string} context - Surrounding conversation context
 * @param {Object} llmCfg - LLM configuration
 * @returns {Promise<Object>} {text, topic, ts, hits, agentId?}
 */
export async function crystallizePattern(topic, context, llmCfg) {
    const timestamp = new Date().toISOString()

    try {
        const pattern = await llmCall({
            provider: llmCfg.provider,
            apiKey: llmCfg.apiKey,
            model: llmCfg.model,
            system: `Extract a single reusable insight about "${topic}". Format:
PATTERN: [what] | APPLIES_WHEN: [trigger] | ACTION: [what to do]
Max 40 words total. Output only the pattern, no preamble.`,
            messages: [{ role: 'user', content: context }],
            maxTokens: 100,
        })

        return {
            text: pattern.trim(),
            topic,
            ts: timestamp,
            hits: 0,
        }
    } catch (error) {
        console.warn('[MoltHive Memory] Crystallization failed:', error.message)

        // Fallback: store the raw topic as a basic pattern
        return {
            text: `PATTERN: ${topic} | APPLIES_WHEN: relevant context | ACTION: consider this insight`,
            topic,
            ts: timestamp,
            hits: 0,
            placeholder: true,
        }
    }
}

/**
 * Parse a reply for CRYSTALLIZE directives.
 * Matches lines like: CRYSTALLIZE: [topic]
 * 
 * @param {string} reply - The agent's reply text
 * @returns {string[]} Array of topics to crystallize
 */
export function parseCrystallizeDirectives(reply) {
    if (!reply) return []
    const matches = []
    const regex = /CRYSTALLIZE:\s*(.+)/gi
    let match
    while ((match = regex.exec(reply)) !== null) {
        const topic = match[1].trim()
        if (topic) matches.push(topic)
    }
    return matches
}

/**
 * Run the full memory compression cycle for an agent.
 * This is the main entry point called after each message.
 * 
 * 1. Check if compression is needed
 * 2. Compress oldest messages → WARM summary
 * 3. Trim the raw history
 * 4. Prune WARM if over limit
 * 5. Persist everything
 * 
 * @param {string} agentId - The agent's ID
 * @param {Object} llmCfg - LLM configuration
 * @returns {Promise<{compressed: boolean, warm?: Object}>}
 */
export async function runCompressionCycle(agentId, llmCfg) {
    try {
        // Load current state
        const rawHistories = await db.get('hive-rawhist', {})
        const rawHistory = rawHistories[agentId] || []

        if (!shouldCompress(rawHistory)) {
            return { compressed: false }
        }

        // Get messages to compress
        const toCompress = getMessagesToCompress(rawHistory)
        if (toCompress.length === 0) return { compressed: false }

        // Compress (async, non-blocking)
        const warmEntry = await compressMessages(toCompress, llmCfg)

        // Remove compressed messages from raw history
        rawHistories[agentId] = rawHistory.slice(toCompress.length)
        await db.set('hive-rawhist', rawHistories)

        // Add to WARM memory (shared across all agents)
        const warmMemory = await db.get('hive-warm', [])
        warmMemory.push(warmEntry)

        // Prune if too many
        if (warmMemory.length > MAX_WARM) {
            warmMemory.splice(0, warmMemory.length - MAX_WARM)
        }

        await db.set('hive-warm', warmMemory)

        return { compressed: true, warm: warmEntry }
    } catch (error) {
        console.error('[MoltHive Memory] Compression cycle failed:', error)
        return { compressed: false, error: error.message }
    }
}

/**
 * Run crystallization for all CRYSTALLIZE directives in a reply.
 * 
 * @param {string} reply - The agent's reply text
 * @param {string} context - Recent conversation context
 * @param {Object} llmCfg - LLM configuration
 * @param {string} agentId - The agent that crystallized
 * @returns {Promise<Object[]>} Array of crystallized patterns
 */
export async function runCrystallization(reply, context, llmCfg, agentId) {
    const topics = parseCrystallizeDirectives(reply)
    if (topics.length === 0) return []

    const results = []

    for (const topic of topics) {
        const pattern = await crystallizePattern(topic, context, llmCfg)
        pattern.agentId = agentId

        // Add to COLD memory (shared across all agents)
        const coldMemory = await db.get('hive-cold', [])
        coldMemory.push(pattern)

        // Prune if too many
        if (coldMemory.length > MAX_COLD) {
            coldMemory.splice(0, coldMemory.length - MAX_COLD)
        }

        await db.set('hive-cold', coldMemory)
        results.push(pattern)
    }

    return results
}

/**
 * Get the current memory state for display in the UI.
 * 
 * @returns {Promise<{warm: Array, cold: Array, warmCount: number, coldCount: number}>}
 */
export async function getMemoryState() {
    const warm = await db.get('hive-warm', [])
    const cold = await db.get('hive-cold', [])

    return {
        warm,
        cold,
        warmCount: warm.length,
        coldCount: cold.length,
    }
}

/**
 * Get the WARM summaries to inject into the system prompt.
 * Returns the last WARM_IN_PROMPT summaries.
 */
export async function getWarmForPrompt() {
    const warm = await db.get('hive-warm', [])
    return warm.slice(-WARM_IN_PROMPT)
}

/**
 * Get the COLD patterns to inject into the system prompt.
 * Returns the last COLD_IN_PROMPT patterns.
 */
export async function getColdForPrompt() {
    const cold = await db.get('hive-cold', [])
    return cold.slice(-COLD_IN_PROMPT)
}

// ═══════════════════════════════════════════════════════════════
//  MEMORY SCOPING — Parent↔Child Access Control
// ═══════════════════════════════════════════════════════════════

/**
 * Memory scope levels:
 *   global  — shared across ALL agents in the hive (default WARM/COLD behavior)
 *   family  — shared between a parent and its children only
 *   private — accessible only to the owning agent
 */
export const MEMORY_SCOPES = {
    GLOBAL: 'global',
    FAMILY: 'family',
    PRIVATE: 'private',
}

/**
 * Store a scoped memory entry.
 *
 * @param {string} agentId - The agent storing the memory
 * @param {string} scope - 'global', 'family', or 'private'
 * @param {Object} entry - { text, topic?, ts? }
 * @param {string} [familyId] - Parent agent ID (for family scope)
 * @returns {Promise<void>}
 */
export async function storeScopedMemory(agentId, scope, entry, familyId = null) {
    const key = scope === MEMORY_SCOPES.FAMILY && familyId
        ? `hive-memory-family-${familyId}`
        : scope === MEMORY_SCOPES.PRIVATE
            ? `hive-memory-private-${agentId}`
            : 'hive-cold'

    const memories = await db.get(key, [])
    memories.push({
        ...entry,
        agentId,
        scope,
        ts: entry.ts || new Date().toISOString(),
    })

    // Cap at 50 per scoped store
    if (memories.length > 50) memories.splice(0, memories.length - 50)
    await db.set(key, memories)
}

/**
 * Get scoped memories readable by an agent.
 * An agent can read: its own private + its family + global.
 *
 * @param {string} agentId
 * @param {string} [parentId] - The agent's parent ID (if it's a child)
 * @returns {Promise<Array>}
 */
export async function getScopedMemories(agentId, parentId = null) {
    const memories = []

    // Private memories
    const priv = await db.get(`hive-memory-private-${agentId}`, [])
    memories.push(...priv)

    // Family memories (from parent's family store)
    const familyKey = parentId || agentId
    const family = await db.get(`hive-memory-family-${familyKey}`, [])
    memories.push(...family)

    // Global memories are already in COLD
    return memories
}

/**
 * Share a memory from child to parent (child→family scope).
 *
 * @param {string} childId - Child agent ID
 * @param {string} parentId - Parent agent ID
 * @param {string} text - Memory content to share
 * @returns {Promise<void>}
 */
export async function shareMemoryWithParent(childId, parentId, text) {
    await storeScopedMemory(childId, MEMORY_SCOPES.FAMILY, {
        text,
        topic: 'child-report',
    }, parentId)
}
