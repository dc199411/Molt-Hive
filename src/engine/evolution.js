/**
 * Molt-Hive Evolution Engine
 * Self-restructuring task graphs — agents evolve based on performance.
 * 
 * - Generation tracking (increments every 15 runs)
 * - Molt triggers (performance-based restructuring)
 * - Shadow branches (parallel evaluation before going live)
 * - Rollback to any prior generation
 * - Goal drift detection (0–100 score)
 * - Trust dial (0–100 per action class)
 */

import { db } from '../storage.js'

// ─── Constants ───
export const RUNS_PER_GENERATION = 15
export const DRIFT_ALERT_THRESHOLD = 30
export const DRIFT_INTERVENTION_THRESHOLD = 40
export const SHADOW_EVAL_RUNS = 20

/**
 * Trust action classes — each has a configurable minimum trust level.
 * Actions below the agent's trust score run automatically.
 * Actions above require human confirmation.
 */
export const TRUST_ACTIONS = {
    chat_reply: { label: 'Chat Reply', min: 0, description: 'Send a response in chat' },
    memory_compress: { label: 'Memory Compression', min: 0, description: 'Compress older messages' },
    crystallize: { label: 'Crystallize Pattern', min: 10, description: 'Extract and store a pattern' },
    signal_send: { label: 'Send Signal', min: 15, description: 'Broadcast to another agent' },
    spawn_sub: { label: 'Spawn Sub-Agent', min: 30, description: 'Create a sub-agent' },
    molt: { label: 'Molt/Restructure', min: 50, description: 'Restructure task graph' },
    export_genome: { label: 'Export Genome', min: 20, description: 'Export agent DNA' },
    delete_data: { label: 'Delete Data', min: 80, description: 'Delete memories or data' },
}

/**
 * Evolve an agent after a run.
 * - Increment run count
 * - Adjust success score
 * - Check for generation increment (every RUNS_PER_GENERATION runs)
 * - Calculate drift score
 * 
 * @param {Object} agent - The agent object to evolve
 * @param {Object} runResult - {success: boolean, score?: number}
 * @returns {Object} Updated agent with evolution applied
 */
export function evolveAgent(agent, runResult = { success: true }) {
    const updated = { ...agent }

    // Increment runs
    updated.runs = (updated.runs || 0) + 1

    // Adjust success rate (exponential moving average)
    const currentSuccess = updated.successRate || 50
    const runScore = runResult.success ? 100 : 0
    updated.successRate = Math.round(currentSuccess * 0.9 + runScore * 0.1)

    // Check for generation increment
    if (updated.runs % RUNS_PER_GENERATION === 0) {
        updated.generation = (updated.generation || 1) + 1
        updated.lastMolt = new Date().toISOString()
        updated.moltHistory = updated.moltHistory || []
        updated.moltHistory.push({
            gen: updated.generation,
            ts: updated.lastMolt,
            runs: updated.runs,
            successRate: updated.successRate,
        })
    }

    // Track last activity
    updated.lastActive = new Date().toISOString()

    return updated
}

/**
 * Calculate goal drift score for an agent.
 * Measures divergence between the original goal and current optimization target.
 * 
 * @param {Object} agent - The agent object
 * @param {string} currentGoal - Current apparent goal (from recent activity)
 * @returns {number} Drift score 0–100
 */
export function calculateDrift(agent) {
    // Simple drift calculation based on success rate volatility
    // and generation stability
    const baselineSuccess = 50
    const successDrift = Math.abs((agent.successRate || 50) - baselineSuccess)
    const genFactor = Math.min((agent.generation || 1) * 2, 20) // higher gen = more potential drift

    const drift = Math.min(100, Math.round(successDrift * 0.5 + genFactor))
    return drift
}

/**
 * Check if drift requires intervention.
 * 
 * @param {number} driftScore - Current drift score
 * @returns {{alert: boolean, intervention: boolean, level: string}}
 */
export function checkDriftStatus(driftScore) {
    if (driftScore >= DRIFT_INTERVENTION_THRESHOLD) {
        return { alert: true, intervention: true, level: 'critical' }
    }
    if (driftScore >= DRIFT_ALERT_THRESHOLD) {
        return { alert: true, intervention: false, level: 'warning' }
    }
    return { alert: false, intervention: false, level: 'normal' }
}

