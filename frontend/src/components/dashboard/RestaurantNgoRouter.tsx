import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Business, Shelter } from "@/hooks/useLiveData";
import {
  buildMultiStopRoute,
  enrichRestaurantNgoRouteWithOSRM,
  RestaurantNgoRoute,
} from "@/lib/restaurantNgoRouting";
import type { GeoNode } from "@/lib/dijkstra";
import { MAP_CENTER } from "@/lib/demoData";

interface RestaurantNgoRouterProps {
  restaurants: Business[];
  ngos: Shelter[];
  onRouteCalculated: (route: RestaurantNgoRoute) => void;
  startPoint?: GeoNode;
}

/**
 * UI component for multi-stop route planning.
 * Users select restaurants and NGOs, then calculate an optimized route.
 */
export function RestaurantNgoRouter({
  restaurants,
  ngos,
  onRouteCalculated,
  startPoint = { id: "start", lat: MAP_CENTER[0], lng: MAP_CENTER[1] },
}: RestaurantNgoRouterProps) {
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(
    new Set(),
  );
  const [selectedNgos, setSelectedNgos] = useState<Set<string>>(new Set());
  const [calculatedRoute, setCalculatedRoute] = useState<RestaurantNgoRoute | null>(
    null,
  );
  const [isCalculating, setIsCalculating] = useState(false);

  // Filter only restaurants and NGOs from the data
  // If type field exists, filter by it; otherwise include all
  const restaurantList = restaurants.filter(
    (b) => !b.type || b.type === "restaurant"
  );
  const ngoList = ngos.filter(
    (s) => !s.type || s.type === "ngo"
  );

  const toggleRestaurant = (id: string) => {
    const newSet = new Set(selectedRestaurants);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRestaurants(newSet);
  };

  const toggleNgo = (id: string) => {
    const newSet = new Set(selectedNgos);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedNgos(newSet);
  };

  const handleCalculateRoute = async () => {
    if (selectedRestaurants.size === 0 || selectedNgos.size === 0) {
      alert("Please select at least one restaurant and one NGO");
      return;
    }

    setIsCalculating(true);

    try {
      const selectedRestaurantObjects = restaurantList.filter((r) =>
        selectedRestaurants.has(r.id),
      );
      const selectedNgoObjects = ngoList.filter((n) =>
        selectedNgos.has(n.id),
      );

      let route = buildMultiStopRoute(
        selectedRestaurantObjects,
        selectedNgoObjects,
        startPoint,
      );

      // Enrich with real road polylines from OSRM
      try {
        route = await enrichRestaurantNgoRouteWithOSRM(route);
      } catch {
        console.warn("OSRM enrichment failed, using haversine routes");
      }

      setCalculatedRoute(route);
      onRouteCalculated(route);
    } finally {
      setIsCalculating(false);
    }
  };

  const selectAllRestaurants = () => {
    setSelectedRestaurants(new Set(restaurantList.map((r) => r.id)));
  };

  const selectAllNgos = () => {
    setSelectedNgos(new Set(ngoList.map((n) => n.id)));
  };

  const clearSelections = () => {
    setSelectedRestaurants(new Set());
    setSelectedNgos(new Set());
    setCalculatedRoute(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Route Planner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Restaurants Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-sm">Restaurants</label>
              <button
                onClick={selectAllRestaurants}
                className="text-xs text-blue-600 hover:underline"
              >
                Select All
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
              {restaurantList.length === 0 ? (
                <p className="text-sm text-gray-500">No restaurants available</p>
              ) : (
                restaurantList.map((restaurant) => (
                  <label
                    key={restaurant.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRestaurants.has(restaurant.id)}
                      onChange={() => toggleRestaurant(restaurant.id)}
                      className="rounded"
                    />
                    <span>{restaurant.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {selectedRestaurants.size} selected
            </p>
          </div>

          {/* NGOs Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-sm">NGOs / Shelters</label>
              <button
                onClick={selectAllNgos}
                className="text-xs text-blue-600 hover:underline"
              >
                Select All
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
              {ngoList.length === 0 ? (
                <p className="text-sm text-gray-500">No NGOs available</p>
              ) : (
                ngoList.map((ngo) => (
                  <label
                    key={ngo.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedNgos.has(ngo.id)}
                      onChange={() => toggleNgo(ngo.id)}
                      className="rounded"
                    />
                    <span>{ngo.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {selectedNgos.size} selected
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCalculateRoute}
              disabled={isCalculating || selectedRestaurants.size === 0 || selectedNgos.size === 0}
              className="flex-1"
              size="sm"
            >
              {isCalculating ? "Calculating..." : "Calculate Route"}
            </Button>
            <Button
              onClick={clearSelections}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Route Results */}
      {calculatedRoute && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Route Calculated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p>
                <span className="font-semibold">Distance:</span> {calculatedRoute.totalDistance.toFixed(2)} km
              {calculatedRoute.roadDistanceKm != null && (
                <span className="text-green-700"> (road: {calculatedRoute.roadDistanceKm.toFixed(1)} km)</span>
              )}
              </p>
              <p>
                <span className="font-semibold">Stops:</span> {calculatedRoute.stops.length}
              </p>
              <p>
                <span className="font-semibold">Estimated Duration:</span>{" "}
                {calculatedRoute.estimatedMinutes != null
                  ? `~${calculatedRoute.estimatedMinutes} min (OSRM)`
                  : `~${calculatedRoute.estimatedDuration} min (est.)`
                }
              </p>
            </div>

            {/* Route Steps */}
            <div className="mt-3">
              <p className="text-xs font-semibold mb-2">Route Steps:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {calculatedRoute.stops.map((stop, index) => (
                  <div key={stop.id} className="text-xs bg-white p-1.5 rounded border border-blue-100">
                    <p className="font-semibold">
                      {index + 1}. {stop.type === "pickup" ? "📍 Pickup" : "🎯 Dropoff"}: {stop.name}
                    </p>
                    <p className="text-gray-600">
                      {stop.cumulativeDistance.toFixed(2)} km from start
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
