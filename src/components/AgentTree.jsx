/**
 * Molt-Hive AgentTree Component
 * Visual hierarchy tree showing parent→child agent relationships,
 * active tasks, and status indicators.
 */

import React, { useState, useEffect } from 'react'
import { C, FM, labelStyle, chipStyle, cardStyle } from './styles.js'

function stateColor(state) {
    switch (state) {
        case 'running': return C.green
        case 'pending': return C.amber
        case 'completed': return C.sky
        case 'failed': return C.red
        case 'cancelled': return C.textD
        default: return C.textD
    }
}

function stateIcon(state) {
    switch (state) {
        case 'running': return '⚡'
        case 'pending': return '⏳'
        case 'completed': return '✅'
        case 'failed': return '❌'
        case 'cancelled': return '⛔'
        default: return '•'
    }
}

function ChildNode({ child, depth = 1 }) {
    const [expanded, setExpanded] = useState(true)
    const indent = depth * 16

    return (
        <div style={{ marginLeft: indent }}>
            {/* Connector line */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 0', cursor: 'pointer',
            }} onClick={() => setExpanded(!expanded)}>
                <div style={{
                    width: 12, height: 1, background: C.border,
                }} />
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: stateColor(child.state),
                    boxShadow: child.state === 'running' ? `0 0 6px ${C.green}` : 'none',
                    flexShrink: 0,
                }} />
                <span style={{
                    fontFamily: FM, fontSize: 10, fontWeight: 600,
                    color: stateColor(child.state),
                }}>{child.name}</span>
                <span style={{
                    fontFamily: FM, fontSize: 8, color: C.textD,
                }}>({child.role})</span>
                <span style={{ fontSize: 10 }}>{stateIcon(child.state)}</span>
            </div>

            {expanded && (
                <div style={{ marginLeft: 18 }}>
                    <div style={{
                        fontFamily: FM, fontSize: 9, color: C.textD,
                        padding: '2px 0', lineHeight: 1.5,
                        borderLeft: `1px solid ${C.border}`,
                        paddingLeft: 8,
                    }}>
                        {child.task && <div>📋 {child.task.slice(0, 80)}{child.task.length > 80 ? '…' : ''}</div>}
                        {child.result?.summary && (
                            <div style={{ color: child.state === 'completed' ? C.green : C.red, marginTop: 2 }}>
                                → {child.result.summary.slice(0, 60)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function ParentNode({ agent, children, isActive, onSelectAgent }) {
    const [expanded, setExpanded] = useState(true)
    const activeChildren = children.filter(c => c.agent.state === 'running' || c.agent.state === 'pending').length
    const completedChildren = children.filter(c => c.agent.state === 'completed').length

    return (
        <div style={{
            ...cardStyle,
            marginBottom: 8,
            padding: '10px 12px',
            borderColor: isActive ? agent.color + '44' : C.border,
            background: isActive ? `${agent.color}08` : C.card,
        }}>
            {/* Parent header */}
            <div
                onClick={() => { setExpanded(!expanded); onSelectAgent(agent.id) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
                <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `${agent.color}22`,
                    border: `1.5px solid ${agent.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: agent.color, flexShrink: 0,
                }}>{agent.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: FM, fontSize: 11, fontWeight: 600,
                        color: agent.color,
                    }}>{agent.name}</div>
                    <div style={{
                        fontFamily: FM, fontSize: 8, color: C.textD,
                    }}>
                        {agent.role} · G{agent.generation || 1} · T{agent.trustLevel || 50}
                    </div>
                </div>
                {children.length > 0 && (
                    <div style={{
                        ...chipStyle,
                        background: activeChildren > 0 ? `${C.green}15` : `${C.sky}15`,
                        color: activeChildren > 0 ? C.green : C.sky,
                    }}>
                        {activeChildren > 0 ? `${activeChildren} active` : `${completedChildren} done`}
                    </div>
                )}
                <span style={{
                    fontFamily: FM, fontSize: 10, color: C.textD,
                    transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                    transition: 'transform 0.15s',
                }}>▶</span>
            </div>

            {/* Children */}
            {expanded && children.length > 0 && (
                <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                    {children.map(({ agent: child }) => (
                        <ChildNode key={child.id} child={child} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function AgentTree({ agents, activeAgentId, agentTree, onSelectAgent }) {
    if (!agentTree || agentTree.length === 0) {
        // Fallback: render flat list
        return (
            <div style={{ padding: '14px 12px', height: '100%', overflowY: 'auto' }}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>AGENT HIERARCHY</div>
                {agents.map(agent => (
                    <ParentNode
                        key={agent.id}
                        agent={agent}
                        children={[]}
                        isActive={agent.id === activeAgentId}
                        onSelectAgent={onSelectAgent}
                    />
                ))}
            </div>
        )
    }

    return (
        <div style={{ padding: '14px 12px', height: '100%', overflowY: 'auto' }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>AGENT HIERARCHY</div>
            <div style={{
                fontFamily: FM, fontSize: 9, color: C.textD,
                marginBottom: 12, lineHeight: 1.5,
            }}>
                {agentTree.length} parent{agentTree.length !== 1 ? 's' : ''} ·{' '}
                {agentTree.reduce((sum, t) => sum + t.children.length, 0)} children
            </div>
            {agentTree.map(({ agent, children }) => (
                <ParentNode
                    key={agent.id}
                    agent={agent}
                    children={children}
                    isActive={agent.id === activeAgentId}
                    onSelectAgent={onSelectAgent}
                />
            ))}
        </div>
    )
}
