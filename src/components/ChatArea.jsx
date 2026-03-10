/**
 * Molt-Hive ChatArea Component (Agentic Version)
 * Messages, tool execution blocks, loop status, 3-mode toggle (CHAT/AUTO/FOREVER).
 */

import React, { useState, useRef, useEffect } from 'react'
import { C, FM, FS, chipStyle, inputStyle } from './styles.js'

// ─── Tool Execution Block ───
function ToolBlock({ msg }) {
    const [expanded, setExpanded] = useState(false)
    const isDone = msg.status === 'done'
    const isSuccess = isDone && msg.result?.success
    const statusColor = !isDone ? C.amber : isSuccess ? C.green : C.red
    const statusIcon = !isDone ? '⟳' : isSuccess ? '✓' : '✗'

    const formatResult = (result) => {
        if (!result) return 'No result'
        const data = result.result || result
        if (typeof data === 'string') return data
        if (data.stdout) return data.stdout + (data.stderr ? `\nSTDERR: ${data.stderr}` : '')
        if (data.content) return typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2)
        if (data.output) return data.output
        if (data.items) return data.items.map(i => `${i.type === 'directory' ? '📁' : '📄'} ${i.name}`).join('\n')
        if (data.results) return data.results.map((r, i) => `[${i + 1}] ${r.title}\n    ${r.snippet}`).join('\n\n')
        if (data.error) return `Error: ${data.error}`
        return JSON.stringify(data, null, 2)
    }

    return (
        <div style={{
            margin: '6px 0', borderRadius: 8,
            border: `1px solid ${statusColor}33`,
            background: `${statusColor}08`,
            animation: 'mh-fadein 0.2s ease', overflow: 'hidden',
        }}>
            <div
                onClick={() => isDone && setExpanded(!expanded)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', cursor: isDone ? 'pointer' : 'default',
                }}
            >
                <span style={{
                    fontFamily: FM, fontSize: 12, color: statusColor, fontWeight: 600,
                    animation: !isDone ? 'mh-pulse 1s ease infinite' : 'none',
                }}>{statusIcon}</span>
                <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 600, color: C.text }}>
                    TOOL: {msg.toolName}
                </span>
                <span style={{
                    fontFamily: FM, fontSize: 9, color: C.textD,
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{typeof msg.params === 'object' ? JSON.stringify(msg.params).slice(0, 80) : ''}</span>
                {isDone && <span style={{ fontFamily: FM, fontSize: 9, color: C.textD }}>{expanded ? '▾' : '▸'}</span>}
            </div>
            {expanded && isDone && (
                <div style={{ padding: '0 12px 10px', maxHeight: 300, overflowY: 'auto' }}>
                    <pre style={{
                        fontFamily: FM, fontSize: 10, color: C.textD,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        margin: 0, lineHeight: 1.5, background: C.bg, borderRadius: 6, padding: 10,
                    }}>{formatResult(msg.result)}</pre>
                </div>
            )}
        </div>
    )
}

// ─── Message Bubble ───
function MessageBubble({ msg, agent }) {
    const isUser = msg.role === 'user'
    const isSystem = msg.role === 'system'
    const isTool = msg.role === 'tool'
    if (isTool) return <ToolBlock msg={msg} />

    const avatarBg = isUser ? C.indigo : isSystem ? C.amber : (agent?.color || C.sky)
    const avatarText = isUser ? 'you' : isSystem ? '⚙' : (agent?.icon || '◈')
    const bubbleBg = isUser ? `${C.indigo}12` : isSystem ? `${C.amber}0a` : C.card
    const bubbleBorder = isUser ? `${C.indigo}22` : isSystem ? `${C.amber}22` : C.border

    return (
        <div style={{
            display: 'flex', gap: 10,
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            animation: 'mh-fadein 0.3s ease', marginBottom: 12,
            maxWidth: '85%', alignSelf: isUser ? 'flex-end' : 'flex-start',
        }}>
            <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `${avatarBg}22`, border: `1.5px solid ${avatarBg}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: avatarBg, fontFamily: FM, fontWeight: 600, flexShrink: 0,
            }}>{avatarText}</div>
            <div>
                {msg.role === 'assistant' && agent && (
                    <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 600, color: agent.color || C.sky, marginBottom: 4 }}>
                        {agent.name}
                    </div>
                )}
                <div className="mh-msg-bubble" style={{
                    background: bubbleBg, border: `1px solid ${bubbleBorder}`,
                    borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    padding: '10px 14px', fontFamily: isUser ? FM : FS,
                    fontSize: isUser ? 13 : 15, lineHeight: 1.6,
                    color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{msg.content}</div>
                {msg.tags && msg.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {msg.tags.map((tag, i) => {
                            const tagColors = { crystallized: C.purple, 'signal sent': C.green, compressed: C.sky, evolved: C.amber, 'task complete': C.green, stopped: C.red }
                            const color = tagColors[tag] || C.textD
                            return <span key={i} style={{ ...chipStyle, background: `${color}15`, color, border: `1px solid ${color}33` }}>{tag}</span>
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Thinking Indicator ───
function ThinkingIndicator({ agent, loopStatus }) {
    return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', animation: 'mh-fadein 0.3s ease', marginBottom: 12 }}>
            <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `${(agent?.color || C.sky)}22`, border: `1.5px solid ${(agent?.color || C.sky)}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: agent?.color || C.sky, fontFamily: FM,
            }}>{agent?.icon || '◈'}</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: agent?.color || C.sky,
                        animation: `mh-pulse 1s ease ${i * 0.2}s infinite`,
                    }} />
                ))}
                {loopStatus && (
                    <span style={{ fontFamily: FM, fontSize: 10, color: C.textD, marginLeft: 8 }}>
                        iteration {loopStatus.iteration} · {loopStatus.action}
                    </span>
                )}
            </div>
        </div>
    )
}

