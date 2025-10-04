import { useEffect, useState } from 'react'
import { useSimStore } from '../state/useSimStore'

const steps = [
  { title: 'Discovery', text: 'Impactor-2025 is detected on a potential Earth-crossing trajectory.', params: { size: 150, speed: 20, approachAngle: 30, density: 3000 } },
  { title: 'Projection', text: 'Initial models show a broad corridor of possible impact locations.', params: { size: 150, speed: 22, approachAngle: 35 } },
  { title: 'Strategy', text: 'We evaluate three deflection options: kinetic, gravity tractor, laser.', params: { } },
  { title: 'Execution', text: 'A kinetic nudge is applied with sufficient lead time to avoid impact.', params: { } },
  { title: 'Outcome', text: 'The object safely misses Earth. Public communication and education ensue.', params: { } }
]

export default function StoryMode(){
  const [i, setI] = useState(0)
  const setParam = useSimStore(s=>s.setParam)
  const reset = useSimStore(s=>s.reset)

  useEffect(()=>{
    const p = steps[i].params as Record<string, number>
    Object.entries(p).forEach(([k,v])=> setParam(k as any, v))
    reset()
  }, [i])

  return (
    <div className="panel" style={{position:'absolute', left:'50%', transform:'translateX(-50%)', top:72, padding:'14px', maxWidth:700}}>
      <div className="badge">Story Mode</div>
      <div style={{fontSize:18, fontWeight:800, marginTop:6}}>{steps[i].title}</div>
      <div style={{opacity:0.9, marginTop:6}}>{steps[i].text}</div>
      <div style={{display:'flex', gap:8, marginTop:10}}>
        <button className="cta" disabled={i===0} onClick={()=>setI(i-1)}>Back</button>
        <button className="cta" disabled={i===steps.length-1} onClick={()=>setI(i+1)}>Next</button>
      </div>
    </div>
  )
}