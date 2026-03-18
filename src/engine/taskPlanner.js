/**
 * Molt-Hive Task Planner
 * Generates and executes structured .plan.md files that guide
 * child agents through complex tasks step-by-step.
 *
 * Storage: uses db (localForage) for browser compatibility.
 * Plan markdown is stored as a string field inside the plan metadata.
 */

import { db } from '../storage.js'

// ─── Plan Step States ───
export const STEP_STATES = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
}

/**
 * Generate a task plan using the LLM.
 *
 * @param {string} task - The task description
 * @param {Object} context - { agentName, agentRole, parentName? }
 * @param {Function} llmCallFn - The llmCall function
 * @param {Object} llmCfg - { provider, apiKey, model }
 * @returns {Promise<Object>} The generated plan
 */
export async function generatePlan(task, context, llmCallFn, llmCfg) {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const systemPrompt = `You are a task planning agent. Generate a structured step-by-step plan.
Output ONLY the plan in this exact markdown format (no extra text):

---
task: "<task description>"
agent: "<agent name>"
parent: "<parent name or 'none'>"
status: pending
---
# Plan: <title>

## Step 1: <step title>
- [ ] <subtask 1>
- [ ] <subtask 2>
STATUS: pending

## Step 2: <step title>
- [ ] <subtask 1>
STATUS: pending

(continue for all steps needed)

Rules:
- Break the task into 3-8 concrete steps
- Each step should be independently executable
- Order steps by dependency (do X before Y)
- Each subtask should be a specific action, not vague`

    try {
        const planMarkdown = await llmCallFn({
            provider: llmCfg.provider,
            apiKey: llmCfg.apiKey,
            model: llmCfg.model,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: `Generate a plan for this task:\n\nTask: ${task}\nAgent: ${context.agentName} (${context.agentRole})\nParent: ${context.parentName || 'none'}`,
            }],
            maxTokens: 1500,
        })

        const plan = parsePlan(planMarkdown)
        plan.id = planId
        plan.raw = planMarkdown

        // Save to storage
        const plans = await db.get('hive-plans', {})
        plans[planId] = {
            id: planId,
            task,
            agentName: context.agentName,
            parentName: context.parentName || null,
            raw: planMarkdown,
            status: 'pending',
            currentStep: 0,
            totalSteps: plan.steps.length,
            createdAt: new Date().toISOString(),
            completedAt: null,
        }
        await db.set('hive-plans', plans)

        return plan
    } catch (error) {
        // Fallback: create a simple 3-step plan
        const fallbackRaw = `# Plan: ${task}\n\n## Step 1: Research\n- [ ] Analyze\nSTATUS: pending\n\n## Step 2: Execute\n- [ ] Implement\nSTATUS: pending\n\n## Step 3: Verify\n- [ ] Test\nSTATUS: pending`

        const fallbackPlan = {
            id: planId,
            task,
            steps: [
                { title: 'Research & understand the task', subtasks: ['Analyze requirements', 'Identify approach'], status: STEP_STATES.PENDING },
                { title: 'Execute the main work', subtasks: ['Implement the solution'], status: STEP_STATES.PENDING },
                { title: 'Verify and report', subtasks: ['Test results', 'Report to parent'], status: STEP_STATES.PENDING },
            ],
            raw: fallbackRaw,
        }

        // Save fallback to storage
        const plans = await db.get('hive-plans', {})
        plans[planId] = {
            id: planId,
            task,
            agentName: context.agentName,
            parentName: context.parentName || null,
            raw: fallbackRaw,
            status: 'pending',
            currentStep: 0,
            totalSteps: 3,
            createdAt: new Date().toISOString(),
            completedAt: null,
        }
        await db.set('hive-plans', plans)

        return fallbackPlan
    }
}

/**
 * Parse a .plan.md file into a structured plan object.
 *
 * @param {string} markdown - The plan markdown content
 * @returns {Object} { task, steps: [{ title, subtasks, status }] }
 */
export function parsePlan(markdown) {
    const steps = []
    let task = ''

    // Extract frontmatter task
    const taskMatch = markdown.match(/task:\s*"?([^"\n]+)"?/i)
    if (taskMatch) task = taskMatch[1].trim()

    // Parse steps
    const stepRegex = /## Step \d+:\s*(.+)\n([\s\S]*?)(?=## Step \d+:|$)/gi
    let match

    while ((match = stepRegex.exec(markdown)) !== null) {
        const title = match[1].trim()
        const body = match[2]

        // Extract subtasks (- [ ] or - [x] lines)
        const subtasks = []
        const subtaskRegex = /- \[([x \/])\]\s*(.+)/gi
        let stMatch
        while ((stMatch = subtaskRegex.exec(body)) !== null) {
            subtasks.push(stMatch[2].trim())
        }

        // Extract status
        const statusMatch = body.match(/STATUS:\s*(\w+)/i)
        const status = statusMatch ? statusMatch[1].toLowerCase() : STEP_STATES.PENDING

        steps.push({ title, subtasks, status })
    }

    return { task, steps }
}

