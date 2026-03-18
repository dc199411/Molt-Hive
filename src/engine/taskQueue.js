/**
 * Molt-Hive Task Queue
 * Persistent task queue with checkpoint/resume for long-running work.
 * Tasks survive server restarts and can be prioritized.
 */

import { db } from '../storage.js'

// ─── Priority Levels ───
export const PRIORITY = {
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
}

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 }

// ─── Task States ───
export const TASK_STATES = {
    QUEUED: 'queued',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
}

/**
 * Add a task to the queue.
 *
 * @param {string} agentId - Agent to run the task
 * @param {string} task - Task description
 * @param {Object} [options]
 * @param {string} [options.priority] - 'high', 'normal', 'low'
 * @param {string} [options.mode] - 'auto' or 'forever'
 * @param {number} [options.maxIterations] - Max iterations
 * @returns {Promise<Object>} The queued task
 */
export async function enqueueTask(agentId, task, options = {}) {
    const {
        priority = PRIORITY.NORMAL,
        mode = 'auto',
        maxIterations = 20,
    } = options

    const taskObj = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        agentId,
        task,
        priority,
        mode,
        maxIterations,
        state: TASK_STATES.QUEUED,
        checkpoint: null,
        result: null,
        iterations: 0,
        toolCalls: 0,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
    }

    const queue = await db.get('hive-taskqueue', [])
    queue.push(taskObj)
    await db.set('hive-taskqueue', queue)

    return taskObj
}

/**
 * Get the next pending task for an agent (highest priority first).
 *
 * @param {string} agentId
 * @returns {Promise<Object|null>}
 */
export async function getNextTask(agentId) {
    const queue = await db.get('hive-taskqueue', [])

    const pending = queue
        .filter(t => t.agentId === agentId && t.state === TASK_STATES.QUEUED)
        .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1))

    return pending[0] || null
}

/**
 * Mark a task as running.
 *
 * @param {string} taskId
 * @returns {Promise<Object|null>}
 */
export async function startTask(taskId) {
    return updateTask(taskId, {
        state: TASK_STATES.RUNNING,
        startedAt: new Date().toISOString(),
    })
}

/**
 * Save a checkpoint for a running task (enables resume after restart).
 *
 * @param {string} taskId
 * @param {Object} checkpoint - { iteration, toolCalls, loopMessages, partialResult }
 * @returns {Promise<Object|null>}
 */
export async function checkpointTask(taskId, checkpoint) {
    return updateTask(taskId, {
        checkpoint: {
            ...checkpoint,
            savedAt: new Date().toISOString(),
        },
    })
}

/**
 * Get a task's checkpoint for resume.
 *
 * @param {string} taskId
 * @returns {Promise<Object|null>}
 */
export async function getCheckpoint(taskId) {
    const queue = await db.get('hive-taskqueue', [])
    const task = queue.find(t => t.id === taskId)
    return task?.checkpoint || null
}

/**
 * Complete a task with results.
 *
 * @param {string} taskId
 * @param {Object} result - { success, summary, iterations, toolCalls }
 * @returns {Promise<Object|null>}
 */
export async function completeTask(taskId, result) {
    return updateTask(taskId, {
        state: result.success ? TASK_STATES.COMPLETED : TASK_STATES.FAILED,
        result,
        iterations: result.iterations || 0,
        toolCalls: result.toolCalls || 0,
        completedAt: new Date().toISOString(),
        checkpoint: null,
    })
}

/**
 * Pause a running task.
 */
export async function pauseTask(taskId) {
    return updateTask(taskId, { state: TASK_STATES.PAUSED })
}

/**
 * Resume a paused task — sets it back to queued.
 */
export async function resumeTask(taskId) {
    return updateTask(taskId, { state: TASK_STATES.QUEUED })
}

/**
 * Cancel a task.
 */
export async function cancelTask(taskId) {
    return updateTask(taskId, {
        state: TASK_STATES.CANCELLED,
        completedAt: new Date().toISOString(),
    })
}

/**
 * Get all tasks for an agent (or all agents).
 *
 * @param {string} [agentId] - Filter by agent
 * @param {boolean} [activeOnly] - Only queued/running/paused
 * @returns {Promise<Array>}
 */
export async function getTaskHistory(agentId = null, activeOnly = false) {
    const queue = await db.get('hive-taskqueue', [])
    let tasks = queue

    if (agentId) {
        tasks = tasks.filter(t => t.agentId === agentId)
    }

    if (activeOnly) {
        const activeStates = [TASK_STATES.QUEUED, TASK_STATES.RUNNING, TASK_STATES.PAUSED]
        tasks = tasks.filter(t => activeStates.includes(t.state))
    }

    return tasks
}

/**
 * Get resumable tasks (paused or running tasks with checkpoints).
 *
 * @returns {Promise<Array>}
 */
export async function getResumableTasks() {
    const queue = await db.get('hive-taskqueue', [])
    return queue.filter(t =>
        t.checkpoint && (t.state === TASK_STATES.PAUSED || t.state === TASK_STATES.RUNNING)
    )
}

/**
 * Update a task in the queue.
 */
async function updateTask(taskId, updates) {
    const queue = await db.get('hive-taskqueue', [])
    const idx = queue.findIndex(t => t.id === taskId)
    if (idx === -1) return null

    queue[idx] = { ...queue[idx], ...updates }
    await db.set('hive-taskqueue', queue)
    return queue[idx]
}

/**
 * Prune completed/cancelled/failed tasks older than N days.
 *
 * @param {number} days - Age threshold
 * @returns {Promise<number>} Number of pruned tasks
 */
export async function pruneTasks(days = 30) {
    const queue = await db.get('hive-taskqueue', [])
    const cutoff = Date.now() - days * 86400000
    const doneStates = [TASK_STATES.COMPLETED, TASK_STATES.FAILED, TASK_STATES.CANCELLED]

    const kept = queue.filter(t => {
        if (!doneStates.includes(t.state)) return true
        const completedTime = new Date(t.completedAt || t.createdAt).getTime()
        return completedTime > cutoff
    })

    const pruned = queue.length - kept.length
    await db.set('hive-taskqueue', kept)
    return pruned
}