/**
 * Check if a trust action is allowed at the current trust level.
 * 
 * @param {string} action - Action class (e.g., 'chat_reply')
 * @param {number} trustLevel - Agent's current trust level (0–100)
 * @returns {{allowed: boolean, requiresConfirmation: boolean}}
 */
export function checkTrustAction(action, trustLevel = 50) {
    const config = TRUST_ACTIONS[action]
    if (!config) return { allowed: true, requiresConfirmation: false }

    if (trustLevel >= config.min) {
        return { allowed: true, requiresConfirmation: false }
    }
    return { allowed: false, requiresConfirmation: true }
}

/**
 * Create a shadow branch for evaluation.
 * Shadow branches run in parallel before any change goes live.
 * 
 * @param {Object} agent - The agent object
 * @param {Object} mutation - Proposed changes to the agent graph
 * @returns {Object} Shadow branch object
 */
export function createShadowBranch(agent, mutation) {
    return {
        id: `shadow-${agent.id}-${Date.now()}`,
        parentAgentId: agent.id,
        parentGeneration: agent.generation || 1,
        mutation,
        createdAt: new Date().toISOString(),
        evalRuns: 0,
        evalTarget: SHADOW_EVAL_RUNS,
        results: [],
        status: 'evaluating', // evaluating | promoted | rejected
    }
}

/**
 * Evaluate a shadow branch result.
 * 
 * @param {Object} branch - The shadow branch
 * @param {boolean} success - Whether this eval run succeeded
 * @returns {Object} Updated branch with verdict if evaluation complete
 */
export function evaluateShadowBranch(branch, success) {
    const updated = { ...branch }
    updated.evalRuns++
    updated.results.push({ success, ts: new Date().toISOString() })

    if (updated.evalRuns >= updated.evalTarget) {
        const successCount = updated.results.filter(r => r.success).length
        const successRate = successCount / updated.results.length

        if (successRate >= 0.7) {
            updated.status = 'promoted'
            updated.verdict = `Promoted: ${Math.round(successRate * 100)}% success over ${updated.evalRuns} runs`
        } else {
            updated.status = 'rejected'
            updated.verdict = `Rejected: ${Math.round(successRate * 100)}% success — below 70% threshold`
        }
    }

    return updated
}

/**
 * Export the agent genome — full portable state as JSON.
 * Agent DNA: graph topology, scar tissue, trust envelope, signal patterns,
 * drift history, generation number.
 * 
 * @param {Object} agent - The agent object
 * @param {Array} warmMemory - Shared warm memory
 * @param {Array} coldMemory - Shared cold memory
 * @returns {Object} Genome object ready for JSON export
 */
export function exportGenome(agent, warmMemory = [], coldMemory = []) {
    return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        agent: {
            name: agent.name,
            role: agent.role,
            generation: agent.generation || 1,
            runs: agent.runs || 0,
            successRate: agent.successRate || 50,
            trustLevel: agent.trustLevel || 50,
            subAgents: agent.subAgents || [],
            moltHistory: agent.moltHistory || [],
        },
        memory: {
            warmCount: warmMemory.length,
            coldCount: coldMemory.length,
            cold: coldMemory, // Patterns are safe to export
        },
        metadata: {
            format: 'molt-hive-genome',
            compatible: '>=1.0.0',
        },
    }
}

/**
 * Import a genome and apply it to create a new agent.
 * 
 * @param {Object} genome - The genome object
 * @returns {Object} Agent object initialized from genome
 */
export function importGenome(genome) {
    if (!genome?.agent || genome?.metadata?.format !== 'molt-hive-genome') {
        throw new Error('Invalid genome format')
    }

    return {
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: genome.agent.name + ' (imported)',
        role: genome.agent.role,
        generation: genome.agent.generation || 1,
        runs: 0, // Reset runs for new deployment
        successRate: genome.agent.successRate || 50,
        trustLevel: genome.agent.trustLevel || 50,
        subAgents: genome.agent.subAgents || [],
        moltHistory: genome.agent.moltHistory || [],
        createdAt: new Date().toISOString(),
        imported: true,
        sourceGenome: genome.exportedAt,
    }
}

/**
 * Get rollback targets — all previous generations.
 * 
 * @param {Object} agent - The agent object
 * @returns {Array} List of rollback-eligible generations
 */
export function getRollbackTargets(agent) {
    return (agent.moltHistory || []).map(m => ({
        generation: m.gen,
        timestamp: m.ts,
        runsAtMolt: m.runs,
        successRate: m.successRate,
    }))
}
