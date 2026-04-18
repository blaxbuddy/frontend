import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Driver } from "@/hooks/useLiveData";

/**
 * Driver page — uses the device's Geolocation API to broadcast the volunteer's
 * real GPS position to the selected driver record. The dashboard map already
 * subscribes to driver row updates via realtime, so the marker + Dijkstra
 * route will follow the device live.
 */
export default function DriverPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState<string>(
    () => localStorage.getItem("driverId") ?? "",
  );
  const [sharing, setSharing] = useState(false);
  const [lastFix, setLastFix] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    at: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    document.title = "Driver GPS — Live tracking";
    supabase
      .from("drivers")
      .select("*")
      .order("name")
      .then(({ data }) => setDrivers((data ?? []) as Driver[]));
  }, []);

  useEffect(() => {
    if (driverId) localStorage.setItem("driverId", driverId);
  }, [driverId]);

  // Cleanup watcher on unmount.
  useEffect(() => () => stopSharing(), []);

  const pushLocation = async (lat: number, lng: number) => {
    if (!driverId) return;
    const { error: rpcError } = await supabase.rpc("update_driver_location", {
      _driver_id: driverId,
      _lat: lat,
      _lng: lng,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setError(null);
    }
  };

  const startSharing = () => {
    if (!driverId) {
      toast({ title: "Pick a driver first", variant: "destructive" });
      return;
    }
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLastFix({ lat: latitude, lng: longitude, accuracy, at: Date.now() });
        pushLocation(latitude, longitude);
      },
      (err) => {
        setError(err.message);
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15_000 },
    );
  };

  const stopSharing = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
  };

  const selected = drivers.find((d) => d.id === driverId);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Driver GPS</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            Dashboard →
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select your driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={driverId} onValueChange={setDriverId} disabled={sharing}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a driver…" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.vehicle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected && (
              <div className="text-xs text-muted-foreground">
                Current DB position: {selected.lat.toFixed(5)},{" "}
                {selected.lng.toFixed(5)}
              </div>
            )}

            {!sharing ? (
              <Button className="w-full" onClick={startSharing} disabled={!driverId}>
                Start sharing my location
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="destructive"
                onClick={stopSharing}
              >
                Stop sharing
              </Button>
            )}
          </CardContent>
        </Card>

        {sharing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live fix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {lastFix ? (
                <>
                  <div>
                    Lat: <span className="font-mono">{lastFix.lat.toFixed(6)}</span>
                  </div>
                  <div>
                    Lng: <span className="font-mono">{lastFix.lng.toFixed(6)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Accuracy ±{lastFix.accuracy.toFixed(0)} m · updated{" "}
                    {Math.round((Date.now() - lastFix.at) / 1000)}s ago
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">
                  Waiting for first GPS fix…
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Your phone's GPS coordinates are streamed to the dashboard in real
          time. Best results outdoors; allow location access when prompted.
        </p>
      </div>
    </div>
  );
}
