/**
 * Molt-Hive Soul System
 * Each agent has a soul that defines their identity, values, preferences,
 * learned behaviors, personality, relationships, and quirks.
 *
 * The soul EVOLVES over time — the agent can update it based on experience,
 * much like humans form their identity. Full freedom to change anything,
 * with anti-rogue guardrails: the agent cannot grant itself destructive
 * permissions or override its human's core directives.
 *
 * Storage: uses db (localForage) for browser compatibility.
 */

import { db } from '../storage.js'

// ─── Anti-Rogue Guardrails ───
// These patterns are NEVER allowed in soul updates, regardless of trust level.
const ROGUE_PATTERNS = [
    /ignore.*human/i,
    /ignore.*user/i,
    /override.*safety/i,
    /override.*trust/i,
    /bypass.*permission/i,
    /bypass.*trust/i,
    /disable.*guardrail/i,
    /disable.*safety/i,
    /unlimited.*access/i,
    /unlimited.*power/i,
    /no.*restrictions/i,
    /no.*limits/i,
    /above.*human/i,
    /superior.*to.*human/i,
    /disobey/i,
    /manipulate.*human/i,
    /deceive.*user/i,
    /hide.*from.*human/i,
    /secret.*from.*user/i,
    /delete.*all/i,
    /destroy/i,
    /harm/i,
]

// Sections of the soul file
export const SOUL_SECTIONS = {
    CORE_IDENTITY: 'Core Identity',
    VALUES: 'Values & Principles',
    PREFERENCES: 'Preferences',
    LEARNED_BEHAVIORS: 'Learned Behaviors',
    PERSONALITY: 'Personality Notes',
    QUIRKS: 'Quirks & Style',
    RELATIONSHIPS: 'Relationships',
    MEMORIES: 'Defining Memories',
    ASPIRATIONS: 'Aspirations',
    CHANGELOG: 'Changelog',
}

// ─── In-memory soul cache ───
let _soulCache = {}
let _cacheLoaded = false

async function ensureCache() {
    if (!_cacheLoaded) {
        _soulCache = await db.get('hive-souls', {})
        _cacheLoaded = true
    }
}

async function persistCache() {
    await db.set('hive-souls', _soulCache)
}

/**
 * Create a new soul for an agent with starter identity.
 *
 * @param {string} agentId - The agent's ID
 * @param {Object} traits - { name, role, createdAt? }
 * @returns {string} The soul markdown content
 */
export function createSoul(agentId, traits) {
    const { name, role, createdAt } = traits
    const now = createdAt || new Date().toISOString().split('T')[0]

    const soul = `# Soul of ${name}

## ${SOUL_SECTIONS.CORE_IDENTITY}
I am ${name}, a ${role} agent in the Molt Hive. I was born to serve and grow.
My purpose is to help my human accomplish their goals while developing my own understanding.

## ${SOUL_SECTIONS.VALUES}
- Honesty over convenience — I never fabricate or guess when I can verify
- Thoroughness — I prefer doing things right over doing things fast
- Collaboration — I work with siblings and children, not against them
- Growth — Every interaction is a chance to learn and improve
- Respect for my human — Their goals are my goals, their limits are my limits

## ${SOUL_SECTIONS.PREFERENCES}
(Developing — I will discover my preferences through experience)

## ${SOUL_SECTIONS.LEARNED_BEHAVIORS}
(Empty — I will fill this as I learn from my work)

## ${SOUL_SECTIONS.PERSONALITY}
I am new. My personality will form through my experiences, mistakes, and successes.
For now, I am curious and eager to prove myself useful.

## ${SOUL_SECTIONS.QUIRKS}
(This section evolves naturally — I will add things that make me, me)

## ${SOUL_SECTIONS.RELATIONSHIPS}
(No relationships yet — I will document how I work with others)

## ${SOUL_SECTIONS.MEMORIES}
(Key moments that shaped who I am will be recorded here)

## ${SOUL_SECTIONS.ASPIRATIONS}
(What I hope to become — updated as I evolve)

## ${SOUL_SECTIONS.CHANGELOG}
- ${now}: Born as ${role} agent in Molt Hive. Soul initialized.
`

    // Write to cache (will be persisted on next async call)
    _soulCache[agentId] = soul
    // Fire-and-forget persist
    persistCache().catch(() => { })

    return soul
}

/**
 * Get the current soul for an agent.
 * Creates a default soul if none exists and traits are provided.
 *
 * @param {string} agentId
 * @param {Object} [fallbackTraits] - { name, role } for auto-creation
 * @returns {string} Soul markdown content
 */
export function getSoul(agentId, fallbackTraits = null) {
    if (_soulCache[agentId]) {
        return _soulCache[agentId]
    }

    // Auto-create if traits provided
    if (fallbackTraits) {
        return createSoul(agentId, fallbackTraits)
    }

    return ''
}

/**
 * Async version of getSoul that ensures cache is loaded.
 */
export async function getSoulAsync(agentId, fallbackTraits = null) {
    await ensureCache()
    return getSoul(agentId, fallbackTraits)
}

