// src/scene/Asteroid.tsx
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Trail } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useSimStore } from '../state/useSimStore'
import { latLonToVector3 } from '../lib/kinematics'

export default function Asteroid(){
  // read sim state
  const time      = useSimStore(s=>s.time)
  const duration  = useSimStore(s=>s.duration)
  const speed     = useSimStore(s=>s.speed)          // not used for physics, but we’ll map to visuals
  const approach  = useSimStore(s=>s.approachAngle)  // degrees, affects path bend slightly
  const impactLat = useSimStore(s=>s.impactLat)
  const impactLon = useSimStore(s=>s.impactLon)

  // refs
  const groupRef = useRef<THREE.Group>(null!)
  const coreRef  = useRef<THREE.Mesh>(null!)
  const glowRef  = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  const { camera } = useThree()

  // Build a smooth curve from "space" → near impact
  const curve = useMemo(()=>{
    // start: far away, direction influenced by approach angle
    // convert approach angle (0..90) into a slight tilt on X/Y
    const tilt = (approach - 45) / 45 // [-1..+1]
    const start = new THREE.Vector3(-6 + tilt*0.6, 2 + tilt*0.4, 4 - tilt*0.5)

    // end: just above the planet surface at impact point (radius ~1.02)
    const end = latLonToVector3(impactLat, impactLon, 1.02)

    // mid: midpoint + a little offset so the path is arced and interesting
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    mid.add(new THREE.Vector3(0.6 + tilt*0.2, 0.25, -0.45))

    return new THREE.QuadraticBezierCurve3(start, mid, end)
  }, [impactLat, impactLon, approach])

  useFrame((_state, dt)=>{
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
      {/* Trail records the group’s motion each frame and draws a streak */}
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
