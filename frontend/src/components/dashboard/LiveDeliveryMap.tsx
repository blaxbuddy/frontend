import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import { osrmRoute } from "@/lib/osrm";
import { haversineKm } from "@/lib/dijkstra";

type LiveDeliveryMapProps = {
  startPos: { lat: number; lng: number };
  endPos: { lat: number; lng: number };
  // Progress from 0 to 1 (0 = at start, 1 = at end)
  progress: number;
};

export function LiveDeliveryMap({ startPos, endPos, progress }: LiveDeliveryMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // Fetch real road route on mount
  useEffect(() => {
    let mounted = true;
    osrmRoute(startPos, endPos).then((res) => {
      if (mounted) {
        if (res && res.geometry.length > 0) {
          setRouteCoords(res.geometry);
        } else {
          // Fallback to straight line
          setRouteCoords([
            [startPos.lat, startPos.lng],
            [endPos.lat, endPos.lng],
          ]);
        }
      }
    });
    return () => { mounted = false; };
  }, [startPos.lat, startPos.lng, endPos.lat, endPos.lng]);

  // Calculate cumulative distances along the polyline
  const cumulativeDistances = useMemo(() => {
    if (routeCoords.length < 2) return [];
    const dists = [0];
    let total = 0;
    for (let i = 1; i < routeCoords.length; i++) {
      const p1 = { id: "", lat: routeCoords[i - 1][0], lng: routeCoords[i - 1][1] };
      const p2 = { id: "", lat: routeCoords[i][0], lng: routeCoords[i][1] };
      total += haversineKm(p1, p2);
      dists.push(total);
    }
    return dists;
  }, [routeCoords]);

  // Interpolate current driver position and remaining route
  const { currentPos, remainingRoute } = useMemo(() => {
    if (routeCoords.length === 0) return { currentPos: null, remainingRoute: [] };
    if (progress <= 0) return { currentPos: routeCoords[0], remainingRoute: routeCoords };
    if (progress >= 1) return { currentPos: routeCoords[routeCoords.length - 1], remainingRoute: [] };

    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
    const targetDistance = totalDistance * progress;

    let segmentIndex = 0;
    for (let i = 0; i < cumulativeDistances.length - 1; i++) {
      if (targetDistance >= cumulativeDistances[i] && targetDistance <= cumulativeDistances[i + 1]) {
        segmentIndex = i;
        break;
      }
    }

    const p1 = routeCoords[segmentIndex];
    const p2 = routeCoords[segmentIndex + 1];
    const d1 = cumulativeDistances[segmentIndex];
    const d2 = cumulativeDistances[segmentIndex + 1];

    const segmentFraction = d2 === d1 ? 0 : (targetDistance - d1) / (d2 - d1);
    const lat = p1[0] + (p2[0] - p1[0]) * segmentFraction;
    const lng = p1[1] + (p2[1] - p1[1]) * segmentFraction;
    const currentPos: [number, number] = [lat, lng];

    const remainingRoute: [number, number][] = [currentPos, ...routeCoords.slice(segmentIndex + 1)];

    return { currentPos, remainingRoute };
  }, [routeCoords, cumulativeDistances, progress]);

  if (routeCoords.length === 0) {
    return <div className="h-full w-full flex items-center justify-center bg-muted/20 text-muted-foreground text-sm">Loading map...</div>;
  }

  const center: [number, number] = [
    (startPos.lat + endPos.lat) / 2,
    (startPos.lng + endPos.lng) / 2
  ];

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full z-0" zoomControl={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap'
      />

      {/* Full route (faded) */}
      <Polyline
        positions={routeCoords}
        pathOptions={{ color: "#cbd5e1", weight: 6, lineCap: "round", lineJoin: "round" }}
      />

      {/* Remaining route (active) */}
      {remainingRoute.length > 0 && (
        <>
          <Polyline
            positions={remainingRoute}
            pathOptions={{ color: "hsl(210, 90%, 55%)", weight: 6, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            positions={remainingRoute}
            pathOptions={{ color: "#ffffff", weight: 2, dashArray: "5 10" }}
          />
        </>
      )}

      {/* Start (Restaurant) Marker */}
      <CircleMarker center={[startPos.lat, startPos.lng]} radius={7} pathOptions={{ color: "#fff", weight: 2, fillColor: "hsl(35, 95%, 50%)", fillOpacity: 1 }}>
        <Popup>Restaurant (Pickup)</Popup>
      </CircleMarker>

      {/* End (NGO) Marker */}
      <CircleMarker center={[endPos.lat, endPos.lng]} radius={7} pathOptions={{ color: "#fff", weight: 2, fillColor: "hsl(152, 65%, 38%)", fillOpacity: 1 }}>
        <Popup>NGO (Drop-off)</Popup>
      </CircleMarker>

      {/* Driver Marker */}
      {currentPos && (
        <CircleMarker center={currentPos} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "hsl(210, 90%, 55%)", fillOpacity: 1 }}>
          <Popup>Volunteer</Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
