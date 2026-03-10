/**
 * Molt-Hive Sidebar Component
 * Agent list with colored indicators and spawn button.
 */

import React from 'react'
import { C, FM, labelStyle } from './styles.js'

function AgentItem({ agent, isActive, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', cursor: 'pointer',
                borderLeft: isActive ? `3px solid ${agent.color}` : '3px solid transparent',
                background: isActive ? `${agent.color}0a` : 'transparent',
                borderRadius: '0 6px 6px 0',
                transition: 'all 0.15s',
                marginBottom: 2,
            }}
        >
            {/* Icon */}
            <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: `${agent.color}22`,
                border: `1.5px solid ${agent.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: agent.color, flexShrink: 0,
            }}>{agent.icon}</div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: FM, fontSize: 12, fontWeight: 600,
                    color: isActive ? agent.color : C.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{agent.name}</div>
                <div style={{
                    fontFamily: FM, fontSize: 9, color: C.textD,
                    marginTop: 2,
                }}>
                    {agent.role}·G{agent.generation || 1} — {agent.successRate || 50}% · {agent.runs || 0} runs
                </div>
            </div>
        </div>
    )
}

export default function Sidebar({ agents, activeAgentId, onSelectAgent, onSpawn, isOpen }) {
    if (!isOpen) return null

    return (
        <div className="mh-sidebar" style={{
            width: 220, background: C.surface,
            borderRight: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column',
            flexShrink: 0, overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                ...labelStyle, padding: '14px 14px 8px',
                fontSize: 9,
            }}>PARENT AGENTS</div>

            {/* Agent List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 4px' }}>
                {agents.map(agent => (
                    <AgentItem
                        key={agent.id}
                        agent={agent}
                        isActive={agent.id === activeAgentId}
                        onClick={() => onSelectAgent(agent.id)}
                    />
                ))}
            </div>

            {/* Spawn Button */}
            <div style={{ padding: 10 }}>
                <button
                    onClick={onSpawn}
                    style={{
                        width: '100%',
                        background: `${C.sky}12`,
                        border: `1px dashed ${C.sky}44`,
                        borderRadius: 8,
                        color: C.sky,
                        fontFamily: FM,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '10px 0',
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.target.style.background = `${C.sky}22`
                        e.target.style.borderColor = `${C.sky}88`
                    }}
                    onMouseLeave={e => {
                        e.target.style.background = `${C.sky}12`
                        e.target.style.borderColor = `${C.sky}44`
                    }}
                >+ SPAWN AGENT</button>
            </div>
        </div>
    )
}
