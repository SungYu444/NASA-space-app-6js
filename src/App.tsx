import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import Globe from './scene/Globe'
import Effects from './scene/Effects'
import Asteroid from './scene/Asteroid'
import ImpactOverlays from './overlays/ImpactOverlays'
import ControlPanel from './ui/ControlPanel'
import MitigationPanel from './ui/MitigationPanel'
import ImpactMap from './ui/ImpactMap'
import DefendMode from './modes/DefendMode'
import StoryMode from './modes/StoryMode'
import { useSimStore } from './state/useSimStore'
import CameraRig from './scene/CameraRig'

export default function App(){
  const mode = useSimStore(s=>s.mode)
  const running = useSimStore(s=>s.running)
  const showImpactMap = useSimStore(s=>s.showImpactMap)
  const setShowImpactMap = useSimStore(s=>s.setShowImpactMap)

  return (
    <div className="app-shell">
      <div className="canvas-wrap">
        <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} shadows>
          <color attach="background" args={['#05070a']} />
          <Suspense fallback={null}>
            <Globe />
            <Effects />
            
            {/* Optional while debugging: <Effects /> */}
            {mode !== 'story' && <Asteroid />}
            <ImpactOverlays />
          </Suspense>

        </Canvas>
      </div>

      {/* UI Layer */}
      <div className="ui-layer">
        <TopBar />
        <ControlPanel />
        <MitigationPanel />
        <StatsPanel />
        {mode==='defend' && <DefendMode />}
        {mode==='story' && <StoryMode />}
        <div className="footer-hint">Left-drag: rotate • Mouse wheel: zoom • Right-drag: pan</div>
      </div>

      {/* Impact Map Modal */}
      {showImpactMap && (
        <ImpactMap onClose={() => {}} />
      )}
    </div>
  )
}

function TopBar(){
  const mode = useSimStore(s=>s.mode)
  const setMode = useSimStore(s=>s.setMode)
  const reset = useSimStore(s=>s.reset)
  const running = useSimStore(s=>s.running)
  const toggleRun = useSimStore(s=>s.toggleRun)
  const showImpactMap = useSimStore(s=>s.showImpactMap)

  return (
    <div className="topbar">
      <div className="panel" style={{padding:'10px 14px'}}>
        <span className="brand">
          ASTEROID DEFENDER
          {showImpactMap && <span style={{color: '#ff6aa2', marginLeft: '8px'}}>• IMPACT ANALYSIS</span>}
        </span>
      </div>
      <div className="mode-switch">
        {(['scenario','defend','story'] as const).map(m => (
          <button key={m} className={"panel "+(mode===m?'active':'')} onClick={()=>setMode(m)}>{m.toUpperCase()}</button>
        ))}
      </div>
      <div className="right-box">
        <button 
          className="cta" 
          onClick={toggleRun}
          disabled={showImpactMap}
          style={{ opacity: showImpactMap ? 0.5 : 1 }}
        >
          {running? 'Pause' : 'Start'}
        </button>
        <button 
          className="cta" 
          onClick={reset}
          disabled={showImpactMap}
          style={{ opacity: showImpactMap ? 0.5 : 1 }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function StatsPanel(){
  const { speed, size, density, eta, energyTNT, craterKm } = useSimStore(s=>s.readouts)
  return (
    <div className="panel stat-panel">
      <div style={{display:'grid', gap:8}}>
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