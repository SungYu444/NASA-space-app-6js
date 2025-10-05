import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSimStore } from '../state/useSimStore'
import { vector3ToLatLon } from '../lib/kinematics'

export default function Globe() {
  const gRef = useRef<THREE.Mesh>(null!)
  const [map, setMap] = useState<THREE.Texture | null>(null)
  const [spec, setSpec] = useState<THREE.Texture | null>(null)

  const setTargetLatLon = useSimStore(s => s.setTargetLatLon)
  const setStart = useSimStore(s => s.start)
  const { raycaster, camera, pointer } = useThree()

  // Try local textures first; if missing, fall back to CDN.
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')

    const loadWithFallback = (
      localUrl: string,
      cdnUrl: string,
      onLoad: (t: THREE.Texture) => void
    ) => {
      loader.load(
        localUrl,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace
          onLoad(t)
        },
        undefined,
        () => {
          // local failed -> try CDN
          loader.load(
            cdnUrl,
            (t2) => {
              t2.colorSpace = THREE.SRGBColorSpace
              onLoad(t2)
            },
            undefined,
            // both failed -> keep fallback material
            () => onLoad(null as any)
          )
        }
      )
    }

    loadWithFallback(
      '/earth_base.jpg',
      'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-blue-marble.jpg',
      (t) => setMap(t ?? null)
    )
    loadWithFallback(
      '/earth_spec.jpg',
      'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-night.jpg',
      (t) => setSpec(t ?? null)
    )
  }, [])

  // Globe stays stagnant - no automatic rotation or shaking

  const handleGlobeClick = (event: any) => {
    // Prevent default to avoid conflicts with OrbitControls
    event.stopPropagation()

    // Update raycaster with current mouse position
    raycaster.setFromCamera(pointer, camera)

    // Check for intersection with the globe
    const intersects = raycaster.intersectObject(gRef.current)

    if (intersects.length > 0) {
      const point = intersects[0].point
      const { lat, lon } = vector3ToLatLon(point)

      // Set the new target location
      setTargetLatLon(lat, lon)

      console.log(`Target set to: ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`)

      // Debug: Check if the store was updated
      setTimeout(() => {
        const currentState = useSimStore.getState()
        console.log(`Store target: ${currentState.targetLat.toFixed(2)}°N, ${currentState.targetLon.toFixed(2)}°E`)
      }, 100)
    }
  }

  const material = map
    ? (
      <meshPhongMaterial
        map={map || undefined}
        specularMap={spec || undefined}
        shininess={30}                         // Highlight strength (higher = glossier)
        specular={new THREE.Color('#66aaff')}  //  Highlight color (try warmer or cooler tones)
        emissive={new THREE.Color('#224466')}  //  Glow tint for the dark side
        emissiveIntensity={0.35}               //  Brightness of that glow
      />

    )
    : (
      <meshStandardMaterial color="#2b6cff" metalness={0.1} roughness={0.6} />
    )

  return (

    <>
      <color attach="background" args={['#02050b']} />

      {/* --- Lighting Setup --- */}
      {/* Stronger global ambient light */}
      <ambientLight intensity={3} />

      {/* Sunlight / main directional light */}
      <directionalLight
        position={[5, 3, 5]}
        intensity={3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Soft fill light on the opposite side */}
      <directionalLight
        position={[-4, -2, -4]}
        intensity={0.5}
        color="#4477ff"
      />

      {/* Optional subtle backlight for atmosphere */}
      <pointLight position={[0, 0, -6]} intensity={0.3} color="#88ccff" />

      {/* --- Earth mesh --- */}
      <mesh ref={gRef} castShadow receiveShadow onClick={handleGlobeClick}>
        <sphereGeometry args={[1, 128, 128]} />
        {material}
      </mesh>

      {/* Thin atmosphere shell */}
      <mesh scale={1.02}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color="#66ccff"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>


      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={1.6}
        maxDistance={10}
        rotateSpeed={0.6}
      />
    </>
  )

}
