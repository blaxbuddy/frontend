/**
 * Nominatim (OpenStreetMap) geocoding helper.
 * Free, no API key required — respects the 1 req/s usage policy via a simple queue.
 */

export type GeoResult = { lat: number; lng: number; displayName: string };

const cache = new Map<string, GeoResult>();
let lastCall = 0;
const MIN_GAP_MS = 1100; // Nominatim: max 1 req/s

async function throttle(): Promise<void> {
  const wait = MIN_GAP_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

/**
 * Geocode a free-text address to lat/lng via Nominatim.
 * Results are cached in-memory so repeated lookups are instant.
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const key = address.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  await throttle();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "FoodRescueDashboard/1.0" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const hit = data[0];
  const result: GeoResult = {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    displayName: hit.display_name ?? address,
  };
  cache.set(key, result);
  return result;
}

/**
 * Reverse-geocode lat/lng to a readable address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  await throttle();

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "FoodRescueDashboard/1.0" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  return data.display_name ?? null;
}
