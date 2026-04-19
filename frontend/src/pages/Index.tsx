import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { LiveMap } from "@/components/dashboard/LiveMap";
import { PickupList } from "@/components/dashboard/PickupList";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { RestaurantNgoRouter } from "@/components/dashboard/RestaurantNgoRouter";
import { RoutePanel } from "@/components/dashboard/RoutePanel";
import { Logo } from "@/components/Logo";
import { useLiveData } from "@/hooks/useLiveData";
import { useSimulator } from "@/hooks/useSimulator";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Pause, Play, Radio, MapPin, Route, Navigation, UtensilsCrossed, HeartHandshake, Truck, LogOut } from "lucide-react";
import type { RestaurantNgoRoute } from "@/lib/restaurantNgoRouting";
import type { PlannedRoutes } from "@/lib/routeOptimiser";

type SidebarTab = "pickups" | "planner" | "optimiser";

const Index = () => {
  const { user, logout } = useAuth();
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
    <main className="min-h-screen neu-bg font-sleek text-slate-700">
      {/* Header */}
      <header className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/20">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden md:block pl-6 border-l border-slate-300">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" /> Live dashboard · Indore, MP
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              Real-time matching of surplus food to NGOs & shelters
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Portal links */}
          <div className="flex gap-2">
            {(!user || user.role === "restaurant") && (
              <Link to="/restaurant">
                <button className="neu-btn px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs text-emerald-600">
                  <UtensilsCrossed className="h-3 w-3" /> Restaurant
                </button>
              </Link>
            )}
            {(!user || user.role === "ngo") && (
              <Link to="/ngo">
                <button className="neu-btn px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs text-orange-600">
                  <HeartHandshake className="h-3 w-3" /> NGO
                </button>
              </Link>
            )}
            {(!user || user.role === "volunteer") && (
              <Link to="/volunteer">
                <button className="neu-btn px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs text-purple-600">
                  <Truck className="h-3 w-3" /> Volunteer
                </button>
              </Link>
            )}
          </div>
          {user && (
            <button
              onClick={() => logout()}
              className="neu-btn px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs text-rose-500 font-semibold transition-colors"
            >
              <LogOut className="h-3 w-3" /> Logout
            </button>
          )}
          <button
            className="neu-flat px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold hover:text-slate-800 transition-colors"
            onClick={() => setRunning(!running)}
          >
            {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {running ? "Pause" : "Resume"}
          </button>
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
