/**
 * Molt-Hive Child Agent System
 * Parent agents spawn child agents for specific sub-tasks.
 * Children get their own HOT context, read access to parent's WARM/COLD memory,
 * and execute within a scoped task. They report results back to the parent.
 *
 * Children can be:
 *  - Ephemeral (destroyed after task completion) — default
 *  - Persistent (survive after task, can be re-tasked)
 */

import { db } from '../storage.js'
import { createAgent } from './agentManager.js'

// ─── Child Agent States ───
export const CHILD_STATES = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
}

/**
 * Spawn a child agent under a parent.
 *
 * @param {string} parentId - The parent agent's ID
 * @param {Object} params
 * @param {string} params.name - Child agent name
 * @param {string} params.role - Child agent role
 * @param {string} params.task - The specific task for this child
 * @param {string} [params.planId] - Optional plan ID to follow
 * @param {boolean} [params.persistent] - If true, survives after task completion
 * @returns {Promise<Object>} The child agent object
 */
export async function spawnChildAgent(parentId, { name, role, task, planId = null, persistent = false }) {
    const children = await db.get('hive-children', {})
    const parentChildren = children[parentId] || []

    const child = createAgent({ name, role, index: parentChildren.length })
    child.parentId = parentId
    child.isChild = true
    child.task = task
    child.planId = planId
    child.persistent = persistent
    child.state = CHILD_STATES.PENDING
    child.result = null
    child.spawnedAt = new Date().toISOString()
    child.completedAt = null

    parentChildren.push(child)
    children[parentId] = parentChildren
    await db.set('hive-children', children)

    // Initialize empty chat history for child
    const chats = await db.get('hive-chats', {})
    chats[child.id] = [{
        role: 'system',
        content: `🧬 ${child.name} (${child.role}) spawned by parent as a child agent.
Task: ${task}
${planId ? `Following plan: ${planId}` : 'No plan — autonomous execution.'}
Report results when complete. You can access the parent's shared memory.`,
        ts: new Date().toISOString(),
    }]
    await db.set('hive-chats', chats)

    return child
}

/**
 * Get all children of a parent agent.
 *
 * @param {string} parentId - The parent agent's ID
 * @returns {Promise<Array>} Array of child agent objects
 */
export async function getChildren(parentId) {
    const children = await db.get('hive-children', {})
    return children[parentId] || []
}

/**
 * Get active (running/pending) children of a parent.
 *
 * @param {string} parentId
 * @returns {Promise<Array>}
 */
export async function getActiveChildren(parentId) {
    const children = await getChildren(parentId)
    return children.filter(c =>
        c.state === CHILD_STATES.PENDING || c.state === CHILD_STATES.RUNNING
    )
}

/**
 * Update a child agent's state.
 *
 * @param {string} parentId
 * @param {string} childId
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated child or null
 */
export async function updateChildAgent(parentId, childId, updates) {
    const children = await db.get('hive-children', {})
    const parentChildren = children[parentId] || []

    const idx = parentChildren.findIndex(c => c.id === childId)
    if (idx === -1) return null

    parentChildren[idx] = { ...parentChildren[idx], ...updates }
    children[parentId] = parentChildren
    await db.set('hive-children', children)

    return parentChildren[idx]
}

/**
 * Mark a child agent's task as started (running).
 *
 * @param {string} parentId
 * @param {string} childId
 * @returns {Promise<Object|null>}
 */
export async function startChild(parentId, childId) {
    return updateChildAgent(parentId, childId, {
        state: CHILD_STATES.RUNNING,
        lastActive: new Date().toISOString(),
    })
}

/**
 * A child reports its task completion with a result.
 *
 * @param {string} parentId
 * @param {string} childId
 * @param {Object} result - { success: boolean, summary: string, data?: any }
 * @returns {Promise<Object|null>}
 */
export async function completeChildTask(parentId, childId, result) {
    const updated = await updateChildAgent(parentId, childId, {
        state: result.success ? CHILD_STATES.COMPLETED : CHILD_STATES.FAILED,
        result,
        completedAt: new Date().toISOString(),
    })

    // If ephemeral and completed successfully, clean up chat history
    if (updated && !updated.persistent && result.success) {
        const chats = await db.get('hive-chats', {})
        delete chats[childId]
        await db.set('hive-chats', chats)
    }

    return updated
}

/**
 * Parent kills/cancels a child agent.
 *
 * @param {string} parentId
 * @param {string} childId
 * @returns {Promise<Object|null>}
 */
export async function killChild(parentId, childId) {
    return updateChildAgent(parentId, childId, {
        state: CHILD_STATES.CANCELLED,
        completedAt: new Date().toISOString(),
    })
}

/**
 * Get the full agent hierarchy tree starting from a given agent.
 *
 * @param {string} agentId - Root agent ID
 * @returns {Promise<Object>} Tree node { agent, children: [TreeNode] }
 */
export async function getAgentTree(agentId) {
    const agents = await db.get('hive-agents', [])
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return null

    const children = await getChildren(agentId)
    const childTrees = await Promise.all(
        children.map(async (child) => ({
            agent: child,
            children: await getChildren(child.id).then(grandchildren =>
                grandchildren.map(gc => ({ agent: gc, children: [] }))
            ),
        }))
    )

    return { agent, children: childTrees }
}

/**
 * Get all child results for a parent (completed children only).
 *
 * @param {string} parentId
 * @returns {Promise<Array>} Array of { childName, role, task, result }
 */
export async function getChildResults(parentId) {
    const children = await getChildren(parentId)
    return children
        .filter(c => c.state === CHILD_STATES.COMPLETED || c.state === CHILD_STATES.FAILED)
        .map(c => ({
            childName: c.name,
            role: c.role,
            task: c.task,
            state: c.state,
            result: c.result,
            completedAt: c.completedAt,
        }))
}

/**
 * Parse SPAWN_CHILD directives from an agent's reply.
 * Format: SPAWN_CHILD: name | role | task description
 *
 * @param {string} reply - The agent's reply text
 * @returns {Array<{name: string, role: string, task: string}>}
 */
export function parseSpawnDirectives(reply) {
    if (!reply) return []

    const directives = []
    const regex = /SPAWN_CHILD:\s*([^|]+)\|([^|]+)\|(.+)/gi
    let match

    while ((match = regex.exec(reply)) !== null) {
        const name = match[1].trim()
        const role = match[2].trim()
        const task = match[3].trim()

        if (name && role && task) {
            directives.push({ name, role, task })
        }
    }

    return directives
}

/**
 * Parse DELEGATE directives from an agent's reply.
 * Format: DELEGATE: childName | subtask
 *
 * @param {string} reply
 * @returns {Array<{childName: string, subtask: string}>}
 */
export function parseDelegateDirectives(reply) {
    if (!reply) return []

    const directives = []
    const regex = /DELEGATE:\s*([^|]+)\|(.+)/gi
    let match

    while ((match = regex.exec(reply)) !== null) {
        const childName = match[1].trim()
        const subtask = match[2].trim()

        if (childName && subtask) {
            directives.push({ childName, subtask })
        }
    }

    return directives
}

/**
 * Clean up all children for a parent (used on reset).
 *
 * @param {string} parentId
 * @returns {Promise<void>}
 */
export async function clearChildren(parentId) {
    const children = await db.get('hive-children', {})
    const parentChildren = children[parentId] || []

    // Clean up child chat histories
    const chats = await db.get('hive-chats', {})
    for (const child of parentChildren) {
        delete chats[child.id]
    }
    await db.set('hive-chats', chats)

    // Remove children
    children[parentId] = []
    await db.set('hive-children', children)
}
