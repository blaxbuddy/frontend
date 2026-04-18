import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { LiveMap } from "@/components/dashboard/LiveMap";
import { PickupList } from "@/components/dashboard/PickupList";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { RestaurantNgoRouter } from "@/components/dashboard/RestaurantNgoRouter";
import { RoutePanel } from "@/components/dashboard/RoutePanel";
import { useLiveData } from "@/hooks/useLiveData";
import { useSimulator } from "@/hooks/useSimulator";
import { Button } from "@/components/ui/button";
import { Pause, Play, Radio, MapPin, Route, Navigation, UtensilsCrossed, HeartHandshake, Truck } from "lucide-react";
import type { RestaurantNgoRoute } from "@/lib/restaurantNgoRouting";
import type { PlannedRoutes } from "@/lib/routeOptimiser";

type SidebarTab = "pickups" | "planner" | "optimiser";

const Index = () => {
  const { businesses, shelters, drivers, pickups, loading } = useLiveData();
  const { running, setRunning } = useSimulator(2500);

  const [activeTab, setActiveTab] = useState<SidebarTab>("pickups");
  const [restaurantNgoRoute, setRestaurantNgoRoute] = useState<RestaurantNgoRoute | null>(null);
  const [plannedRoutes, setPlannedRoutes] = useState<PlannedRoutes | null>(null);

  const handleRouteCalculated = useCallback((route: RestaurantNgoRoute) => {
    setRestaurantNgoRoute(route);
  }, []);

  const handleRoutePlanned = useCallback((routes: PlannedRoutes | null) => {
    setPlannedRoutes(routes);
  }, []);

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: "pickups", label: "Pickups", icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: "planner", label: "Route Planner", icon: <Route className="h-3.5 w-3.5" /> },
    { id: "optimiser", label: "VRP Optimiser", icon: <Navigation className="h-3.5 w-3.5" /> },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> Live dashboard · Indore, MP
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold mt-1">
              LEFTO — Food Rescue Router
            </h1>
            <p className="opacity-90 mt-1 max-w-2xl">
              Real-time matching of surplus food from Indore restaurants to NGOs &amp; shelters,
              with OSRM road-network routing and Dijkstra-optimized paths.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Portal links */}
            <div className="flex gap-2">
              <Link to="/restaurant">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-white/10 border-white/20 hover:bg-white/20 text-white">
                  <UtensilsCrossed className="h-3 w-3" /> Restaurant
                </Button>
              </Link>
              <Link to="/ngo">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-white/10 border-white/20 hover:bg-white/20 text-white">
                  <HeartHandshake className="h-3 w-3" /> NGO
                </Button>
              </Link>
              <Link to="/volunteer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-white/10 border-white/20 hover:bg-white/20 text-white">
                  <Truck className="h-3 w-3" /> Volunteer
                </Button>
              </Link>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setRunning(!running)}
            >
              {running ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {running ? "Pause" : "Resume"}
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-6 py-6 space-y-6">
        <StatsBar drivers={drivers} pickups={pickups} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <div className="rounded-xl overflow-hidden shadow-panel border border-border/60 bg-surface flex flex-col h-full">
            {loading ? (
              <div className="flex-1 min-h-[560px] flex items-center justify-center text-muted-foreground">
                Loading live map…
              </div>
            ) : (
              <div className="flex-1 min-h-[560px] relative">
                <div className="absolute inset-0">
                  <LiveMap
                    businesses={businesses}
                    shelters={shelters}
                    drivers={drivers}
                    pickups={pickups}
                    restaurantNgoRoute={restaurantNgoRoute}
                    plannedRoutes={plannedRoutes}
                  />
                </div>
              </div>
            )}
          </div>

          <aside className="bg-gradient-panel rounded-xl shadow-panel border border-border/60 p-4 flex flex-col">
            {/* Tab bar */}
            <div className="flex gap-1 mb-4 bg-muted/50 p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "pickups" && (
                <>
                  <PickupList
                    pickups={pickups}
                    businesses={businesses}
                    shelters={shelters}
                    drivers={drivers}
                  />
                  <Legend />
                </>
              )}
              {activeTab === "planner" && (
                <RestaurantNgoRouter
                  restaurants={businesses}
                  ngos={shelters}
                  onRouteCalculated={handleRouteCalculated}
                />
              )}
              {activeTab === "optimiser" && (
                <RoutePanel
                  pickups={pickups}
                  businesses={businesses}
                  shelters={shelters}
                  drivers={drivers}
                  onRoutePlanned={handleRoutePlanned}
                />
              )}
            </div>
          </aside>
        </div>
      </section>

      <footer className="container mx-auto px-6 pb-10 text-xs text-muted-foreground">
        Map data © OpenStreetMap contributors · OSRM road routing · LEFTO Food Rescue Platform
      </footer>
    </main>
  );
};

function Legend() {
  const rows = [
    { color: "hsl(35, 95%, 50%)", label: "🥖 Restaurant with surplus food" },
    { color: "hsl(152, 65%, 38%)", label: "🏠 NGO / Shelter (drop-off)" },
    { color: "hsl(210, 90%, 55%)", label: "🚗 Available driver" },
    { color: "hsl(0, 78%, 58%)", label: "🚗 Driver en route" },
    { color: "hsl(280, 80%, 55%)", label: "🗺️ Restaurant → NGO route" },
  ];
  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Legend
      </h4>
      <ul className="space-y-1.5 text-xs">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Index;