/**
 * Update the status of a specific step in a plan.
 *
 * @param {string} planId
 * @param {number} stepIndex - 0-based step index
 * @param {string} status - New status
 * @param {string} [result] - Optional result text
 * @returns {Promise<Object>} Updated plan metadata
 */
export async function updatePlanStep(planId, stepIndex, status, result = null) {
    const plans = await db.get('hive-plans', {})
    const plan = plans[planId]
    if (!plan) return null

    // Update the raw markdown if it exists
    if (plan.raw) {
        let content = plan.raw

        // Find the Nth step and update its STATUS line
        let stepCount = 0
        content = content.replace(/STATUS:\s*\w+/gi, (match) => {
            if (stepCount === stepIndex) {
                stepCount++
                return `STATUS: ${status}${result ? ` — ${result}` : ''}`
            }
            stepCount++
            return match
        })

        // Update checkbox markers for completed steps
        if (status === STEP_STATES.COMPLETED) {
            let inTargetStep = false
            let currentStep = -1
            const lines = content.split('\n')
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].match(/## Step \d+:/)) {
                    currentStep++
                    inTargetStep = currentStep === stepIndex
                }
                if (inTargetStep && lines[i].match(/- \[ \]/)) {
                    lines[i] = lines[i].replace('- [ ]', '- [x]')
                }
            }
            content = lines.join('\n')
        }

        plan.raw = content
    }

    // Update metadata
    if (status === STEP_STATES.COMPLETED || status === STEP_STATES.FAILED) {
        plan.currentStep = stepIndex + 1
    }

    // Check if all steps done
    const allDone = plan.currentStep >= plan.totalSteps
    if (allDone) {
        plan.status = 'completed'
        plan.completedAt = new Date().toISOString()
    } else {
        plan.status = 'in_progress'
    }

    plans[planId] = plan
    await db.set('hive-plans', plans)

    return plan
}

/**
 * Get the current step instructions for injecting into agent context.
 *
 * @param {string} planId
 * @returns {Promise<string>} Formatted current step text
 */
export async function getCurrentStepPrompt(planId) {
    const plans = await db.get('hive-plans', {})
    const plan = plans[planId]
    if (!plan || !plan.raw) return ''

    const parsed = parsePlan(plan.raw)

    if (plan.currentStep >= parsed.steps.length) {
        return '✅ All plan steps completed. Report TASK_COMPLETE with your final results.'
    }

    const step = parsed.steps[plan.currentStep]
    const progress = `${plan.currentStep}/${parsed.steps.length}`

    return `📋 PLAN PROGRESS: ${progress} steps complete
Current step (${plan.currentStep + 1}/${parsed.steps.length}): ${step.title}
Subtasks:
${step.subtasks.map(s => `  - ${s}`).join('\n')}

When this step is done, write: PLAN_STEP_COMPLETE: <brief result>
If this step cannot be done, write: PLAN_STEP_FAILED: <reason>`
}

/**
 * Get plan status summary.
 *
 * @param {string} planId
 * @returns {Promise<Object|null>}
 */
export async function getPlanStatus(planId) {
    const plans = await db.get('hive-plans', {})
    return plans[planId] || null
}

/**
 * List all plans (optionally filtered by agent).
 *
 * @param {string} [agentName] - Filter by agent name
 * @returns {Promise<Array>}
 */
export async function listPlans(agentName = null) {
    const plans = await db.get('hive-plans', {})
    const list = Object.values(plans)

    if (agentName) {
        return list.filter(p => p.agentName === agentName)
    }
    return list
}

/**
 * Parse PLAN_STEP_COMPLETE and PLAN_STEP_FAILED directives.
 *
 * @param {string} reply
 * @returns {{ complete: string|null, failed: string|null }}
 */
export function parsePlanDirectives(reply) {
    if (!reply) return { complete: null, failed: null }

    const completeMatch = reply.match(/PLAN_STEP_COMPLETE:\s*(.+)/i)
    const failedMatch = reply.match(/PLAN_STEP_FAILED:\s*(.+)/i)

    return {
        complete: completeMatch ? completeMatch[1].trim() : null,
        failed: failedMatch ? failedMatch[1].trim() : null,
    }
}
