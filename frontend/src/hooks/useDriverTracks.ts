import { useEffect, useRef, useState } from "react";
import type { Driver } from "./useLiveData";

export type TrackPoint = { lat: number; lng: number; t: number };
export type DriverTracks = Record<string, TrackPoint[]>;

const MAX_POINTS = 12;
const MAX_AGE_MS = 60_000;

/**
 * Maintains a rolling history of recent positions for each driver so we can
 * draw a fading "live trail" on the map as vehicles move in real-time.
 */
export function useDriverTracks(drivers: Driver[]): DriverTracks {
  const [tracks, setTracks] = useState<DriverTracks>({});
  const lastPos = useRef<Record<string, { lat: number; lng: number }>>({});

  useEffect(() => {
    const now = Date.now();
    setTracks((prev) => {
      const next: DriverTracks = { ...prev };
      const liveIds = new Set(drivers.map((d) => d.id));

      for (const d of drivers) {
        const last = lastPos.current[d.id];
        const moved = !last || last.lat !== d.lat || last.lng !== d.lng;
        const history = next[d.id] ?? [];

        if (moved) {
          const updated = [...history, { lat: d.lat, lng: d.lng, t: now }]
            .filter((p) => now - p.t <= MAX_AGE_MS)
            .slice(-MAX_POINTS);
          next[d.id] = updated;
          lastPos.current[d.id] = { lat: d.lat, lng: d.lng };
        }
      }

      // Drop tracks for drivers no longer present
      for (const id of Object.keys(next)) {
        if (!liveIds.has(id)) delete next[id];
      }
      return next;
    });
  }, [drivers]);

  return tracks;
}
