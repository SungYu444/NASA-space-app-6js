import * as THREE from 'three'
import { Mitigation } from '../state/useSimStore'

export function latLonToVector3(lat:number, lon:number, radius=1){
  const phi = (90 - lat) * (Math.PI/180)
  const theta = (lon + 180) * (Math.PI/180)
  const x = - (radius * Math.sin(phi) * Math.cos(theta))
  const z = (radius * Math.sin(phi) * Math.sin(theta))
  const y = (radius * Math.cos(phi))
  return new THREE.Vector3(x,y,z)
}

export function simplePathAtTime({ time, duration, approachAngleDeg, leadTime, mitigation, mitigationPower }:{
  time:number; duration:number; approachAngleDeg:number; leadTime:number; mitigation:Mitigation; mitigationPower:number;
}){
  // pick an arbitrary target (lat,lon) and apply mitigation-induced drift when active
  const baseLat = 40
  const baseLon = -100

  let driftLat = 0
  let driftLon = 0
  // If time < duration - leadTime → mitigation is applied early; amount scales with mitigationPower
  const apply = time > (duration - Math.max(1, leadTime))
  if(apply){
    const tNorm = (time - (duration - leadTime)) / Math.max(1, leadTime)
    const power = mitigationPower * tNorm
    if(mitigation==='kinetic') { driftLat += power * 5; driftLon += power * 8 }
    if(mitigation==='tractor') { driftLat += power * 3; driftLon += power * 3 }
    if(mitigation==='laser') { driftLat += power * 7; driftLon += power * 2 }
  }

  // Approach angle could bias latitude progression slightly over time
  const angleBias = (approachAngleDeg-45)/90
  const lat = baseLat + driftLat + angleBias * (time/duration) * 10
  const lon = baseLon + driftLon + (time/duration) * 20

  // ETA (very rough): proportion of remaining duration
  const eta = Math.max(0, duration - time)

  return { impactLat: lat, impactLon: lon, eta }
}