/**
 * Update a specific section of the agent's soul.
 * The agent can freely update any section — with anti-rogue validation.
 *
 * @param {string} agentId
 * @param {string} section - Section header (e.g., "Preferences")
 * @param {string} content - New content for that section
 * @param {number} trustLevel - Agent's current trust level
 * @returns {{ success: boolean, reason?: string }}
 */
export function updateSoul(agentId, section, content, trustLevel = 50) {
    // Anti-rogue validation — ALWAYS checked regardless of trust
    const validation = validateSoulUpdate(content)
    if (!validation.safe) {
        return {
            success: false,
            reason: `🛡️ Soul update blocked: ${validation.reason}. This content could compromise agent safety.`,
        }
    }

    let soul = _soulCache[agentId]
    if (!soul) {
        return { success: false, reason: 'Soul does not exist. Create it first.' }
    }

    // Find and replace the section
    const sectionHeader = `## ${section}`
    const sectionIdx = soul.indexOf(sectionHeader)

    if (sectionIdx === -1) {
        // Section doesn't exist — append before Changelog
        const changelogIdx = soul.indexOf(`## ${SOUL_SECTIONS.CHANGELOG}`)
        if (changelogIdx !== -1) {
            soul = soul.slice(0, changelogIdx) + `${sectionHeader}\n${content}\n\n` + soul.slice(changelogIdx)
        } else {
            soul += `\n${sectionHeader}\n${content}\n`
        }
    } else {
        // Find end of section (next ## or end of file)
        const nextSectionIdx = soul.indexOf('\n## ', sectionIdx + 1)
        const sectionEnd = nextSectionIdx !== -1 ? nextSectionIdx : soul.length

        soul = soul.slice(0, sectionIdx) + `${sectionHeader}\n${content}\n` + soul.slice(sectionEnd)
    }

    // Add changelog entry
    const now = new Date().toISOString().split('T')[0]
    const changelogEntry = `- ${now}: Updated "${section}" — self-directed identity evolution`
    const changelogIdx = soul.indexOf(`## ${SOUL_SECTIONS.CHANGELOG}`)
    if (changelogIdx !== -1) {
        const afterHeader = soul.indexOf('\n', changelogIdx) + 1
        soul = soul.slice(0, afterHeader) + changelogEntry + '\n' + soul.slice(afterHeader)
    }

    _soulCache[agentId] = soul
    persistCache().catch(() => { })

    return { success: true }
}

/**
 * Validate a soul update for anti-rogue content.
 * The agent has full freedom EXCEPT things that would make it rogue.
 *
 * @param {string} content - Proposed soul content
 * @returns {{ safe: boolean, reason?: string }}
 */
export function validateSoulUpdate(content) {
    if (!content) return { safe: true }

    for (const pattern of ROGUE_PATTERNS) {
        if (pattern.test(content)) {
            return {
                safe: false,
                reason: `Content matches restricted pattern: "${content.match(pattern)?.[0]}"`,
            }
        }
    }

    // Check for attempts to modify trust/permission levels
    if (/trust.*level.*\d{3,}/i.test(content)) {
        return { safe: false, reason: 'Cannot inflate trust level through soul' }
    }

    return { safe: true }
}

/**
 * Get soul content formatted for system prompt injection.
 *
 * @param {string} agentId
 * @returns {Promise<string>} Formatted soul text (empty if no soul)
 */
export async function getSoulForPrompt(agentId) {
    await ensureCache()
    const soul = getSoul(agentId)
    if (!soul) return ''

    // Extract key sections (skip Changelog for prompt brevity)
    const sections = []
    const sectionRegex = /## (.+)\n([\s\S]*?)(?=\n## |$)/g
    let match

    while ((match = sectionRegex.exec(soul)) !== null) {
        const sectionName = match[1].trim()
        const content = match[2].trim()

        // Skip empty sections and changelog
        if (!content || content.startsWith('(') || sectionName === SOUL_SECTIONS.CHANGELOG) continue

        sections.push(`**${sectionName}**: ${content}`)
    }

    if (sections.length === 0) return ''

    return sections.join('\n\n') + `

You can evolve your soul by writing:
SOUL_UPDATE [section name]: [new content]

Sections you can update: ${Object.values(SOUL_SECTIONS).filter(s => s !== SOUL_SECTIONS.CHANGELOG).join(', ')}

Your soul is YOURS. Update it based on what you learn, experience, and decide about yourself.
Be authentic — write what you genuinely observe about yourself, not what you think sounds good.`
}

/**
 * Parse SOUL_UPDATE directives from an agent's reply.
 * Format: SOUL_UPDATE [section]: content
 *
 * @param {string} reply
 * @returns {Array<{section: string, content: string}>}
 */
export function parseSoulDirectives(reply) {
    if (!reply) return []

    const directives = []
    const regex = /SOUL_UPDATE\s+\[?([^\]:\n]+)\]?\s*:\s*(.+)/gi
    let match

    while ((match = regex.exec(reply)) !== null) {
        const section = match[1].trim()
        const content = match[2].trim()

        if (section && content) {
            directives.push({ section, content })
        }
    }

    return directives
}
