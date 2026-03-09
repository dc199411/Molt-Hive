/**
 * Molt-Hive LaunchScreen Component
 * 3-step onboarding: Name Hive → Connect LLM → First Agent
 * Designed for simplicity — any user should be through in 5 minutes.
 */

import React, { useState, useEffect } from 'react'
import { C, FM, FS, primaryButton, inputStyle, cardStyle, labelStyle } from './styles.js'
import { PROVIDERS, testConnection, getEnvKey } from '../llm.js'
import { AGENT_ROLES } from '../engine/agentManager.js'

export default function LaunchScreen({ onLaunch }) {
    const [step, setStep] = useState(1)
    const [hiveName, setHiveName] = useState('')
    const [selectedProvider, setSelectedProvider] = useState(null)
    const [selectedModel, setSelectedModel] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [testResult, setTestResult] = useState(null)
    const [testing, setTesting] = useState(false)
    const [agentName, setAgentName] = useState('')
    const [agentRole, setAgentRole] = useState('Generalist')

    // Auto-fill API key from env when provider changes
    useEffect(() => {
        if (selectedProvider) {
            const envKey = getEnvKey(selectedProvider.id)
            if (envKey) setApiKey(envKey)
            else setApiKey('')
            setSelectedModel(selectedProvider.models[0])
            setTestResult(null)
        }
    }, [selectedProvider])

    const handleTest = async () => {
        if (!selectedProvider) return
        setTesting(true)
        setTestResult(null)
        try {
            const result = await testConnection({
                provider: selectedProvider.id,
                apiKey,
                model: selectedModel,
            })
            setTestResult(result)
        } catch (e) {
            setTestResult({ ok: false, error: e.message })
        }
        setTesting(false)
    }

    const handleLaunch = () => {
        if (!hiveName || !selectedProvider || !agentName) return
        onLaunch({
            hiveName,
            provider: selectedProvider.id,
            model: selectedModel,
            apiKey,
            agentName,
            agentRole,
        })
    }

    const providerColors = {
        anthropic: '#d97706',
        openai: '#10b981',
        groq: '#f97316',
        mistral: '#6366f1',
        ollama: '#64748b',
    }

    // ─── Animated Logo ───
    const Logo = () => (
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
            <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.sky}22, ${C.purple}22)`,
                border: `2px solid ${C.sky}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontFamily: FM, fontWeight: 700, color: C.sky,
            }}>M</div>
            {[C.sky, C.green, C.purple].map((color, i) => (
                <div key={i} style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: 8, height: 8, borderRadius: '50%',
                    background: color, marginTop: -4, marginLeft: -4,
                    animation: `mh-orbit ${3 + i * 0.7}s linear infinite`,
                }} />
            ))}
        </div>
    )

    // ─── Step 1: Name the Hive ───
    if (step === 1) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.bg, flexDirection: 'column', padding: 24,
            }}>
                <Logo />
                <h1 style={{
                    fontFamily: FS, fontSize: 32, fontWeight: 400,
                    fontStyle: 'italic', color: C.text, marginBottom: 8,
                }}>Molt Hive</h1>
                <p style={{
                    fontFamily: FM, fontSize: 12, color: C.textD,
                    textAlign: 'center', maxWidth: 420, lineHeight: 1.6, marginBottom: 32,
                }}>
                    A self-evolving multi-agent system with infinite compressed memory.
                    Name your hive — this is the identity your agents will share.
                </p>
                <input
                    value={hiveName}
                    onChange={e => setHiveName(e.target.value)}
                    placeholder="e.g. Synapse, Atlas, Nexus, Forge…"
                    onKeyDown={e => e.key === 'Enter' && hiveName && setStep(2)}
                    autoFocus
                    style={{ ...inputStyle, maxWidth: 360, textAlign: 'center', marginBottom: 20 }}
                />
                <button
                    onClick={() => hiveName && setStep(2)}
                    disabled={!hiveName}
                    style={{
                        ...primaryButton,
                        opacity: hiveName ? 1 : 0.4,
                        padding: '12px 32px',
                    }}
                >CONNECT LLM →</button>
            </div>
        )
    }

    // ─── Step 2: Connect LLM ───
    if (step === 2) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.bg, flexDirection: 'column', padding: 24,
            }}>
                <div style={{ ...labelStyle, marginBottom: 16 }}>STEP 2 — CONNECT YOUR LLM</div>
                <h2 style={{
                    fontFamily: FS, fontSize: 24, color: C.text,
                    marginBottom: 24, fontStyle: 'italic',
                }}>Choose a provider</h2>

                {/* Provider Grid */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: 10, maxWidth: 400, width: '100%', marginBottom: 20,
                }}>
                    {PROVIDERS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedProvider(p)}
                            style={{
                                ...cardStyle,
                                cursor: 'pointer',
                                border: selectedProvider?.id === p.id
                                    ? `2px solid ${providerColors[p.id]}`
                                    : `1px solid ${C.border}`,
                                textAlign: 'center',
                                padding: '14px 12px',
                                transition: 'all 0.2s',
                                background: selectedProvider?.id === p.id ? `${providerColors[p.id]}15` : C.card,
                            }}
                        >
                            <div style={{
                                fontFamily: FM, fontSize: 13, fontWeight: 600,
                                color: providerColors[p.id],
                            }}>{p.name}</div>
                            {p.local && (
                                <div style={{
                                    fontFamily: FM, fontSize: 9, color: C.textD, marginTop: 4,
                                }}>offline · no key needed</div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Model + Key */}
                {selectedProvider && (
                    <div style={{ maxWidth: 400, width: '100%' }}>
                        <select
                            value={selectedModel}
                            onChange={e => setSelectedModel(e.target.value)}
                            style={{
                                ...inputStyle, marginBottom: 10,
                                appearance: 'auto', cursor: 'pointer',
                            }}
                        >
                            {selectedProvider.models.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>

                        {!selectedProvider.local && (
                            <input
                                type="password"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder={`${selectedProvider.name} API key`}
                                style={{ ...inputStyle, marginBottom: 12 }}
                            />
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={handleTest}
                                disabled={testing || (!selectedProvider.local && !apiKey)}
                                style={{
                                    ...primaryButton, flex: 1,
                                    opacity: testing || (!selectedProvider.local && !apiKey) ? 0.5 : 1,
                                    background: C.card, color: C.text,
                                    border: `1px solid ${C.border}`,
                                }}
                            >{testing ? 'Testing…' : 'Test Connection'}</button>

                            <button
                                onClick={() => setStep(3)}
                                disabled={!testResult?.ok && !selectedProvider.local}
                                style={{
                                    ...primaryButton, flex: 1,
                                    opacity: (testResult?.ok || selectedProvider.local) ? 1 : 0.4,
                                }}
                            >First Agent →</button>
                        </div>

                        {testResult && (
                            <div style={{
                                marginTop: 12, padding: '10px 14px',
                                borderRadius: 8,
                                background: testResult.ok ? `${C.green}15` : `${C.red}15`,
                                border: `1px solid ${testResult.ok ? C.green : C.red}33`,
                                fontFamily: FM, fontSize: 12,
                                color: testResult.ok ? C.green : C.red,
                            }}>
                                {testResult.ok
                                    ? `✓ Connected — ${testResult.latency}ms latency`
                                    : `✗ ${testResult.error}`}
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={() => setStep(1)}
                    style={{
                        ...labelStyle, marginTop: 20, cursor: 'pointer',
                        background: 'none', border: 'none', color: C.textD,
                    }}
                >← BACK</button>
            </div>
        )
    }

    // ─── Step 3: First Agent ───
    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: C.bg, flexDirection: 'column', padding: 24,
        }}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>STEP 3 — YOUR FIRST AGENT</div>
            <h2 style={{
                fontFamily: FS, fontSize: 24, color: C.text,
                marginBottom: 24, fontStyle: 'italic',
            }}>Name your first parent agent</h2>

            <input
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="e.g. Atlas, Forge, Scout…"
                autoFocus
                style={{ ...inputStyle, maxWidth: 360, textAlign: 'center', marginBottom: 20 }}
            />

            {/* Role Grid */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8, maxWidth: 360, width: '100%', marginBottom: 24,
            }}>
                {AGENT_ROLES.map(role => (
                    <button
                        key={role}
                        onClick={() => setAgentRole(role)}
                        style={{
                            ...cardStyle,
                            cursor: 'pointer',
                            padding: '10px 8px',
                            textAlign: 'center',
                            border: agentRole === role
                                ? `2px solid ${C.sky}`
                                : `1px solid ${C.border}`,
                            background: agentRole === role ? `${C.sky}15` : C.card,
                        }}
                    >
                        <div style={{
                            fontFamily: FM, fontSize: 11, fontWeight: 600,
                            color: agentRole === role ? C.sky : C.textD,
                        }}>{role}</div>
                    </button>
                ))}
            </div>

            <button
                onClick={handleLaunch}
                disabled={!agentName}
                style={{
                    ...primaryButton,
                    padding: '14px 36px',
                    fontSize: 14,
                    opacity: agentName ? 1 : 0.4,
                    animation: agentName ? 'mh-glow 2s ease infinite' : 'none',
                }}
            >LAUNCH {hiveName.toUpperCase()}</button>

            <button
                onClick={() => setStep(2)}
                style={{
                    ...labelStyle, marginTop: 20, cursor: 'pointer',
                    background: 'none', border: 'none', color: C.textD,
                }}
            >← BACK</button>
        </div>
    )
}
