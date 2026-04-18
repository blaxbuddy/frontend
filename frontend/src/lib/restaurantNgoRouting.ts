/**
 * Multi-stop route optimization between restaurants and NGOs.
 * Uses haversine distance for offline calculation (no external dependencies).
 * Implements a greedy nearest-neighbor approach with alternating pickups/dropoffs.
 */

import { Business, Shelter } from "@/hooks/useLiveData";
import { haversineKm, GeoNode } from "./dijkstra";
import { osrmMultiRoute } from "./osrm";

export type LocationType = "restaurant" | "ngo" | "origin";

export type RouteStop = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: "pickup" | "dropoff";
  locationName: string;
  distanceFromPrevious: number; // km
  cumulativeDistance: number; // km from start
};

export type RestaurantNgoRoute = {
  stops: RouteStop[];
  totalDistance: number; // km
  estimatedDuration: number; // minutes (rough: 0.5km per minute)
  startPoint: GeoNode;
  geoJSON: GeoJSON.Feature[];
  /** Real road polyline from OSRM, if available */
  roadPolyline: [number, number][] | null;
  /** Road distance in km from OSRM, if available */
  roadDistanceKm: number | null;
  /** Estimated travel time from OSRM, if available */
  estimatedMinutes: number | null;
};

export type GeoJSON = {
  Feature: {
    type: "Feature";
    geometry: {
      type: "LineString" | "Point";
      coordinates: [number, number][]; // [lng, lat]
    };
    properties: Record<string, unknown>;
  };
};

/**
 * Find the nearest location to a given point.
 * Returns the location and distance (km).
 */
function findNearest(
  from: GeoNode,
  candidates: GeoNode[],
  exclude?: Set<string>,
): { node: GeoNode; distanceKm: number } | null {
  if (candidates.length === 0) return null;

  let best = { node: candidates[0], distanceKm: Infinity };

  for (const candidate of candidates) {
    if (exclude?.has(candidate.id)) continue;

    const distance = haversineKm(from, candidate);
    if (distance < best.distanceKm) {
      best = { node: candidate, distanceKm: distance };
    }
  }

  return best.distanceKm === Infinity ? null : best;
}

/**
 * Build a multi-stop route: start → restaurant₁ → NGO₁ → restaurant₂ → NGO₂ → ...
 *
 * Algorithm:
 * 1. Start at origin point
 * 2. Greedily find nearest unvisited restaurant
 * 3. Add pickup stop
 * 4. Find nearest NGO that hasn't been visited yet
 * 5. Add dropoff stop
 * 6. Repeat 2-5 until all restaurants or NGOs exhausted
 * 7. Return complete route with distances
 */
