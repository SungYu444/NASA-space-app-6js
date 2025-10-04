import { useEffect, useRef, useState } from 'react'
import { useSimStore } from '../state/useSimStore'

export default function DefendMode(){
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const setParam = useSimStore(s=>s.setParam)
  const reset = useSimStore(s=>s.reset)
  const toggleRun = useSimStore(s=>s.toggleRun)

  useEffect(()=>{
    // spawn a random scenario every wave
    const spawn = ()=>{
      const rand = (a:number,b:number)=> a + Math.random()*(b-a)
      setParam('size', rand(50,600))
      setParam('speed', rand(12,45))
      setParam('approachAngle', rand(10,70))
      setParam('density', rand(1200,5000))
      setParam('leadTime', rand(5,40))
      reset(); toggleRun();
    }
    spawn()
    // every 20s, new wave
    const id = setInterval(()=>{ setWave(w=>w+1); spawn() }, 20000)
    return ()=> clearInterval(id)
  }, [])

  useEffect(()=>{
    const id = setInterval(()=> setScore(s=>s+5), 1000)
    return ()=> clearInterval(id)
  }, [])

  return (
    <div className="panel" style={{position:'absolute', left:'50%', transform:'translateX(-50%)', top:72, padding:'10px 14px'}}>
      <div className="badge">Defend Earth</div>
      <div style={{display:'flex', gap:16}}>
        <div>Wave: <b>{wave}</b></div>
        <div>Score: <b>{score}</b></div>
      </div>
      <div className="small" style={{marginTop:6}}>Pick mitigation and adjust Power/Lead time to avoid impact zones.</div>
    </div>
  )
}