// ─── Mode Button ───
const MODE_CONFIG = {
    chat: { icon: '💬', label: 'CHAT', color: C.textD, desc: 'Single response, no tools' },
    auto: { icon: '🤖', label: 'AUTO', color: C.sky, desc: 'Up to 20 iterations' },
    forever: { icon: '♾️', label: 'FOREVER', color: C.amber, desc: 'Runs until stopped' },
}

// ─── Main ChatArea ───
export default function ChatArea({
    messages, agent, isBusy, onSend, onCancel,
    hotCount, hotLimit,
    agentMode, onCycleMode,
    loopStatus, serverOnline,
}) {
    const [input, setInput] = useState('')
    const messagesEndRef = useRef(null)
    const textareaRef = useRef(null)
    const mode = MODE_CONFIG[agentMode] || MODE_CONFIG.auto

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isBusy])

    const handleSend = () => {
        const text = input.trim()
        if (!text || isBusy) return
        onSend(text)
        setInput('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const handleInput = (e) => {
        setInput(e.target.value)
        const ta = e.target
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: C.bg }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
                {messages.map((msg, i) => <MessageBubble key={i} msg={msg} agent={agent} />)}
                {isBusy && <ThinkingIndicator agent={agent} loopStatus={loopStatus} />}
                <div ref={messagesEndRef} />
            </div>

            {/* Cancel/Stop bar */}
            {isBusy && (
                <div style={{
                    padding: '6px 16px', background: C.surface,
                    borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'center', gap: 10,
                }}>
                    <button onClick={onCancel} style={{
                        background: `${C.red}15`, border: `1px solid ${C.red}44`,
                        borderRadius: 6, color: C.red, fontFamily: FM, fontSize: 11, fontWeight: 600,
                        padding: '6px 20px', cursor: 'pointer', transition: 'all 0.2s',
                    }}>■ STOP</button>
                    {agentMode === 'forever' && loopStatus && (
                        <span style={{ fontFamily: FM, fontSize: 10, color: C.amber, alignSelf: 'center' }}>
                            ♾️ iteration {loopStatus.iteration} · {loopStatus.action}
                        </span>
                    )}
                </div>
            )}

            {/* Input Area */}
            <div className="mh-chat-footer" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                        className="mh-chat-input"
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={`${mode.icon} ${mode.label} — Message ${agent?.name || 'agent'}...`}
                        rows={2}
                        style={{
                            ...inputStyle, resize: 'none', minHeight: 40, maxHeight: 120,
                            borderColor: isBusy ? C.textF : (mode.color) + '44',
                            fontFamily: FM, fontSize: 13,
                        }}
                    />
                    <button
                        className="mh-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isBusy}
                        style={{
                            width: 38, height: 38, borderRadius: 8,
                            background: input.trim() && !isBusy ? `linear-gradient(135deg, ${agent?.color || C.sky}, ${C.teal})` : C.card,
                            border: 'none', color: input.trim() && !isBusy ? '#000' : C.textD,
                            fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.2s',
                        }}
                    >↑</button>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div style={{ fontFamily: FM, fontSize: 9, color: C.textF }}>
                        ↵ send · ctx {hotCount}/{hotLimit} · knowledge ∞
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {/* Server status */}
                        <div style={{
                            fontFamily: FM, fontSize: 9, color: serverOnline ? C.green : C.red,
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: serverOnline ? C.green : C.red }} />
                            {serverOnline ? 'tools' : 'no tools'}
                        </div>

                        {/* 3-Mode Toggle */}
                        <button
                            className="mh-mode-btn"
                            onClick={onCycleMode}
                            title={mode.desc}
                            style={{
                                fontFamily: FM, fontSize: 9, fontWeight: 600,
                                padding: '3px 10px', borderRadius: 4,
                                border: `1px solid ${mode.color}55`,
                                background: `${mode.color}15`, color: mode.color,
                                cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}
                        >
                            <span>{mode.icon}</span>
                            <span>{mode.label}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
