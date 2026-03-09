/**
 * Molt-Hive — Root Application Shell
 * Wires the agent engine (src/engine/) to the UI components (src/components/).
 * 
 * This is the orchestrator:
 * - Loads/persists all state from storage
 * - Routes messages through the engine (memory, signals, evolution)
 * - Manages active agent, hive config, and UI state
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ANIMATIONS_CSS, C, FM } from './components/styles.js'
import LaunchScreen from './components/LaunchScreen.jsx'
import TopBar from './components/TopBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChatArea from './components/ChatArea.jsx'
import MemoryPanel from './components/MemoryPanel.jsx'
import NetworkPanel from './components/NetworkPanel.jsx'
import SpawnModal from './components/SpawnModal.jsx'

import { db } from './storage.js'
import { llmCall } from './llm.js'
import {
    createAgent, spawnAgent, getAgents, updateAgent,
    getChatHistory, appendChat, appendRawHistory, getRawHistory,
    saveHiveConfig, getHiveConfig, resetHive,
} from './engine/agentManager.js'
import {
    HOT_LIMIT, getHotMessages, runCompressionCycle, runCrystallization,
    getMemoryState,
} from './engine/memory.js'
import { buildSystemPromptWithMemory } from './engine/systemPrompt.js'
import { parseSignals, broadcastSignals, getSignals } from './engine/signals.js'
import { evolveAgent } from './engine/evolution.js'

export default function App() {
    // ─── State ───
    const [launched, setLaunched] = useState(false)
    const [loading, setLoading] = useState(true)
    const [config, setConfig] = useState(null)       // {hiveName, provider, model, apiKey}
    const [agents, setAgents] = useState([])
    const [activeAgentId, setActiveAgentId] = useState(null)
    const [chatMessages, setChatMessages] = useState([])
    const [isBusy, setIsBusy] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [rightTab, setRightTab] = useState('memory')  // 'memory' | 'network'
    const [showSpawnModal, setShowSpawnModal] = useState(false)
    const [warmMemory, setWarmMemory] = useState([])
    const [coldMemory, setColdMemory] = useState([])
    const [signals, setSignals] = useState([])
    const [hotCount, setHotCount] = useState(0)

    const activeAgent = agents.find(a => a.id === activeAgentId) || null

    // ─── Load persisted state on mount ───
    useEffect(() => {
        async function load() {
            try {
                const savedConfig = await getHiveConfig()
                const savedAgents = await db.get('hive-agents', [])

                if (savedConfig && savedAgents.length > 0) {
                    setConfig(savedConfig)
                    setAgents(savedAgents)
                    setActiveAgentId(savedAgents[0].id)
                    setLaunched(true)

                    // Load chat for first agent
                    const chat = await getChatHistory(savedAgents[0].id)
                    setChatMessages(chat)

                    // Load memory state
                    const mem = await getMemoryState()
                    setWarmMemory(mem.warm)
                    setColdMemory(mem.cold)

                    // Load signals
                    const sigs = await getSignals()
                    setSignals(sigs)

                    // Calculate hot count
                    const raw = await getRawHistory(savedAgents[0].id)
                    setHotCount(Math.min(raw.length, HOT_LIMIT))
                }
            } catch (e) {
                console.error('[MoltHive] Failed to load state:', e)
            }
            setLoading(false)
        }
        load()
    }, [])

    // ─── Launch handler (from LaunchScreen) ───
    const handleLaunch = useCallback(async ({ hiveName, provider, model, apiKey, agentName, agentRole }) => {
        try {
            const newConfig = { hiveName, provider, model, apiKey }
            await saveHiveConfig(newConfig)

            const agent = createAgent({ name: agentName, role: agentRole, index: 0 })
            const agentsList = [agent]
            await db.set('hive-agents', agentsList)

            // Create initial chat message
            const initMsg = {
                role: 'system',
                content: `🧠 Welcome to ${hiveName}. Agent ${agentName} (${agentRole}) is online — Generation 1.
Memory: HOT (last ${HOT_LIMIT} messages) · WARM (auto-compressed) · COLD (crystallized patterns).
Write naturally. Your context never fills. Knowledge is infinite.`,
                ts: new Date().toISOString(),
            }
            const chats = { [agent.id]: [initMsg] }
            const rawHist = { [agent.id]: [] }
            await db.set('hive-chats', chats)
            await db.set('hive-rawhist', rawHist)

            setConfig(newConfig)
            setAgents(agentsList)
            setActiveAgentId(agent.id)
            setChatMessages([initMsg])
            setHotCount(0)
            setLaunched(true)
        } catch (e) {
            console.error('[MoltHive] Launch failed:', e)
        }
    }, [])

    // ─── Switch active agent ───
    const handleSelectAgent = useCallback(async (agentId) => {
        setActiveAgentId(agentId)
        try {
            const chat = await getChatHistory(agentId)
            setChatMessages(chat)
            const raw = await getRawHistory(agentId)
            setHotCount(Math.min(raw.length, HOT_LIMIT))
        } catch (e) {
            console.error('[MoltHive] Failed to switch agent:', e)
        }
    }, [])

    // ─── Spawn new agent ───
    const handleSpawn = useCallback(async ({ name, role }) => {
        try {
            const { agent, agents: updatedAgents } = await spawnAgent({ name, role }, agents)
            setAgents(updatedAgents)
            setShowSpawnModal(false)

            // Switch to new agent
            setActiveAgentId(agent.id)
            const chat = await getChatHistory(agent.id)
            setChatMessages(chat)
            setHotCount(0)

            // Refresh memory state (new agent inherits shared brain)
            const mem = await getMemoryState()
            setWarmMemory(mem.warm)
            setColdMemory(mem.cold)
        } catch (e) {
            console.error('[MoltHive] Spawn failed:', e)
        }
    }, [agents])

    // ─── Send message — the core flow ───
    const handleSend = useCallback(async (text) => {
        if (!activeAgent || !config || isBusy) return

        setIsBusy(true)
        const llmCfg = { provider: config.provider, apiKey: config.apiKey, model: config.model }

        try {
            // 1. Append user message to chat (immediate)
            const userMsg = {
                role: 'user',
                content: text,
                ts: new Date().toISOString(),
            }
            await appendChat(activeAgent.id, userMsg)
            await appendRawHistory(activeAgent.id, userMsg)
            setChatMessages(prev => [...prev, userMsg])

            // 2. Build HOT messages for LLM
            const rawHistory = await getRawHistory(activeAgent.id)
            const hotMsgs = getHotMessages(rawHistory)
            setHotCount(hotMsgs.length)

            // 3. Build system prompt with memory
            const systemPrompt = await buildSystemPromptWithMemory({
                agent: activeAgent,
                allAgents: agents,
                llmName: `${config.provider} / ${config.model}`,
            })

            // 4. Call LLM
            const reply = await llmCall({
                provider: config.provider,
                apiKey: config.apiKey,
                model: config.model,
                system: systemPrompt,
                messages: hotMsgs,
                maxTokens: 900,
            })

            // 5. Process reply
            const tags = []

            // 5a. Check for CRYSTALLIZE directives
            const crystals = await runCrystallization(reply, text, llmCfg, activeAgent.id)
            if (crystals.length > 0) {
                tags.push('crystallized')
            }

            // 5b. Check for SIGNAL directives
            const parsedSignals = parseSignals(reply, activeAgent.id, activeAgent.name)
            if (parsedSignals.length > 0) {
                await broadcastSignals(parsedSignals)
                tags.push('signal sent')
                const updatedSignals = await getSignals()
                setSignals(updatedSignals)
            }

            // 5c. Append agent reply to chat
            const agentMsg = {
                role: 'assistant',
                content: reply,
                ts: new Date().toISOString(),
                tags: tags.length > 0 ? tags : undefined,
            }
            await appendChat(activeAgent.id, agentMsg)
            await appendRawHistory(activeAgent.id, agentMsg)
            setChatMessages(prev => [...prev, agentMsg])

            // 5d. Run background compression (non-blocking)
            runCompressionCycle(activeAgent.id, llmCfg).then(async (result) => {
                if (result.compressed) {
                    const mem = await getMemoryState()
                    setWarmMemory(mem.warm)
                    setColdMemory(mem.cold)

                    // Add compressed tag to the last agent message in chat display
                    setChatMessages(prev => {
                        const updated = [...prev]
                        const lastAgent = [...updated].reverse().find(m => m.role === 'assistant')
                        if (lastAgent) {
                            lastAgent.tags = [...(lastAgent.tags || []), 'compressed']
                        }
                        return updated
                    })
                }
            }).catch(e => console.warn('[MoltHive] Background compression error:', e))

            // 5e. Evolve agent
            const evolved = evolveAgent(activeAgent, { success: true })
            const updatedAgents = await updateAgent(evolved, agents)
            setAgents(updatedAgents)

            // 5f. Refresh memory state
            const mem = await getMemoryState()
            setWarmMemory(mem.warm)
            setColdMemory(mem.cold)

            // Update hot count
            const updatedRaw = await getRawHistory(activeAgent.id)
            setHotCount(Math.min(updatedRaw.length, HOT_LIMIT))

        } catch (error) {
            // User-facing error message
            const errorMsg = {
                role: 'system',
                content: `⚠ Error: ${error.message}`,
                ts: new Date().toISOString(),
            }
            await appendChat(activeAgent.id, errorMsg)
            setChatMessages(prev => [...prev, errorMsg])

            // Evolve with failure
            const evolved = evolveAgent(activeAgent, { success: false })
            const updatedAgents = await updateAgent(evolved, agents)
            setAgents(updatedAgents)
        }

        setIsBusy(false)
    }, [activeAgent, agents, config, isBusy])

    // ─── Reset handler ───
    const handleReset = useCallback(async () => {
        if (!confirm('Reset entire Hive? All agents, memory, and history will be deleted.')) return
        await resetHive()
        setLaunched(false)
        setConfig(null)
        setAgents([])
        setActiveAgentId(null)
        setChatMessages([])
        setWarmMemory([])
        setColdMemory([])
        setSignals([])
        setHotCount(0)
    }, [])

    // ─── Loading state ───
    if (loading) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.bg, fontFamily: FM, color: C.textD, fontSize: 12,
            }}>
                Loading Molt Hive…
            </div>
        )
    }

    // ─── Inject animations ───
    return (
        <>
            <style>{ANIMATIONS_CSS}</style>

            {!launched ? (
                <LaunchScreen onLaunch={handleLaunch} />
            ) : (
                <div style={{
                    height: '100vh', display: 'flex', flexDirection: 'column',
                    background: C.bg, overflow: 'hidden',
                }}>
                    {/* Top Bar */}
                    <TopBar
                        hiveName={config?.hiveName || 'Hive'}
                        agent={activeAgent}
                        agents={agents}
                        warmCount={warmMemory.length}
                        coldCount={coldMemory.length}
                        hotCount={hotCount}
                        hotLimit={HOT_LIMIT}
                        provider={config?.provider}
                        model={config?.model}
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(p => !p)}
                        onReset={handleReset}
                    />

                    {/* Main Layout */}
                    <div style={{
                        flex: 1, display: 'flex', overflow: 'hidden',
                    }}>
                        {/* Sidebar */}
                        <Sidebar
                            agents={agents}
                            activeAgentId={activeAgentId}
                            onSelectAgent={handleSelectAgent}
                            onSpawn={() => setShowSpawnModal(true)}
                            isOpen={sidebarOpen}
                        />

                        {/* Chat */}
                        <ChatArea
                            messages={chatMessages}
                            agent={activeAgent}
                            isBusy={isBusy}
                            onSend={handleSend}
                            hotCount={hotCount}
                            hotLimit={HOT_LIMIT}
                        />

                        {/* Right Panel */}
                        <div style={{
                            width: 280, background: C.surface,
                            borderLeft: `1px solid ${C.border}`,
                            display: 'flex', flexDirection: 'column',
                            flexShrink: 0,
                        }}>
                            {/* Tab switcher */}
                            <div style={{
                                display: 'flex', borderBottom: `1px solid ${C.border}`,
                            }}>
                                {[
                                    { id: 'memory', label: '◈ Memory' },
                                    { id: 'network', label: '⊕ Network' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setRightTab(tab.id)}
                                        style={{
                                            flex: 1, padding: '10px 8px',
                                            background: rightTab === tab.id ? `${C.sky}0a` : 'transparent',
                                            border: 'none',
                                            borderBottom: rightTab === tab.id
                                                ? `2px solid ${C.sky}`
                                                : '2px solid transparent',
                                            color: rightTab === tab.id ? C.sky : C.textD,
                                            fontFamily: FM, fontSize: 11, fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >{tab.label}</button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                {rightTab === 'memory' ? (
                                    <MemoryPanel
                                        warmMemory={warmMemory}
                                        coldMemory={coldMemory}
                                        hotCount={hotCount}
                                        hotLimit={HOT_LIMIT}
                                    />
                                ) : (
                                    <NetworkPanel
                                        agents={agents}
                                        activeAgentId={activeAgentId}
                                        signals={signals}
                                        onSelectAgent={handleSelectAgent}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Spawn Modal */}
                    {showSpawnModal && (
                        <SpawnModal
                            onSpawn={handleSpawn}
                            onClose={() => setShowSpawnModal(false)}
                        />
                    )}
                </div>
            )}
        </>
    )
}
