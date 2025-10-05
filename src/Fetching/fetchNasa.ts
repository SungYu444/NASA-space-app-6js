import 'dotenv/config'

const API_KEY = process.env.NASA_API_KEY ?? 'DEMO_KEY'
const bse_Url = process.env.BASE_URL ?? 'https://api.nasa.gov/neo/rest/v1'
/*
object type to save each data
*/
type DiameterRange = {
  estimated_diameter_min: number;
  estimated_diameter_max: number;
};

type EstimatedDiameter = {
  kilometers: DiameterRange;
  meters: DiameterRange;
  feet: DiameterRange;
  miles: DiameterRange;
};

type CloseApproachData = {
  close_approach_date: string;
  relative_velocity: {
    kilometers_per_second: string;
    kilometers_per_hour: string;
    miles_per_hour: string;
  };
  miss_distance: {
    kilometers: string;
    meters: string;
    miles: string;
    astronomical: string;
  };
  orbiting_body: string;
};

type OrbitalData = {
  orbit_id: string;
  orbit_determination_date: string;
  first_observation_date: string;
  last_observation_date: string;
  data_arc_in_days: number;
  observations_used: number;
  orbit_uncertainty: string;
  minimum_orbit_intersection: string;
  jupiter_tisserand_invariant: string;
  epoch_osculation: string;
  eccentricity: string;
  semi_major_axis: string;
  inclination: string;
  ascending_node_longitude: string;
  orbital_period: string;
  perihelion_distance: string;
  perihelion_argument: string;
  aphelion_distance: string;
  perihelion_time: string;
  mean_anomaly: string;
  mean_motion: string;
};

// Raw response from NASA for a single asteroid
export type NeoDetail = {
  id: string;
  neo_reference_id: string;
  name: string;
  designation: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: EstimatedDiameter;
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: CloseApproachData[];
  orbital_data: OrbitalData;
  is_sentry_object: boolean;
};

// Simplified list item
export type AsteroidListItem = {
  id: string;
  name: string;
  isPotentiallyHazardous: boolean;
};

// NEW: Better organized structure for frontend


export type ProcessedAsteroidInfo = {
  // Basic Info
  basicInfo: {
    id: string;
    name: string;
    designation: string;
    nasaJplUrl: string;
    absoluteMagnitude: number;
    isPotentiallyHazardous: boolean;
  };
  
  // Size/Diameter Info
  size: {
    kilometers: {
      min: number;
      max: number;
      avg: number;
    };
    meters: {
      min: number;
      max: number;
    };
  };
  
  // Speed Info (from latest close approach)
  speed: {
    kmPerSecond: number | null;
    kmPerHour: number | null;
    milesPerHour: number | null;
  };
  
  // Orbital Info
  orbital: {
    inclinationDegrees: number | null;
  };
  
  // Close Approach Info
  closeApproach: {
    date: string | null;
    missDistanceKm: number | null;
  };
};

/*
fetching data from NASA api and put those data into the objects 
*/ 

