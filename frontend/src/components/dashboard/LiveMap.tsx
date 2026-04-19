import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import { Business, Driver, Pickup, Shelter } from "@/hooks/useLiveData";
import { businessIcon, shelterIcon, driverIcon } from "@/lib/mapIcons";
import { Fragment, useMemo } from "react";
import { GeoNode, shortestPath } from "@/lib/dijkstra";
import { useDriverTracks } from "@/hooks/useDriverTracks";
import { MAP_CENTER } from "@/lib/demoData";
import type { RestaurantNgoRoute } from "@/lib/restaurantNgoRouting";
import type { PlannedRoutes } from "@/lib/routeOptimiser";

const ROUTE_COLORS: Record<Pickup["status"], string> = {
  pending: "hsl(0, 78%, 58%)",
  claimed: "hsl(35, 95%, 55%)",
  in_transit: "hsl(210, 90%, 55%)",
  delivered: "hsl(152, 65%, 38%)",
  expired: "hsl(0, 0%, 60%)",
};

/** Color palette for multi-stop and VRP routes */
const MULTI_STOP_COLOR = "hsl(280, 80%, 55%)"; // purple/magenta
const VRP_ROUTE_COLORS = [
  "hsl(210, 90%, 55%)",
  "hsl(152, 65%, 42%)",
  "hsl(35, 95%, 50%)",
  "hsl(0, 78%, 55%)",
];

