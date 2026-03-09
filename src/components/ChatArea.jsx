/**
 * Molt-Hive ChatArea Component
 * Message view, input, typewriter effect, tag chips.
 * User messages right-aligned, agent messages left-aligned, system messages amber.
 */

import React, { useState, useRef, useEffect } from 'react'
import { C, FM, FS, chipStyle, inputStyle } from './styles.js'

// ─── Message Bubble ───
function MessageBubble({ msg, agent }) {
    const isUser = msg.role === 'user'
    const isSystem = msg.role === 'system'
    const isAgent = msg.role === 'assistant'

    const avatarBg = isUser ? C.indigo : isSystem ? C.amber : (agent?.color || C.sky)
    const avatarText = isUser ? 'you' : isSystem ? '⚙' : (agent?.icon || '◈')
    const bubbleBg = isUser ? `${C.indigo}12` : isSystem ? `${C.amber}0a` : C.card
    const bubbleBorder = isUser ? `${C.indigo}22` : isSystem ? `${C.amber}22` : C.border
    const font = isUser ? FM : FS
    const fontSize = isUser ? 13 : 15

    return (
        <div style={{
            display: 'flex', gap: 10,
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            animation: 'mh-fadein 0.3s ease',
            marginBottom: 12,
            maxWidth: '85%',
            alignSelf: isUser ? 'flex-end' : 'flex-start',
        }}>
            {/* Avatar */}
            <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `${avatarBg}22`,
                border: `1.5px solid ${avatarBg}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: avatarBg, fontFamily: FM,
                fontWeight: 600, flexShrink: 0,
            }}>{avatarText}</div>

            {/* Content */}
            <div>
                {/* Agent name label */}
                {isAgent && agent && (
                    <div style={{
                        fontFamily: FM, fontSize: 10, fontWeight: 600,
                        color: agent.color || C.sky, marginBottom: 4,
                    }}>{agent.name}</div>
                )}

                {/* Message text */}
                <div style={{
                    background: bubbleBg,
                    border: `1px solid ${bubbleBorder}`,
                    borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    padding: '10px 14px',
                    fontFamily: font,
                    fontSize,
                    lineHeight: 1.6,
                    color: C.text,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}>{msg.content}</div>

                {/* Tags */}
                {msg.tags && msg.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {msg.tags.map((tag, i) => {
                            const tagColors = {
                                crystallized: C.purple,
                                'signal sent': C.green,
                                compressed: C.sky,
                                evolved: C.amber,
                            }
                            const color = tagColors[tag] || C.textD
                            return (
                                <span key={i} style={{
                                    ...chipStyle,
                                    background: `${color}15`,
                                    color,
                                    border: `1px solid ${color}33`,
                                }}>{tag}</span>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Thinking Indicator ───
function ThinkingIndicator({ agent }) {
    return (
        <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            animation: 'mh-fadein 0.3s ease', marginBottom: 12,
        }}>
            <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `${(agent?.color || C.sky)}22`,
                border: `1.5px solid ${(agent?.color || C.sky)}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: agent?.color || C.sky, fontFamily: FM,
            }}>{agent?.icon || '◈'}</div>
            <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: agent?.color || C.sky,
                        animation: `mh-pulse 1s ease ${i * 0.2}s infinite`,
                    }} />
                ))}
            </div>
        </div>
    )
}

// ─── Main ChatArea ───
export default function ChatArea({ messages, agent, isBusy, onSend, hotCount, hotLimit }) {
    const [input, setInput] = useState('')
    const messagesEndRef = useRef(null)
    const textareaRef = useRef(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isBusy])

    const handleSend = () => {
        const text = input.trim()
        if (!text || isBusy) return
        onSend(text)
        setInput('')
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Auto-resize textarea
    const handleInput = (e) => {
        setInput(e.target.value)
        const ta = e.target
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            minWidth: 0, background: C.bg,
        }}>
            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '20px 24px',
                display: 'flex', flexDirection: 'column',
            }}>
                {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} agent={agent} />
                ))}
                {isBusy && <ThinkingIndicator agent={agent} />}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                background: C.surface,
                borderTop: `1px solid ${C.border}`,
                padding: '12px 16px',
            }}>
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-end',
                }}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${agent?.name || 'agent'}...`}
                        rows={2}
                        style={{
                            ...inputStyle,
                            resize: 'none',
                            minHeight: 40,
                            maxHeight: 120,
                            borderColor: isBusy ? C.textF : (agent?.color || C.sky) + '44',
                            fontFamily: FM,
                            fontSize: 13,
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isBusy}
                        style={{
                            width: 38, height: 38, borderRadius: 8,
                            background: input.trim() && !isBusy
                                ? `linear-gradient(135deg, ${agent?.color || C.sky}, ${C.teal})`
                                : C.card,
                            border: 'none',
                            color: input.trim() && !isBusy ? '#000' : C.textD,
                            fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                        }}
                    >↑</button>
                </div>

                <div style={{
                    fontFamily: FM, fontSize: 9, color: C.textF,
                    marginTop: 6, textAlign: 'center',
                }}>
                    ↵ send · memory auto-compresses · context fixed · knowledge ∞ · ctx {hotCount}/{hotLimit}
                </div>
            </div>
        </div>
    )
}
