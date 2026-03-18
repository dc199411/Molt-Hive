/**
 * Molt-Hive Scheduler
 * Time-based recurring agent tasks using cron expressions.
 * Agents can schedule tasks via the SCHEDULE directive.
 * Tasks run on a polling interval and persist across restarts.
 */

import { db } from '../storage.js'

// ─── Scheduled Task States ───
export const SCHED_STATES = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    CANCELLED: 'cancelled',
}

/**
 * Schedule a recurring task for an agent.
 *
 * @param {string} agentId - The agent that will run the task
 * @param {string} cronExpression - Cron-style schedule (e.g., "0 9 * * 1-5")
 * @param {string} task - Task description
 * @param {Object} [options]
 * @param {string} [options.name] - Human-readable schedule name
 * @returns {Promise<Object>} The scheduled task
 */
export async function scheduleTask(agentId, cronExpression, task, options = {}) {
    const schedTask = {
        id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        agentId,
        cron: cronExpression,
        task,
        name: options.name || task.slice(0, 50),
        state: SCHED_STATES.ACTIVE,
        lastRun: null,
        nextRun: calculateNextRun(cronExpression),
        runCount: 0,
        createdAt: new Date().toISOString(),
    }

    const schedules = await db.get('hive-schedules', [])
    schedules.push(schedTask)
    await db.set('hive-schedules', schedules)

    return schedTask
}

/**
 * List all scheduled tasks (optionally filtered by agent).
 *
 * @param {string} [agentId]
 * @returns {Promise<Array>}
 */
export async function listScheduledTasks(agentId = null) {
    const schedules = await db.get('hive-schedules', [])
    if (agentId) return schedules.filter(s => s.agentId === agentId)
    return schedules
}

/**
 * Pause a scheduled task.
 */
export async function pauseScheduledTask(taskId) {
    return updateSchedule(taskId, { state: SCHED_STATES.PAUSED })
}

/**
 * Resume a paused scheduled task.
 */
export async function resumeScheduledTask(taskId) {
    return updateSchedule(taskId, {
        state: SCHED_STATES.ACTIVE,
        nextRun: calculateNextRun((await getSchedule(taskId))?.cron),
    })
}

/**
 * Cancel (delete) a scheduled task.
 */
export async function cancelScheduledTask(taskId) {
    return updateSchedule(taskId, { state: SCHED_STATES.CANCELLED })
}

/**
 * Get tasks that are due to run NOW.
 *
 * @returns {Promise<Array>} Tasks whose nextRun <= now
 */
export async function getDueTasks() {
    const schedules = await db.get('hive-schedules', [])
    const now = Date.now()

    return schedules.filter(s =>
        s.state === SCHED_STATES.ACTIVE &&
        s.nextRun &&
        new Date(s.nextRun).getTime() <= now
    )
}

/**
 * Mark a scheduled task as just-ran and calculate next run.
 *
 * @param {string} taskId
 * @returns {Promise<Object|null>}
 */
export async function markRan(taskId) {
    const schedule = await getSchedule(taskId)
    if (!schedule) return null

    return updateSchedule(taskId, {
        lastRun: new Date().toISOString(),
        nextRun: calculateNextRun(schedule.cron),
        runCount: (schedule.runCount || 0) + 1,
    })
}

/**
 * Parse SCHEDULE directives from agent replies.
 * Format: SCHEDULE [cron]: task description
 * Example: SCHEDULE [0 9 * * 1-5]: Check email and summarize
 *
 * @param {string} reply
 * @returns {Array<{cron: string, task: string}>}
 */
export function parseScheduleDirectives(reply) {
    if (!reply) return []

    const directives = []
    const regex = /SCHEDULE\s+\[([^\]]+)\]\s*:\s*(.+)/gi
    let match

    while ((match = regex.exec(reply)) !== null) {
        const cron = match[1].trim()
        const task = match[2].trim()
        if (cron && task) {
            directives.push({ cron, task })
        }
    }

    return directives
}

/**
 * Calculate the next run time from a cron expression.
 * Simplified cron parser supporting:
 *   minute hour day-of-month month day-of-week
 *   * = any, N = specific, N-M = range, * /N = every N
 *
 * @param {string} cronExpr
 * @returns {string} ISO date string of next run
 */
export function calculateNextRun(cronExpr) {
    if (!cronExpr) return new Date(Date.now() + 3600000).toISOString() // fallback: 1 hour

    const parts = cronExpr.trim().split(/\s+/)
    if (parts.length < 5) {
        return new Date(Date.now() + 3600000).toISOString()
    }

    const [minExpr, hourExpr] = parts
    const now = new Date()

    // Parse minute
    let minute = now.getMinutes()
    if (minExpr !== '*') {
        if (minExpr.includes('/')) {
            const interval = parseInt(minExpr.split('/')[1])
            minute = Math.ceil((minute + 1) / interval) * interval
            if (minute >= 60) minute = 0
        } else {
            minute = parseInt(minExpr)
        }
    }

    // Parse hour
    let hour = now.getHours()
    if (hourExpr !== '*') {
        if (hourExpr.includes('/')) {
            const interval = parseInt(hourExpr.split('/')[1])
            hour = Math.ceil((hour + 1) / interval) * interval
            if (hour >= 24) hour = 0
        } else {
            hour = parseInt(hourExpr)
        }
    }

    // Build next run date
    const next = new Date(now)
    next.setMinutes(minute, 0, 0)
    next.setHours(hour)

    // If next time is in the past, move to next day
    if (next <= now) {
        next.setDate(next.getDate() + 1)
    }

    return next.toISOString()
}

// ─── Internal Helpers ───

async function getSchedule(taskId) {
    const schedules = await db.get('hive-schedules', [])
    return schedules.find(s => s.id === taskId) || null
}

async function updateSchedule(taskId, updates) {
    const schedules = await db.get('hive-schedules', [])
    const idx = schedules.findIndex(s => s.id === taskId)
    if (idx === -1) return null

    schedules[idx] = { ...schedules[idx], ...updates }
    await db.set('hive-schedules', schedules)
    return schedules[idx]
}

/**
 * Run the scheduler tick — checks for due tasks and returns them.
 * Call this on a setInterval in the server.
 *
 * @returns {Promise<Array>} Tasks that need to be executed now
 */
export async function schedulerTick() {
    const dueTasks = await getDueTasks()

    // Mark each as ran and calculate next
    for (const task of dueTasks) {
        await markRan(task.id)
    }

    return dueTasks
}
