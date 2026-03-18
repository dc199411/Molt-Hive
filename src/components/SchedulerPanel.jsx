/**
 * Molt-Hive SchedulerPanel Component
 * Dashboard for creating, viewing, pausing, and cancelling
 * recurring scheduled agent tasks.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { C, FM, labelStyle, chipStyle, cardStyle, inputStyle } from './styles.js'

function stateChip(state) {
    switch (state) {
        case 'active': return { bg: `${C.green}15`, color: C.green, label: 'ACTIVE' }
        case 'paused': return { bg: `${C.amber}15`, color: C.amber, label: 'PAUSED' }
        case 'cancelled': return { bg: `${C.red}15`, color: C.red, label: 'CANCELLED' }
        default: return { bg: `${C.textD}15`, color: C.textD, label: state }
    }
}

function ScheduleCard({ schedule, onPause, onResume, onCancel }) {
    const chip = stateChip(schedule.state)

    return (
        <div style={{ ...cardStyle, marginBottom: 8, padding: '10px 12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>⏰</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: FM, fontSize: 10, fontWeight: 600, color: C.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{schedule.name || schedule.task?.slice(0, 30)}</div>
                </div>
                <span style={{ ...chipStyle, background: chip.bg, color: chip.color }}>
                    {chip.label}
                </span>
            </div>

            {/* Details */}
            <div style={{
                fontFamily: FM, fontSize: 9, color: C.textD,
                lineHeight: 1.6, marginBottom: 6,
            }}>
                <div>📋 {schedule.task}</div>
                <div>🕐 Cron: <span style={{ color: C.sky }}>{schedule.cron}</span></div>
                <div>🔄 Runs: {schedule.runCount || 0}</div>
                {schedule.lastRun && <div>Last: {new Date(schedule.lastRun).toLocaleString()}</div>}
                {schedule.nextRun && <div>Next: {new Date(schedule.nextRun).toLocaleString()}</div>}
            </div>

            {/* Actions */}
            {schedule.state !== 'cancelled' && (
                <div style={{ display: 'flex', gap: 4 }}>
                    {schedule.state === 'active' ? (
                        <button
                            onClick={() => onPause(schedule.id)}
                            style={{
                                flex: 1, padding: '4px 8px', borderRadius: 4,
                                background: `${C.amber}12`, border: `1px solid ${C.amber}33`,
                                color: C.amber, fontFamily: FM, fontSize: 9,
                                fontWeight: 600, cursor: 'pointer',
                            }}
                        >⏸ Pause</button>
                    ) : (
                        <button
                            onClick={() => onResume(schedule.id)}
                            style={{
                                flex: 1, padding: '4px 8px', borderRadius: 4,
                                background: `${C.green}12`, border: `1px solid ${C.green}33`,
                                color: C.green, fontFamily: FM, fontSize: 9,
                                fontWeight: 600, cursor: 'pointer',
                            }}
                        >▶ Resume</button>
                    )}
                    <button
                        onClick={() => onCancel(schedule.id)}
                        style={{
                            flex: 1, padding: '4px 8px', borderRadius: 4,
                            background: `${C.red}08`, border: `1px solid ${C.red}22`,
                            color: C.red, fontFamily: FM, fontSize: 9,
                            fontWeight: 600, cursor: 'pointer',
                        }}
                    >✕ Cancel</button>
                </div>
            )}
        </div>
    )
}

