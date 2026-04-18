import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Listens for postMessage events from the parent window (when this dashboard
 * is embedded as an iframe) and forwards restaurant / pickup payloads to the
 * `ingest-restaurant-data` edge function.
 *
 * Parent page usage:
 *   const iframe = document.getElementById('dashboard') as HTMLIFrameElement;
 *
 *   // 1) Register a restaurant — receive its id back via 'lovable:ingest:ack'
 *   iframe.contentWindow?.postMessage({
 *     source: 'restaurant-feed',
 *     type: 'restaurant',
 *     name: 'Pasta Palace',
 *     address: '123 MG Road, Bengaluru',
 *     lat: 12.9716, lng: 77.5946,
 *     closes_at: '22:00:00',     // optional
 *     correlationId: 'r-1',      // optional, echoed back in ack
 *   }, '*');
 *
 *   // 2) Once you have the restaurant id, send surplus food listings
 *   iframe.contentWindow?.postMessage({
 *     source: 'restaurant-feed',
 *     type: 'pickup',
 *     restaurant_id: '<uuid from ack>',
 *     food_description: '15 sandwiches + 5 salads',
 *     quantity: 20,
 *     expires_at: new Date(Date.now() + 2*60*60*1000).toISOString(),
 *   }, '*');
 *
 *   window.addEventListener('message', (e) => {
 *     if (e.data?.source === 'lovable:ingest:ack') console.log('ack', e.data);
 *   });
 */
export function usePostMessageIngest() {
  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== "restaurant-feed") return;
      if (data.type !== "restaurant" && data.type !== "pickup") return;

      try {
        const { data: result, error } = await supabase.functions.invoke(
          "ingest-restaurant-data",
          { body: data },
        );
        if (error) throw error;

        // Echo result back to the parent so it can capture the new restaurant id.
        event.source?.postMessage(
          {
            source: "lovable:ingest:ack",
            ok: true,
            type: data.type,
            correlationId: data.correlationId,
            result,
          },
          { targetOrigin: event.origin || "*" },
        );

        if (data.type === "restaurant") {
          toast.success(`New restaurant: ${result?.restaurant?.name ?? "added"}`);
        } else {
          toast.success("New surplus food pickup");
        }
      } catch (err) {
        console.error("ingest failed", err);
        const message = err instanceof Error ? err.message : String(err);
        event.source?.postMessage(
          {
            source: "lovable:ingest:ack",
            ok: false,
            type: data.type,
            correlationId: data.correlationId,
            error: message,
          },
          { targetOrigin: event.origin || "*" },
        );
        toast.error(`Ingest failed: ${message}`);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
