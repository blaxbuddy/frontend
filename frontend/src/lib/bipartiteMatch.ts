/**
 * Bipartite Matching Engine
 * 
 * Matches food donation pickups to available volunteer drivers
 * based on the weight of the food and the volunteer's vehicle type.
 *
 * Weight → Vehicle mapping:
 *   0  – 20 kg  →  2-wheeler (Bike/Scooter)
 *  21  – 50 kg  →  3-wheeler (Auto/Rickshaw)
 *  51  – 200 kg →  4-wheeler (Car/Van)
 *  200+ kg      →  truck
 *
 * A larger vehicle can ALWAYS carry a smaller load (e.g. a truck can do a 5 kg job).
 */

// ─── Types ───────────────────────────────────────────────────────────
export type VehicleType = '2-wheeler' | '3-wheeler' | '4-wheeler' | 'truck';

export interface Pickup {
  id: string;
  weightKg: number;
  requiredVehicle: VehicleType;
  assignedDriverId?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  vehicleType: VehicleType;
  isOnline: boolean;
}

export interface MatchResult {
  pickupId: string;
  driverId: string;
  driverName: string;
  vehicleType: VehicleType;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Numeric tier for a vehicle type — higher = bigger capacity */
const VEHICLE_TIER: Record<VehicleType, number> = {
  '2-wheeler': 1,
  '3-wheeler': 2,
  '4-wheeler': 3,
  'truck': 4,
};

/** Determine the minimum required vehicle for a given weight (kg). */
export function requiredVehicleForWeight(weightKg: number): VehicleType {
  if (weightKg <= 20) return '2-wheeler';
  if (weightKg <= 50) return '3-wheeler';
  if (weightKg <= 200) return '4-wheeler';
  return 'truck';
}

/** Can this driver's vehicle handle the required vehicle tier? */
export function canDriverHandle(driverVehicle: VehicleType, requiredVehicle: VehicleType): boolean {
  return VEHICLE_TIER[driverVehicle] >= VEHICLE_TIER[requiredVehicle];
}

// ─── Bipartite Matching ──────────────────────────────────────────────

/**
 * Greedy bipartite matching: assign each unassigned pickup to the
 * best-fit available driver (smallest vehicle that can handle it).
 *
 * This is the "best-fit decreasing" heuristic:
 *  1. Sort pickups heaviest-first so large loads get priority.
 *  2. For each pickup, find the available driver whose vehicle is the
 *     smallest that can still carry the load ("best fit").
 *  3. Assign and remove that driver from the pool.
 */
export function matchPickupsToDrivers(
  pickups: Pickup[],
  drivers: Driver[]
): MatchResult[] {
  // Only consider unassigned pickups
  const unassigned = pickups
    .filter(p => !p.assignedDriverId)
    .sort((a, b) => b.weightKg - a.weightKg); // heaviest first

  // Only consider online drivers
  const availableDrivers = drivers
    .filter(d => d.isOnline)
    .map(d => ({ ...d })); // clone so we can mutate

  const matches: MatchResult[] = [];

  for (const pickup of unassigned) {
    // Find all drivers that can handle this pickup, sorted by smallest vehicle first
    const eligible = availableDrivers
      .filter(d => canDriverHandle(d.vehicleType, pickup.requiredVehicle))
      .sort((a, b) => VEHICLE_TIER[a.vehicleType] - VEHICLE_TIER[b.vehicleType]);

    if (eligible.length > 0) {
      const bestDriver = eligible[0];

      matches.push({
        pickupId: pickup.id,
        driverId: bestDriver.id,
        driverName: bestDriver.name,
        vehicleType: bestDriver.vehicleType,
      });

      // Remove this driver from the pool (one delivery at a time)
      const idx = availableDrivers.findIndex(d => d.id === bestDriver.id);
      if (idx !== -1) availableDrivers.splice(idx, 1);
    }
  }

  return matches;
}