export default function SchedulerPanel({ activeAgentId }) {
    const [schedules, setSchedules] = useState([])
    const [showCreate, setShowCreate] = useState(false)
    const [newCron, setNewCron] = useState('0 9 * * *')
    const [newTask, setNewTask] = useState('')
    const [status, setStatus] = useState('')

    const loadSchedules = useCallback(async () => {
        try {
            const { listScheduledTasks } = await import('../engine/scheduler.js')
            const tasks = await listScheduledTasks()
            setSchedules(tasks)
        } catch {
            setSchedules([])
        }
    }, [])

    useEffect(() => {
        loadSchedules()
        const interval = setInterval(loadSchedules, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [loadSchedules])

    const handleCreate = async () => {
        if (!newCron || !newTask || !activeAgentId) return
        try {
            const { scheduleTask } = await import('../engine/scheduler.js')
            await scheduleTask(activeAgentId, newCron, newTask)
            setStatus('✅ Scheduled')
            setNewCron('0 9 * * *')
            setNewTask('')
            setShowCreate(false)
            loadSchedules()
        } catch (err) {
            setStatus(`⚠ ${err.message}`)
        }
        setTimeout(() => setStatus(''), 3000)
    }

    const handlePause = async (taskId) => {
        try {
            const { pauseScheduledTask } = await import('../engine/scheduler.js')
            await pauseScheduledTask(taskId)
            loadSchedules()
        } catch { }
    }

    const handleResume = async (taskId) => {
        try {
            const { resumeScheduledTask } = await import('../engine/scheduler.js')
            await resumeScheduledTask(taskId)
            loadSchedules()
        } catch { }
    }

    const handleCancel = async (taskId) => {
        try {
            const { cancelScheduledTask } = await import('../engine/scheduler.js')
            await cancelScheduledTask(taskId)
            loadSchedules()
        } catch { }
    }

    const activeCount = schedules.filter(s => s.state === 'active').length

    return (
        <div style={{ padding: '14px 12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>SCHEDULER</div>
            <div style={{
                fontFamily: FM, fontSize: 9, color: C.textD,
                marginBottom: 8,
            }}>
                {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} · {activeCount} active
            </div>

            {status && (
                <div style={{
                    fontFamily: FM, fontSize: 9,
                    color: status.startsWith('✅') ? C.green : C.amber,
                    marginBottom: 8, padding: '4px 8px',
                    background: status.startsWith('✅') ? `${C.green}10` : `${C.amber}10`,
                    borderRadius: 4,
                }}>{status}</div>
            )}

            {/* Create button / form */}
            {showCreate ? (
                <div style={{ ...cardStyle, marginBottom: 10, padding: '10px 12px' }}>
                    <div style={{ ...labelStyle, fontSize: 8, marginBottom: 6 }}>NEW SCHEDULE</div>
                    <input
                        value={newCron}
                        onChange={e => setNewCron(e.target.value)}
                        placeholder="Cron: 0 9 * * 1-5"
                        style={{ ...inputStyle, fontSize: 10, padding: '6px 10px', marginBottom: 6 }}
                    />
                    <input
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                        placeholder="Task description..."
                        style={{ ...inputStyle, fontSize: 10, padding: '6px 10px', marginBottom: 6 }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button
                            onClick={handleCreate}
                            style={{
                                flex: 1, padding: '5px 8px', borderRadius: 4,
                                background: `${C.green}22`, border: `1px solid ${C.green}44`,
                                color: C.green, fontFamily: FM, fontSize: 9,
                                fontWeight: 600, cursor: 'pointer',
                            }}
                        >+ Create</button>
                        <button
                            onClick={() => setShowCreate(false)}
                            style={{
                                flex: 1, padding: '5px 8px', borderRadius: 4,
                                background: 'transparent', border: `1px solid ${C.border}`,
                                color: C.textD, fontFamily: FM, fontSize: 9,
                                fontWeight: 600, cursor: 'pointer',
                            }}
                        >Cancel</button>
                    </div>

                    {/* Cron helper */}
                    <div style={{
                        fontFamily: FM, fontSize: 8, color: C.textF,
                        marginTop: 6, lineHeight: 1.6,
                    }}>
                        Examples:<br />
                        <span style={{ color: C.textD }}>*/5 * * * *</span> — every 5 min<br />
                        <span style={{ color: C.textD }}>0 9 * * 1-5</span> — weekdays 9am<br />
                        <span style={{ color: C.textD }}>0 */2 * * *</span> — every 2 hours
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowCreate(true)}
                    style={{
                        width: '100%', marginBottom: 10,
                        background: `${C.sky}08`, border: `1px dashed ${C.sky}33`,
                        borderRadius: 6, padding: '8px 0',
                        color: C.sky, fontFamily: FM, fontSize: 10,
                        fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.target.style.background = `${C.sky}18`; e.target.style.borderColor = `${C.sky}66` }}
                    onMouseLeave={e => { e.target.style.background = `${C.sky}08`; e.target.style.borderColor = `${C.sky}33` }}
                >+ NEW SCHEDULE</button>
            )}

            {/* Schedule list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {schedules.filter(s => s.state !== 'cancelled').length > 0 ? (
                    schedules
                        .filter(s => s.state !== 'cancelled')
                        .map(s => (
                            <ScheduleCard
                                key={s.id}
                                schedule={s}
                                onPause={handlePause}
                                onResume={handleResume}
                                onCancel={handleCancel}
                            />
                        ))
                ) : (
                    <div style={{
                        fontFamily: FM, fontSize: 11, color: C.textD,
                        textAlign: 'center', padding: '20px 0',
                    }}>
                        No scheduled tasks yet.
                        <br />Create one above or let agents use SCHEDULE directives.
                    </div>
                )}
            </div>
        </div>
    )
}
