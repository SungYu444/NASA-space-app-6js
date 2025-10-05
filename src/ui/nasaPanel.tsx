import React, { useEffect, useState } from 'react';
import { preloadAsteroidListOnLoad, getAsteroidInfoById, type AsteroidListItem, type ProcessedAsteroidInfo } from '../Fetching/fetchNasa';

export default function NasaPanel() {
  const [list, setList] = useState<AsteroidListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [info, setInfo] = useState<ProcessedAsteroidInfo | null>(null);
  const [loading, setLoading] = useState(false);

  
  // Preload asteroid list on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const items = await preloadAsteroidListOnLoad();
        if (!cancelled) {
          setList(items);
          // Auto-select first item
          if (items.length > 0) setSelectedId(items[0].id);
        }
      } catch (err) {
        console.error('Failed to preload:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch details when user clicks "Search"
  const onSearch = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      const details = await getAsteroidInfoById(selectedId);
      setInfo(details);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <div className="Nasa Asteriod data" style={{ width: 380 }}>
      <h2>Today's Asteroid Near Earth</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 6 }}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading || list.length === 0}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,.06)',
            color: '#e7edf7',
            border: '1px solid rgba(255,255,255,.08)',
          }}
        >
          {list.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="btn" onClick={onSearch} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {/* Display asteroid details */}
      {info && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(255,255,255,.06)',
            color: '#e7edf7',
            fontSize: 14,
          }}
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
          <div style={{ marginBottom: 4 }}>Min: {info.size.kilometers.min} | Max: {info.size.kilometers.max} | Avg: {info.size.kilometers.avg}</div>

          <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>Speed</div>
          <div style={{ marginBottom: 4 }}>km/s: {info.speed.kmPerSecond ?? 'N/A'}</div>
          <div style={{ marginBottom: 4 }}>km/h: {info.speed.kmPerHour ?? 'N/A'}</div>
          <div style={{ marginBottom: 4 }}>mph: {info.speed.milesPerHour ?? 'N/A'}</div>

          <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 4 }}>Close Approach</div>
          <div style={{ marginBottom: 4 }}>Date: {info.closeApproach.date ?? 'N/A'}</div>
          <div>Miss Distance: {info.closeApproach.missDistanceKm ?? 'N/A'} km</div>
        </div>
      )}
    </div>
  );
}