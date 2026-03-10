/**
 * Molt-Hive Skills System (Folder-Based)
 * 
 * Skills live in the /skills directory, one folder per skill.
 * Each skill folder contains a SKILL.md with YAML frontmatter (name, description)
 * and markdown body (instructions, examples, actions).
 * 
 * How it works:
 * - On the server: reads skills/ directory and parses SKILL.md files
 * - In the browser: fetches skill data via /api/skills endpoint
 * - Agent can CREATE new skills by writing SKILL.md files via file_write tool
 * - Users can add skills by creating a new folder in skills/ with a SKILL.md
 * 
 * Format (same as OpenClaw):
 * ---
 * name: skill-name
 * description: When to use this skill
 * ---
 * # Skill Title
 * ## Overview / Steps / Actions / Notes
 */

const SERVER_URL = '/api'

/**
 * Parse YAML frontmatter from a SKILL.md file.
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!match) return { meta: {}, body: content }

    const meta = {}
    match[1].split('\n').forEach(line => {
        const kv = line.match(/^(\w+):\s*(.+)$/)
        if (kv) meta[kv[1]] = kv[2].trim()
    })

    return { meta, body: match[2].trim() }
}

/**
 * Fetch all skills from the server.
 * The server reads from the skills/ directory.
 * 
 * @returns {Promise<Array<{name: string, description: string, body: string}>>}
 */
export async function getAllSkills() {
    try {
        const response = await fetch(`${SERVER_URL}/skills`)
        if (!response.ok) throw new Error(`Status ${response.status}`)
        const data = await response.json()
        return data.skills || []
    } catch (error) {
        console.warn('[Skills] Failed to load from server:', error.message)
        return []
    }
}

/**
 * Format skills for injection into the system prompt.
 * Returns a compact summary of each skill.
 */
export async function getSkillsPromptBlock() {
    const skills = await getAllSkills()
    if (skills.length === 0) return ''

    return skills
        .filter(s => s.name !== '_template')
        .map(s => `- **${s.name}**: ${s.description}`)
        .join('\n')
}

/**
 * Get full skill content for a specific skill.
 * Used when the agent wants to follow a skill's instructions.
 */
export async function getSkillContent(name) {
    const skills = await getAllSkills()
    return skills.find(s => s.name === name) || null
}

/**
 * Parse CREATE_SKILL directives from agent replies.
 * 
 * Format:
 * CREATE_SKILL: skill-name
 * description: When to use this skill
 * ---
 * # Skill content (markdown)
 * ...
 * ---
 * 
 * Alternative format (simpler):
 * LEARN_SKILL: skill-name | description
 */
export function parseCreateSkill(reply) {
    if (!reply) return null

    // Try CREATE_SKILL format
    const createMatch = reply.match(
        /CREATE_SKILL:\s*(\S+)\s*\n\s*description:\s*(.+)\n---\n([\s\S]*?)---/i
    )
    if (createMatch) {
        return {
            name: createMatch[1].trim().toLowerCase().replace(/\s+/g, '-'),
            description: createMatch[2].trim(),
            body: createMatch[3].trim(),
        }
    }

    // Try LEARN_SKILL format
    const learnMatch = reply.match(/LEARN_SKILL:\s*([^|]+)\|\s*(.+)/i)
    if (learnMatch) {
        return {
            name: learnMatch[1].trim().toLowerCase().replace(/\s+/g, '-'),
            description: learnMatch[2].trim(),
            body: null, // Will be auto-generated
        }
    }

    return null
}

/**
 * Create a new skill by writing a SKILL.md file.
 * Uses the file_write tool via the server.
 */
export async function createSkill(name, description, body) {
    const skillContent = `---
name: ${name}
description: ${description}
---

${body || `# ${name}\n\n## Overview\n\n${description}\n\n## Notes\n\n- This skill was auto-learned by the agent\n- Edit this file to customize the skill`}
`

    try {
        const response = await fetch(`${SERVER_URL}/tools/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tool: 'file_write',
                params: { path: `skills/${name}/SKILL.md`, content: skillContent },
            }),
        })
        const data = await response.json()
        return data.success
    } catch (error) {
        console.error('[Skills] Failed to create skill:', error)
        return false
    }
}
