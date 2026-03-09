/**
 * Molt-Hive Skills System
 * Learnable, reusable capabilities that agents can acquire and execute.
 * 
 * Skills are stored in COLD memory as executable patterns.
 * Agents learn new skills from successful tool chains.
 */

import { db } from '../storage.js'

/**
 * Pre-built skills that ship with Molt-Hive.
 * Users can add custom skills via the LEARN_SKILL directive or by editing this array.
 */
export const BUILT_IN_SKILLS = [
    {
        name: 'web_research',
        description: 'Research a topic by searching the web and reading relevant pages.',
        triggers: ['research', 'find out', 'look up', 'search for', 'learn about'],
        steps: [
            { tool: 'web_search', paramTemplate: { query: '{{topic}}' } },
            { tool: 'web_fetch', paramTemplate: { url: '{{top_result_url}}' } },
        ],
        category: 'research',
    },
    {
        name: 'create_project',
        description: 'Create a new project directory with files.',
        triggers: ['create project', 'new project', 'scaffold', 'initialize'],
        steps: [
            { tool: 'shell_execute', paramTemplate: { command: 'mkdir {{name}}' } },
            { tool: 'file_write', paramTemplate: { path: '{{name}}/package.json', content: '{{package_json}}' } },
            { tool: 'shell_execute', paramTemplate: { command: 'cd {{name}} && npm init -y' } },
        ],
        category: 'development',
    },
    {
        name: 'code_review',
        description: 'Read and analyze code files for issues, patterns, and improvements.',
        triggers: ['review code', 'check code', 'analyze code', 'audit'],
        steps: [
            { tool: 'file_list', paramTemplate: { path: '{{directory}}', recursive: true } },
            { tool: 'file_read', paramTemplate: { path: '{{target_file}}' } },
        ],
        category: 'development',
    },
    {
        name: 'deploy_static',
        description: 'Build and deploy a static site.',
        triggers: ['deploy', 'ship', 'publish', 'build and deploy'],
        steps: [
            { tool: 'shell_execute', paramTemplate: { command: 'npm run build' } },
            { tool: 'shell_execute', paramTemplate: { command: 'npx serve -s dist -l 3000' } },
        ],
        category: 'deployment',
    },
    {
        name: 'git_workflow',
        description: 'Standard git workflow: stage, commit, push.',
        triggers: ['commit', 'push', 'save changes', 'git'],
        steps: [
            { tool: 'shell_execute', paramTemplate: { command: 'git add -A' } },
            { tool: 'shell_execute', paramTemplate: { command: 'git commit -m "{{message}}"' } },
            { tool: 'shell_execute', paramTemplate: { command: 'git push origin {{branch}}' } },
        ],
        category: 'development',
    },
    {
        name: 'install_and_use_package',
        description: 'Install an npm package and create a script that uses it.',
        triggers: ['install package', 'add library', 'use npm package'],
        steps: [
            { tool: 'web_search', paramTemplate: { query: '{{package}} npm usage guide' } },
            { tool: 'npm_install', paramTemplate: { packages: '{{package}}' } },
            { tool: 'file_write', paramTemplate: { path: '{{script_path}}', content: '{{script_content}}' } },
        ],
        category: 'development',
    },
    {
        name: 'api_integration',
        description: 'Research an API, understand its endpoints, and make test requests.',
        triggers: ['integrate api', 'connect to api', 'use api', 'api call'],
        steps: [
            { tool: 'web_search', paramTemplate: { query: '{{api_name}} API documentation' } },
            { tool: 'web_fetch', paramTemplate: { url: '{{docs_url}}' } },
            { tool: 'http_request', paramTemplate: { method: 'GET', url: '{{test_endpoint}}' } },
        ],
        category: 'integration',
    },
    {
        name: 'data_analysis',
        description: 'Read data, process it with code, and report findings.',
        triggers: ['analyze data', 'process data', 'data analysis', 'parse data'],
        steps: [
            { tool: 'file_read', paramTemplate: { path: '{{data_file}}' } },
            { tool: 'code_execute', paramTemplate: { code: '{{analysis_code}}' } },
        ],
        category: 'analysis',
    },
]

/**
 * Get all skills (built-in + learned).
 */
export async function getAllSkills() {
    const learned = await db.get('hive-skills', [])
    return [...BUILT_IN_SKILLS, ...learned]
}

/**
 * Get skills formatted for the system prompt.
 */
export async function getSkillsPromptBlock() {
    const skills = await getAllSkills()

    return skills.map(s =>
        `- **${s.name}**: ${s.description} (triggers: ${s.triggers.join(', ')})`
    ).join('\n')
}

/**
 * Parse LEARN_SKILL directives from agent replies.
 * Format: LEARN_SKILL: name | description | triggers: word1, word2
 */
export function parseLearnSkill(reply) {
    if (!reply) return null

    const match = reply.match(/LEARN_SKILL:\s*([^|]+)\|\s*([^|]+)\|\s*triggers?:\s*(.+)/i)
    if (!match) return null

    return {
        name: match[1].trim().replace(/\s+/g, '_').toLowerCase(),
        description: match[2].trim(),
        triggers: match[3].split(',').map(t => t.trim().toLowerCase()),
        steps: [], // Will be populated from the tool chain that led to learning
        category: 'learned',
        learnedAt: new Date().toISOString(),
    }
}

/**
 * Save a newly learned skill.
 */
export async function saveLearnedSkill(skill) {
    const skills = await db.get('hive-skills', [])

    // Don't duplicate
    const exists = skills.find(s => s.name === skill.name)
    if (exists) {
        // Update existing
        Object.assign(exists, skill)
    } else {
        skills.push(skill)
    }

    await db.set('hive-skills', skills)
    return skill
}

/**
 * Find skills matching a trigger phrase.
 */
export async function findMatchingSkills(text) {
    const skills = await getAllSkills()
    const lower = text.toLowerCase()

    return skills.filter(skill =>
        skill.triggers.some(trigger => lower.includes(trigger))
    )
}

/**
 * Delete a learned skill by name.
 */
export async function deleteSkill(name) {
    const skills = await db.get('hive-skills', [])
    const filtered = skills.filter(s => s.name !== name)
    await db.set('hive-skills', filtered)
}
