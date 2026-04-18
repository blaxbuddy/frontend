/**
 * Vehicle Routing Problem (VRP) solver for food rescue logistics.
 *
 * Algorithm:
 *   1. Sort pending pickups by expiry (soonest first — user requirement)
 *   2. For each pickup, find the best-fit driver by:
 *      a) Vehicle capacity ≥ food quantity (large qty → large vehicle)
 *      b) Nearest suited vehicle (haversine distance)
 *   3. For each driver's assigned pickups, build a multi-stop route:
 *      pickup₁.business → pickup₁.shelter → pickup₂.business → pickup₂.shelter → …
 *   4. Chain Dijkstra legs (haversine) for distance calculation
 *   5. Optionally fetch OSRM road polylines for map display
 */

import type { Business, Driver, Pickup, Shelter } from "@/hooks/useLiveData";
import { haversineKm, type GeoNode } from "./dijkstra";
import { osrmMultiRoute, type OSRMRouteResult } from "./osrm";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RouteStop = {
  stopNumber: number;
  type: "pickup" | "dropoff";
  pickupId: string;
  locationId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  foodDescription: string;
  quantity: number;
  expiresAt: string;
  /** km from previous stop (0 for the first stop) */
  legDistanceKm: number;
};

export type DriverRoute = {
  driverId: string;
  driverName: string;
  vehicle: string;
  stops: RouteStop[];
  totalDistanceKm: number;
  /** Real road polyline (from OSRM), if available */
  roadPolyline: [number, number][] | null;
  /** Road distance in km (from OSRM), if available */
  roadDistanceKm: number | null;
  /** Estimated duration in minutes (from OSRM), if available */
  estimatedMinutes: number | null;
};

export type PlannedRoutes = {
  driverRoutes: DriverRoute[];
  unassignedPickups: Pickup[];
  totalDistanceKm: number;
};

/* ------------------------------------------------------------------ */
/*  Vehicle capacity tiers                                             */
/* ------------------------------------------------------------------ */

const VEHICLE_CAPACITY: Record<string, number> = {
  bike: 5,
  car: 20,
  van: 50,
  truck: 100,
};

const VEHICLE_RANK: Record<string, number> = {
  bike: 0,
  car: 1,
  van: 2,
  truck: 3,
};

/** Pick the minimum vehicle type that can carry `qty` units. */
function minVehicleForQty(qty: number): string {
  if (qty <= VEHICLE_CAPACITY.bike) return "bike";
  if (qty <= VEHICLE_CAPACITY.car) return "car";
  if (qty <= VEHICLE_CAPACITY.van) return "van";
  return "truck";
}

/* ------------------------------------------------------------------ */
/*  Core solver                                                        */
/* ------------------------------------------------------------------ */

/**
 * Plan optimised routes for all pending pickups across available drivers.
 *
 * Strategy (per user requirements):
 *  - Sort pickups by expiry (earliest first)
 *  - For each pickup, find the nearest driver whose vehicle capacity ≥ quantity
 *  - Assign pickup to that driver
 *  - Build each driver's ordered route
 */
