/**
 * OSRM (Open Source Routing Machine) integration.
 * Uses the free public demo server to fetch real road-network routes.
 *
 * NOTE: The public demo is for development/demo use. For production,
 * self-host OSRM or use a commercial instance.
 */

const OSRM_BASE = "https://router.project-osrm.org";

export type OSRMRouteResult = {
  /** Decoded polyline as [lat, lng][] */
  geometry: [number, number][];
  /** Distance in metres */
  distanceM: number;
  /** Duration in seconds */
  durationS: number;
};

/**
 * Fetch the driving route between two points via OSRM.
 * Returns the road-following polyline + distance + duration.
 */
export async function osrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<OSRMRouteResult | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=polyline`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;

    const route = data.routes[0];
    return {
      geometry: decodePolyline(route.geometry),
      distanceM: route.distance,
      durationS: route.duration,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a multi-waypoint driving route via OSRM.
 * Points are visited in the order given (no re-ordering by OSRM).
 */
export async function osrmMultiRoute(
  points: { lat: number; lng: number }[],
): Promise<OSRMRouteResult | null> {
  if (points.length < 2) return null;

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=polyline`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;

    const route = data.routes[0];
    return {
      geometry: decodePolyline(route.geometry),
      distanceM: route.distance,
      durationS: route.duration,
    };
  } catch {
    return null;
  }
}

/**
 * Decode Google-encoded polyline (precision 5) into [lat, lng][].
 * OSRM uses this format by default with `geometries=polyline`.
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
