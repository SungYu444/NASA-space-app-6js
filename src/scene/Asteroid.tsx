// src/scene/Asteroid.tsx
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Trail } from '@react-three/drei'
import { useEffect, useState, useRef } from 'react'
import { useSimStore } from '../state/useSimStore'
import { latLonToVector3, simplePathAtTime } from '../lib/kinematics'

export default function Asteroid() {
  // read sim state
  const time = useSimStore(s => s.time)
  const duration = useSimStore(s => s.duration)
  const size = useSimStore(s => s.size)
  const speed = useSimStore(s => s.speed)
  const approach = useSimStore(s => s.approachAngle)
  const mitigation = useSimStore(s => s.mitigation)
  const mitigationPower = useSimStore(s => s.mitigationPower)
  const leadTime = useSimStore(s => s.leadTime)
  const running = useSimStore(s => s.running)


  // target override + flag
  const targetLat = useSimStore(s => s.targetLat)
  const targetLon = useSimStore(s => s.targetLon)
  const useTargetImpact = useSimStore(s => s.useTargetImpact)
  const nasaData = useSimStore(s => s.nasaAsteroidData)
  const useNasaData = useSimStore(s => s.useNasaData)

  const setImpactLatLon = useSimStore(s => s.setImpactLatLon)
  const { isShaking, shakeIntensity } = useSimStore(s => ({
    isShaking: s.isShaking,
    shakeIntensity: s.shakeIntensity
  }))

  // texture loading
  const [asteroidTexture, setAsteroidTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load('/meteor.jpg', (texture) => {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      setAsteroidTexture(texture)
    })
  }, [])

  // refs
  const groupRef = useRef<THREE.Group>(null!)
  const coreRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  const { camera } = useThree()

  useFrame((_state, dt) => {
    // Compute impact point (honor target when requested)
    const { impactLat, impactLon } = simplePathAtTime({
      time,
      duration,
      approachAngleDeg: approach,
      leadTime,
      mitigation,
      mitigationPower,
      targetLat,
      targetLon,
      lockToTarget: useTargetImpact, // key: forces end-point to the clicked location
    })

    // Update store for overlays/other systems
    setImpactLatLon(impactLat, impactLon)

    // --- Build a curve that NEVER crosses the Earth ---
    // End point slightly above the surface
    const end = latLonToVector3(impactLat, impactLon, 1.02)

    // Surface normal at end
    const n = end.clone().normalize()

    // Build an orthonormal basis (t, b) in the tangent plane at 'end'
    // Start with cross against world-up; fall back if near parallel (poles)
    let t = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0))
    if (t.lengthSq() < 1e-6) {
      t = new THREE.Vector3().crossVectors(n, new THREE.Vector3(1, 0, 0))
    }
    t.normalize()
    const b = new THREE.Vector3().crossVectors(n, t).normalize()

    // Use the approach angle to spin direction around the normal (tangent heading)
    const theta = THREE.MathUtils.degToRad(approach)
    const dir = t.clone().multiplyScalar(Math.cos(theta)).addScaledVector(b, Math.sin(theta)).normalize()

    // Choose start and mid strictly outside the sphere (radius > 1)
    const start = n.clone().multiplyScalar(3.2)   // along normal, safely outside
      .addScaledVector(dir, 1.0)                  // small lateral offset for nicer arc

    const mid = n.clone().multiplyScalar(2.2)     // control point also outside
      .addScaledVector(dir, 0.5)

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)

    // progress 0..1
    const tNorm = Math.min(1, Math.max(0, time / duration))

    // position & orientation
    const pos = curve.getPoint(tNorm)
    groupRef.current.position.copy(pos)

    const tan = curve.getTangent(tNorm).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan)
    groupRef.current.quaternion.copy(q)

    // spin
    if (coreRef.current) {
      coreRef.current.rotation.x += dt * 1.2
      coreRef.current.rotation.y += dt * 0.8
    }

    // heat / glow
    const r = pos.length()
    const heat = THREE.MathUtils.clamp(1 - (r - 1.0) / 0.5, 0, 1)
    const speedNorm = THREE.MathUtils.clamp((speed - 5) / 65, 0, 1)
    const baseGlowScale = size / 120
    const heatGlowScale = 1 + THREE.MathUtils.lerp(0.05, 0.35, heat)
    const glowScale = baseGlowScale * heatGlowScale
    if (glowRef.current) {
      glowRef.current.scale.setScalar(glowScale)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = THREE.MathUtils.lerp(0.0, 0.9, heat * (0.6 + speedNorm * 0.4))
    }

    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(0.0, 10.0, heat)
      lightRef.current.distance = THREE.MathUtils.lerp(0.0, 3.5, heat)
    }

    // camera shake on impact
    if (isShaking && shakeIntensity > 0) {
      const shake = shakeIntensity * 0.02
      camera.position.x += (Math.random() - 0.5) * shake
      camera.position.y += (Math.random() - 0.5) * shake
    }
  })

  return (
    <group ref={groupRef}>
      {/* Trail records the group's motion each frame and draws a streak */}
      {running && (
      <Trail width={0.12} length={9} color="#ffd9a6" attenuation={(t) => t}>
        <group>
          {/* hot bloom light */}
          <pointLight ref={lightRef} color={'#ffb07a'} intensity={0} distance={0} />

          {/* rock core */}
          <mesh ref={coreRef} castShadow>
            <icosahedronGeometry args={[0.06 * (size / 120), 2]} />
            <meshStandardMaterial
              map={asteroidTexture || undefined}
              color={asteroidTexture ? '#ffffff' : '#6a6a6a'}
              roughness={0.95}
              metalness={0.0}
              bumpMap={asteroidTexture || undefined}
              bumpScale={0.005}
            />
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
            scale={[0.5, 0.5, 1.2]}
            size={2.2}
            speed={0.2}
            color={'#ffb07a'}
            opacity={0.8}
          />
        </group>
      </Trail>
      )}
    </group>
  )
}
