import { useSimStore } from '../state/useSimStore'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'

interface ImpactMapProps {
  onClose: () => void
}

// Component to center the map on impact location
function MapCenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], 13)
  }, [lat, lon, map])
  return null
}

export default function ImpactMap({ onClose }: ImpactMapProps) {
  const { impactLat, impactLon, readouts, setShowImpactMap, pause } = useSimStore(s => ({
    impactLat: s.impactLat,
    impactLon: s.impactLon,
    readouts: s.readouts,
    setShowImpactMap: s.setShowImpactMap,
    pause: s.pause
  }))

  const handleClose = () => {
    // Set time to just before impact to prevent re-triggering
    const setTime = useSimStore.getState().setTime
    const duration = useSimStore.getState().duration
    setTime(duration - 0.1) // Set to 0.1 seconds before impact
    setShowImpactMap(false)
    onClose()
  }

  const handleReturnToSimulation = () => {
    // Reset the simulation completely when returning (includes shake state)
    const reset = useSimStore.getState().reset
    reset()
    onClose()
  }

  const { craterKm, energyTNT, speed, size } = readouts

<<<<<<< HEAD
=======
<<<<<<< Updated upstream
=======
>>>>>>> 91df55fd87770d07b2b23b1e9a92057f26afcc50
  // Environmental effects state
  const [elevation, setElevation] = useState<number | null>(null)
  const [terrainType, setTerrainType] = useState<string>('Unknown')
  const [tsunamiRisk, setTsunamiRisk] = useState<string>('Calculating...')
  const [environmentalEffects, setEnvironmentalEffects] = useState<string[]>([])

  // Fetch elevation data using Open-Elevation API
  useEffect(() => {
    const fetchElevation = async () => {
      try {
        const response = await fetch(
          `https://api.open-elevation.com/api/v1/lookup?locations=${impactLat},${impactLon}`
        )
        const data = await response.json()
        if (data.results && data.results[0]) {
          const elev = data.results[0].elevation
          setElevation(elev)
          
          // Determine terrain type and environmental effects
          analyzeEnvironmentalEffects(elev)
        }
      } catch (error) {
        console.error('Failed to fetch elevation:', error)
        setElevation(null)
        setTerrainType('Data unavailable')
        setTsunamiRisk('Unable to determine')
      }
    }
    
    fetchElevation()
  }, [impactLat, impactLon])

  // Analyze environmental effects based on elevation and impact energy
<<<<<<< HEAD
  const analyzeEnvironmentalEffects = (elev: number) => {
=======
    const analyzeEnvironmentalEffects = (elev: number) => {
>>>>>>> 91df55fd87770d07b2b23b1e9a92057f26afcc50
    const effects: string[] = []
    
    // Determine terrain type
    if (elev < 0) {
      setTerrainType('Ocean/Sea')
      
      // Ocean impact - high tsunami risk
      const waterDepth = Math.abs(elev)
      if (energyTNT > 100) {
        setTsunamiRisk('EXTREME - Mega-tsunami expected')
        effects.push(`Mega-tsunami with waves up to ${(energyTNT * 0.5).toFixed(0)}m high`)
        effects.push(`Coastal devastation within ${(craterKm * 50).toFixed(0)} km`)
        effects.push('Widespread flooding of low-lying areas')
      } else if (energyTNT > 10) {
        setTsunamiRisk('HIGH - Major tsunami likely')
        effects.push(`Major tsunami waves up to ${(energyTNT * 0.3).toFixed(0)}m`)
        effects.push('Significant coastal damage expected')
      } else {
        setTsunamiRisk('MODERATE - Local tsunami possible')
        effects.push('Local tsunami waves possible')
      }
      effects.push('Massive water displacement')
      effects.push('Marine ecosystem destruction')
      
    } else if (elev < 10) {
      setTerrainType('Coastal/Low-lying')
      setTsunamiRisk('MODERATE - Vulnerable to flooding')
      effects.push('Severe flooding from displaced water')
      effects.push('Storm surge-like effects')
      effects.push('Groundwater contamination')
      
    } else if (elev < 100) {
      setTerrainType('Plains/Valley')
      setTsunamiRisk('LOW - Inland location')
      effects.push('Widespread ground shaking')
      effects.push('Dust cloud affecting air quality')
      effects.push('Potential river/lake displacement')
      
    } else if (elev < 500) {
      setTerrainType('Hills/Plateau')
      setTsunamiRisk('VERY LOW - Elevated terrain')
      effects.push('Seismic landslides possible')
      effects.push('Regional atmospheric disturbance')
      
    } else {
      setTerrainType('Mountains')
      setTsunamiRisk('NEGLIGIBLE - Mountainous terrain')
      effects.push('Avalanches and rockslides')
      effects.push('Valley flooding from melted ice')
    }
    
    // Add energy-based effects
    if (energyTNT > 1000) {
      effects.push('Global climate impact (nuclear winter)')
      effects.push('Mass extinction event likely')
    } else if (energyTNT > 100) {
      effects.push('Regional climate disruption')
      effects.push('Crop failure in surrounding regions')
    } else if (energyTNT > 10) {
      effects.push('Local weather pattern disruption')
      effects.push('Agricultural damage in impact zone')
    }
    
    // Add seismic effects
    const magnitude = 4 + Math.log10(energyTNT)
    effects.push(`Earthquake equivalent: Magnitude ${magnitude.toFixed(1)}`)
    
    setEnvironmentalEffects(effects)
  }

<<<<<<< HEAD
=======
>>>>>>> Stashed changes
>>>>>>> 91df55fd87770d07b2b23b1e9a92057f26afcc50
  // Calculate accurate impact zone sizes based on meteorite properties
  // Using scientific formulas for impact effects
  
  // Crater diameter (already calculated in readouts)
  const craterDiameterKm = craterKm
  
  // Blast radius (thermal effects) - roughly 2-3x crater radius
  const blastRadiusKm = craterDiameterKm * 2.5
  
  // Seismic effects radius - roughly 10-20x crater radius
  const seismicRadiusKm = craterDiameterKm * 15
  
  // Leaflet uses meters for circle radius, so convert km to meters
  const craterRadiusM = (craterDiameterKm / 2) * 1000
  const blastRadiusM = blastRadiusKm * 1000
  const seismicRadiusM = seismicRadiusKm * 1000

  return (
    <div className="impact-map-overlay">
      <div className="impact-map-container">
        <div className="impact-map-header">
          <h2>Impact Analysis Report</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="impact-map-content">
          <div className="map-section">
            <h3>Impact Location</h3>
            <div className="map-container">
              <MapContainer
                center={[impactLat, impactLon]}
                zoom={13}
                style={{ width: '100%', height: '100%', borderRadius: '8px' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapCenter lat={impactLat} lon={impactLon} />
                
                {/* Seismic effects zone (outermost) - orange dashed */}
                <Circle
                  center={[impactLat, impactLon]}
                  radius={seismicRadiusM}
                  pathOptions={{
                    color: '#ff6b35',
                    fillColor: 'transparent',
                    fillOpacity: 0,
                    weight: 3,
                    dashArray: '10, 5',
                    opacity: 0.7
                  }}
                />
                
                {/* Blast/thermal zone - orange filled */}
                <Circle
                  center={[impactLat, impactLon]}
                  radius={blastRadiusM}
                  pathOptions={{
                    color: 'rgba(255, 107, 53, 0.6)',
                    fillColor: 'rgba(255, 107, 53, 0.2)',
                    fillOpacity: 0.3,
                    weight: 2,
                    opacity: 0.8
                  }}
                />
                
                {/* Main crater - dark red */}
                <Circle
                  center={[impactLat, impactLon]}
                  radius={craterRadiusM}
                  pathOptions={{
                    color: '#8b0000',
                    fillColor: 'rgba(139, 0, 0, 0.8)',
                    fillOpacity: 0.7,
                    weight: 3,
                    opacity: 0.9
                  }}
                />
              </MapContainer>
            </div>
            
            <div className="coordinates">
              <div>Latitude: {impactLat.toFixed(2)}°</div>
              <div>Longitude: {impactLon.toFixed(2)}°</div>
            </div>
          </div>

          <div className="impact-stats">
            <h3>Impact Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Crater Diameter</div>
                <div className="stat-value">{craterKm.toFixed(2)} km</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Energy Release</div>
                <div className="stat-value">{energyTNT.toFixed(2)} Mt TNT</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Impact Speed</div>
                <div className="stat-value">{speed.toFixed(1)} km/s</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Asteroid Size</div>
                <div className="stat-value">{size.toFixed(0)} m</div>
            </div>
          </div>

            <div className="impact-legend" style={{ marginTop: '24px' }}>
              <h4>Impact Zones</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-color crater"></div>
                  <span>Crater: {craterDiameterKm.toFixed(1)} km diameter</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color blast"></div>
                  <span>Blast Zone: {blastRadiusKm.toFixed(1)} km radius</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color seismic"></div>
                  <span>Seismic Zone: {seismicRadiusKm.toFixed(1)} km radius</span>
                </div>
              </div>
            </div>

            {/* Environmental Effects Section */}
            <div className="impact-legend" style={{ marginTop: '24px' }}>
              <h4>Environmental Analysis</h4>
              <div className="stats-grid" style={{ marginBottom: '12px' }}>
                <div className="stat-item">
                  <div className="stat-label">Elevation</div>
                  <div className="stat-value">
                    {elevation !== null ? `${elevation.toFixed(0)} m` : 'Loading...'}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Terrain Type</div>
                  <div className="stat-value" style={{ fontSize: '16px' }}>
                    {terrainType}
                  </div>
                </div>
              </div>
              
              <div className="stat-item" style={{ marginBottom: '12px' }}>
                <div className="stat-label">Tsunami Risk</div>
                <div className="stat-value" style={{ 
                  fontSize: '16px',
                  color: tsunamiRisk.includes('EXTREME') ? '#ff0000' : 
                         tsunamiRisk.includes('HIGH') ? '#ff6b6b' : 
                         tsunamiRisk.includes('MODERATE') ? '#ffa500' : 
                         tsunamiRisk.includes('LOW') ? '#ffeb3b' : '#66ff66'
                }}>
                  {tsunamiRisk}
                </div>
              </div>

              <h4 style={{ fontSize: '18px', marginTop: '16px', marginBottom: '8px' }}>
                Secondary Effects
              </h4>
              <div style={{ 
                fontSize: '16px', 
                lineHeight: '1.6',
                color: 'var(--text)',
                opacity: 0.9
              }}>
                {environmentalEffects.length > 0 ? (
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '20px',
                    listStyleType: '• '
                  }}>
                    {environmentalEffects.map((effect, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{effect}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ opacity: 0.6 }}>Analyzing environmental impact...</div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="impact-map-footer">
          <button className="cta" onClick={handleClose}>Continue Simulation</button>
          <button className="cta" onClick={handleReturnToSimulation} style={{marginLeft: '12px', background: 'linear-gradient(180deg, rgba(102, 224, 255, 0.2), rgba(102, 224, 255, 0.1))', borderColor: '#66e0ff'}}>Start New Simulation</button>
        </div>
      </div>
    </div>
  )
}
