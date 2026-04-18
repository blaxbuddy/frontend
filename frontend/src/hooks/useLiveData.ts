import { useState } from "react";
import {
  DEMO_BUSINESSES,
  DEMO_SHELTERS,
  DEMO_DRIVERS,
  DEMO_PICKUPS,
} from "@/lib/demoData";

export type Business = {
  id: string; name: string; address: string;
  lat: number; lng: number; closes_at: string;
  type?: "restaurant" | "business";
};
export type Shelter = {
  id: string; name: string; address: string;
  lat: number; lng: number; capacity: number; accepts_until: string;
  type?: "ngo" | "shelter";
};
export type Driver = {
  id: string; name: string; vehicle: "bike" | "car" | "van" | "truck";
  capacity: number; lat: number; lng: number;
  status: "available" | "en_route" | "offline";
  updated_at: string;
};
export type Pickup = {
  id: string; business_id: string; shelter_id: string;
  driver_id: string | null; food_description: string;
  quantity: number; expires_at: string;
  status: "pending" | "claimed" | "in_transit" | "delivered" | "expired";
};

/**
 * Provides live data for the dashboard.
 * Uses hardcoded demo data — no external dependencies.
 */
export function useLiveData() {
  const [businesses] = useState(DEMO_BUSINESSES as Business[]);
  const [shelters] = useState(DEMO_SHELTERS as Shelter[]);
  const [drivers] = useState(DEMO_DRIVERS as Driver[]);
  const [pickups] = useState(DEMO_PICKUPS as Pickup[]);
  const loading = false;

  return { businesses, shelters, drivers, pickups, loading };
}
