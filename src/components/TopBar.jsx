/**
 * Molt-Hive TopBar Component
 * Status bar showing hive name, active agent, stats, LLM badge, and reset.
 */

import React from 'react'
import { C, FM, FS, labelStyle } from './styles.js'

export default function TopBar({
    hiveName, agent, agents, warmCount, coldCount,
    hotCount, hotLimit, provider, model,
    sidebarOpen, onToggleSidebar, onReset,
}) {
    return (
        <div style={{
            height: 44, background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 16, flexShrink: 0,
        }}>
            {/* Sidebar Toggle */}
            <button
                onClick={onToggleSidebar}
                style={{
                    background: 'none', border: 'none', color: C.textD,
                    cursor: 'pointer', fontSize: 18, padding: 4,
                }}
            >☰</button>

            {/* Hive Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: C.green,
                    animation: 'mh-pulse 2s ease infinite',
                }} />
                <span style={{
                    fontFamily: FS, fontStyle: 'italic',
                    fontSize: 15, color: C.text,
                }}>{hiveName}</span>
            </div>

            {/* Agent Info */}
            {agent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: C.textD, fontSize: 12 }}>·</span>
                    <span style={{
                        fontFamily: FM, fontSize: 13, fontWeight: 600,
                        color: agent.color || C.sky,
                    }}>{agent.name}</span>
                    <span style={{
                        fontFamily: FM, fontSize: 9, fontWeight: 600,
                        background: `${(agent.color || C.sky)}22`,
                        color: agent.color || C.sky,
                        padding: '2px 6px', borderRadius: 4,
                    }}>G{agent.generation || 1}</span>
                </div>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Stats */}
            <div style={{
                ...labelStyle, fontSize: 9,
                display: 'flex', gap: 12, color: C.textD,
            }}>
                <span>{agents?.length || 0} agents</span>
                <span>·</span>
                <span>{warmCount} warm</span>
                <span>·</span>
                <span>{coldCount} crystals</span>
                <span>·</span>
                <span>ctx {hotCount}/{hotLimit}</span>
            </div>

            {/* LLM Badge */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: FM, fontSize: 10, color: C.textD,
            }}>
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: C.green,
                    animation: 'mh-pulse 2s ease infinite',
                }} />
                <span>{provider} / {model?.split('-').slice(0, 2).join('-')}</span>
            </div>

            {/* Reset */}
            <button
                onClick={onReset}
                style={{
                    background: 'none', border: `1px solid ${C.red}33`,
                    color: C.red, fontFamily: FM, fontSize: 9,
                    padding: '3px 8px', borderRadius: 4,
                    cursor: 'pointer', opacity: 0.6,
                    transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.target.style.opacity = 1}
                onMouseLeave={e => e.target.style.opacity = 0.6}
            >reset</button>
        </div>
    )
}
