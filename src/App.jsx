/**
 * Molt-Hive — Root Application Shell (Agentic Version)
 * Wires the agent engine to the UI with full tool execution support.
 * 
 * Handles:
 * - State loading/persistence
 * - Agentic loop (plan → act → observe → repeat)
 * - Tool execution display
 * - Autonomous mode toggle
 * - Server health monitoring
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
import { checkServerHealth } from './engine/toolRunner.js'
import { runAgentLoop } from './engine/agentLoop.js'
import { parseCreateSkill, createSkill } from './engine/skills.js'

export default function App() {
    // ─── State ───
    const [launched, setLaunched] = useState(false)
    const [loading, setLoading] = useState(true)
    const [config, setConfig] = useState(null)
    const [agents, setAgents] = useState([])
    const [activeAgentId, setActiveAgentId] = useState(null)
    const [chatMessages, setChatMessages] = useState([])
    const [isBusy, setIsBusy] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [rightTab, setRightTab] = useState('memory')
    const [showSpawnModal, setShowSpawnModal] = useState(false)
    const [warmMemory, setWarmMemory] = useState([])
    const [coldMemory, setColdMemory] = useState([])
    const [signals, setSignals] = useState([])
    const [hotCount, setHotCount] = useState(0)
    const [serverOnline, setServerOnline] = useState(false)
    const [agentMode, setAgentMode] = useState('auto') // 'chat' | 'auto' | 'forever'
    const [loopStatus, setLoopStatus] = useState(null) // {iteration, action}
    const cancelRef = useRef(false)

    const activeAgent = agents.find(a => a.id === activeAgentId) || null

    // ─── Server health check ───
    useEffect(() => {
        async function checkServer() {
            const health = await checkServerHealth()
            setServerOnline(health.ok)
        }
        checkServer()
        const interval = setInterval(checkServer, 15000)
        return () => clearInterval(interval)
    }, [])

    // ─── Load persisted state ───
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

                    const chat = await getChatHistory(savedAgents[0].id)
                    setChatMessages(chat)

                    const mem = await getMemoryState()
                    setWarmMemory(mem.warm)
                    setColdMemory(mem.cold)

                    const sigs = await getSignals()
                    setSignals(sigs)

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

    // ─── Launch handler ───
    const handleLaunch = useCallback(async ({ hiveName, provider, model, apiKey, agentName, agentRole }) => {
        try {
            const newConfig = { hiveName, provider, model, apiKey }
            await saveHiveConfig(newConfig)

            const agent = createAgent({ name: agentName, role: agentRole, index: 0 })
            const agentsList = [agent]
            await db.set('hive-agents', agentsList)

            const initMsg = {
                role: 'system',
                content: `🧠 Welcome to ${hiveName}. Agent ${agentName} (${agentRole}) is online — Generation 1.
Memory: HOT (last ${HOT_LIMIT} messages) · WARM (auto-compressed) · COLD (crystallized patterns).
Tools: ${serverOnline ? '✅ Server online — full tool access' : '⚠ Tool server not detected. Start it with: npm run server'}
Write naturally. Give tasks. Your agent will research, plan, and execute autonomously.`,
                ts: new Date().toISOString(),
            }
            await db.set('hive-chats', { [agent.id]: [initMsg] })
            await db.set('hive-rawhist', { [agent.id]: [] })

            setConfig(newConfig)
            setAgents(agentsList)
            setActiveAgentId(agent.id)
            setChatMessages([initMsg])
            setHotCount(0)
            setLaunched(true)
        } catch (e) {
            console.error('[MoltHive] Launch failed:', e)
        }
    }, [serverOnline])

    // ─── Switch agent ───
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

    // ─── Spawn agent ───
    const handleSpawn = useCallback(async ({ name, role }) => {
        try {
            const { agent, agents: updatedAgents } = await spawnAgent({ name, role }, agents)
            setAgents(updatedAgents)
            setShowSpawnModal(false)
            setActiveAgentId(agent.id)
            const chat = await getChatHistory(agent.id)
            setChatMessages(chat)
            setHotCount(0)
            const mem = await getMemoryState()
            setWarmMemory(mem.warm)
            setColdMemory(mem.cold)
        } catch (e) {
            console.error('[MoltHive] Spawn failed:', e)
        }
    }, [agents])

    // ═══════════════════════════════════════════════════════════
    //  SEND MESSAGE — The Agentic Flow
    // ═══════════════════════════════════════════════════════════
    const handleSend = useCallback(async (text) => {
        if (!activeAgent || !config || isBusy) return
        setIsBusy(true)
        cancelRef.current = false

        const llmCfg = { provider: config.provider, apiKey: config.apiKey, model: config.model }

        // 1. Add user message immediately
        const userMsg = { role: 'user', content: text, ts: new Date().toISOString() }
        await appendChat(activeAgent.id, userMsg)
        await appendRawHistory(activeAgent.id, userMsg)
        setChatMessages(prev => [...prev, userMsg])

        // 2. Build conversation context (HOT messages)
        const rawHistory = await getRawHistory(activeAgent.id)
        const hotMsgs = getHotMessages(rawHistory)
        setHotCount(hotMsgs.length)

        try {
            // 3. Run the agentic loop
            await runAgentLoop({
                task: text,
                agent: activeAgent,
                allAgents: agents,
                llmCfg,
                conversationHistory: hotMsgs,
                maxIterations: agentMode === 'forever' ? 'forever' : agentMode === 'auto' ? 20 : 1,
                callbacks: {
                    onThinking: (iteration) => {
                        setLoopStatus({ iteration, action: 'thinking' })
                    },

                    onToolCall: (toolName, params) => {
                        setLoopStatus({ iteration: loopStatus?.iteration, action: `${toolName}` })
                        const toolMsg = {
                            role: 'tool',
                            toolName,
                            params,
                            status: 'running',
                            ts: new Date().toISOString(),
                        }
                        setChatMessages(prev => [...prev, toolMsg])
                    },

                    onToolResult: (toolName, result) => {
                        setChatMessages(prev => {
                            const updated = [...prev]
                            // Find the last tool message for this tool and update it
                            for (let i = updated.length - 1; i >= 0; i--) {
                                if (updated[i].role === 'tool' && updated[i].toolName === toolName && updated[i].status === 'running') {
                                    updated[i] = { ...updated[i], status: 'done', result }
                                    break
                                }
                            }
                            return updated
                        })
                    },

                    onMessage: async (text, tags) => {
                        const agentMsg = {
                            role: 'assistant',
                            content: text,
                            ts: new Date().toISOString(),
                            tags,
                        }
                        await appendChat(activeAgent.id, agentMsg)
                        await appendRawHistory(activeAgent.id, agentMsg)
                        setChatMessages(prev => [...prev, agentMsg])

                        // Handle CRYSTALLIZE/SIGNAL/CREATE_SKILL in message
                        if (text) {
                            const crystals = await runCrystallization(text, '', llmCfg, activeAgent.id)
                            const parsedSignals = parseSignals(text, activeAgent.id, activeAgent.name)
                            if (parsedSignals.length > 0) {
                                await broadcastSignals(parsedSignals)
                                setSignals(await getSignals())
                            }

                            // Handle CREATE_SKILL / LEARN_SKILL directives
                            const newSkill = parseCreateSkill(text)
                            if (newSkill) {
                                const created = await createSkill(newSkill.name, newSkill.description, newSkill.body)
                                if (created) {
                                    const skillMsg = {
                                        role: 'system',
                                        content: `🧠 Skill "${newSkill.name}" learned and saved to skills/${newSkill.name}/SKILL.md`,
                                        ts: new Date().toISOString(),
                                    }
                                    setChatMessages(prev => [...prev, skillMsg])
                                }
                            }
                        }
                    },

                    onComplete: async (summary) => {
                        setLoopStatus(null)
                        runCompressionCycle(activeAgent.id, llmCfg)
                            .then(async (r) => {
                                if (r.compressed) {
                                    const mem = await getMemoryState()
                                    setWarmMemory(mem.warm)
                                    setColdMemory(mem.cold)
                                }
                            })
                            .catch(e => console.warn('[MoltHive] Compression error:', e))
                    },

                    onCheckpoint: (checkpoint) => {
                        const cpMsg = {
                            role: 'system',
                            content: `📍 Checkpoint — iteration ${checkpoint.iteration}, ${checkpoint.toolCalls} tool calls, running ${checkpoint.elapsed}`,
                            ts: new Date().toISOString(),
                        }
                        setChatMessages(prev => [...prev, cpMsg])
                    },

                    onNeedsHuman: (question) => {
                        const humanMsg = {
                            role: 'system',
                            content: `🤚 Agent paused — needs your input:\n${question}`,
                            ts: new Date().toISOString(),
                        }
                        setChatMessages(prev => [...prev, humanMsg])
                    },

                    onError: (error) => {
                        const errorMsg = {
                            role: 'system',
                            content: `⚠ Error: ${error}`,
                            ts: new Date().toISOString(),
                        }
                        setChatMessages(prev => [...prev, errorMsg])
                    },

                    shouldContinue: () => !cancelRef.current,
                },
            })

            // Evolve agent after loop completes
            const evolved = evolveAgent(activeAgent, { success: true })
            const updatedAgents = await updateAgent(evolved, agents)
            setAgents(updatedAgents)

        } catch (error) {
            const errorMsg = {
                role: 'system',
                content: `⚠ Error: ${error.message}`,
                ts: new Date().toISOString(),
            }
            await appendChat(activeAgent.id, errorMsg)
            setChatMessages(prev => [...prev, errorMsg])

            const evolved = evolveAgent(activeAgent, { success: false })
            const updatedAgents = await updateAgent(evolved, agents)
            setAgents(updatedAgents)
        }

        // Refresh memory state
        const mem = await getMemoryState()
        setWarmMemory(mem.warm)
        setColdMemory(mem.cold)
        const updatedRaw = await getRawHistory(activeAgent.id)
        setHotCount(Math.min(updatedRaw.length, HOT_LIMIT))
        setLoopStatus(null)
        setIsBusy(false)
    }, [activeAgent, agents, config, isBusy, agentMode])

    // ─── Cancel loop ───
    const handleCancel = useCallback(() => {
        cancelRef.current = true
    }, [])

    // ─── Reset ───
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

    // ─── Loading ───
    if (loading) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.bg, fontFamily: FM, color: C.textD, fontSize: 12,
            }}>Loading Molt Hive…</div>
        )
    }

    return (
        <>
            <style>{ANIMATIONS_CSS}</style>
            {!launched ? (
                <LaunchScreen onLaunch={handleLaunch} />
            ) : (
                <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
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
                        serverOnline={serverOnline}
                        agentMode={agentMode}
                        loopStatus={loopStatus}
                    />

                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        <Sidebar
                            agents={agents}
                            activeAgentId={activeAgentId}
                            onSelectAgent={handleSelectAgent}
                            onSpawn={() => setShowSpawnModal(true)}
                            isOpen={sidebarOpen}
                        />

                        <ChatArea
                            messages={chatMessages}
                            agent={activeAgent}
                            isBusy={isBusy}
                            onSend={handleSend}
                            onCancel={handleCancel}
                            hotCount={hotCount}
                            hotLimit={HOT_LIMIT}
                            agentMode={agentMode}
                            onCycleMode={() => setAgentMode(m => m === 'chat' ? 'auto' : m === 'auto' ? 'forever' : 'chat')}
                            loopStatus={loopStatus}
                            serverOnline={serverOnline}
                        />

                        <div style={{
                            width: 280, background: C.surface,
                            borderLeft: `1px solid ${C.border}`,
                            display: 'flex', flexDirection: 'column', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
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
                                            borderBottom: rightTab === tab.id ? `2px solid ${C.sky}` : '2px solid transparent',
                                            color: rightTab === tab.id ? C.sky : C.textD,
                                            fontFamily: FM, fontSize: 11, fontWeight: 600,
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                    >{tab.label}</button>
                                ))}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                {rightTab === 'memory' ? (
                                    <MemoryPanel warmMemory={warmMemory} coldMemory={coldMemory} hotCount={hotCount} hotLimit={HOT_LIMIT} />
                                ) : (
                                    <NetworkPanel agents={agents} activeAgentId={activeAgentId} signals={signals} onSelectAgent={handleSelectAgent} />
                                )}
                            </div>
                        </div>
                    </div>

                    {showSpawnModal && (
                        <SpawnModal onSpawn={handleSpawn} onClose={() => setShowSpawnModal(false)} />
                    )}
                </div>
            )}
        </>
    )
}
