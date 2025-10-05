import * as THREE from 'three'
import { useMemo } from 'react'
import { useSimStore } from '../state/useSimStore'
import { latLonToVector3 } from '../lib/kinematics'

function CircleOverlay({ 
  lat, 
  lon, 
  radiusKm, 
  color, 
  altitude = 1.002 
}: { 
  lat: number
  lon: number
  radiusKm: number
  color: number
  altitude?: number
}) {
  const segments = 256
  const size = useSimStore(s => s.size)

  const pts = useMemo(() => {
    // Safety check for valid inputs
    if (!isFinite(lat) || !isFinite(lon) || !isFinite(radiusKm) || !isFinite(altitude)) {
      return []
    }
    
    const arr: THREE.Vector3[] = []
    const earthRadiusKm = 6371
    
    // Hard cap the radius to prevent deformation
    const MAX_RADIUS_KM = 3000 // Maximum 3000km radius
    const cappedRadiusKm = Math.min(radiusKm, MAX_RADIUS_KM)
    
    const angle = (cappedRadiusKm / earthRadiusKm) * size / 15
    
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const dLat = angle * Math.cos(theta)
      const dLon = angle * Math.sin(theta)
      arr.push(latLonToVector3(lat + dLat, lon + dLon, altitude))
    }
    
    return arr
  }, [lat, lon, radiusKm, altitude])
  
  // Don't render if no valid points
  if (pts.length === 0) {
    return null
  }
  
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={pts.length} 
          array={new Float32Array(pts.flatMap(p => [p.x, p.y, p.z]))} 
          itemSize={3} 
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={1.5} />
    </line>
  )
}

export default function ImpactOverlays() {
  const { targetLat, targetLon, blastKm, seismicKm, tsunamiKm } = useSimStore(s => ({
    targetLat: s.targetLat ?? 40,
    targetLon: s.targetLon ?? -100,
    blastKm: s.blastKm ?? 0,
    seismicKm: s.seismicKm ?? 0,
    tsunamiKm: s.tsunamiKm ?? 0
  }))
  
  // Don't render if coordinates are invalid
  if (!isFinite(targetLat) || !isFinite(targetLon) || !isFinite(blastKm) || !isFinite(seismicKm) || !isFinite(tsunamiKm)) {
    return null
  }
  
  // Debug: Log when coordinates or sizes change
  console.log(`ImpactOverlays - target: ${targetLat.toFixed(2)}°N, ${targetLon.toFixed(2)}°E`)
  console.log(`ImpactOverlays - blast: ${blastKm.toFixed(0)}km, seismic: ${seismicKm.toFixed(0)}km, tsunami: ${tsunamiKm.toFixed(0)}km`)
  
  // Create a unique key based on target coordinates AND radius sizes to force re-render
  const targetKey = `${targetLat.toFixed(3)}_${targetLon.toFixed(3)}_${blastKm.toFixed(0)}_${seismicKm.toFixed(0)}_${tsunamiKm.toFixed(0)}`
  
  return (
    <group key={targetKey}>
      <CircleOverlay lat={targetLat} lon={targetLon} radiusKm={blastKm} color={0xffb86c} />
      <CircleOverlay lat={targetLat} lon={targetLon} radiusKm={seismicKm} color={0xf8f8f2} altitude={1.003} />
      <CircleOverlay lat={targetLat} lon={targetLon} radiusKm={tsunamiKm} color={0x66e0ff} altitude={1.004} />
    </group>
  )
}