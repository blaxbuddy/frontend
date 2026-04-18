import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_BUSINESSES,
  DEMO_SHELTERS,
  DEMO_DRIVERS,
  DEMO_PICKUPS,
} from "@/lib/demoData";

export type Business = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  closes_at: string;
  type?: "restaurant" | "business";
  user_id?: string;
};

export type Shelter = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  accepts_until: string;
  type?: "ngo" | "shelter";
  user_id?: string;
};

export type Driver = {
  id: string;
  name: string;
  vehicle: "bike" | "car" | "van" | "truck";
  capacity: number;
  lat: number;
  lng: number;
  status: "available" | "en_route" | "offline";
  updated_at: string;
  user_id?: string;
};

export type Pickup = {
  id: string;
  business_id: string;
  shelter_id: string;
  driver_id: string | null;
  food_description: string;
  quantity: number;
  expires_at: string;
  status: "pending" | "claimed" | "in_transit" | "delivered" | "expired";
  user_id?: string;
};

/**
 * Provides live data for the dashboard.
 * Fetches real data from Supabase; falls back to demo data.
 * Filters pickups by logged-in user if userIds provided.
 */
export function useLiveData(userIds?: { supabaseUserId?: string; role?: string }) {
  const [businesses, setBusinesses] = useState<Business[]>(DEMO_BUSINESSES as Business[]);
  const [shelters, setShelters] = useState<Shelter[]>(DEMO_SHELTERS as Shelter[]);
  const [drivers, setDrivers] = useState<Driver[]>(DEMO_DRIVERS as Driver[]);
  const [pickups, setPickups] = useState<Pickup[]>(DEMO_PICKUPS as Pickup[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch businesses
        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*');

        if (!bizError && bizData) {
          setBusinesses(bizData as Business[]);
        }

        // Fetch shelters
        const { data: shelterData, error: shelterError } = await supabase
          .from('shelters')
          .select('*');

        if (!shelterError && shelterData) {
          setShelters(shelterData as Shelter[]);
        }

        // Fetch drivers
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*');

        if (!driverError && driverData) {
          setDrivers(driverData as Driver[]);
        }

        // Fetch pickups
        let pickupQuery = supabase.from('pickups').select('*');

        // Note: Filtering by user_id may not work until the migration is applied
        // For now, we'll fetch all and filter client-side if needed
        const { data: pickupData, error: pickupError } = await pickupQuery;

        if (!pickupError && pickupData) {
          const filtered = pickupData.filter((p: any) => {
            if (!userIds?.supabaseUserId) return true;
            return p.user_id === userIds.supabaseUserId;
          });
          setPickups(filtered as Pickup[]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch live data:', err);
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime updates for drivers
    const driversSub = supabase
      .channel('drivers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        (payload: any) => {
          setDrivers((prev) => {
            const updated = prev.filter((d) => d.id !== (payload.new as any)?.id);
            return [...updated, (payload.new as Driver)];
          });
        }
      )
      .subscribe();

    // Subscribe to realtime updates for pickups
    const pickupsSub = supabase
      .channel('pickups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickups' },
        (payload: any) => {
          const newPickup = payload.new as any;
          if (!userIds?.supabaseUserId || newPickup?.user_id === userIds.supabaseUserId) {
            setPickups((prev) => {
              const updated = prev.filter((p) => p.id !== newPickup?.id);
              return [...updated, (newPickup as Pickup)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      driversSub.unsubscribe();
      pickupsSub.unsubscribe();
    };
  }, [userIds?.supabaseUserId]);

  return { businesses, shelters, drivers, pickups, loading };
}