export function buildMultiStopRoute(
  restaurants: Business[],
  ngos: Shelter[],
  startPoint: GeoNode,
): RestaurantNgoRoute {
  const stops: RouteStop[] = [];
  let cumulativeDistance = 0;
  let currentPoint = startPoint;

  const visitedRestaurants = new Set<string>();
  const visitedNgos = new Set<string>();

  // Convert to GeoNode format for distance calculations
  const restaurantNodes: GeoNode[] = restaurants.map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
  }));

  const ngoNodes: GeoNode[] = ngos.map((n) => ({
    id: n.id,
    lat: n.lat,
    lng: n.lng,
  }));

  // Alternate between pickups and dropoffs
  while (
    visitedRestaurants.size < restaurants.length ||
    visitedNgos.size < ngos.length
  ) {
    // Find nearest unvisited restaurant for pickup
    if (visitedRestaurants.size < restaurants.length) {
      const nearest = findNearest(currentPoint, restaurantNodes, visitedRestaurants);

      if (nearest) {
        const restaurant = restaurants.find((r) => r.id === nearest.node.id)!;
        const distanceKm = nearest.distanceKm;
        cumulativeDistance += distanceKm;

        stops.push({
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          lat: restaurant.lat,
          lng: restaurant.lng,
          type: "pickup",
          locationName: restaurant.name,
          distanceFromPrevious: distanceKm,
          cumulativeDistance,
        });

        visitedRestaurants.add(restaurant.id);
        currentPoint = nearest.node;
      }
    }

    // Find nearest unvisited NGO for dropoff
    if (visitedNgos.size < ngos.length && stops[stops.length - 1]?.type === "pickup") {
      const nearest = findNearest(currentPoint, ngoNodes, visitedNgos);

      if (nearest) {
        const ngo = ngos.find((n) => n.id === nearest.node.id)!;
        const distanceKm = nearest.distanceKm;
        cumulativeDistance += distanceKm;

        stops.push({
          id: ngo.id,
          name: ngo.name,
          address: ngo.address,
          lat: ngo.lat,
          lng: ngo.lng,
          type: "dropoff",
          locationName: ngo.name,
          distanceFromPrevious: distanceKm,
          cumulativeDistance,
        });

        visitedNgos.add(ngo.id);
        currentPoint = nearest.node;
      }
    }

    // Break if both lists are exhausted
    if (visitedRestaurants.size >= restaurants.length && visitedNgos.size >= ngos.length) {
      break;
    }

    // Prevent infinite loop
    if (stops.length > restaurants.length + ngos.length) {
      break;
    }
  }

  // Convert to GeoJSON for map rendering
  const geoJSON = routeToGeoJSON(stops, startPoint);

  // Rough estimate: assume average speed is ~2km/minute in city traffic (30 km/h typical)
  const estimatedDuration = Math.ceil(cumulativeDistance * 2);

  return {
    stops,
    totalDistance: parseFloat(cumulativeDistance.toFixed(2)),
    estimatedDuration,
    startPoint,
    geoJSON,
    roadPolyline: null,
    roadDistanceKm: null,
    estimatedMinutes: null,
  };
}

/**
 * Convert route stops to GeoJSON features for Leaflet visualization.
 * Includes:
 * - LineString polyline connecting all stops
 * - Point features for each stop
 */
function routeToGeoJSON(
  stops: RouteStop[],
  startPoint: GeoNode,
): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];

  // Polyline connecting all stops
  const coordinates: [number, number][] = [[startPoint.lng, startPoint.lat]];
  for (const stop of stops) {
    coordinates.push([stop.lng, stop.lat]);
  }

  features.push({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates,
    },
    properties: {
      name: "Route",
      stops: stops.length,
      distance: stops.length > 0 ? stops[stops.length - 1].cumulativeDistance : 0,
    },
  });

  // Point features for each stop
  stops.forEach((stop, index) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [stop.lng, stop.lat],
      },
      properties: {
        id: stop.id,
        name: stop.name,
        type: stop.type,
        index: index + 1,
        distance: stop.cumulativeDistance.toFixed(2),
      },
    });
  });

  return features;
}

/**
 * Simple distance calculation between two coordinates.
 * Used for UI displays or alternative routing.
 */
export function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  return haversineKm(
    { id: "from", lat: from.lat, lng: from.lng },
    { id: "to", lat: to.lat, lng: to.lng },
  );
}

/**
 * Enrich a restaurant→NGO route with OSRM real road polylines.
 * This is async and best-effort — the route still works without OSRM.
 */
export async function enrichRestaurantNgoRouteWithOSRM(
  route: RestaurantNgoRoute,
): Promise<RestaurantNgoRoute> {
  if (route.stops.length === 0) return route;

  // Build waypoint list: start → stop1 → stop2 → …
  const waypoints: { lat: number; lng: number }[] = [
    { lat: route.startPoint.lat, lng: route.startPoint.lng },
    ...route.stops.map((s) => ({ lat: s.lat, lng: s.lng })),
  ];

  try {
    const osrmResult = await osrmMultiRoute(waypoints);
    if (osrmResult) {
      return {
        ...route,
        roadPolyline: osrmResult.geometry,
        roadDistanceKm: osrmResult.distanceM / 1000,
        estimatedMinutes: Math.round(osrmResult.durationS / 60),
      };
    }
  } catch {
    console.warn("OSRM enrichment failed for restaurant→NGO route, using haversine");
  }

  return route;
}
