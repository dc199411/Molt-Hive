/**
 * Molt-Hive SoulEditor Component
 * View and edit agent soul files — identity, values, preferences,
 * learned behaviors, personality, and changelog.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { C, FM, labelStyle, chipStyle, cardStyle, inputStyle } from './styles.js'

const SECTION_ICONS = {
    'Core Identity': '🧬',
    'Values & Principles': '⚖️',
    'Preferences': '⚙️',
    'Learned Behaviors': '🧠',
    'Personality Notes': '💬',
    'Quirks & Style': '✨',
    'Relationships': '🤝',
    'Defining Memories': '📌',
    'Aspirations': '🎯',
    'Changelog': '📝',
}

function SoulSection({ title, content, onEdit, isEditing, editValue, onEditChange, onSave, onCancel }) {
    const icon = SECTION_ICONS[title] || '•'
    const isEmpty = !content || content.startsWith('(')

    return (
        <div style={{
            ...cardStyle,
            marginBottom: 8,
            padding: '10px 12px',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: isEditing ? 8 : (isEmpty ? 2 : 6),
            }}>
                <div style={{
                    fontFamily: FM, fontSize: 10, fontWeight: 600,
                    color: C.sky, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <span>{icon}</span> {title}
                </div>
                {!isEditing && title !== 'Changelog' && (
                    <button
                        onClick={onEdit}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontFamily: FM, fontSize: 9, color: C.textD,
                            padding: '2px 6px', borderRadius: 4,
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.target.style.color = C.sky}
                        onMouseLeave={e => e.target.style.color = C.textD}
                    >✎ edit</button>
                )}
            </div>

            {isEditing ? (
                <div>
                    <textarea
                        value={editValue}
                        onChange={e => onEditChange(e.target.value)}
                        style={{
                            ...inputStyle,
                            width: '100%',
                            minHeight: 60,
                            resize: 'vertical',
                            fontSize: 10,
                            lineHeight: 1.5,
                            boxSizing: 'border-box',
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <button
                            onClick={onSave}
                            style={{
                                flex: 1, padding: '4px 8px', borderRadius: 4,
                                background: `${C.green}22`, border: `1px solid ${C.green}44`,
                                color: C.green, fontFamily: FM, fontSize: 9,
                                fontWeight: 600, cursor: 'pointer',
                            }}
                        >Save</button>
                        <button
                            onClick={onCancel}
                            style={{
                                flex: 1, padding: '4px 8px', borderRadius: 4,
                                background: 'transparent', border: `1px solid ${C.border}`,
                                color: C.textD, fontFamily: FM, fontSize: 9,
                                fontWeight: 600, cursor: 'pointer',
                            }}
                        >Cancel</button>
                    </div>
                </div>
            ) : (
                <div style={{
                    fontFamily: FM, fontSize: 10, color: isEmpty ? C.textF : C.text,
                    lineHeight: 1.6, fontStyle: isEmpty ? 'italic' : 'normal',
                    whiteSpace: 'pre-wrap',
                }}>
                    {content || '(empty)'}
                </div>
            )}
        </div>
    )
}

export default function SoulEditor({ agentId, agentName, agentRole }) {
    const [soul, setSoul] = useState(null)
    const [sections, setSections] = useState([])
    const [editingSection, setEditingSection] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [status, setStatus] = useState('')

    // Load soul from the engine
    const loadSoul = useCallback(async () => {
        try {
            const { getSoul, createSoul } = await import('../engine/soul.js')
            let soulContent = getSoul(agentId)
            if (!soulContent && agentName) {
                soulContent = createSoul(agentId, { name: agentName, role: agentRole })
            }
            setSoul(soulContent)
            parseSections(soulContent)
        } catch (err) {
            setSoul(null)
            setSections([])
        }
    }, [agentId, agentName, agentRole])

    useEffect(() => { loadSoul() }, [loadSoul])

    function parseSections(content) {
        if (!content) { setSections([]); return }
        const parsed = []
        const regex = /## (.+)\n([\s\S]*?)(?=\n## |$)/g
        let match
        while ((match = regex.exec(content)) !== null) {
            parsed.push({ title: match[1].trim(), content: match[2].trim() })
        }
        setSections(parsed)
    }

    const handleEdit = (title, content) => {
        setEditingSection(title)
        setEditValue(content || '')
    }

    const handleSave = async () => {
        try {
            const { updateSoul } = await import('../engine/soul.js')
            const result = updateSoul(agentId, editingSection, editValue, 50)
            if (result.success) {
                setStatus('✅ Soul updated')
                setEditingSection(null)
                loadSoul()
            } else {
                setStatus(`🛡️ ${result.reason}`)
            }
        } catch (err) {
            setStatus(`⚠ Error: ${err.message}`)
        }
        setTimeout(() => setStatus(''), 3000)
    }

    if (!agentId) {
        return (
            <div style={{ padding: '14px 12px' }}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>SOUL</div>
                <div style={{ fontFamily: FM, fontSize: 11, color: C.textD, textAlign: 'center', padding: '20px 0' }}>
                    No agent selected.
                </div>
            </div>
        )
    }

    return (
        <div style={{ padding: '14px 12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>SOUL — {agentName || 'Agent'}</div>
            <div style={{
                fontFamily: FM, fontSize: 9, color: C.textD,
                marginBottom: 10, lineHeight: 1.5,
            }}>
                Self-evolving identity · {sections.length} sections
            </div>

            {status && (
                <div style={{
                    fontFamily: FM, fontSize: 9, color: status.startsWith('✅') ? C.green : C.amber,
                    marginBottom: 8, padding: '4px 8px',
                    background: status.startsWith('✅') ? `${C.green}10` : `${C.amber}10`,
                    borderRadius: 4,
                }}>{status}</div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {sections.map(({ title, content }) => (
                    <SoulSection
                        key={title}
                        title={title}
                        content={content}
                        onEdit={() => handleEdit(title, content)}
                        isEditing={editingSection === title}
                        editValue={editValue}
                        onEditChange={setEditValue}
                        onSave={handleSave}
                        onCancel={() => setEditingSection(null)}
                    />
                ))}
                {sections.length === 0 && (
                    <div style={{
                        fontFamily: FM, fontSize: 11, color: C.textD,
                        textAlign: 'center', padding: '20px 0',
                    }}>
                        No soul file yet.
                        <br />Soul is created when the agent first runs.
                    </div>
                )}
            </div>
        </div>
    )
}