export function LiveMap({
  businesses, shelters, drivers, pickups,
  restaurantNgoRoute,
  plannedRoutes,
}: {
  businesses: Business[]; shelters: Shelter[]; drivers: Driver[]; pickups: Pickup[];
  restaurantNgoRoute?: RestaurantNgoRoute | null;
  plannedRoutes?: PlannedRoutes | null;
}) {
  const center: [number, number] = MAP_CENTER;

  // Live vehicle trails — recent positions per driver for a "live tracking" feel.
  const tracks = useDriverTracks(drivers);

  // Build the geographic graph used by Dijkstra.
  // Nodes = every driver, business and shelter currently on the map.
  const graph: GeoNode[] = useMemo(() => {
    return [
      ...drivers.map((d) => ({ id: `d:${d.id}`, lat: d.lat, lng: d.lng })),
      ...businesses.map((b) => ({ id: `b:${b.id}`, lat: b.lat, lng: b.lng })),
      ...shelters.map((s) => ({ id: `s:${s.id}`, lat: s.lat, lng: s.lng })),
    ];
  }, [drivers, businesses, shelters]);

  const nodeById = useMemo(() => new Map(graph.map((n) => [n.id, n])), [graph]);

  // Dijkstra-optimised routes for in-progress pickups.
  // claimed   : driver → business → shelter (waypoint = business)
  // in_transit: driver → shelter (food already picked up)
  const routes = useMemo(() => {
    return pickups
      .filter((p) => p.status === "claimed" || p.status === "in_transit")
      .map((p) => {
        if (!p.driver_id) return null;
        const sourceId = `d:${p.driver_id}`;
        const targetId = `s:${p.shelter_id}`;
        const waypointId = p.status === "claimed" ? `b:${p.business_id}` : undefined;

        const result = shortestPath(graph, sourceId, targetId, waypointId);
        if (!result) return null;

        const segments: [number, number][] = result.path
          .map((id) => nodeById.get(id))
          .filter((n): n is GeoNode => !!n)
          .map((n) => [n.lat, n.lng]);

        return {
          id: p.id,
          segments,
          color: ROUTE_COLORS[p.status],
          distanceKm: result.distanceKm,
        };
      })
      .filter(
        (x): x is { id: string; segments: [number, number][]; color: string; distanceKm: number } =>
          !!x && x.segments.length >= 2,
      );
  }, [pickups, graph, nodeById]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
      style={{ minHeight: 480 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Dijkstra-optimised routes — layered for high visibility:
          1) soft glow halo  2) white casing  3) solid colored core
          4) animated dashed overlay  5) endpoint + waypoint dots */}
      {routes.map((r) => (
        <Fragment key={r.id}>
          {/* Glow halo */}
          <Polyline
            positions={r.segments}
            pathOptions={{ color: r.color, weight: 18, opacity: 0.18, lineCap: "round", lineJoin: "round" }}
            interactive={false}
          />
          {/* White casing for contrast on any basemap */}
          <Polyline
            positions={r.segments}
            pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
            interactive={false}
          />
          {/* Solid colored core */}
          <Polyline
            positions={r.segments}
            pathOptions={{ color: r.color, weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }}
          >
            <Popup>
              <div className="font-semibold">Optimised route</div>
              <div className="text-xs opacity-70">
                {r.segments.length} stops · {r.distanceKm.toFixed(2)} km (Dijkstra)
              </div>
            </Popup>
          </Polyline>
          {/* Animated marching-ants flow */}
          <Polyline
            positions={r.segments}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              opacity: 0.95,
              dashArray: "10 22",
              lineCap: "butt",
              className: "route-flow",
            }}
            interactive={false}
          />
          {/* Endpoint + waypoint highlight dots */}
          {r.segments.map((pos, i) => (
            <CircleMarker
              key={`${r.id}-pt-${i}`}
              center={pos}
              radius={i === 0 || i === r.segments.length - 1 ? 7 : 5}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: r.color,
                fillOpacity: 1,
              }}
            />
          ))}
        </Fragment>
      ))}

      {/* Businesses */}
      {businesses.map((b) => (
        <Marker key={b.id} position={[b.lat, b.lng]} icon={businessIcon}>
          <Popup>
            <div className="font-semibold">{b.name}</div>
            <div className="text-xs opacity-70">{b.address}</div>
            <div className="text-xs mt-1">Closes at {b.closes_at?.slice(0, 5) || "N/A"}</div>
          </Popup>
        </Marker>
      ))}

      {/* Shelters */}
      {shelters.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={shelterIcon}>
          <Popup>
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs opacity-70">{s.address}</div>
            <div className="text-xs mt-1">Capacity {s.capacity || "N/A"} · until {s.accepts_until?.slice(0, 5) || "N/A"}</div>
          </Popup>
        </Marker>
      ))}

      {/* Drivers */}
      {drivers.map((d) => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={driverIcon(d.vehicle, d.status === "available")}
        >
          <Popup>
            <div className="font-semibold">{d.name}</div>
            <div className="text-xs capitalize opacity-70">
              {d.vehicle} · {d.capacity}u capacity
            </div>
            <div className="text-xs mt-1 capitalize">Status: {d.status.replace("_", " ")}</div>
          </Popup>
        </Marker>
      ))}

      {/* Live vehicle trails — recent path of each driver */}
      {drivers.map((d) => {
        const pts = tracks[d.id];
        if (!pts || pts.length < 2) return null;
        const positions = pts.map((p) => [p.lat, p.lng] as [number, number]);
        const color =
          d.status === "available"
            ? "hsl(210, 90%, 55%)"
            : d.status === "en_route"
            ? "hsl(0, 78%, 58%)"
            : "hsl(0, 0%, 60%)";
        return (
          <Polyline
            key={`trail-${d.id}`}
            positions={positions}
            pathOptions={{ color, weight: 3, opacity: 0.55 }}
          />
        );
      })}

      {/* Subtle proximity rings around available drivers */}
      {drivers
        .filter((d) => d.status === "available")
        .map((d) => (
          <CircleMarker
            key={`ring-${d.id}`}
            center={[d.lat, d.lng]}
            radius={22}
            pathOptions={{
              color: "hsl(210, 90%, 55%)",
              fillColor: "hsl(210, 90%, 55%)",
              fillOpacity: 0.06,
              weight: 1,
            }}
          />
        ))}

      {/* ─── Restaurant → NGO multi-stop route (OSRM road polylines) ─── */}
      {restaurantNgoRoute && restaurantNgoRoute.stops.length > 0 && (() => {
        // Build polyline from road polyline (OSRM) or fallback to stop coordinates
        const positions: [number, number][] = restaurantNgoRoute.roadPolyline
          ? restaurantNgoRoute.roadPolyline
          : [
              [restaurantNgoRoute.startPoint.lat, restaurantNgoRoute.startPoint.lng],
              ...restaurantNgoRoute.stops.map((s) => [s.lat, s.lng] as [number, number]),
            ];

        return (
          <Fragment>
            {/* Glow halo */}
            <Polyline
              positions={positions}
              pathOptions={{ color: MULTI_STOP_COLOR, weight: 16, opacity: 0.15, lineCap: "round", lineJoin: "round" }}
              interactive={false}
            />
            {/* White casing */}
            <Polyline
              positions={positions}
              pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
              interactive={false}
            />
            {/* Colored core */}
            <Polyline
              positions={positions}
              pathOptions={{ color: MULTI_STOP_COLOR, weight: 4, opacity: 1, lineCap: "round", lineJoin: "round" }}
            >
              <Popup>
                <div className="font-semibold">Restaurant → NGO Route</div>
                <div className="text-xs opacity-70">
                  {restaurantNgoRoute.stops.length} stops · {restaurantNgoRoute.totalDistance.toFixed(2)} km
                  {restaurantNgoRoute.roadDistanceKm != null && ` (road: ${restaurantNgoRoute.roadDistanceKm.toFixed(1)} km)`}
                </div>
              </Popup>
            </Polyline>
            {/* Animated dashes */}
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#ffffff",
                weight: 2.5,
                opacity: 0.9,
                dashArray: "8 18",
                lineCap: "butt",
                className: "route-flow",
              }}
              interactive={false}
            />
            {/* Start point marker */}
            <CircleMarker
              center={[restaurantNgoRoute.startPoint.lat, restaurantNgoRoute.startPoint.lng]}
              radius={8}
              pathOptions={{ color: "#fff", weight: 3, fillColor: MULTI_STOP_COLOR, fillOpacity: 1 }}
            >
              <Popup>Start point</Popup>
            </CircleMarker>
            {/* Numbered stop markers */}
            {restaurantNgoRoute.stops.map((stop, i) => (
              <CircleMarker
                key={`ngo-stop-${stop.id}-${i}`}
                center={[stop.lat, stop.lng]}
                radius={stop.type === "pickup" ? 8 : 9}
                pathOptions={{
                  color: "#fff",
                  weight: 2.5,
                  fillColor: stop.type === "pickup" ? "hsl(35, 95%, 50%)" : "hsl(152, 65%, 38%)",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="font-semibold">
                    {i + 1}. {stop.type === "pickup" ? "📦 Pickup" : "🎯 Dropoff"}
                  </div>
                  <div className="text-xs">{stop.name}</div>
                  <div className="text-xs opacity-70">{stop.cumulativeDistance.toFixed(2)} km from start</div>
                </Popup>
              </CircleMarker>
            ))}
          </Fragment>
        );
      })()}

      {/* ─── VRP Driver routes (from Route Optimiser) ─── */}
      {plannedRoutes && plannedRoutes.driverRoutes.map((route, idx) => {
        const color = VRP_ROUTE_COLORS[idx % VRP_ROUTE_COLORS.length];
        const positions: [number, number][] = route.roadPolyline
          ? route.roadPolyline
          : route.stops.map((s) => [s.lat, s.lng] as [number, number]);

        if (positions.length < 2) return null;

        return (
          <Fragment key={`vrp-${route.driverId}`}>
            <Polyline
              positions={positions}
              pathOptions={{ color, weight: 14, opacity: 0.12, lineCap: "round", lineJoin: "round" }}
              interactive={false}
            />
            <Polyline
              positions={positions}
              pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.85, lineCap: "round", lineJoin: "round" }}
              interactive={false}
            />
            <Polyline
              positions={positions}
              pathOptions={{ color, weight: 4, opacity: 1, lineCap: "round", lineJoin: "round" }}
            >
              <Popup>
                <div className="font-semibold">{route.driverName}</div>
                <div className="text-xs opacity-70">
                  {route.stops.length} stops · {(route.roadDistanceKm ?? route.totalDistanceKm).toFixed(1)} km
                </div>
              </Popup>
            </Polyline>
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                opacity: 0.85,
                dashArray: "6 16",
                lineCap: "butt",
                className: "route-flow",
              }}
              interactive={false}
            />
            {route.stops.map((stop) => (
              <CircleMarker
                key={`vrp-stop-${stop.pickupId}-${stop.type}`}
                center={[stop.lat, stop.lng]}
                radius={7}
                pathOptions={{
                  color: "#fff",
                  weight: 2,
                  fillColor: stop.type === "pickup" ? "hsl(35, 95%, 50%)" : "hsl(152, 65%, 38%)",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="font-semibold">{stop.stopNumber}. {stop.type === "pickup" ? "📦" : "🎯"} {stop.name}</div>
                  <div className="text-xs">{stop.foodDescription} · {stop.quantity} units</div>
                </Popup>
              </CircleMarker>
            ))}
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
