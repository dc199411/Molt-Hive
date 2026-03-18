/**
 * Molt-Hive TaskPlanViewer Component
 * Shows active task plans with step-by-step progress tracking.
 * Reads plan files from storage and displays status of each step.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { C, FM, labelStyle, chipStyle, cardStyle } from './styles.js'

function stepStateStyle(status) {
    switch (status) {
        case 'completed': return { bg: `${C.green}12`, color: C.green, icon: '✓' }
        case 'running': return { bg: `${C.amber}12`, color: C.amber, icon: '⚡' }
        case 'failed': return { bg: `${C.red}12`, color: C.red, icon: '✗' }
        case 'skipped': return { bg: `${C.textD}12`, color: C.textD, icon: '—' }
        default: return { bg: `${C.sky}08`, color: C.textD, icon: '○' }
    }
}

function PlanCard({ plan }) {
    const [expanded, setExpanded] = useState(plan.status === 'in_progress' || plan.status === 'pending')
    const progress = plan.totalSteps > 0 ? Math.round((plan.currentStep / plan.totalSteps) * 100) : 0
    const progressColor = plan.status === 'completed' ? C.green :
        plan.status === 'in_progress' ? C.amber : C.sky

    return (
        <div style={{ ...cardStyle, marginBottom: 8, padding: '10px 12px' }}>
            {/* Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
                <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: `${progressColor}22`,
                    border: `1.5px solid ${progressColor}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: progressColor, flexShrink: 0, fontWeight: 700,
                }}>📋</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: FM, fontSize: 10, fontWeight: 600, color: C.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{plan.task?.slice(0, 40) || 'Unnamed Plan'}</div>
                    <div style={{ fontFamily: FM, fontSize: 8, color: C.textD }}>
                        {plan.agentName} · {plan.currentStep}/{plan.totalSteps} steps
                    </div>
                </div>

                <span style={{
                    ...chipStyle,
                    background: `${progressColor}15`,
                    color: progressColor,
                }}>{progress}%</span>
            </div>

            {/* Progress bar */}
            <div style={{
                background: C.bg, borderRadius: 3, height: 4,
                overflow: 'hidden', margin: '8px 0 4px',
            }}>
                <div style={{
                    height: '100%', borderRadius: 3,
                    background: `linear-gradient(90deg, ${progressColor}, ${progressColor}88)`,
                    width: `${progress}%`,
                    transition: 'width 0.3s',
                }} />
            </div>

            {/* Expanded details */}
            {expanded && (
                <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    <div style={{ fontFamily: FM, fontSize: 8, color: C.textD, marginBottom: 6 }}>
                        Created: {plan.createdAt ? new Date(plan.createdAt).toLocaleString() : 'Unknown'}
                        {plan.completedAt && ` · Completed: ${new Date(plan.completedAt).toLocaleString()}`}
                    </div>

                    {/* We show step numbers since we don't have step titles in the metadata */}
                    {Array.from({ length: plan.totalSteps || 0 }).map((_, i) => {
                        const stepStatus = i < plan.currentStep ? 'completed' :
                            i === plan.currentStep && plan.status === 'in_progress' ? 'running' : 'pending'
                        const style = stepStateStyle(stepStatus)

                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '3px 0',
                            }}>
                                <div style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: style.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 8, color: style.color, fontWeight: 700,
                                    flexShrink: 0,
                                }}>{style.icon}</div>
                                <span style={{
                                    fontFamily: FM, fontSize: 9,
                                    color: stepStatus === 'completed' ? C.green :
                                        stepStatus === 'running' ? C.amber : C.textD,
                                }}>
                                    Step {i + 1}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function TaskPlanViewer() {
    const [plans, setPlans] = useState([])
    const [filter, setFilter] = useState('all') // 'all', 'active', 'completed'

    const loadPlans = useCallback(async () => {
        try {
            const { listPlans } = await import('../engine/taskPlanner.js')
            const allPlans = await listPlans()
            setPlans(allPlans)
        } catch {
            setPlans([])
        }
    }, [])

    useEffect(() => {
        loadPlans()
        const interval = setInterval(loadPlans, 5000) // Refresh every 5s
        return () => clearInterval(interval)
    }, [loadPlans])

    const filtered = plans.filter(p => {
        if (filter === 'active') return p.status === 'in_progress' || p.status === 'pending'
        if (filter === 'completed') return p.status === 'completed'
        return true
    })

    const activePlans = plans.filter(p => p.status === 'in_progress' || p.status === 'pending').length

    return (
        <div style={{ padding: '14px 12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>TASK PLANS</div>
            <div style={{
                fontFamily: FM, fontSize: 9, color: C.textD,
                marginBottom: 10,
            }}>
                {plans.length} plan{plans.length !== 1 ? 's' : ''} · {activePlans} active
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {['all', 'active', 'completed'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            flex: 1, padding: '4px 6px',
                            background: filter === f ? `${C.sky}15` : 'transparent',
                            border: `1px solid ${filter === f ? C.sky + '44' : C.border}`,
                            borderRadius: 4, cursor: 'pointer',
                            fontFamily: FM, fontSize: 9, fontWeight: 600,
                            color: filter === f ? C.sky : C.textD,
                            textTransform: 'capitalize',
                        }}
                    >{f}</button>
                ))}
            </div>

            {/* Plans list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.length > 0 ? (
                    filtered.map(plan => <PlanCard key={plan.id} plan={plan} />)
                ) : (
                    <div style={{
                        fontFamily: FM, fontSize: 11, color: C.textD,
                        textAlign: 'center', padding: '20px 0',
                    }}>
                        {filter === 'all' ? 'No task plans yet.' : `No ${filter} plans.`}
                        <br />Plans are created when agents decompose tasks.
                    </div>
                )}
            </div>
        </div>
    )
}
