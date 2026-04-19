import { Driver, Pickup } from "@/hooks/useLiveData";

export function StatsBar({ drivers, pickups }: { drivers: Driver[]; pickups: Pickup[] }) {
  const available = drivers.filter((d) => d.status === "available").length;
  const enRoute = drivers.filter((d) => d.status === "en_route").length;
  const pending = pickups.filter((p) => p.status === "pending").length;
  const inTransit = pickups.filter((p) => p.status === "in_transit" || p.status === "claimed").length;
  const delivered = pickups.filter((p) => p.status === "delivered").length;
  const totalMeals = pickups
    .filter((p) => p.status === "delivered")
    .reduce((s, p) => s + p.quantity, 0);

  const items = [
    { label: "Available drivers", value: available, dot: "bg-route" },
    { label: "En route", value: enRoute, dot: "bg-amberWarm" },
    { label: "Pending pickups", value: pending, dot: "bg-alert" },
    { label: "In transit", value: inTransit, dot: "bg-rescue" },
    { label: "Delivered today", value: delivered, dot: "bg-rescue-glow" },
    { label: "Meals rescued", value: totalMeals, dot: "bg-rescue" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl glass-panel p-4"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${it.dot}`} />
            {it.label}
          </div>
          <div className="text-2xl font-semibold mt-1 tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
