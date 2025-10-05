import React, { useEffect, useState } from 'react';
import {
  preloadAsteroidListOnLoad,
  getAsteroidInfoById,
  type AsteroidListItem,
  type ProcessedAsteroidInfo
} from '../Fetching/fetchNasa';

export default function AsteroidViewer() {
  const [list, setList] = useState<AsteroidListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(''); // no auto-select
  const [info, setInfo] = useState<ProcessedAsteroidInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      console.error('Failed to fetch details:', err);
      setError('Failed to fetch asteroid details.');
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
          // size controls how many rows are visible when expanded; leave native expand via click
          size={1}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,.06)',
            color: '#e7edf7',
            border: '1px solid rgba(255,255,255,.08)',
            maxHeight: 240,            // allow more items without overflowing layout
            overflowY: 'auto',         // scroll if many items
          }}
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

        <button className="btn" onClick={onSearch} disabled={loading || !selectedId}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ff8585', marginBottom: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

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
          <div style={{ marginBottom: 4 }}>
            Min: {info.size.kilometers.min} | Max: {info.size.kilometers.max} | Avg: {info.size.kilometers.avg}
          </div>

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