/**
 * Molt-Hive Storage Adapter
 * Unified async key-value interface using localStorage.
 * All keys prefixed with 'molthive:' to avoid collisions.
 * Auto-detects window.storage API (Claude artifacts compatibility).
 * Auto-prunes oldest WARM summaries when localStorage quota exceeded.
 */

const PREFIX = 'molthive:'

/**
 * Detect the best available storage backend.
 * Priority: window.storage (Claude artifacts) → localStorage
 */
function getBackend() {
  if (typeof window !== 'undefined' && window.storage) {
    return 'windowStorage'
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return 'localStorage'
  }
  return 'memory'
}

// In-memory fallback for environments without localStorage
const memoryStore = new Map()

/**
 * Raw read from backend
 */
function rawGet(key) {
  const backend = getBackend()
  const prefixedKey = PREFIX + key

  if (backend === 'windowStorage') {
    return window.storage.getItem(prefixedKey)
  }
  if (backend === 'localStorage') {
    return localStorage.getItem(prefixedKey)
  }
  return memoryStore.get(prefixedKey) || null
}

/**
 * Raw write to backend with quota error handling
 */
function rawSet(key, value) {
  const backend = getBackend()
  const prefixedKey = PREFIX + key

  if (backend === 'windowStorage') {
    window.storage.setItem(prefixedKey, value)
    return
  }
  if (backend === 'localStorage') {
    localStorage.setItem(prefixedKey, value)
    return
  }
  memoryStore.set(prefixedKey, value)
}

/**
 * Raw delete from backend
 */
function rawDel(key) {
  const backend = getBackend()
  const prefixedKey = PREFIX + key

  if (backend === 'windowStorage') {
    window.storage.removeItem(prefixedKey)
    return
  }
  if (backend === 'localStorage') {
    localStorage.removeItem(prefixedKey)
    return
  }
  memoryStore.delete(prefixedKey)
}

/**
 * Get all keys matching a prefix
 */
function rawKeys(prefix) {
  const backend = getBackend()
  const fullPrefix = PREFIX + (prefix || '')
  const results = []

  if (backend === 'windowStorage') {
    // window.storage may not support key enumeration — fallback gracefully
    try {
      const len = window.storage.length || 0
      for (let i = 0; i < len; i++) {
        const k = window.storage.key(i)
        if (k && k.startsWith(fullPrefix)) {
          results.push(k.slice(PREFIX.length))
        }
      }
    } catch {
      // Some implementations don't support enumeration
    }
    return results
  }

  if (backend === 'localStorage') {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(fullPrefix)) {
        results.push(k.slice(PREFIX.length))
      }
    }
    return results
  }

  // Memory fallback
  for (const k of memoryStore.keys()) {
    if (k.startsWith(fullPrefix)) {
      results.push(k.slice(PREFIX.length))
    }
  }
  return results
}

/**
 * Prune oldest WARM summaries to free storage space.
 * Keeps the 5 most recent summaries.
 */
async function pruneWarmMemory() {
  try {
    const warmRaw = rawGet('hive-warm')
    if (!warmRaw) return false

    const warm = JSON.parse(warmRaw)
    if (!Array.isArray(warm) || warm.length <= 5) return false

    // Keep only the 5 most recent
    const pruned = warm.slice(-5)
    rawSet('hive-warm', JSON.stringify(pruned))
    console.log(`[MoltHive Storage] Pruned WARM memory: ${warm.length} → ${pruned.length}`)
    return true
  } catch (e) {
    console.warn('[MoltHive Storage] Failed to prune WARM memory:', e)
    return false
  }
}

/**
 * The unified storage interface.
 * All methods are async for consistency and future compatibility.
 */
export const db = {
  /**
   * Get a value by key, returning defaultValue if not found or on error.
   * @param {string} key - Storage key (without prefix)
   * @param {*} defaultValue - Value to return if key not found
   * @returns {Promise<*>} Parsed value or defaultValue
   */
  async get(key, defaultValue = null) {
    try {
      const raw = rawGet(key)
      if (raw === null || raw === undefined) return defaultValue
      return JSON.parse(raw)
    } catch (e) {
      console.warn(`[MoltHive Storage] Error reading key "${key}":`, e)
      return defaultValue
    }
  },

  /**
   * Set a value by key. Handles quota errors by pruning WARM memory.
   * @param {string} key - Storage key (without prefix)
   * @param {*} value - Value to serialize and store
   */
  async set(key, value) {
    const serialized = JSON.stringify(value)

    try {
      rawSet(key, serialized)
    } catch (e) {
      // Likely quota exceeded — try pruning WARM memory and retry
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn('[MoltHive Storage] Quota exceeded, pruning WARM memory...')
        const pruned = await pruneWarmMemory()

        if (pruned) {
          try {
            rawSet(key, serialized)
            return
          } catch (retryErr) {
            console.error('[MoltHive Storage] Still over quota after prune:', retryErr)
          }
        }

        // Last resort: try to clear old chat histories
        try {
          const chatKeys = rawKeys('hive-chats')
          if (chatKeys.length > 0) {
            console.warn('[MoltHive Storage] Clearing oldest chat histories to free space...')
            rawDel(chatKeys[0])
            rawSet(key, serialized)
            return
          }
        } catch {
          // Give up gracefully
        }
      }
      console.error(`[MoltHive Storage] Failed to write key "${key}":`, e)
    }
  },

  /**
   * Delete a key.
   * @param {string} key - Storage key (without prefix)
   */
  async del(key) {
    try {
      rawDel(key)
    } catch (e) {
      console.warn(`[MoltHive Storage] Error deleting key "${key}":`, e)
    }
  },

  /**
   * Get all keys matching a prefix.
   * @param {string} prefix - Key prefix to match (without molthive: prefix)
   * @returns {Promise<string[]>} Array of matching keys
   */
  async keys(prefix = '') {
    try {
      return rawKeys(prefix)
    } catch (e) {
      console.warn(`[MoltHive Storage] Error listing keys with prefix "${prefix}":`, e)
      return []
    }
  },

  /**
   * Remove all molt-hive keys from storage.
   */
  async clearAll() {
    try {
      const allKeys = rawKeys('')
      for (const key of allKeys) {
        rawDel(key)
      }
      console.log(`[MoltHive Storage] Cleared ${allKeys.length} keys`)
    } catch (e) {
      console.error('[MoltHive Storage] Error during clearAll:', e)
    }
  }
}
