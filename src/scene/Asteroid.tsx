// src/scene/Asteroid.tsx
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Trail } from '@react-three/drei'
import { useRef } from 'react'
import { useSimStore } from '../state/useSimStore'
import { latLonToVector3, simplePathAtTime } from '../lib/kinematics'

export default function Asteroid(){
  // read sim state
  const time      = useSimStore(s=>s.time)
  const duration  = useSimStore(s=>s.duration)
  const speed     = useSimStore(s=>s.speed)
  const approach  = useSimStore(s=>s.approachAngle)
  const mitigation = useSimStore(s=>s.mitigation)
  const mitigationPower = useSimStore(s=>s.mitigationPower)
  const leadTime = useSimStore(s=>s.leadTime)
  const setImpactLatLon = useSimStore(s=>s.setImpactLatLon)

  // refs
  const groupRef = useRef<THREE.Group>(null!)
  const coreRef  = useRef<THREE.Mesh>(null!)
  const glowRef  = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  const { camera } = useThree()

  useFrame((_state, dt)=>{
    // Calculate impact point dynamically based on mitigation (like HTML version)
    const { impactLat, impactLon } = simplePathAtTime({
      time,
      duration,
      approachAngleDeg: approach,
      leadTime,
      mitigation,
      mitigationPower
    })
    
    // Update store with calculated impact point
    setImpactLatLon(impactLat, impactLon)

    // Build curve each frame with current impact point
    const tilt = (approach - 45) / 45
    const start = new THREE.Vector3(-3 + tilt*0.3, 1.5 + tilt*0.2, 2.5 - tilt*0.3)
    const end = latLonToVector3(impactLat, impactLon, 1.02)
    
    // Calculate midpoint and push it away from Earth center to create a proper arc
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const midDir = mid.clone().normalize()
    mid.add(midDir.multiplyScalar(0.8))  // Push outward away from Earth
    mid.add(new THREE.Vector3(0.5 + tilt*0.1, 0.3, -0.2))  // Additional offset
    
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)

    // normalized progress 0..1
    const t = Math.min(1, Math.max(0, time / duration))

    // position along the curve
    const pos = curve.getPoint(t)
    groupRef.current.position.copy(pos)

    // face forward along tangent
    const tan = curve.getTangent(t).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), tan)
    groupRef.current.quaternion.copy(q)

    // spin the rock
    if (coreRef.current){
      coreRef.current.rotation.x += dt*1.2
      coreRef.current.rotation.y += dt*0.8
    }

    // visual "heat" response → brighter near atmosphere (radius ~ 1.0)
    const r = pos.length()
    const heat = THREE.MathUtils.clamp(1 - (r - 1.0) / 0.5, 0, 1) // 0 far, 1 very hot
    const speedNorm = THREE.MathUtils.clamp((speed - 5) / 65, 0, 1)

    // glow shell grows + brightens with heat & speed
    const glowScale = 1 + THREE.MathUtils.lerp(0.05, 0.35, heat)
    if (glowRef.current){
      glowRef.current.scale.setScalar(glowScale)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = THREE.MathUtils.lerp(0.0, 0.9, heat * (0.6 + speedNorm*0.4))
    }

    // hot point light for bloom
    if (lightRef.current){
      lightRef.current.intensity = THREE.MathUtils.lerp(0.0, 10.0, heat)
      lightRef.current.distance  = THREE.MathUtils.lerp(0.0, 3.5, heat)
    }

    // subtle camera micro-shake near atmosphere
    const shake = heat > 0.6 ? (heat - 0.6) * 0.02 : 0
    if (shake > 0){
      camera.position.x += (Math.random()-0.5) * shake
      camera.position.y += (Math.random()-0.5) * shake
    }
  })

  return (
    <group ref={groupRef}>
      {/* Trail records the group's motion each frame and draws a streak */}
      <Trail width={0.12} length={9} color="#ffd9a6" attenuation={(t)=>t}>
        <group>
          {/* hot bloom light */}
          <pointLight ref={lightRef} color={'#ffb07a'} intensity={0} distance={0} />

          {/* rock core */}
          <mesh ref={coreRef} castShadow>
            <icosahedronGeometry args={[0.06, 1]} />
            <meshStandardMaterial color={'#c7c7c7'} roughness={0.85} metalness={0.15} />
          </mesh>

          {/* additive glow shell */}
          <mesh ref={glowRef}>
            <sphereGeometry args={[0.09, 32, 32]} />
            <meshBasicMaterial
              color={'#ff8a00'}
              transparent
              opacity={0.0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* hot sparks behind the head */}
          <Sparkles
            count={24}
            scale={[0.5,0.5,1.2]}
            size={2.2}
            speed={0.2}
            color={'#ffb07a'}
            opacity={0.8}
          />
        </group>
      </Trail>
    </group>
  )
}