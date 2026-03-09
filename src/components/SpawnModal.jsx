/**
 * Molt-Hive SpawnModal Component
 * Modal overlay for creating new parent agents.
 */

import React, { useState, useEffect, useRef } from 'react'
import { C, FM, primaryButton, inputStyle, cardStyle, labelStyle } from './styles.js'
import { AGENT_ROLES } from '../engine/agentManager.js'

export default function SpawnModal({ onSpawn, onClose }) {
    const [name, setName] = useState('')
    const [role, setRole] = useState('Generalist')
    const inputRef = useRef(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSubmit = () => {
        if (!name.trim()) return
        onSpawn({ name: name.trim(), role })
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit()
        if (e.key === 'Escape') onClose()
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000,
                animation: 'mh-fadein 0.2s ease',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: C.surface,
                    border: `1px solid ${C.borderB}`,
                    borderRadius: 16,
                    padding: 28,
                    width: 380,
                    maxWidth: '90vw',
                }}
            >
                <div style={{ ...labelStyle, marginBottom: 16 }}>SPAWN NEW AGENT</div>

                <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Agent name…"
                    style={{ ...inputStyle, marginBottom: 16, textAlign: 'center' }}
                />

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6, marginBottom: 20,
                }}>
                    {AGENT_ROLES.map(r => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            style={{
                                ...cardStyle,
                                cursor: 'pointer',
                                padding: '8px 6px',
                                textAlign: 'center',
                                border: role === r
                                    ? `2px solid ${C.sky}`
                                    : `1px solid ${C.border}`,
                                background: role === r ? `${C.sky}15` : C.card,
                            }}
                        >
                            <span style={{
                                fontFamily: FM, fontSize: 10, fontWeight: 600,
                                color: role === r ? C.sky : C.textD,
                            }}>{r}</span>
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        style={{
                            ...primaryButton, flex: 1,
                            opacity: name.trim() ? 1 : 0.4,
                        }}
                    >SPAWN AGENT</button>
                    <button
                        onClick={onClose}
                        style={{
                            ...primaryButton, flex: 0.5,
                            background: C.card, color: C.text,
                            border: `1px solid ${C.border}`,
                        }}
                    >CANCEL</button>
                </div>
            </div>
        </div>
    )
}
