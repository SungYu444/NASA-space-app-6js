// src/ui/ControlPanel.tsx
import { useEffect, useMemo } from 'react'
import { useSimStore } from '../state/useSimStore'

export default function ControlPanel() {
  const s = useSimStore()
  const { useNasaData, nasaAsteroidData } = useSimStore(s => ({
    useNasaData: s.useNasaData,
    nasaAsteroidData: s.nasaAsteroidData
  }))

  // --- rAF loop: advances time while running=true ---
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      useSimStore.getState().tick(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // handy derived label values
  const durationLabel = useMemo(() => s.duration.toFixed(0), [s.duration])
  const timeLabel = useMemo(() => s.time.toFixed(1), [s.time])

  // lock everything except Pause/Reset while running
  const locked = s.running
  const dim = locked ? 0.5 : 1

  return (
    <div className="panel control" style={{ width: 380 }}>
      {/* Preset picker + Hit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
        <select
          value={s.selectedPresetId}
          onChange={(e) => s.selectPreset(e.target.value)}
          disabled={locked}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,.06)',
            color: '#e7edf7',
            border: '1px solid rgba(255,255,255,.08)',
            opacity: dim
          }}
        >
          {s.presets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => s.hit()}
          disabled={locked}
          style={{ opacity: dim }}
        >
          Hit
        </button>
      </div>

      {/* Start/Pause + Reset — these stay enabled */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="btn"
          onClick={() => s.toggleRun()}
        // leave enabled so it can Pause while running
        >
          {s.running ? 'Pause' : 'Start'}
        </button>
        <button
          className="btn"
          onClick={() => s.reset()}
        // leave enabled to allow Reset while running
        >
          Reset
        </button>
      </div>

      {/* NASA Data Status */}
      {useNasaData && nasaAsteroidData && (
        <div style={{
          fontSize: '11px',
          color: 'rgba(102, 224, 255, 0.9)',
          marginBottom: '8px',
          textAlign: 'center',
          padding: '6px',
          background: 'rgba(102, 224, 255, 0.1)',
          borderRadius: '4px',
          border: '1px solid rgba(102, 224, 255, 0.3)'
        }}>
          🌌 Using NASA Data: {nasaAsteroidData.basicInfo.name}
        </div>
      )}

      {/* Impact Analysis Button */}
      <div style={{ marginBottom: 12 }}>
        <button
          className="cta"
          onClick={() => s.showImpactAnalysis()}
          disabled={locked}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'linear-gradient(180deg, rgba(102, 224, 255, 0.15), rgba(102, 224, 255, 0.05))',
            borderColor: '#66e0ff',
            fontSize: '14px',
            fontWeight: '600',
            opacity: dim
          }}
        >
          📊 Show Impact Analysis
        </button>
      </div>

      {/* Size */}
      <div className="row">
        <span className="label">Asteroid Size (m)</span>
        <span className="value">{s.size.toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={10}
        max={1000}
        step={1}
        value={s.size}
        onChange={e => s.setSize(+e.target.value)}
        disabled={locked}
        style={{ opacity: dim }}
      />

      {/* Speed */}
      <div className="row">
        <span className="label">Speed (km/s)</span>
        <span className="value">{s.speed.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={5}
        max={70}
        step={0.1}
        value={s.speed}
        onChange={e => s.setSpeed(+e.target.value)}
        disabled={locked}
        style={{ opacity: dim }}
      />

      {/* Approach Angle */}
      <div className="row">
        <span className="label">Approach Angle (°)</span>
        <span className="value">{s.approachAngle.toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={5}
        max={85}
        step={1}
        value={s.approachAngle}
        onChange={e => s.setApproachAngle(+e.target.value)}
        disabled={locked}
        style={{ opacity: dim }}
      />

      {/* Density */}
      <div className="row">
        <span className="label">Density (kg/m³)</span>
        <span className="value">{s.density.toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={500}
        max={7000}
        step={100}
        value={s.density}
        onChange={e => s.setDensity(+e.target.value)}
        disabled={locked}
        style={{ opacity: dim }}
      />

      {/* Time scrubber */}
      <div className="row">
        <span className="label">Time</span>
        <span className="value">{timeLabel} / {durationLabel}s</span>
      </div>
      <input
        type="range"
        min={0}
        max={s.duration}
        step={0.1}
        value={s.time}
        onChange={(e) => s.setTime(+e.target.value)}
        disabled={locked}
        style={{ opacity: dim }}
      />
    </div>
  )
}
