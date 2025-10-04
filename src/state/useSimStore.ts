import { create } from 'zustand'
import { simplePathAtTime } from '../lib/kinematics'

/** Public types used elsewhere */
export type Mitigation = 'kinetic' | 'tractor' | 'laser'
export type Mode = 'scenario' | 'defend' | 'story'

type AsteroidPreset = {
  id: string
  name: string
  size: number
  speed: number
  density: number
}

/** Simple energy model (not physically strict) */
function estimateEnergyMtTNT(size_m: number, density: number, speed_kms: number) {
  const r = size_m / 2
  const vol = (4 / 3) * Math.PI * r * r * r
  const mass = density * vol // kg
  const v = speed_kms * 1000 // m/s
  const joules = 0.5 * mass * v * v
  return joules / 4.184e15 // megatons TNT
}

type Readouts = {
  speed: number
  size: number
  density: number
  eta: number
  energyTNT: number
  craterKm: number
}

type SimState = {
  time: number
  duration: number
  running: boolean

  size: number
  speed: number
  density: number
  approachAngle: number

  mitigation: Mitigation
  mitigationPower: number
  leadTime: number

  impactLat: number
  impactLon: number

  blastKm: number
  seismicKm: number
  tsunamiKm: number

  mode: Mode
  presets: AsteroidPreset[]
  selectedPresetId: string

  // derived display info
  readouts: Readouts

  /* Core actions */
  tick: (dt: number) => void
  start: () => void
  pause: () => void
  reset: () => void
  selectPreset: (id: string) => void
  setImpactLatLon: (lat: number, lon: number) => void
  hit: () => void
  setMode: (m: Mode) => void

  /* setters */
  setRunning: (v: boolean) => void
  setTime: (v: number) => void
  setDuration: (v: number) => void
  setSize: (v: number) => void
  setSpeed: (v: number) => void
  setDensity: (v: number) => void
  setApproachAngle: (v: number) => void
  setMitigation: (v: Mitigation) => void
  setMitigationPower: (v: number) => void
  setLeadTime: (v: number) => void

  /* legacy */
  toggleRun: () => void
  setParam: (
    key:
      | 'size' | 'speed' | 'density' | 'approachAngle'
      | 'mitigationPower' | 'leadTime' | 'duration' | 'time' | 'mitigation',
    value: number | Mitigation
  ) => void
}

export const useSimStore = create<SimState>((set, get) => {
  const recalcHazards = (
    n?: Partial<Pick<SimState, 'size' | 'speed' | 'density'>>
  ) => {
    const size = n?.size ?? get().size
    const speed = n?.speed ?? get().speed
    const density = n?.density ?? get().density
    const E = estimateEnergyMtTNT(size, density, speed)
    const blastKm = 80 + E * 5
    const seismicKm = 40 + E * 2
    const tsunamiKm = 120 + E * 6
    const craterKm = Math.cbrt(E) * 1.2
    const readouts: Readouts = {
      speed,
      size,
      density,
      eta: get().duration - get().time,
      energyTNT: E,
      craterKm,
    }
    set({ blastKm, seismicKm, tsunamiKm, readouts })
  }

  const base = {
    time: 0,
    duration: 120,
    running: false,
    size: 120,
    speed: 18,
    density: 3000,
    approachAngle: 35,
    mitigation: 'kinetic' as Mitigation,
    mitigationPower: 0.5,
    leadTime: 15,
    impactLat: 10,
    impactLon: 70,
    blastKm: 0,
    seismicKm: 0,
    tsunamiKm: 0,
    mode: 'scenario' as Mode,
    presets: [
      { id: 'tiny', name: 'Tiny (40 m, 15 km/s)', size: 40, speed: 15, density: 2500 },
      { id: 'small', name: 'Small (120 m, 18 km/s)', size: 120, speed: 18, density: 3000 },
      { id: 'med', name: 'Medium (350 m, 25 km/s)', size: 350, speed: 25, density: 3000 },
      { id: 'large', name: 'Large (800 m, 28 km/s)', size: 800, speed: 28, density: 3200 },
      { id: 'iron', name: 'Iron (200 m, 30 km/s)', size: 200, speed: 30, density: 7800 },
    ],
    selectedPresetId: 'small',
    readouts: { speed: 0, size: 0, density: 0, eta: 0, energyTNT: 0, craterKm: 0 },
  }

  
  // Calculate initial impact position
  const initialImpact = simplePathAtTime({
    time: base.duration,
    duration: base.duration,
    approachAngleDeg: base.approachAngle,
    leadTime: base.leadTime,
    mitigation: base.mitigation,
    mitigationPower: base.mitigationPower
  })
  base.impactLat = initialImpact.impactLat
  base.impactLon = initialImpact.impactLon

  set(base)
  recalcHazards()

  return {
    ...get(),

    tick: (dt) => {
      const { running, time, duration } = get()
      if (!running) return
      const t = Math.min(duration, time + dt)
      set({ time: t })
      recalcHazards()
    },

    start: () => set({ running: true }),
    pause: () => set({ running: false }),
    reset: () => set({ running: false, time: 0 }),

    selectPreset: (id) => {
      const p = get().presets.find(p => p.id === id)
      if (!p) return
      set({
        selectedPresetId: id,
        size: p.size,
        speed: p.speed,
        density: p.density,
      })
      recalcHazards({ size: p.size, speed: p.speed, density: p.density })
    },

    setImpactLatLon: (lat, lon) => set({ impactLat: lat, impactLon: lon }),
    hit: () => set({ time: 0, running: true }),
    setMode: (m) => set({ mode: m }),

    setRunning: (v) => set({ running: v }),
    setTime: (v) => set({ time: Math.max(0, Math.min(get().duration, v)) }),
    setDuration: (v) => set({ duration: Math.max(1, v) }),

    setSize: (v) => { set({ size: v }); recalcHazards({ size: v }) },
    setSpeed: (v) => { set({ speed: v }); recalcHazards({ speed: v }) },
    setDensity: (v) => { set({ density: v }); recalcHazards({ density: v }) },
    setApproachAngle: (v) => set({ approachAngle: v }),
    setMitigation: (v) => set({ mitigation: v }),
    setMitigationPower: (v) => set({ mitigationPower: v }),
    setLeadTime: (v) => set({ leadTime: v }),

    toggleRun: () => set({ running: !get().running }),

    setParam: (key, value) => {
      switch (key) {
        case 'mitigation': get().setMitigation(value as Mitigation); break
        case 'size': get().setSize(value as number); break
        case 'speed': get().setSpeed(value as number); break
        case 'density': get().setDensity(value as number); break
        case 'approachAngle': get().setApproachAngle(value as number); break
        case 'mitigationPower': get().setMitigationPower(value as number); break
        case 'leadTime': get().setLeadTime(value as number); break
        case 'duration': get().setDuration(value as number); break
        case 'time': get().setTime(value as number); break
        default: break
      }
    },
  }
})
