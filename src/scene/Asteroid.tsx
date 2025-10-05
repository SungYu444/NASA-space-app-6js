// src/scene/Asteroid.tsx
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import { useEffect, useState, useRef, useMemo } from 'react'
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
  const running = useSimStore(s => s.running)

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

  // 🔥 Shock shell + trail
  const shockRef = useRef<THREE.Mesh>(null!)
  const trailRef = useRef<THREE.Mesh>(null!)
  const shockMatRef = useRef<THREE.ShaderMaterial>(null!)
  const trailMatRef = useRef<THREE.ShaderMaterial>(null!)

  const { camera } = useThree()

  // ===== Flame easing state (0..1) =====
  const flameFactorRef = useRef(0) // grows when close to Earth, shrinks otherwise

  // ---- SHADERS ----
  const commonNoise = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm(vec2 p){
      float v = 0.0;
      float a = 0.5;
      for(int i=0; i<5; i++){
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }
  `

  const shockMaterial = useMemo(() => {
    const v = `
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `
    const f = `
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      uniform float u_time;
      uniform float u_intensity; // includes flameFactor
      uniform vec3  u_camPos;
      uniform vec3 u_hot;
      uniform vec3 u_mid;
      uniform vec3 u_cool;
      ${commonNoise}
      void main(){
        vec3 V = normalize(u_camPos - vWorldPos);
        float fres = pow(1.0 - max(dot(normalize(vNormal), V), 0.0), 3.0);
        float front = clamp(vNormal.z * 0.5 + 0.5, 0.0, 1.0);
        float t = u_time * (1.2 + 1.6*u_intensity);
        vec2 flow = vec2(vNormal.x*2.0, vNormal.y*2.0 - t);
        float n = fbm(flow);
        float body = mix(0.3, 1.0, front) * (0.7 + 0.3*n);
        float alpha = (0.25 + 0.75*fres) * body * (0.75 + 0.25*u_intensity);
        vec3 col = mix(u_mid, u_hot, front);
        col = mix(col, u_cool, fres*0.6);
        col *= (1.0 + 0.7*u_intensity);
        gl_FragColor = vec4(col, alpha);
      }
    `
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: 0 },
        u_camPos: { value: new THREE.Vector3() },
        u_hot: { value: new THREE.Color('#fff2b0') },
        u_mid: { value: new THREE.Color('#ff7a2a') },
        u_cool: { value: new THREE.Color('#ff3200') },
      },
      vertexShader: v,
      fragmentShader: f,
    })
  }, [])

  const trailMaterial = useMemo(() => {
    const v = `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
    const f = `
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_intensity; // includes flameFactor
      uniform vec3  u_hot;
      uniform vec3  u_mid;
      uniform vec3  u_cool;
      ${commonNoise}
      void main(){
        float y = vUv.y;
        float x = vUv.x - 0.5;
        float t = u_time * (1.0 + 1.5*u_intensity);
        float n = fbm(vec2(x*2.0, y*4.0 - t));
        float edgeX = smoothstep(0.55, 0.05, abs(x));
        float tip   = smoothstep(0.0, 0.15, y);
        float tail  = 1.0 - smoothstep(0.85, 1.0, y);
        float base  = tip * tail;
        float alpha = (0.3 + 0.7*n) * edgeX * base * (0.6 + 0.4*u_intensity);
        vec3 col = mix(u_hot, u_mid, smoothstep(0.0, 0.6, y));
        col = mix(col, u_cool, smoothstep(0.5, 1.0, y));
        col *= (1.0 + 0.6*u_intensity);
        gl_FragColor = vec4(col, alpha);
      }
    `
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: 0 },
        u_hot: { value: new THREE.Color('#fff2b0') },
        u_mid: { value: new THREE.Color('#ff7a2a') },
        u_cool: { value: new THREE.Color('#ff3200') },
      },
      vertexShader: v,
      fragmentShader: f,
    })
  }, [])

  useEffect(() => { shockMatRef.current = shockMaterial }, [shockMaterial])
  useEffect(() => { trailMatRef.current = trailMaterial }, [trailMaterial])

  useFrame((_state, dt) => {
    const { impactLat, impactLon } = simplePathAtTime({
      time, duration, approachAngleDeg: approach, leadTime,
      mitigation, mitigationPower, targetLat, targetLon,
      lockToTarget: useTargetImpact,
    })
    setImpactLatLon(impactLat, impactLon)

    // Path outside Earth
    const end = latLonToVector3(impactLat, impactLon, 1.02)
    const n = end.clone().normalize()
    let t = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0))
    if (t.lengthSq() < 1e-6) t = new THREE.Vector3().crossVectors(n, new THREE.Vector3(1, 0, 0))
    t.normalize()
    const b = new THREE.Vector3().crossVectors(n, t).normalize()
    const theta = THREE.MathUtils.degToRad(approach)
    const dir = t.clone().multiplyScalar(Math.cos(theta)).addScaledVector(b, Math.sin(theta)).normalize()
    const start = n.clone().multiplyScalar(3.2).addScaledVector(dir, 1.0)
    const mid = n.clone().multiplyScalar(2.2).addScaledVector(dir, 0.5)
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)

    const tNorm = Math.min(1, Math.max(0, time / duration))
    const pos = curve.getPoint(tNorm)
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

    // heat / glow (heat > 0 near atmosphere; based on radius)
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

    // ======= Atmosphere gating with smooth "catch-up" =======
    const beforeImpact = time < duration
    const inAtmosphere = heat > 0.02

    // Ease flameFactor up/down (catch-up feel).
    // Faster growth as heat increases, slower decay when leaving.
    const growRate = 1.2 + 1.8 * heat           // up to ~3.0 near surface
    const decayRate = 2.0                        // fade fairly quickly when leaving
    const target = (beforeImpact && inAtmosphere) ? 1 : 0
    const f = flameFactorRef.current
    const rate = target > f ? growRate : decayRate
    flameFactorRef.current = THREE.MathUtils.clamp(f + (target - f) * (1 - Math.exp(-rate * dt)), 0, 1)
    const flameFactor = flameFactorRef.current

    // Composite physical intensity (speed/heat) * visual flameFactor
    const physIntensity = THREE.MathUtils.clamp(0.45 * speedNorm + 0.65 * heat, 0, 1)
    const visIntensity = physIntensity * flameFactor

    if (shockMatRef.current && shockRef.current) {
      shockRef.current.visible = flameFactor > 0.01
      if (shockRef.current.visible) {
        shockMatRef.current.uniforms.u_time.value += dt
        shockMatRef.current.uniforms.u_intensity.value = visIntensity
          ; (shockMatRef.current.uniforms.u_camPos.value as THREE.Vector3).copy(camera.position)

        // Wrap grows as flameFactor increases (feels like plasma forming)
        const wrap = 0.11 * (size / 120) * (0.85 + 0.45 * flameFactor) * (1.0 + 0.3 * heat)
        shockRef.current.scale.setScalar(wrap / 0.11)
      }
    }

    if (trailMatRef.current && trailRef.current) {
      const visible = flameFactor > 0.01
      trailRef.current.visible = visible
      if (visible) {
        trailMatRef.current.uniforms.u_time.value += dt
        trailMatRef.current.uniforms.u_intensity.value = visIntensity

        // Start farther behind and "catch up" as flameFactor grows
        const backFar = 0.20   // farther when flame just appears
        const backNear = 0.06  // tight when fully developed
        const back = THREE.MathUtils.lerp(backFar, backNear, flameFactor)
        trailRef.current.position.set(0, 0, -back)

        // Length & width ramp with both heat/speed and flameFactor
        const lengthBase = 0.40
        const lengthGain = 0.40 * (speedNorm + heat) // physical contribution
        const widthBase = 0.08
        const widthGain = 0.10 * (speedNorm + heat)

        const length = (lengthBase + lengthGain) * (0.3 + 0.7 * flameFactor)
        const width = (widthBase + widthGain) * (0.3 + 0.7 * flameFactor)

        trailRef.current.scale.set(width, length, width)
      }
    }
    // ================================================

    // camera shake on impact
    if (isShaking && shakeIntensity > 0) {
      const shake = shakeIntensity * 0.02
      camera.position.x += (Math.random() - 0.5) * shake
      camera.position.y += (Math.random() - 0.5) * shake
    }
  })

  return (
    <group ref={groupRef}>
      {/* Draw the Trail AFTER start so the history line appears only when running */}
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

            {/* subtle additive glow just at the head */}
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
          </group>
        </Trail>
      )}

      {/* Shock shell that wraps the meteor head */}
      <mesh ref={shockRef}>
        <sphereGeometry args={[0.11, 32, 32]} />
        <primitive object={shockMaterial} attach="material" />
      </mesh>

      {/* Tapered trail (cone) behind the head (points to -Z) */}
      <mesh ref={trailRef} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0, 1.0, 1.0, 24, 1, true]} />
        <primitive object={trailMaterial} attach="material" />
      </mesh>
    </group>
  )
}
