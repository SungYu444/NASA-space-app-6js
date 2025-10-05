import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import Globe from './scene/Globe'
import Effects from './scene/Effects'
import Asteroid from './scene/Asteroid'
import ImpactOverlays from './overlays/ImpactOverlays'
import ControlPanel from './ui/ControlPanel'
import ImpactMap from './ui/ImpactMap'
import { useSimStore } from './state/useSimStore'
import CameraRig from './scene/CameraRig'
import NasaPanel from './ui/nasaPanel'
import QuizMode from './modes/QuizMode'
import Starfield from './scene/Starfield'

export default function App() {
  const mode = useSimStore(s => s.mode)
  const showImpactMap = useSimStore(s => s.showImpactMap)
  const quizVisible = useSimStore(s => s.quizVisible)

  return (
    <div className="app-shell">
      <div className="canvas-wrap">
        <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} shadows>
          <color attach="background" args={['#05070a']} />
          <Suspense fallback={null}>
            <Starfield />
            <Globe />
            <Effects />
            <ImpactOverlays />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Layer */}
      <div className="ui-layer">
        <TopBar />
        <ControlPanel />
        <StatsPanel />
        <NasaPanel />
        <div className="footer-hint">Left-drag: rotate • Mouse wheel: zoom • Right-drag: pan</div>
      </div>

      {/* Overlays / Modals (render outside UI so they cover everything) */}
      {showImpactMap && <ImpactMap onClose={() => { }} />}
      {quizVisible && <QuizMode />}
    </div>
  )
}

function TopBar() {
  const mode = useSimStore(s => s.mode)
  const setMode = useSimStore(s => s.setMode)
  const showImpactMap = useSimStore(s => s.showImpactMap)
  const quizVisible = useSimStore(s => s.quizVisible)

  return (
    <div className="topbar">
      <span className="brand">
        {showImpactMap && <span style={{ color: '#ff6aa2', marginLeft: 8 }}>• IMPACT ANALYSIS</span>}
        {quizVisible && <span style={{ color: '#66e0ff', marginLeft: 8 }}>• QUIZ</span>}
      </span>
      <div className="mode-switch">
        {(['scenario', 'quiz'] as const).map(m => (
          <button
            key={m}
            className={'panel ' + (mode === m ? 'active' : '')}
            onClick={() => setMode(m)}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

function StatsPanel() {
  const { speed, size, density, eta, energyTNT, craterKm } = useSimStore(s => s.readouts)
  return (
    <div className="panel stat-panel">
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="badge">Live Stats</div>
        <div className="row"><span className="label">Speed</span><span className="value">{speed.toFixed(1)} km/s</span></div>
        <div className="row"><span className="label">Size</span><span className="value">{size.toFixed(1)} m</span></div>
        <div className="row"><span className="label">Density</span><span className="value">{density.toFixed(0)} kg/m³</span></div>
        <div className="row"><span className="label">ETA</span><span className="value">{eta.toFixed(1)} s</span></div>
        <div className="row"><span className="label">Energy</span><span className="value">{energyTNT.toFixed(2)} Mt TNT</span></div>
        <div className="row"><span className="label">Crater Size</span><span className="value">{craterKm.toFixed(2)} km</span></div>
        <div className="legend small">
          <span>Blast</span><span>Seismic</span><span>Tsunami</span>
        </div>
      </div>
    </div>
  )
}