export function planRoutes(
  drivers: Driver[],
  pickups: Pickup[],
  businesses: Business[],
  shelters: Shelter[],
): PlannedRoutes {
  const bizMap = new Map(businesses.map((b) => [b.id, b]));
  const shelMap = new Map(shelters.map((s) => [s.id, s]));

  // Only consider pending pickups and available drivers
  const pending = pickups
    .filter((p) => p.status === "pending")
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

  const availableDrivers = drivers.filter((d) => d.status === "available");

  // Track driver assignments: driverId → list of pickups assigned
  const assignments = new Map<string, Pickup[]>();
  // Track current driver position (updated as we assign pickups)
  const driverPositions = new Map<string, { lat: number; lng: number }>();
  // Track remaining capacity per driver
  const driverRemainingCapacity = new Map<string, number>();

  for (const d of availableDrivers) {
    assignments.set(d.id, []);
    driverPositions.set(d.id, { lat: d.lat, lng: d.lng });
    driverRemainingCapacity.set(d.id, d.capacity);
  }

  const unassigned: Pickup[] = [];

  // Assign pickups greedily: expiry-sorted, each goes to best-fit nearest driver
  for (const pickup of pending) {
    const biz = bizMap.get(pickup.business_id);
    if (!biz) {
      unassigned.push(pickup);
      continue;
    }

    const minVehicle = minVehicleForQty(pickup.quantity);
    const minRank = VEHICLE_RANK[minVehicle] ?? 0;

    // Filter drivers that can handle this quantity
    let candidates = availableDrivers.filter((d) => {
      const rank = VEHICLE_RANK[d.vehicle] ?? 0;
      const remaining = driverRemainingCapacity.get(d.id) ?? 0;
      return rank >= minRank && remaining >= pickup.quantity;
    });

    if (candidates.length === 0) {
      // Fallback: try any driver with enough remaining capacity
      candidates = availableDrivers.filter((d) => {
        const remaining = driverRemainingCapacity.get(d.id) ?? 0;
        return remaining >= pickup.quantity;
      });
    }

    if (candidates.length === 0) {
      unassigned.push(pickup);
      continue;
    }

    // Pick the nearest candidate from their current (possibly updated) position
    let bestDriver: Driver | null = null;
    let bestDist = Infinity;

    for (const d of candidates) {
      const pos = driverPositions.get(d.id)!;
      const dist = haversineKm(
        { id: "", lat: pos.lat, lng: pos.lng },
        { id: "", lat: biz.lat, lng: biz.lng },
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestDriver = d;
      }
    }

    if (!bestDriver) {
      unassigned.push(pickup);
      continue;
    }

    // Assign
    assignments.get(bestDriver.id)!.push(pickup);

    // Update driver's "current position" to the shelter (last dropoff point)
    const shelter = shelMap.get(pickup.shelter_id);
    if (shelter) {
      driverPositions.set(bestDriver.id, { lat: shelter.lat, lng: shelter.lng });
    }

    // Reduce remaining capacity
    const prev = driverRemainingCapacity.get(bestDriver.id) ?? 0;
    driverRemainingCapacity.set(bestDriver.id, prev - pickup.quantity);
  }

  // Build routes for each driver
  const driverRoutes: DriverRoute[] = [];

  for (const d of availableDrivers) {
    const assigned = assignments.get(d.id) ?? [];
    if (assigned.length === 0) continue;

    const stops: RouteStop[] = [];
    let prevLat = d.lat;
    let prevLng = d.lng;
    let totalDist = 0;
    let stopNum = 1;

    for (const pickup of assigned) {
      const biz = bizMap.get(pickup.business_id);
      const shelter = shelMap.get(pickup.shelter_id);
      if (!biz || !shelter) continue;

      // Leg: previous position → business (pickup)
      const legToBiz = haversineKm(
        { id: "", lat: prevLat, lng: prevLng },
        { id: "", lat: biz.lat, lng: biz.lng },
      );
      totalDist += legToBiz;

      stops.push({
        stopNumber: stopNum++,
        type: "pickup",
        pickupId: pickup.id,
        locationId: biz.id,
        name: biz.name,
        address: biz.address,
        lat: biz.lat,
        lng: biz.lng,
        foodDescription: pickup.food_description,
        quantity: pickup.quantity,
        expiresAt: pickup.expires_at,
        legDistanceKm: legToBiz,
      });

      // Leg: business → shelter (dropoff)
      const legToShelter = haversineKm(
        { id: "", lat: biz.lat, lng: biz.lng },
        { id: "", lat: shelter.lat, lng: shelter.lng },
      );
      totalDist += legToShelter;

      stops.push({
        stopNumber: stopNum++,
        type: "dropoff",
        pickupId: pickup.id,
        locationId: shelter.id,
        name: shelter.name,
        address: shelter.address,
        lat: shelter.lat,
        lng: shelter.lng,
        foodDescription: pickup.food_description,
        quantity: pickup.quantity,
        expiresAt: pickup.expires_at,
        legDistanceKm: legToShelter,
      });

      prevLat = shelter.lat;
      prevLng = shelter.lng;
    }

    driverRoutes.push({
      driverId: d.id,
      driverName: d.name,
      vehicle: d.vehicle,
      stops,
      totalDistanceKm: totalDist,
      roadPolyline: null,
      roadDistanceKm: null,
      estimatedMinutes: null,
    });
  }

  return {
    driverRoutes,
    unassignedPickups: unassigned,
    totalDistanceKm: driverRoutes.reduce((s, r) => s + r.totalDistanceKm, 0),
  };
}

/* ------------------------------------------------------------------ */
/*  OSRM enrichment — fetch real road polylines for each driver route  */
/* ------------------------------------------------------------------ */

/**
 * Enrich planned routes with OSRM road polylines.
 * This is async and optional — the routes work fine with haversine-only.
 */
export async function enrichWithOSRM(
  routes: PlannedRoutes,
  drivers: Driver[],
): Promise<PlannedRoutes> {
  const enriched = { ...routes, driverRoutes: [...routes.driverRoutes] };

  await Promise.all(
    enriched.driverRoutes.map(async (route, idx) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      if (!driver || route.stops.length === 0) return;

      // Build waypoint list: driver position → stop1 → stop2 → …
      const waypoints: { lat: number; lng: number }[] = [
        { lat: driver.lat, lng: driver.lng },
        ...route.stops.map((s) => ({ lat: s.lat, lng: s.lng })),
      ];

      const osrmResult = await osrmMultiRoute(waypoints);
      if (osrmResult) {
        enriched.driverRoutes[idx] = {
          ...route,
          roadPolyline: osrmResult.geometry,
          roadDistanceKm: osrmResult.distanceM / 1000,
          estimatedMinutes: Math.round(osrmResult.durationS / 60),
        };
      }
    }),
  );

  return enriched;
}
