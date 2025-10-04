import * as THREE from 'three'
import { useMemo } from 'react'
import { useSimStore } from '../state/useSimStore'
import { latLonToVector3 } from '../lib/kinematics'

function CircleOverlay({ lat, lon, radiusKm, color, altitude=1.002 }:{ lat:number; lon:number; radiusKm:number; color:number; altitude?:number }){
  const segments = 256
  const pts = useMemo(()=>{
    const arr: THREE.Vector3[] = []
    const earthRadiusKm = 6371
    const angle = (radiusKm / earthRadiusKm) * 180/Math.PI // convert arc length to degrees approx.
    for(let i=0;i<=segments;i++){
      const theta = (i/segments) * Math.PI*2
      const dLat = angle * Math.cos(theta)
      const dLon = angle * Math.sin(theta)
      arr.push(latLonToVector3(lat + dLat, lon + dLon, altitude))
    }
    return arr
  }, [lat, lon, radiusKm, altitude])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={pts.length} array={new Float32Array(pts.flatMap(p => [p.x, p.y, p.z]))} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={1.5} />
    </line>
  )
}

export default function ImpactOverlays(){
  const { impactLat, impactLon, blastKm, seismicKm, tsunamiKm } = useSimStore()
  return (
    <group>
      <CircleOverlay lat={impactLat} lon={impactLon} radiusKm={blastKm} color={0xffb86c} />
      <CircleOverlay lat={impactLat} lon={impactLon} radiusKm={seismicKm} color={0xf8f8f2} altitude={1.003} />
      <CircleOverlay lat={impactLat} lon={impactLon} radiusKm={tsunamiKm} color={0x66e0ff} altitude={1.004} />
    </group>
  )
}