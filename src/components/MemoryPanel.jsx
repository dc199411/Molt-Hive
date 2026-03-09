/**
 * Molt-Hive MemoryPanel Component
 * Shows HOT context budget, WARM summaries, and COLD crystallized patterns.
 */

import React, { useState } from 'react'
import { C, FM, labelStyle, chipStyle, cardStyle } from './styles.js'

export default function MemoryPanel({ warmMemory, coldMemory, hotCount, hotLimit }) {
    const [tab, setTab] = useState('warm')
    const warmCount = warmMemory?.length || 0
    const coldCount = coldMemory?.length || 0

    // Context budget color
    const budgetRatio = hotCount / hotLimit
    const budgetColor = budgetRatio > 0.8 ? C.amber : budgetRatio > 0.6 ? C.amber : C.green

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            padding: '14px 12px',
        }}>
            {/* Context Budget */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>CONTEXT BUDGET</div>
                <div style={{
                    background: C.bg, borderRadius: 6, height: 8,
                    overflow: 'hidden', marginBottom: 6,
                }}>
                    <div style={{
                        height: '100%', borderRadius: 6,
                        background: budgetColor,
                        width: `${Math.min(100, budgetRatio * 100)}%`,
                        transition: 'width 0.3s, background 0.3s',
                    }} />
                </div>
                <div style={{
                    fontFamily: FM, fontSize: 10, color: budgetColor,
                }}>
                    HOT: {hotCount} / {hotLimit}
                </div>
                <div style={{
                    fontFamily: FM, fontSize: 9, color: C.textD, marginTop: 4,
                    lineHeight: 1.5,
                }}>
                    Context fixed forever. {warmCount} warm + {coldCount} crystals = ∞ knowledge.
                </div>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {['warm', 'crystals'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            flex: 1, padding: '6px 8px',
                            background: tab === t ? `${C.sky}15` : 'transparent',
                            border: `1px solid ${tab === t ? C.sky + '44' : C.border}`,
                            borderRadius: 6, cursor: 'pointer',
                            fontFamily: FM, fontSize: 10, fontWeight: 600,
                            color: tab === t ? C.sky : C.textD,
                            transition: 'all 0.15s',
                        }}
                    >
                        {t === 'warm' ? `Warm (${warmCount})` : `Crystals (${coldCount})`}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {tab === 'warm' && (
                    <div>
                        {warmMemory && warmMemory.length > 0 ? (
                            [...warmMemory].reverse().map((w, i) => (
                                <div key={i} style={{
                                    ...cardStyle,
                                    marginBottom: 8,
                                    padding: '10px 12px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{
                                            ...chipStyle,
                                            background: `${C.sky}15`,
                                            color: C.sky,
                                        }}>COMPRESSED</span>
                                        <span style={{
                                            fontFamily: FM, fontSize: 9, color: C.textD,
                                        }}>{w.msgCount || '?'} msgs → ~120 tokens</span>
                                    </div>
                                    <div style={{
                                        fontFamily: FM, fontSize: 11, color: C.text,
                                        lineHeight: 1.5,
                                    }}>{w.text}</div>
                                    {w.ts && (
                                        <div style={{
                                            fontFamily: FM, fontSize: 8, color: C.textF,
                                            marginTop: 6,
                                        }}>{new Date(w.ts).toLocaleString()}</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{
                                fontFamily: FM, fontSize: 11, color: C.textD,
                                textAlign: 'center', padding: '20px 0',
                            }}>
                                No compressed memories yet.
                                <br />Chat more — compression triggers automatically.
                            </div>
                        )}
                    </div>
                )}

                {tab === 'crystals' && (
                    <div>
                        {coldMemory && coldMemory.length > 0 ? (
                            [...coldMemory].reverse().map((c, i) => (
                                <div key={i} style={{
                                    ...cardStyle,
                                    marginBottom: 8,
                                    padding: '10px 12px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{
                                            ...chipStyle,
                                            background: `${C.purple}15`,
                                            color: C.purple,
                                        }}>{c.topic}</span>
                                        <span style={{
                                            fontFamily: FM, fontSize: 9, color: C.textD,
                                        }}>{c.hits || 0} hits</span>
                                    </div>
                                    <div style={{
                                        fontFamily: FM, fontSize: 11, color: C.text,
                                        lineHeight: 1.5,
                                    }}>{c.text}</div>
                                    {c.ts && (
                                        <div style={{
                                            fontFamily: FM, fontSize: 8, color: C.textF,
                                            marginTop: 6,
                                        }}>{new Date(c.ts).toLocaleString()}</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{
                                fontFamily: FM, fontSize: 11, color: C.textD,
                                textAlign: 'center', padding: '20px 0',
                            }}>
                                No crystallized patterns yet.
                                <br />Ask your agent to CRYSTALLIZE insights.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
