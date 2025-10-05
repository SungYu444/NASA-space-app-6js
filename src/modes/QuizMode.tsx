// src/modes/QuizMode.tsx
import { useEffect, useMemo, useState } from 'react'
import { useSimStore } from '../state/useSimStore'
import { assessTsunami, buildTsunamiQuestion } from '../lib/tsunami'
import { assessPopulationDensity, estimateCasualties, buildCasualtyQuestion } from '../lib/casualty'

type Q = { q: string; choices: string[]; explanations: string[]; answer: number }

const STATIC_QUESTIONS: Q[] = [
    {
        q: 'What is the approximate radius of Earth?',
        choices: ['1,000 km', '6,371 km', '12,742 km', '25,000 km'],
        explanations: [
            'Too small — Earth’s radius is much larger.',
            'Correct — Earth’s mean radius is about 6,371 km.',
            'That’s close to the DIAMETER (~12,742 km), not the radius.',
            'Too large — even the diameter isn’t this big.'
        ],
        answer: 1
    }
]

export default function QuizMode() {
    const resumeFromQuiz = useSimStore(s => s.resumeFromQuiz)
    const { impactLat, impactLon, readouts } = useSimStore(s => ({
        impactLat: s.impactLat,
        impactLon: s.impactLon,
        readouts: s.readouts
    }))

    const [picked, setPicked] = useState<number[]>([])
    const [submitted, setSubmitted] = useState(false)

    // Dynamic questions
    const [tsunamiQ, setTsunamiQ] = useState<Q | null>(null)
    const [casualtyQ, setCasualtyQ] = useState<Q | null>(null)

    useEffect(() => {
        let alive = true
            ; (async () => {
                try {
                    // 1) Terrain/tsunami assessment
                    const tsu = await assessTsunami(impactLat, impactLon, readouts.energyTNT, readouts.craterKm)
                    if (!alive) return
                    setTsunamiQ(buildTsunamiQuestion(tsu))

                    // 2) Density → casualties
                    const dens = await assessPopulationDensity(impactLat, impactLon, tsu.terrain)
                    if (!alive) return

                    // blast radius proxy (your map logic used crater*2.5; keep consistent)
                    const craterKm = readouts.craterKm
                    const blastRadiusKm = craterKm * 2.5

                    const cas = estimateCasualties({
                        energyTNT: readouts.energyTNT,
                        craterKm,
                        blastRadiusKm,
                        densityPkm2: dens.densityPkm2,
                        tsunamiRisk: tsu.risk
                    })

                    // fill in density category used in explanation
                    cas.density = dens

                    if (!alive) return
                    setCasualtyQ(buildCasualtyQuestion(cas))
                } catch {
                    if (!alive) return
                    // Fallback, very generic
                    setTsunamiQ({
                        q: 'Based on the current impact location, what is the tsunami risk?',
                        choices: ['Unable to determine', 'LOW', 'MODERATE', 'HIGH'],
                        explanations: [
                            'Correct — necessary data was unavailable.',
                            'Assumes low risk without data.',
                            'Assumes moderate risk without data.',
                            'Assumes high risk without data.'
                        ],
                        answer: 0
                    })
                    setCasualtyQ({
                        q: 'Which factor most increases expected casualties?',
                        choices: ['Impact energy', 'Population density', 'Local terrain/elevation', 'All of the above'],
                        explanations: [
                            'Energy matters but not alone.',
                            'Density matters but not alone.',
                            'Terrain matters but not alone.',
                            'Correct — all contribute significantly.'
                        ],
                        answer: 3
                    })
                }
            })()
        return () => { alive = false }
    }, [impactLat, impactLon, readouts.energyTNT, readouts.craterKm])

    // Final 3-question set: 1 static + 2 dynamic
    const QUESTIONS: Q[] = useMemo(() => {
        const list: Q[] = []
        list.push(STATIC_QUESTIONS[0])
        list.push(
            tsunamiQ ?? {
                q: 'Calculating terrain-aware tsunami risk...',
                choices: ['…', '…', '…', '…'],
                explanations: ['Loading…', 'Loading…', 'Loading…', 'Loading…'],
                answer: 0
            }
        )
        list.push(
            casualtyQ ?? {
                q: 'Estimating population-aware casualties...',
                choices: ['…', '…', '…', '…'],
                explanations: ['Loading…', 'Loading…', 'Loading…', 'Loading…'],
                answer: 0
            }
        )
        return list
    }, [tsunamiQ, casualtyQ])

    useEffect(() => {
        setPicked(prev => prev.length === QUESTIONS.length ? prev : Array(QUESTIONS.length).fill(-1))
    }, [QUESTIONS.length])

    const correctCount = submitted
        ? picked.filter((p, i) => p === QUESTIONS[i].answer).length
        : 0

    return (
        <div
            style={{
                position: 'fixed', inset: 0,
                display: 'grid', placeItems: 'center',
                background: 'rgba(0,0,0,.55)', zIndex: 1000,
                padding: 16
            }}
        >
            <div
                className="panel"
                style={{
                    width: 'min(560px, 94vw)',
                    maxHeight: '85vh',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Trivia Checkpoint</div>
                    <div style={{ opacity: .8 }}>Answer the 3 questions below to resume the simulation.</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6, display: 'grid', gap: 12 }}>
                    {QUESTIONS.map((q, qi) => {
                        const userPick = picked[qi]
                        const isCorrect = submitted && userPick === q.answer
                        const showFeedback = submitted && q.explanations?.length === q.choices.length
                        return (
                            <div key={qi} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 10 }}>
                                <div style={{ marginBottom: 8, fontWeight: 600 }}>
                                    {qi + 1}. {q.q}
                                </div>

                                <div style={{ display: 'grid', gap: 6 }}>
                                    {q.choices.map((c, ci) => {
                                        const selected = picked[qi] === ci
                                        const correct = submitted && ci === q.answer
                                        const wrong = submitted && selected && ci !== q.answer
                                        return (
                                            <button
                                                key={ci}
                                                onClick={() => {
                                                    if (submitted) return
                                                    setPicked(prev => { const copy = [...prev]; copy[qi] = ci; return copy })
                                                }}
                                                style={{
                                                    textAlign: 'left',
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(255,255,255,.12)',
                                                    background: selected ? 'rgba(102,224,255,.12)' : 'rgba(255,255,255,.04)',
                                                    color: '#e7edf7',
                                                    outline: correct ? '2px solid #5cf28a' : wrong ? '2px solid #ff6a6a' : 'none',
                                                    cursor: submitted ? 'default' : 'pointer'
                                                }}
                                            >
                                                {c}
                                            </button>
                                        )
                                    })}
                                </div>

                                {showFeedback && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            background: isCorrect ? 'rgba(92, 242, 138, 0.08)' : 'rgba(255, 106, 106, 0.08)',
                                            border: `1px solid ${isCorrect ? 'rgba(92, 242, 138, 0.35)' : 'rgba(255, 106, 106, 0.35)'}`
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                            {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                                        </div>
                                        <div style={{ opacity: .95 }}>
                                            {q.explanations[q.answer]}
                                        </div>
                                        {!isCorrect && userPick >= 0 && (
                                            <div style={{ opacity: .7, marginTop: 6 }}>
                                                Your choice: “{q.choices[userPick]}”
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    {!submitted ? (
                        <button
                            className="btn"
                            onClick={() => setSubmitted(true)}
                            disabled={picked.includes(-1)}
                            style={{ opacity: picked.includes(-1) ? 0.6 : 1 }}
                        >
                            Submit
                        </button>
                    ) : (
                        <>
                            <div style={{ alignSelf: 'center', marginRight: 'auto', opacity: .9 }}>
                                Score: {correctCount} / {QUESTIONS.length}
                            </div>
                            <button
                                className="btn"
                                onClick={() => { setSubmitted(false); setPicked(Array(QUESTIONS.length).fill(-1)) }}
                            >
                                Retry
                            </button>
                            <button
                                className="btn"
                                onClick={() => { resumeFromQuiz() }}
                                style={{ outline: '2px solid #66e0ff' }}
                            >
                                Resume Impact
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
