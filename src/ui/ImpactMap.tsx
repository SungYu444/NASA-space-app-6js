import { useSimStore } from '../state/useSimStore'

interface ImpactMapProps {
  onClose: () => void
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
    // Reset the simulation completely when returning
    const reset = useSimStore.getState().reset
    reset()
    onClose()
  }

  const { craterKm, energyTNT, speed, size } = readouts

  // Calculate accurate impact zone sizes based on meteorite properties
  // Using scientific formulas for impact effects
  
  // Crater diameter (already calculated in readouts)
  const craterDiameterKm = craterKm
  
  // Blast radius (thermal effects) - roughly 2-3x crater radius
  const blastRadiusKm = craterDiameterKm * 2.5
  
  // Seismic effects radius - roughly 10-20x crater radius
  const seismicRadiusKm = craterDiameterKm * 15
  
  // Convert to pixels for the map display (scale to fit the map container)
  const mapContainerWidth = 400 // Approximate width of map container
  const mapContainerHeight = 300 // Approximate height of map container
  
  // Scale factors to make zones visible but not overwhelming
  const craterRadiusPx = Math.max(5, Math.min(25, craterDiameterKm * 0.5))
  const blastRadiusPx = Math.max(8, Math.min(40, blastRadiusKm * 0.3))
  const seismicRadiusPx = Math.max(12, Math.min(60, seismicRadiusKm * 0.2))

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
              <div className="apple-map-container">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${impactLon-0.005},${impactLat-0.005},${impactLon+0.005},${impactLat+0.005}&layer=mapnik&marker=${impactLat},${impactLon}`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', borderRadius: '8px' }}
                  title="Impact Location Map"
                />
                
                {/* Impact zone overlay - positioned to stick with the blue marker */}
                <div className="impact-overlay">
                  <svg width="100%" height="100%" className="impact-svg-overlay">
                    {/* Seismic effects zone (outermost) */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={`${seismicRadiusPx}px`}
                      fill="none"
                      stroke="#ff6b35"
                      strokeWidth="2"
                      strokeDasharray="6,3"
                      opacity="0.6"
                    />
                    
                    {/* Blast/thermal zone */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={`${blastRadiusPx}px`}
                      fill="rgba(255, 107, 53, 0.15)"
                      stroke="rgba(255, 107, 53, 0.4)"
                      strokeWidth="1"
                    />
                    
                    {/* Main crater */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={`${craterRadiusPx}px`}
                      fill="rgba(139, 0, 0, 0.7)"
                      stroke="#8b0000"
                      strokeWidth="2"
                    />
                    
                    {/* Impact epicenter (center dot) */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r="4px"
                      fill="#000000"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="coordinates">
              <div>Latitude: {impactLat.toFixed(2)}°</div>
              <div>Longitude: {impactLon.toFixed(2)}°</div>
            </div>
            
            <div className="impact-legend">
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
