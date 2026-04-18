import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Calls the simulate-tick edge function on an interval to move drivers.
 * Pause state is stored globally in `app_settings` so it syncs across tabs/devices,
 * and the edge function itself no-ops when paused.
 */
export function useSimulator(intervalMs = 2500) {
  const [running, setRunningState] = useState(true);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const runningRef = useRef(true);

  // Keep ref in sync so the interval callback always sees latest value
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Load initial pause flag + subscribe to changes
  useEffect(() => {
    let mounted = true;

    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "simulation_paused")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const paused = data?.value === true;
        setRunningState(!paused);
      });

    const channel = supabase
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { key?: string; value?: unknown } | null;
          if (row?.key === "simulation_paused") {
            setRunningState(row.value !== true);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Tick loop — guarded by runningRef so pause is honored immediately
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled || !runningRef.current || inFlight.current) return;
      inFlight.current = true;
      try {
        await supabase.functions.invoke("simulate-tick");
      } catch {
        /* swallow — next tick will retry */
      } finally {
        inFlight.current = false;
      }
    };

    if (runningRef.current) tick();
    const id = setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  /** Toggle global pause. Writes to app_settings; realtime will sync state. */
  const setRunning = async (next: boolean) => {
    setBusy(true);
    // Optimistic local update
    setRunningState(next);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "simulation_paused", value: !next, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) {
      // Revert on failure
      setRunningState(!next);
    }
    setBusy(false);
  };

  return { running, setRunning, busy };
}
