/**
 * Molt-Hive NetworkPanel Component
 * SVG radial graph showing agents as nodes + signal feed.
 */

import React from 'react'
import { C, FM, labelStyle, chipStyle } from './styles.js'

export default function NetworkPanel({ agents, activeAgentId, signals, onSelectAgent }) {
    const size = 200
    const cx = size / 2
    const cy = size / 2
    const radius = 70

    // Calculate node positions radially
    const nodes = agents.map((agent, i) => {
        const angle = (i / Math.max(agents.length, 1)) * Math.PI * 2 - Math.PI / 2
        return {
            ...agent,
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
        }
    })

    const signalTypeColors = {
        pattern: C.purple,
        directive: C.sky,
        alert: C.red,
        molt: C.amber,
        general: C.textD,
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            padding: '14px 12px',
        }}>
            {/* Header */}
            <div style={{ ...labelStyle, marginBottom: 12 }}>
                HIVE NETWORK · {agents.length} PARENT{agents.length !== 1 ? 'S' : ''} · ONE BRAIN
            </div>

            {/* SVG Graph */}
            <div style={{
                background: C.bg, borderRadius: 12,
                border: `1px solid ${C.border}`,
                padding: 8, marginBottom: 12,
            }}>
                <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
                    {/* Connection Lines */}
                    {agents.length >= 2 && nodes.map((node, i) => (
                        nodes.slice(i + 1).map((other, j) => (
                            <line
                                key={`${i}-${j}`}
                                x1={node.x} y1={node.y}
                                x2={other.x} y2={other.y}
                                stroke={C.border}
                                strokeWidth={1}
                                strokeDasharray="4 4"
                            />
                        ))
                    ))}

                    {/* Central Hub (when 2+ agents) */}
                    {agents.length >= 2 && (
                        <>
                            {nodes.map((node, i) => (
                                <line
                                    key={`hub-${i}`}
                                    x1={cx} y1={cy}
                                    x2={node.x} y2={node.y}
                                    stroke={`${C.sky}33`}
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                />
                            ))}
                            <circle
                                cx={cx} cy={cy} r={12}
                                fill={`${C.sky}15`}
                                stroke={`${C.sky}44`}
                                strokeWidth={1.5}
                            />
                            <text
                                x={cx} y={cy + 4}
                                textAnchor="middle"
                                fill={C.sky}
                                fontSize={10}
                                fontFamily={FM}
                            >◈</text>
                        </>
                    )}

                    {/* Agent Nodes */}
                    {nodes.map((node, i) => {
                        const isActive = node.id === activeAgentId
                        return (
                            <g
                                key={node.id}
                                onClick={() => onSelectAgent(node.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Glow for active */}
                                {isActive && (
                                    <circle
                                        cx={node.x} cy={node.y} r={20}
                                        fill="none"
                                        stroke={node.color}
                                        strokeWidth={1.5}
                                        opacity={0.4}
                                    >
                                        <animate
                                            attributeName="r"
                                            values="18;22;18"
                                            dur="2s"
                                            repeatCount="indefinite"
                                        />
                                        <animate
                                            attributeName="opacity"
                                            values="0.4;0.15;0.4"
                                            dur="2s"
                                            repeatCount="indefinite"
                                        />
                                    </circle>
                                )}
                                <circle
                                    cx={node.x} cy={node.y} r={16}
                                    fill={`${node.color}22`}
                                    stroke={node.color}
                                    strokeWidth={isActive ? 2 : 1}
                                />
                                <text
                                    x={node.x} y={node.y + 4}
                                    textAnchor="middle"
                                    fill={node.color}
                                    fontSize={12}
                                    fontFamily={FM}
                                >{node.icon}</text>
                                <text
                                    x={node.x} y={node.y + 28}
                                    textAnchor="middle"
                                    fill={C.textD}
                                    fontSize={8}
                                    fontFamily={FM}
                                >{node.name}</text>
                            </g>
                        )
                    })}
                </svg>
            </div>

            {/* Signal Feed */}
            <div style={{ ...labelStyle, marginBottom: 8 }}>RECENT SIGNALS</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {signals && signals.length > 0 ? (
                    [...signals].reverse().slice(0, 15).map((sig, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 6,
                            marginBottom: 6, padding: '6px 8px',
                            background: C.card, borderRadius: 6,
                            border: `1px solid ${C.border}`,
                            animation: 'mh-fadein 0.3s ease',
                        }}>
                            <span style={{
                                ...chipStyle,
                                background: `${signalTypeColors[sig.type] || C.textD}15`,
                                color: signalTypeColors[sig.type] || C.textD,
                                flexShrink: 0,
                            }}>{sig.type}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontFamily: FM, fontSize: 9, color: C.textD,
                                }}>
                                    <span style={{ color: C.sky }}>{sig.from}</span>
                                    {' → '}
                                    <span style={{ color: C.green }}>{sig.to}</span>
                                </div>
                                <div style={{
                                    fontFamily: FM, fontSize: 10, color: C.text,
                                    marginTop: 2, lineHeight: 1.4,
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>{sig.message}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{
                        fontFamily: FM, fontSize: 11, color: C.textD,
                        textAlign: 'center', padding: '16px 0',
                    }}>
                        No signals yet.
                        <br />Agents signal via SIGNAL [Name]: [msg]
                    </div>
                )}
            </div>
        </div>
    )
}