export async function fetchAsteroidList(date: string): Promise<AsteroidListItem[]> {
  const best_url = `${bse_Url}/feed?start_date=${date}&end_date=${date}&api_key=${API_KEY}`;
  
  const response = await fetch(best_url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asteroid list: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const neos = data.near_earth_objects?.[date] || [];
  
  return neos.map((neo: any) => ({
    id: neo.id,
    name: neo.name,
    isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
  }));
}

/**
 * Fetches detailed information about a specific asteroid by ID.
 * @param asteroidId - NASA NEO ID
 * @returns Detailed asteroid data
 */
export async function fetchAsteroidDetails(asteroidId: string): Promise<NeoDetail> {
  const best_url = `${bse_Url}/neo/${asteroidId}?api_key=${API_KEY}`;
  
  const response = await fetch(best_url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asteroid details: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Preload asteroid list on page load.
 * Falls back to yesterday if today's feed is empty.
 */
export async function preloadAsteroidListOnLoad(): Promise<AsteroidListItem[]> {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10);

  let list = await fetchAsteroidList(ymd);

  // Optional: fallback to yesterday if today is empty
  if (list.length === 0) {
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const ymdYesterday = yesterday.toISOString().slice(0, 10);
    list = await fetchAsteroidList(ymdYesterday);
  }

  return list;
}

/**
 * Pick the close-approach entry closest to the reference date.
 * Preference:
 * 1) The most recent approach in the past (<= reference).
 * 2) If none in the past, the earliest future approach.
 */
function latestRelevantApproach(
  arr: CloseApproachData[] | undefined,
  reference: Date = new Date()
): CloseApproachData | null {
  if (!arr || arr.length === 0) return null;

  const refTime = reference.getTime();

  // Parse dates as UTC midnight to avoid TZ off-by-one issues
  const toTime = (d: string) => Date.parse(d + 'T00:00:00Z');

  let bestPast: { item: CloseApproachData; time: number } | null = null;   // max time <= ref
  let bestFuture: { item: CloseApproachData; time: number } | null = null; // min time > ref

  for (const ca of arr) {
    const t = toTime(ca.close_approach_date);
    if (t <= refTime) {
      if (!bestPast || t > bestPast.time) bestPast = { item: ca, time: t };
    } else {
      if (!bestFuture || t < bestFuture.time) bestFuture = { item: ca, time: t };
    }
  }

  if (bestPast) return bestPast.item;
  if (bestFuture) return bestFuture.item;
  return null;
}

/**
 * Process raw NASA data into a clean, organized, UI-ready format.
 * Returns data grouped by category for easier frontend consumption.
 * @param detail - Raw NeoDetail from NASA
 * @returns ProcessedAsteroidInfo with organized, calculated fields
 */
export function processAsteroidData(detail: NeoDetail): ProcessedAsteroidInfo {
  const km = detail.estimated_diameter.kilometers;
  const m = detail.estimated_diameter.meters;

  // Pick the approach closest to now
  const latest = latestRelevantApproach(detail.close_approach_data);

  const round2 = (n: number) => Number(n.toFixed(2));
  const parseNum = (s: string | number | undefined | null): number | null => {
    if (s === undefined || s === null) return null;
    const n = typeof s === 'number' ? s : parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const speedKps = latest ? parseNum(latest.relative_velocity.kilometers_per_second) : null;
  const speedKph = latest ? parseNum(latest.relative_velocity.kilometers_per_hour) : null;
  const speedMph = latest ? parseNum(latest.relative_velocity.miles_per_hour) : null;
  const missKm   = latest ? parseNum(latest.miss_distance.kilometers) : null;
  const inclDeg  = detail.orbital_data?.inclination ? parseNum(detail.orbital_data.inclination) : null;

  return {
    basicInfo: {
      id: detail.id,
      name: detail.name,
      designation: detail.designation,
      nasaJplUrl: detail.nasa_jpl_url,
      absoluteMagnitude: round2(detail.absolute_magnitude_h),
      isPotentiallyHazardous: detail.is_potentially_hazardous_asteroid,
    },
    
    size: {
      kilometers: {
        min: round2(km.estimated_diameter_min),
        max: round2(km.estimated_diameter_max),
        avg: round2((km.estimated_diameter_min + km.estimated_diameter_max) / 2),
      },
      meters: {
        min: round2(m.estimated_diameter_min),
        max: round2(m.estimated_diameter_max),
      },
    },
    
    speed: {
      kmPerSecond: speedKps !== null ? round2(speedKps) : null,
      kmPerHour: speedKph !== null ? round2(speedKph) : null,
      milesPerHour: speedMph !== null ? round2(speedMph) : null,
    },
    
    orbital: {
      inclinationDegrees: inclDeg !== null ? round2(inclDeg) : null,
    },
    
    closeApproach: {
      date: latest ? latest.close_approach_date : null,
      missDistanceKm: missKm !== null ? round2(missKm) : null,
    },
  };
}

/**
 * Main orchestrator: input asteroid ID, output all processed data.
 * This is what React will call when user selects an asteroid and clicks "Search".
 * @param asteroidId - NASA NEO ID (e.g., "3542519")
 * @returns Processed asteroid info ready for display
 */
export async function getAsteroidInfoById(asteroidId: string): Promise<ProcessedAsteroidInfo | null> {
  try {
    const detail = await fetchAsteroidDetails(asteroidId);
    return processAsteroidData(detail);
  } catch (err) {
    console.error('Failed to fetch asteroid by ID:', err);
    return null;
  }
}





// ========== TEST SECTION ==========
async function main() {
  try {
    const asteroidId = '2247517'; // Change this to test different asteroids
    console.log(`Searching for asteroid ID: "${asteroidId}"`);
    console.log('---');

    const result = await getAsteroidInfoById(asteroidId);
    
    if (!result) {
      console.log('❌ Asteroid not found.');
      return;
    }

    console.log('✅ Asteroid found!');
    console.log('---');
    console.log('BASIC INFO:');
    console.log('  ID:', result.basicInfo.id);
    console.log('  Name:', result.basicInfo.name);
    console.log('  Designation:', result.basicInfo.designation);
    console.log('  Absolute Magnitude (H):', result.basicInfo.absoluteMagnitude);
    console.log('  Potentially Hazardous:', result.basicInfo.isPotentiallyHazardous ? 'YES' : 'NO');
    console.log('  NASA JPL URL:', result.basicInfo.nasaJplUrl);
    console.log('---');
    console.log('SIZE INFO:');
    console.log('  Diameter (km):');
    console.log('    Min:', result.size.kilometers.min, 'km');
    console.log('    Max:', result.size.kilometers.max, 'km');
    console.log('    Avg:', result.size.kilometers.avg, 'km');
    console.log('  Diameter (meters):');
    console.log('    Min:', result.size.meters.min, 'm');
    console.log('    Max:', result.size.meters.max, 'm');
    console.log('---');
    console.log('SPEED INFO:');
    console.log('  Speed (km/s):', result.speed.kmPerSecond);
    console.log('  Speed (km/h):', result.speed.kmPerHour);
    console.log('  Speed (mph):', result.speed.milesPerHour);
    console.log('---');
    console.log('ORBITAL INFO:');
    console.log('  Inclination:', result.orbital.inclinationDegrees, '°');
    console.log('---');
    console.log('CLOSE APPROACH INFO:');
    console.log('  Date:', result.closeApproach.date);
    console.log('  Miss Distance:', result.closeApproach.missDistanceKm, 'km');
    
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}
  

// Test preload

(async () => {
  const list = await preloadAsteroidListOnLoad();
  console.log('Preload list length:', list.length);
  console.log('Sample (first 5):');
  list.slice(0, 5).forEach(item => {
    console.log(`${item.name} (ID: ${item.id})`);
  });
})();

// Uncomment to test asteroid search by ID
 //main();
 

/*
use preloadTsteroidListonLoad on react to show a loaded information 
*/ 