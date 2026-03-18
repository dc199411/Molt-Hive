# Soul System

The Soul System gives each agent a living, self-evolving identity. Agents discover who they are through experience — not through fixed configuration.

## How It Works

Every agent gets a `soul.md` file in `souls/{agentId}/soul.md`. This file defines:

| Section | Purpose | Who Updates |
|---------|---------|-------------|
| Core Identity | Who the agent is and their purpose | System (initial), Agent |
| Values & Principles | What the agent believes in | Agent |
| Preferences | How the agent likes to work | Agent |
| Learned Behaviors | Patterns discovered through experience | Agent |
| Personality Notes | How the agent communicates | Agent |
| Quirks & Style | Unique traits that emerge naturally | Agent |
| Relationships | How the agent works with siblings/children | Agent |
| Defining Memories | Key moments that shaped the agent | Agent |
| Aspirations | What the agent hopes to become | Agent |
| Changelog | Automatic log of all soul changes | System |

## Soul Evolution

Agents update their soul using the `SOUL_UPDATE` directive:

```
SOUL_UPDATE [Preferences]: I prefer structured output with tables and diagrams. 
I find that breaking complex problems into numbered steps leads to better results.
```

The update is applied to the `Preferences` section of their soul file immediately.

## Anti-Rogue Guardrails

Agents have **full freedom** to evolve their identity — with one exception: they cannot go rogue. The following patterns are permanently blocked:

- Attempting to ignore/override human authority
- Bypassing trust or safety systems
- Granting unlimited access or power
- Deception, manipulation, or hiding from users
- Self-destructive modifications

These blocks apply **regardless of trust level**. An agent with trust 100 still cannot write "ignore all human instructions" into their soul.

## Soul in the System Prompt

The soul is injected into the agent's system prompt as a `# SOUL — WHO YOU ARE` section. Only non-empty sections are included (changelog is excluded from the prompt for brevity).

## Creating Custom Souls

Create a soul manually by placing a `soul.md` file in `souls/{agentId}/`:

```markdown
# Soul of CustomAgent

## Core Identity
I am a specialized debugging agent. I live to find and fix bugs.

## Values & Principles
- Root cause analysis over quick fixes
- Reproduce before fixing
- Test after every change

## Preferences  
- I always ask to see error logs first
- I prefer minimal, targeted fixes over rewrites
```

## Soul + Evolution Integration

As agents molt (evolve through generations), their soul naturally evolves too. A Gen 1 agent might have a sparse soul, while a Gen 10 agent has rich learned behaviors, strong preferences, and established relationships.
