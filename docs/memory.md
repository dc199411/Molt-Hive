# Memory System

Molt Hive uses a three-tier infinite memory system that keeps a **fixed-size context window** while accumulating **infinite knowledge**.

## Memory Tiers

| Tier | Contents | Limit | Shared? | In Prompt |
|------|----------|-------|---------|-----------|
| **HOT** | Last 8 messages verbatim | 8 messages | Per-agent | Always |
| **WARM** | Auto-compressed summaries (~120 tokens) | 50 entries | All agents | Last 5 |
| **COLD** | Crystallized patterns | 100 entries | All agents | Last 6 |

## How Compression Works

```
Message 1 ─┐
Message 2  │── When HOT exceeds 14 messages (HOT_LIMIT + COMPRESS_AT)
Message 3  │   oldest 6 are compressed into one WARM summary
Message 4  │
Message 5  │
Message 6 ─┘ → WARM: "User asked about API design. Agent proposed REST with pagination..."
Message 7 ─┐
...         │── These stay in HOT (always in context)
Message 14 ─┘
```

## Crystallization (COLD Memory)

Agents store reusable patterns by writing `CRYSTALLIZE: topic`:

```
CRYSTALLIZE: API rate limiting

→ COLD entry stored:
PATTERN: Use exponential backoff with jitter
APPLIES_WHEN: API returns 429 or connection timeout
ACTION: Retry with 2^n * (1 + random(0,1)) seconds delay, max 5 retries
```

## Memory Scoping

Three access levels for parent↔child memory:

| Scope | Access | Use Case |
|-------|--------|----------|
| **Global** | All agents in the hive | Default WARM/COLD — everyone learns |
| **Family** | Parent + its children only | Task-specific context that shouldn't pollute the hive |
| **Private** | Single agent only | Internal working memory |

```javascript
// Child shares a finding with its parent's family store
await shareMemoryWithParent(childId, parentId, "Found 3 critical vulnerabilities in deps")
```

## Memory in the System Prompt

The system prompt always includes:
- Last 5 WARM summaries
- Last 6 COLD patterns
- Scoped family/private memories (if applicable)

## Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `HOT_LIMIT` | 8 | Messages kept verbatim |
| `COMPRESS_AT` | 6 | Compress when HOT exceeds limit+6 |
| `MAX_WARM` | 50 | Max warm entries before auto-prune |
| `MAX_COLD` | 100 | Max cold entries before auto-prune |
| `WARM_IN_PROMPT` | 5 | Warm summaries injected into prompt |
| `COLD_IN_PROMPT` | 6 | Cold patterns injected into prompt |
