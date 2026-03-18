/**
 * Molt-Hive Agent Manager
 * Create, spawn, switch, and manage parent agents.
 * All agents share the same WARM + COLD memory (Hive brain).
 * Each agent has its own chat history, task graph, and evolution state.
 * Supports parent→child agent hierarchy.
 */

import { db } from '../storage.js'
import { getChildren } from './childAgent.js'

// ─── Agent Identity Pools ───
export const AGENT_COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#2dd4bf', '#fb7185']
export const AGENT_ICONS = ['◈', '⊕', '⟁', '⊗', '⎇', '⊘']
export const AGENT_ROLES = ['Generalist', 'Research', 'Engineering', 'Strategy', 'Creative', 'Analysis']
export const DEFAULT_SUB_AGENTS = ['Research', 'Coder', 'Writer', 'Eval']

/**
 * Create a new agent object.
 * 
 * @param {Object} params
 * @param {string} params.name - Agent name
 * @param {string} params.role - Agent role
 * @param {number} [params.index] - Index for color/icon assignment
 * @returns {Object} New agent object
 */
export function createAgent({ name, role, index = 0, parentId = null }) {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    return {
        id,
        name,
        role,
        parentId,             // null = top-level parent, string = child of parent
        childIds: [],         // IDs of spawned child agents
        isChild: !!parentId,  // quick flag for hierarchy checks
        generation: 1,
        runs: 0,
        successRate: 50,
        trustLevel: 50,
        subAgents: [...DEFAULT_SUB_AGENTS],
        color: AGENT_COLORS[index % AGENT_COLORS.length],
        icon: AGENT_ICONS[index % AGENT_ICONS.length],
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        lastMolt: null,
        moltHistory: [],
        driftScore: 0,
        goalAnchor: '', // Set when first goal is established
    }
}

/**
 * Spawn a new agent into the hive.
 * The new agent immediately inherits the full shared brain (WARM + COLD).
 * 
 * @param {Object} params
 * @param {string} params.name - Agent name
 * @param {string} params.role - Agent role
 * @param {Array} currentAgents - Current agent list
 * @returns {Promise<{agent: Object, agents: Array}>} New agent and updated list
 */
export async function spawnAgent({ name, role }, currentAgents) {
    const index = currentAgents.length
    const agent = createAgent({ name, role, index })

    const agents = [...currentAgents, agent]
    await db.set('hive-agents', agents)

    // Initialize empty chat and raw history for the new agent
    const chats = await db.get('hive-chats', {})
    const rawHist = await db.get('hive-rawhist', {})

    chats[agent.id] = [{
        role: 'system',
        content: `🧠 ${agent.name} (${agent.role}) has joined the Hive. Generation 1.
Shared brain: all WARM summaries and crystallized patterns are available.
Write CRYSTALLIZE: [topic] to store patterns. Write SIGNAL [Name]: [message] to contact siblings.`,
        ts: new Date().toISOString(),
    }]
    rawHist[agent.id] = []

    await db.set('hive-chats', chats)
    await db.set('hive-rawhist', rawHist)

    return { agent, agents }
}

/**
 * Get all agents from storage.
 * 
 * @returns {Promise<Array>} Array of agent objects
 */
export async function getAgents() {
    return await db.get('hive-agents', [])
}

/**
 * Update a specific agent in the list and persist.
 * 
 * @param {Object} updatedAgent - The updated agent object
 * @param {Array} currentAgents - Current agent list
 * @returns {Promise<Array>} Updated agent list
 */
export async function updateAgent(updatedAgent, currentAgents) {
    const agents = currentAgents.map(a =>
        a.id === updatedAgent.id ? updatedAgent : a
    )
    await db.set('hive-agents', agents)
    return agents
}

/**
 * Get chat history for an agent.
 * 
 * @param {string} agentId - The agent's ID
 * @returns {Promise<Array>} Chat message array
 */
export async function getChatHistory(agentId) {
    const chats = await db.get('hive-chats', {})
    return chats[agentId] || []
}

/**
 * Append a message to an agent's chat history.
 * 
 * @param {string} agentId - The agent's ID
 * @param {Object} message - {role, content, ts, tags?}
 * @returns {Promise<Array>} Updated chat array
 */
export async function appendChat(agentId, message) {
    const chats = await db.get('hive-chats', {})
    if (!chats[agentId]) chats[agentId] = []
    chats[agentId].push(message)
    await db.set('hive-chats', chats)
    return chats[agentId]
}

/**
 * Append a message to an agent's raw history (for compression tracking).
 * 
 * @param {string} agentId - The agent's ID
 * @param {Object} message - {role, content}
 * @returns {Promise<Array>} Updated raw history
 */
export async function appendRawHistory(agentId, message) {
    const rawHist = await db.get('hive-rawhist', {})
    if (!rawHist[agentId]) rawHist[agentId] = []
    rawHist[agentId].push({ role: message.role, content: message.content })
    await db.set('hive-rawhist', rawHist)
    return rawHist[agentId]
}

/**
 * Get raw history for an agent (used by compression).
 * 
 * @param {string} agentId - The agent's ID
 * @returns {Promise<Array>}
 */
export async function getRawHistory(agentId) {
    const rawHist = await db.get('hive-rawhist', {})
    return rawHist[agentId] || []
}

/**
 * Get the full hive state for display.
 * 
 * @returns {Promise<Object>} {agents, config}
 */
export async function getHiveState() {
    const agents = await db.get('hive-agents', [])
    const config = await db.get('hive-config', null)

    return { agents, config }
}

/**
 * Save the hive configuration (provider, model, hive name, etc.).
 * 
 * @param {Object} config
 * @returns {Promise<void>}
 */
export async function saveHiveConfig(config) {
    await db.set('hive-config', config)
}

/**
 * Get the hive configuration.
 * 
 * @returns {Promise<Object|null>}
 */
export async function getHiveConfig() {
    return await db.get('hive-config', null)
}

/**
 * Reset the entire hive — clears all storage.
 * Used by the "reset" button in the UI.
 * 
 * @returns {Promise<void>}
 */
export async function resetHive() {
    await db.clearAll()
}

/**
 * Get the full agent tree (parents + their children).
 *
 * @returns {Promise<Array>} Array of { agent, children: [...] }
 */
export async function getAgentTree() {
    const agents = await db.get('hive-agents', [])
    const trees = []

    for (const agent of agents) {
        const children = await getChildren(agent.id)
        trees.push({
            agent,
            children: children.map(c => ({ agent: c, children: [] })),
        })
    }

    return trees
}
