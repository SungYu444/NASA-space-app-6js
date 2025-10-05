  import React, { useEffect, useState } from 'react';
  import {
    preloadAsteroidListOnLoad,
    getAsteroidInfoById,
    type AsteroidListItem,
    type ProcessedAsteroidInfo
  } from '../Fetching/fetchNasa';
  import { useSimStore } from '../state/useSimStore';

  export default function AsteroidViewer() {
    const [list, setList] = useState<AsteroidListItem[]>([]);
    const [selectedId, setSelectedId] = useState<string>(''); // no auto-select
    const [info, setInfo] = useState<ProcessedAsteroidInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Connect to simulation store
    const setNasaAsteroidData = useSimStore(s => s.setNasaAsteroidData);
    const useNasaData = useSimStore(s => s.useNasaData);
    const clearNasaData = useSimStore(s => s.clearNasaData);

    // Preload asteroid list on mount
    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          setError(null);
          const items = await preloadAsteroidListOnLoad();
          if (!cancelled) {
            // Optional: sort by name for nicer UX
            const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
            setList(sorted);
            // Do NOT auto-select
            // if (sorted.length > 0) setSelectedId(sorted[0].id);
          }
        } catch (err) {
          console.error('Failed to preload:', err);
          if (!cancelled) setError('Failed to load asteroid list.');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    // Fetch details when user clicks "Search"
    const onSearch = async () => {
      if (!selectedId) return;
      try {
        setLoading(true);
        setError(null);
        const details = await getAsteroidInfoById(selectedId);
        setInfo(details);
        
        // Update simulation with NASA data
        setNasaAsteroidData(details);
      } catch (err) {
        console.error('Failed to fetch details:', err);
        setError('Failed to fetch asteroid details.');
      } finally {
        setLoading(false);
      }
    };

     return (
       <div 
         className="Nasa Asteriod data nasa-panel" 
         style={{ 
           pointerEvents: 'auto', // Ensure the panel captures pointer events
           zIndex: 10 // Ensure it's above the 3D scene
         }}
         onMouseEnter={(e) => e.stopPropagation()}
         onMouseLeave={(e) => e.stopPropagation()}
       >
         <h2>Today's Asteroid Near Earth</h2>

         <div 
           style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 6 }}
           onMouseDown={(e) => e.stopPropagation()}
           onClick={(e) => e.stopPropagation()}
         >
           <select
             value={selectedId}
             onChange={(e) => setSelectedId(e.target.value)}
             disabled={loading || list.length === 0}
             // size controls how many rows are visible when expanded; leave native expand via click
             size={1}
             style={{
               padding: '8px 10px',
               borderRadius: 8,
               background: 'rgba(255,255,255,.06)',
               color: '#e7edf7',
               border: '1px solid rgba(255,255,255,.08)',
               maxHeight: 592,            // allow more items without overflowing layout
               overflowY: 'auto',         // scroll if many items
               pointerEvents: 'auto',
             }}
             onMouseDown={(e) => e.stopPropagation()}
             onClick={(e) => e.stopPropagation()}
           >
            <option value="" disabled>
              {loading ? 'Loading…' : list.length ? 'Select an asteroid…' : 'No asteroids found'}
            </option>
            {list.map((item) => (
              <option key={item.id} value={item.id} title={item.name}>
                {item.name}
              </option>
            ))}
          </select>

           <button 
             className="btn" 
             onClick={onSearch} 
             disabled={loading || !selectedId}
             onMouseDown={(e) => e.stopPropagation()}
           >
             {loading ? 'Loading...' : 'Search'}
           </button>
        </div>

        {error && (
          <div style={{ color: '#ff8585', marginBottom: 8, fontSize: 20 }}>
            {error}
          </div>
        )}

         {/* Display asteroid details */}
         {info && (
           <div
             className="nasa-asteroid-data"
             style={{
               padding: 12,
               borderRadius: 8,
               background: 'rgba(255,255,255,.03)',
               border: '1px solid rgba(255,255,255,.06)',
               color: '#e7edf7',
               fontSize: 20,
               maxHeight: '1200px',
               overflowY: 'auto',
               overflowX: 'hidden',
               paddingBottom: '16px', // Extra padding at bottom for scroll
               pointerEvents: 'auto', // Ensure scrolling works
               // Custom scrollbar styling
               scrollbarWidth: 'thin',
               scrollbarColor: 'rgba(255,255,255,0.3) transparent',
             }}
             onMouseDown={(e) => e.stopPropagation()}
             onMouseUp={(e) => e.stopPropagation()}
             onClick={(e) => e.stopPropagation()}
           >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{info.basicInfo.name}</div>
            <div style={{ marginBottom: 4 }}>ID: {info.basicInfo.id}</div>
            <div style={{ marginBottom: 4 }}>Designation: {info.basicInfo.designation}</div>
            <div style={{ marginBottom: 4 }}>Absolute Magnitude: {info.basicInfo.absoluteMagnitude}</div>
            <div style={{ marginBottom: 4 }}>
              Potentially Hazardous: {info.basicInfo.isPotentiallyHazardous ? 'Yes' : 'No'}
            </div>
            <div style={{ marginBottom: 8 }}>
              <a href={info.basicInfo.nasaJplUrl} target="_blank" rel="noreferrer" style={{ color: '#6ab7ff' }}>
                NASA JPL Link
              </a>
            </div>

            <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>Size (km)</div>
            <div style={{ marginBottom: 4 }}>
              Min: {info.size.kilometers.min} | Max: {info.size.kilometers.max} | Avg: {info.size.kilometers.avg}
            </div>

            <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>Speed</div>
            <div style={{ marginBottom: 4 }}>km/s: {info.speed.kmPerSecond ?? 'N/A'}</div>
            <div style={{ marginBottom: 4 }}>km/h: {info.speed.kmPerHour ?? 'N/A'}</div>
            <div style={{ marginBottom: 4 }}>mph: {info.speed.milesPerHour ?? 'N/A'}</div>

             <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>Close Approach</div>
             <div style={{ marginBottom: 4 }}>Date: {info.closeApproach.date ?? 'N/A'}</div>
             <div style={{ marginBottom: 8 }}>Miss Distance: {info.closeApproach.missDistanceKm ?? 'N/A'} km</div>

             {/* Enhanced Orbital Data */}
             <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>Orbital Elements</div>
             <div style={{ fontSize: '20px', marginBottom: 4 }}>
               Semi-Major Axis: {info.orbital.semiMajorAxisAU ?? 'N/A'} AU
             </div>
             <div style={{ fontSize: '20px', marginBottom: 4 }}>
               Eccentricity: {info.orbital.eccentricity ?? 'N/A'}
             </div>
             <div style={{ fontSize: '20px', marginBottom: 4 }}>
               Orbital Period: {info.orbital.orbitalPeriodDays ?? 'N/A'} days
             </div>
             <div style={{ fontSize: '20px', marginBottom: 4 }}>
               Perihelion: {info.orbital.perihelionDistanceAU ?? 'N/A'} AU
             </div>
             <div style={{ fontSize: '20px', marginBottom: 8 }}>
               Aphelion: {info.orbital.aphelionDistanceAU ?? 'N/A'} AU
             </div>

             {/* Impact Risk Assessment */}
             <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>Impact Risk Assessment</div>
             <div style={{ 
               marginBottom: 4, 
               color: info.impactRisk.riskLevel === 'HIGH' ? '#ff6b6b' : 
                      info.impactRisk.riskLevel === 'MEDIUM' ? '#ffa500' : 
                      info.impactRisk.riskLevel === 'LOW' ? '#66ff66' : '#999'
             }}>
               Risk Level: {info.impactRisk.riskLevel}
             </div>
             {info.impactRisk.probability !== null && (
               <div style={{ fontSize: '20px', marginBottom: 4 }}>
                 Impact Probability: {(info.impactRisk.probability * 100).toFixed(6)}%
               </div>
             )}
             {info.impactRisk.nextCloseApproach.date && (
               <div style={{ fontSize: '20px', marginBottom: 4 }}>
                 Next Approach: {info.impactRisk.nextCloseApproach.date}
               </div>
             )}
             {info.impactRisk.yearsUntilNextApproach && (
               <div style={{ fontSize: '20px', marginBottom: 4 }}>
                 In: {info.impactRisk.yearsUntilNextApproach} years
               </div>
             )}
             {info.impactRisk.nextCloseApproach.missDistanceKm && (
               <div style={{ fontSize: '20px', marginBottom: 8 }}>
                 Next Miss Distance: {info.impactRisk.nextCloseApproach.missDistanceKm.toFixed(0)} km
               </div>
             )}
            
             {/* Integration Buttons */}
             <div 
               style={{ display: 'flex', gap: '8px', marginTop: '8px' }}
               onMouseDown={(e) => e.stopPropagation()}
               onClick={(e) => e.stopPropagation()}
             >
               <button
                 onClick={() => {
                   setNasaAsteroidData(info);
                   alert('Asteroid data integrated! The simulation now uses real NASA data.');
                 }}
                 style={{
                   flex: 1,
                   padding: '8px 12px',
                   background: 'linear-gradient(135deg, #66e0ff, #4dd4ff)',
                   border: '1px solid #66e0ff',
                   borderRadius: '6px',
                   color: '#000',
                   fontWeight: '600',
                   cursor: 'pointer'
                 }}
                 onMouseDown={(e) => e.stopPropagation()}
               >
                 🚀 Integrate
               </button>
               <button
                 onClick={() => {
                   clearNasaData();
                   alert('NASA data cleared! Using default asteroid.');
                 }}
                 style={{
                   flex: 1,
                   padding: '8px 12px',
                   background: 'linear-gradient(135deg, #ff6b6b, #ff5252)',
                   border: '1px solid #ff6b6b',
                   borderRadius: '6px',
                   color: '#fff',
                   fontWeight: '600',
                   cursor: 'pointer'
                 }}
                 onMouseDown={(e) => e.stopPropagation()}
               >
                 🔄 Reset
               </button>
             </div>
          </div>
        )}
      </div>
    );
  }