import { Business, Driver, Pickup, Shelter } from "@/hooks/useLiveData";
import { Badge } from "@/components/ui/badge";
import { Clock, Package } from "lucide-react";

const statusStyles: Record<Pickup["status"], string> = {
  pending: "bg-alert/15 text-alert border-alert/30",
  claimed: "bg-amberWarm/20 text-foreground border-amberWarm/40",
  in_transit: "bg-route/15 text-route border-route/30",
  delivered: "bg-rescue/15 text-rescue border-rescue/30",
  expired: "bg-muted text-muted-foreground border-border",
};

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m left`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function PickupList({
  pickups, businesses, shelters, drivers,
}: {
  pickups: Pickup[]; businesses: Business[]; shelters: Shelter[]; drivers: Driver[];
}) {
  const sorted = [...pickups].sort((a, b) => {
    const order = { pending: 0, claimed: 1, in_transit: 2, delivered: 3, expired: 4 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground/80 px-1">Active pickups</h3>
      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {sorted.map((p) => {
          const biz = businesses.find((b) => b.id === p.business_id);
          const shelter = shelters.find((s) => s.id === p.shelter_id);
          const driver = drivers.find((d) => d.id === p.driver_id);
          return (
            <div
              key={p.id}
              className="rounded-lg border border-border/60 bg-surface p-3 shadow-sm hover:shadow-panel transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium leading-tight">{biz?.name}</div>
                <Badge variant="outline" className={`capitalize ${statusStyles[p.status]}`}>
                  {p.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Package className="h-3 w-3" /> {p.food_description}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">→ {shelter?.name}</div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {timeLeft(p.expires_at)}
                </span>
                {driver && (
                  <span className="font-medium text-foreground/70">{driver.name}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
