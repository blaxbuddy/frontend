import { useState, useCallback } from "react";
import type { Business, Driver, Pickup, Shelter } from "@/hooks/useLiveData";
import {
  planRoutes,
  enrichWithOSRM,
  type PlannedRoutes,
  type DriverRoute,
} from "@/lib/routeOptimiser";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Navigation,
  Package,
  Route,
  Truck,
  Loader2,
  Play,
  MapPin,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m left`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const VEHICLE_EMOJI: Record<string, string> = {
  bike: "\ud83d\udeb2",
  car: "\ud83d\ude97",
  van: "\ud83d\ude90",
  truck: "\ud83d\ude9b",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RoutePanel({
  pickups,
  businesses,
  shelters,
  drivers,
  onRoutePlanned,
}: {
  pickups: Pickup[];
  businesses: Business[];
  shelters: Shelter[];
  drivers: Driver[];
  onRoutePlanned: (routes: PlannedRoutes | null) => void;
}) {
  const [planned, setPlanned] = useState<PlannedRoutes | null>(null);
  const [computing, setComputing] = useState(false);
  const [starting, setStarting] = useState(false);

  const pendingPickups = pickups.filter((p) => p.status === "pending");
  const availableDrivers = drivers.filter((d) => d.status === "available");

  /* -------- Optimise -------- */
  const handleOptimise = useCallback(async () => {
    if (pendingPickups.length === 0) {
      toast({ title: "No pending pickups to route", variant: "destructive" });
      return;
    }
    if (availableDrivers.length === 0) {
      toast({ title: "No available drivers", variant: "destructive" });
      return;
    }

    setComputing(true);
    try {
      // Step 1: Haversine-based VRP
      let result = planRoutes(drivers, pickups, businesses, shelters);

      // Step 2: Enrich with OSRM road polylines (async, best-effort)
      try {
        result = await enrichWithOSRM(result, drivers);
      } catch {
        // OSRM failure is non-fatal — haversine route still works
        console.warn("OSRM enrichment failed, using haversine routes");
      }

      setPlanned(result);
      onRoutePlanned(result);

      if (result.driverRoutes.length > 0) {
        toast({
          title: "Route optimised!",
          description: `${result.driverRoutes.length} driver(s), ${result.totalDistanceKm.toFixed(1)} km total`,
        });
      }
    } catch (err) {
      console.error("Route optimisation failed", err);
      toast({ title: "Optimisation failed", variant: "destructive" });
    } finally {
      setComputing(false);
    }
  }, [drivers, pickups, businesses, shelters, pendingPickups.length, availableDrivers.length, onRoutePlanned]);

  /* -------- Start all routes -------- */
  const handleStart = useCallback(() => {
    if (!planned) return;
    setStarting(true);

    toast({
      title: "\ud83c\udf89 Routes started!",
      description: `${planned.driverRoutes.length} driver(s) dispatched across ${planned.driverRoutes.reduce((s, r) => s + r.stops.length, 0)} stops.`,
    });

    setPlanned(null);
    onRoutePlanned(null);
    setStarting(false);
  }, [planned, onRoutePlanned]);

  /* -------- Clear -------- */
  const handleClear = () => {
    setPlanned(null);
    onRoutePlanned(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground/80 px-1 flex items-center gap-1.5">
        <Route className="h-4 w-4" /> Route Planner
      </h3>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border/60 bg-surface p-2">
          <div className="text-muted-foreground">Pending pickups</div>
          <div className="text-lg font-semibold tabular-nums">{pendingPickups.length}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface p-2">
          <div className="text-muted-foreground">Available drivers</div>
          <div className="text-lg font-semibold tabular-nums">{availableDrivers.length}</div>
        </div>
      </div>

      {/* Info callout */}
      <div className="rounded-lg bg-accent/50 border border-accent-foreground/10 p-2.5 text-xs text-accent-foreground/80 leading-relaxed">
        <strong>Auto-assignment:</strong> Pickups sorted by expiry \u2192 matched to nearest driver whose vehicle fits the food quantity.
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          className="flex-1 gap-1.5"
          onClick={handleOptimise}
          disabled={computing || pendingPickups.length === 0 || availableDrivers.length === 0}
        >
          {computing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {computing ? "Computing\u2026" : "Optimise Route"}
        </Button>
        {planned && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {planned && (
        <div className="space-y-3">
          {/* Total summary */}
          <div className="rounded-xl bg-gradient-to-br from-rescue/10 to-route/10 border border-rescue/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Route plan ready</span>
              <Button
                size="sm"
                className="gap-1.5 bg-rescue hover:bg-rescue/90"
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Start All
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <div>
                <div className="text-muted-foreground">Drivers</div>
                <div className="font-semibold">{planned.driverRoutes.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Distance</div>
                <div className="font-semibold tabular-nums">
                  {(planned.driverRoutes.reduce((s, r) => s + (r.roadDistanceKm ?? r.totalDistanceKm), 0)).toFixed(1)} km
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Est. time</div>
                <div className="font-semibold tabular-nums">
                  {planned.driverRoutes.some((r) => r.estimatedMinutes)
                    ? `${planned.driverRoutes.reduce((s, r) => s + (r.estimatedMinutes ?? 0), 0)} min`
                    : "\u2014"
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Unassigned warning */}
          {planned.unassignedPickups.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {planned.unassignedPickups.length} pickup(s) couldn't be assigned \u2014 not enough driver capacity.
              </span>
            </div>
          )}

          {/* Per-driver routes */}
          <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
            {planned.driverRoutes.map((route) => (
              <DriverRouteCard key={route.driverId} route={route} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Driver route card                                                  */
/* ------------------------------------------------------------------ */

function DriverRouteCard({ route }: { route: DriverRoute }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border/60 bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-route" />
          <div>
            <div className="text-sm font-medium">{route.driverName}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {VEHICLE_EMOJI[route.vehicle] ?? "\ud83d\ude97"} {route.vehicle} \u00b7 {route.stops.length} stops
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-semibold text-foreground tabular-nums">
            {(route.roadDistanceKm ?? route.totalDistanceKm).toFixed(1)} km
          </div>
          {route.estimatedMinutes && (
            <div>~{route.estimatedMinutes} min</div>
          )}
        </div>
      </button>

      {/* Stops */}
      {expanded && (
        <div className="border-t border-border/40 px-3 pb-3">
          <div className="relative pl-5 pt-2">
            {/* Connecting line */}
            <div className="absolute left-[9px] top-5 bottom-3 w-[2px] bg-gradient-to-b from-rescue/40 to-amberWarm/40 rounded-full" />

            {route.stops.map((stop) => (
              <div key={`${stop.pickupId}-${stop.type}`} className="relative mb-2.5 last:mb-0">
                {/* Dot */}
                <div
                  className={`absolute -left-5 top-1 h-[18px] w-[18px] rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white ${
                    stop.type === "pickup" ? "bg-rescue" : "bg-amberWarm"
                  }`}
                >
                  {stop.stopNumber}
                </div>

                <div className="ml-1">
                  <div className="flex items-center gap-1.5">
                    {stop.type === "pickup" ? (
                      <Package className="h-3 w-3 text-rescue" />
                    ) : (
                      <MapPin className="h-3 w-3 text-amberWarm" />
                    )}
                    <span className="text-xs font-medium">
                      {stop.type === "pickup" ? "Pickup" : "Drop-off"}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                      +{stop.legDistanceKm.toFixed(1)} km
                    </span>
                  </div>
                  <div className="text-xs font-medium mt-0.5">{stop.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">
                    {stop.foodDescription} \u00b7 {stop.quantity} units
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {timeLeft(stop.expiresAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
