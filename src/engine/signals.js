/**
 * Molt-Hive Signal Bus
 * Inter-agent communication without master mediation.
 * Agents write SIGNAL [AgentName]: [message] to broadcast to siblings.
 * Typed signals: pattern / directive / alert / molt.
 */

import { db } from '../storage.js'

/**
 * Signal types for categorization.
 */
export const SIGNAL_TYPES = {
    PATTERN: 'pattern',
    DIRECTIVE: 'directive',
    ALERT: 'alert',
    MOLT: 'molt',
    GENERAL: 'general',
}

/**
 * Parse SIGNAL directives from an agent's reply.
 * Matches: SIGNAL [AgentName]: [message]
 * 
 * @param {string} reply - The agent's reply text
 * @param {string} fromAgentId - ID of the sending agent
 * @param {string} fromAgentName - Name of the sending agent
 * @returns {Array} Array of parsed signals [{from, to, message, type, ts}]
 */
export function parseSignals(reply, fromAgentId, fromAgentName) {
    if (!reply) return []

    const signals = []
    const regex = /SIGNAL\s+\[?([^\]:\n]+)\]?\s*:\s*(.+)/gi
    let match

    while ((match = regex.exec(reply)) !== null) {
        const targetName = match[1].trim()
        const message = match[2].trim()

        if (!targetName || !message) continue

        // Auto-detect signal type from content
        let type = SIGNAL_TYPES.GENERAL
        const lowerMsg = message.toLowerCase()
        if (lowerMsg.includes('pattern') || lowerMsg.includes('learned')) {
            type = SIGNAL_TYPES.PATTERN
        } else if (lowerMsg.includes('alert') || lowerMsg.includes('warning') || lowerMsg.includes('error')) {
            type = SIGNAL_TYPES.ALERT
        } else if (lowerMsg.includes('molt') || lowerMsg.includes('evolve') || lowerMsg.includes('restructure')) {
            type = SIGNAL_TYPES.MOLT
        } else if (lowerMsg.includes('do ') || lowerMsg.includes('should') || lowerMsg.includes('must')) {
            type = SIGNAL_TYPES.DIRECTIVE
        }

        signals.push({
            from: fromAgentName,
            fromId: fromAgentId,
            to: targetName,
            message,
            type,
            ts: new Date().toISOString(),
        })
    }

    return signals
}

/**
 * Broadcast signals to the hive signal bus.
 * All agents can read all signals — they filter by relevance.
 * 
 * @param {Array} signals - Array of signals to broadcast
 * @returns {Promise<void>}
 */
export async function broadcastSignals(signals) {
    if (!signals || signals.length === 0) return

    try {
        const allSignals = await db.get('hive-signals', [])
        allSignals.push(...signals)

        // Keep only the last 100 signals to prevent unbounded growth
        if (allSignals.length > 100) {
            allSignals.splice(0, allSignals.length - 100)
        }

        await db.set('hive-signals', allSignals)
    } catch (error) {
        console.error('[MoltHive Signals] Failed to broadcast:', error)
    }
}

/**
 * Get all recent signals from the bus.
 * 
 * @param {number} limit - Max signals to return
 * @returns {Promise<Array>}
 */
export async function getSignals(limit = 20) {
    try {
        const signals = await db.get('hive-signals', [])
        return signals.slice(-limit)
    } catch (error) {
        console.warn('[MoltHive Signals] Failed to read signals:', error)
        return []
    }
}

/**
 * Get signals targeted at a specific agent.
 * 
 * @param {string} agentName - The target agent's name
 * @param {number} limit - Max signals to return
 * @returns {Promise<Array>}
 */
export async function getSignalsForAgent(agentName, limit = 10) {
    try {
        const signals = await db.get('hive-signals', [])
        return signals
            .filter(s => s.to.toLowerCase() === agentName.toLowerCase())
            .slice(-limit)
    } catch (error) {
        console.warn('[MoltHive Signals] Failed to read agent signals:', error)
        return []
    }
}

/**
 * Clear all signals (admin/reset).
 */
export async function clearSignals() {
    await db.set('hive-signals', [])
}
