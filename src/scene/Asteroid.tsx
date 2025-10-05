// src/scene/Asteroid.tsx
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Trail } from '@react-three/drei'
import { useEffect, useState, useRef } from 'react'
import { useSimStore } from '../state/useSimStore'
import { latLonToVector3, simplePathAtTime } from '../lib/kinematics'

const isFiniteVec3 = (v: THREE.Vector3) =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)

const clampLat = (lat: number) =>
  Number.isFinite(lat) ? THREE.MathUtils.clamp(lat, -89.999, 89.999) : 0

const normLon = (lon: number) => {
  if (!Number.isFinite(lon)) return 0
  // normalize to [-180, 180)
  let l = ((lon % 360) + 540) % 360 - 180
  return l
}

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

  // target override + flag
  const targetLat = useSimStore(s => s.targetLat)
  const targetLon = useSimStore(s => s.targetLon)
  const useTargetImpact = useSimStore(s => s.useTargetImpact)

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
  const lastGoodPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 3)) // safe seed

  const { camera } = useThree()

  useFrame((_state, dt) => {
    // Compute impact point (honor target when requested)
    const res = simplePathAtTime({
      time,
      duration,
      approachAngleDeg: approach,
      leadTime,
      mitigation,
      mitigationPower,
      targetLat,
      targetLon,
      lockToTarget: useTargetImpact,
    })

    // Guard: if function ever returns bad numbers, bail early this frame
    if (
      !res ||
      !Number.isFinite(res.impactLat) ||
      !Number.isFinite(res.impactLon)
    ) {
      // don't update Trail with NaN; just keep previous transform
      return
    }

    // Safe lat/lon
    const iLat = clampLat(res.impactLat)
    const iLon = normLon(res.impactLon)

    // Update store (with safe values)
    setImpactLatLon(iLat, iLon)

    // --- Build a curve that NEVER crosses the Earth ---
    // End point slightly above the surface
    let end = latLonToVector3(iLat, iLon, 1.02)
    if (!isFiniteVec3(end)) {
      // fallback: keep last position and skip this frame
      return
    }

    // Surface normal at end
    let n = end.clone().normalize()
    if (!isFiniteVec3(n) || n.lengthSq() === 0) n.set(0, 1, 0)

    // tangent basis at end
    let tVec = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0))
    if (tVec.lengthSq() < 1e-6) tVec = new THREE.Vector3().crossVectors(n, new THREE.Vector3(1, 0, 0))
    tVec.normalize()
    const bVec = new THREE.Vector3().crossVectors(n, tVec).normalize()

    // approach heading in tangent plane
    const theta = THREE.MathUtils.degToRad(approach || 0)
    const dir = tVec.clone().multiplyScalar(Math.cos(theta)).addScaledVector(bVec, Math.sin(theta)).normalize()

    // start/mid strictly outside the unit sphere
    const start = n.clone().multiplyScalar(3.2).addScaledVector(dir, 1.0)
    const mid = n.clone().multiplyScalar(2.2).addScaledVector(dir, 0.5)

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)

    // progress 0..1
    const tNorm = Math.min(1, Math.max(0, duration > 0 ? time / duration : 0))

    // position & orientation
    let pos = curve.getPoint(tNorm)
    if (!isFiniteVec3(pos)) {
      // don't feed NaNs into Trail/meshline; reuse last good
      pos = lastGoodPos.current
    } else {
      lastGoodPos.current.copy(pos)
    }
    groupRef.current.position.copy(pos)

    let tan = curve.getTangent(tNorm)
    if (!isFiniteVec3(tan) || tan.lengthSq() === 0) tan.set(0, 0, 1)
    tan.normalize()
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
    </group>
  )
}
