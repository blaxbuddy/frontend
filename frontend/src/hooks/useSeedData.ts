import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Seeds Supabase with demo data when the tables are empty.
 * Runs once on mount — safe to call on every page load.
 *
 * Includes: 6 restaurants (businesses), 4 NGO shelters, 4 drivers,
 * and 8 pending pickups ready for the route planner.
 */
export function useSeedData() {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    (async () => {
      try {
        // Check if data already exists
        const { count } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true });

        if (count && count > 0) {
          console.log("[seed] Data already exists, skipping seed.");
          return;
        }

        console.log("[seed] No data found — seeding demo data…");

        // ---- Businesses (Restaurants with surplus food) ----
        const { data: bizData } = await supabase
          .from("businesses")
          .insert([
            {
              name: "Truffles Restaurant",
              address: "St. Marks Rd, Bengaluru",
              lat: 12.9748,
              lng: 77.6010,
              closes_at: "23:00:00",
            },
            {
              name: "Vidyarthi Bhavan",
              address: "Gandhi Bazaar, Bengaluru",
              lat: 12.9520,
              lng: 77.5720,
              closes_at: "20:30:00",
            },
            {
              name: "Meghana Foods",
              address: "Residency Rd, Bengaluru",
              lat: 12.9690,
              lng: 77.6055,
              closes_at: "22:00:00",
            },
            {
              name: "Empire Restaurant",
              address: "Church St, Bengaluru",
              lat: 12.9760,
              lng: 77.6080,
              closes_at: "01:00:00",
            },
            {
              name: "CTR - Central Tiffin Room",
              address: "Malleshwaram, Bengaluru",
              lat: 12.9950,
              lng: 77.5700,
              closes_at: "21:00:00",
            },
            {
              name: "Brahmin's Coffee Bar",
              address: "Shankarapuram, Bengaluru",
              lat: 12.9580,
              lng: 77.5680,
              closes_at: "19:30:00",
            },
          ])
          .select();

        if (!bizData) {
          console.error("[seed] Failed to insert businesses");
          return;
        }

        // ---- Shelters (NGOs) ----
        const { data: shelterData } = await supabase
          .from("shelters")
          .insert([
            {
              name: "Akshaya Patra Foundation",
              address: "Rajajinagar, Bengaluru",
              lat: 12.9910,
              lng: 77.5530,
              capacity: 200,
              accepts_until: "22:00:00",
            },
            {
              name: "The Robin Hood Army Hub",
              address: "Koramangala, Bengaluru",
              lat: 12.9350,
              lng: 77.6250,
              capacity: 100,
              accepts_until: "21:30:00",
            },
            {
              name: "Feeding India Centre",
              address: "Jayanagar, Bengaluru",
              lat: 12.9300,
              lng: 77.5820,
              capacity: 150,
              accepts_until: "23:00:00",
            },
            {
              name: "No Food Waste Depot",
              address: "Indiranagar, Bengaluru",
              lat: 12.9780,
              lng: 77.6400,
              capacity: 80,
              accepts_until: "20:00:00",
            },
          ])
          .select();

        if (!shelterData) {
          console.error("[seed] Failed to insert shelters");
          return;
        }

        // ---- Drivers (Volunteers) ----
        await supabase.from("drivers").insert([
          {
            name: "Ravi Kumar",
            vehicle: "van",
            capacity: 50,
            lat: 12.9716,
            lng: 77.5946,
            status: "available",
          },
          {
            name: "Priya Sharma",
            vehicle: "car",
            capacity: 20,
            lat: 12.9650,
            lng: 77.5900,
            status: "available",
          },
          {
            name: "Akash Reddy",
            vehicle: "bike",
            capacity: 5,
            lat: 12.9800,
            lng: 77.6100,
            status: "available",
          },
          {
            name: "Sunita Devi",
            vehicle: "truck",
            capacity: 100,
            lat: 12.9550,
            lng: 77.5750,
            status: "available",
          },
        ]);

        // ---- Pickups (pending surplus food) ----
        const now = Date.now();
        const h = (hours: number) => new Date(now + hours * 3600_000).toISOString();

        await supabase.from("pickups").insert([
          {
            business_id: bizData[0].id, // Truffles
            shelter_id: shelterData[1].id, // Robin Hood Army
            food_description: "40 biryani portions + 20 naan",
            quantity: 40,
            expires_at: h(1.5),
            status: "pending",
          },
          {
            business_id: bizData[1].id, // Vidyarthi Bhavan
            shelter_id: shelterData[2].id, // Feeding India
            food_description: "30 masala dosa + chutney",
            quantity: 30,
            expires_at: h(1),
            status: "pending",
          },
          {
            business_id: bizData[2].id, // Meghana Foods
            shelter_id: shelterData[0].id, // Akshaya Patra
            food_description: "25 thali meals",
            quantity: 25,
            expires_at: h(2),
            status: "pending",
          },
          {
            business_id: bizData[3].id, // Empire
            shelter_id: shelterData[3].id, // No Food Waste
            food_description: "15 kebab platters + 10 rotis",
            quantity: 15,
            expires_at: h(3),
            status: "pending",
          },
          {
            business_id: bizData[4].id, // CTR
            shelter_id: shelterData[0].id, // Akshaya Patra
            food_description: "60 idli-vada combos",
            quantity: 60,
            expires_at: h(0.75),
            status: "pending",
          },
          {
            business_id: bizData[5].id, // Brahmin's Coffee Bar
            shelter_id: shelterData[2].id, // Feeding India
            food_description: "20 upma plates + filter coffee",
            quantity: 20,
            expires_at: h(2.5),
            status: "pending",
          },
          {
            business_id: bizData[0].id, // Truffles
            shelter_id: shelterData[3].id, // No Food Waste
            food_description: "3 party-size pasta trays",
            quantity: 3,
            expires_at: h(4),
            status: "pending",
          },
          {
            business_id: bizData[2].id, // Meghana Foods
            shelter_id: shelterData[1].id, // Robin Hood Army
            food_description: "50 chicken rice boxes",
            quantity: 50,
            expires_at: h(1.25),
            status: "pending",
          },
        ]);

        console.log(
          "[seed] ✅ Demo data seeded:",
          `${bizData.length} restaurants,`,
          `${shelterData.length} shelters,`,
          "4 drivers, 8 pickups",
        );
      } catch (err) {
        console.error("[seed] Seeding failed:", err);
      }
    })();
  }, []);
}
