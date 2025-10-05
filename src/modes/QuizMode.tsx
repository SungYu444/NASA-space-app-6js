// src/modes/QuizMode.tsx
import { useState } from 'react'
import { useSimStore } from '../state/useSimStore'

type Q = { q: string; choices: string[]; answer: number }

const QUESTIONS: Q[] = [
    { q: 'What is the approximate radius of Earth?', choices: ['1,000 km', '6,371 km', '12,742 km', '25,000 km'], answer: 1 },
    { q: 'Which force primarily keeps satellites in orbit?', choices: ['Electromagnetic', 'Gravity', 'Strong nuclear', 'Friction'], answer: 1 },
    { q: 'Meteor vs. meteorite: which hits the ground?', choices: ['Meteor', 'Meteorite', 'Comet', 'Asteroid'], answer: 1 },
]

export default function QuizMode() {
    const closeQuiz = useSimStore(s => s.closeQuiz)
    const start = useSimStore(s => s.start)
    const [picked, setPicked] = useState<number[]>(Array(QUESTIONS.length).fill(-1))
    const [submitted, setSubmitted] = useState(false)
    const resumeFromQuiz = useSimStore(s => s.resumeFromQuiz)

    const correctCount = submitted
        ? picked.filter((p, i) => p === QUESTIONS[i].answer).length
        : 0

    return (
        <div
            style={{
                position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
                background: 'rgba(0,0,0,.55)', zIndex: 1000
            }}
        >
            <div className="panel" style={{ width: 560, padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 18 }}>Trivia Checkpoint</div>
                <div style={{ opacity: .8, marginBottom: 12 }}>
                    Answer the 3 questions below to resume the simulation.
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                    {QUESTIONS.map((q, qi) => (
                        <div key={qi} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 10 }}>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>{qi + 1}. {q.q}</div>
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
                                                setPicked(prev => {
                                                    const copy = [...prev]; copy[qi] = ci; return copy
                                                })
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
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
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
                                onClick={() => { resumeFromQuiz() }}   // <— single atomic update
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
