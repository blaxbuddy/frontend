import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, HeartHandshake, Package, MapPin, Send } from "lucide-react";
import { LiveDeliveryMap } from "@/components/dashboard/LiveDeliveryMap";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function NgoPortal() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [mockDistance, setMockDistance] = useState<number | null>(null);
  const [dropOTP, setDropOTP] = useState("----");

  const [volunteerStatus, setVolunteerStatus] = useState<string | null>(null);

  const { user, logout } = useAuth();

  useEffect(() => {
    if (!submitted) return;
    // Poll Supabase for pickup status changes (replaces localStorage polling)
    const pollInterval = setInterval(async () => {
      try {
        const { data: latestPickup } = await (supabase
          .from('pickups' as any)
          .select('status')
          .order('created_at', { ascending: false })
          .limit(1)
          .single() as any);
        
        if (latestPickup?.status === 'in_transit') {
          setVolunteerStatus('in_transit');
        } else if (latestPickup?.status === 'completed') {
          setVolunteerStatus('completed');
        }
      } catch {
        // Also check localStorage as fallback for same-browser demo
        setVolunteerStatus(localStorage.getItem("volunteerStatus"));
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [submitted]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (submitted && volunteerStatus === "in_transit") {
      // Distance is null (waiting) -> sets to 2.4 km when driver picks up
      setMockDistance((prev) => prev === null ? 2.4 : prev);
      
      interval = setInterval(() => {
        setMockDistance((prev) => {
          if (prev === null || prev <= 0.05) {
            clearInterval(interval);
            return 0;
          }
          return parseFloat((prev - 0.24).toFixed(2));
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [submitted, volunteerStatus]);

  const handleSubmit = async () => {
    if (!quantity) {
      toast({ title: "Please specify food quantity", variant: "destructive" });
      return;
    }

    // Try to get drop_otp from the latest pending pickup in Supabase
    let otp = "----";
    try {
      const { data: latestPickup } = await (supabase
        .from('pickups' as any)
        .select('drop_otp')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as any);
      
      if (latestPickup?.drop_otp) {
        otp = latestPickup.drop_otp;
      }
    } catch {
      // Fallback to localStorage for same-browser demo
      otp = localStorage.getItem("dropOTP") ?? "----";
    }

    setDropOTP(otp);
    setSubmitted(true);
    setShowForm(false);
    
    // Reset states for new request
    localStorage.removeItem("volunteerStatus");
    setVolunteerStatus(null);
    setMockDistance(null);

    toast({
      title: "🎉 Request submitted!",
      description: `Requesting ${quantity} servings. Waiting for driver pickup...`,
    });
  };

  const handleLogout = () => {
    logout();
  };

  // Fixed coordinates for the demo: Sarafa Bazaar (pickup) -> Sirpur Lake (NGO)
  const pickupPos = { lat: 22.7185, lng: 75.8569 };
  const dropPos = { lat: 22.6864, lng: 75.8534 };
  const maxDistance = 2.4;
  const progress = mockDistance !== null ? Math.max(0, Math.min(1, (maxDistance - mockDistance) / maxDistance)) : 0;

  return (
    <div className="min-h-screen neu-bg relative font-sleek text-slate-700 overflow-hidden">
      {/* Decorative glowing blobs for the reflective greenish glass effect */}
      <div className="absolute top-[10%] left-[-10%] w-96 h-96 bg-orange-400/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-96 h-96 bg-orange-300/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-orange-500 text-white shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden md:block pl-6 border-l border-orange-400">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-white" />
              <h1 className="text-xl font-bold">NGO Portal</h1>
            </div>
            <p className="text-sm text-orange-100 mt-0.5">Request surplus food donations for those in need</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right text-sm mr-2 hidden md:block">
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-orange-100 capitalize">{user?.role}</p>
          </div>
          <Link to="/">
            <button className="px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors text-white backdrop-blur-md">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </button>
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors text-white backdrop-blur-md"
          >
            <LogOut className="h-3 w-3" /> Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-2xl relative z-10">
        {!showForm && !submitted && (
          <div className="neu-flat rounded-3xl p-10 text-center space-y-8 animate-fade-in-up">
            <div className="mx-auto w-24 h-24 neu-flat rounded-full flex items-center justify-center">
              <HeartHandshake className="h-10 w-10 text-orange-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800">Need Food for People?</h2>
              <p className="text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                Submit a request and we'll match you with nearby donors that have surplus food ready for pickup.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="neu-btn text-orange-600 px-10 py-4 rounded-2xl text-lg w-full max-w-sm mx-auto flex items-center justify-center gap-2"
            >
              <Package className="h-5 w-5" />
              Request a Donation!
            </button>
          </div>
        )}

        {showForm && (
          <div className="neu-flat rounded-3xl p-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/20">
              <div className="p-3 neu-pressed rounded-full">
                <Package className="h-6 w-6 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Set Food Requirement</h2>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="foodQuantity" className="flex items-center gap-2 text-sm font-semibold text-slate-600 ml-1">
                  <Package className="h-4 w-4 text-orange-500" /> Required Quantity
                </label>
                <div className="flex gap-4">
                  <input
                    id="foodQuantity"
                    type="number"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="neu-input w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-orange-500/20"
                  />
                  <div className="flex items-center px-4 neu-pressed rounded-xl text-sm text-slate-600 whitespace-nowrap font-medium">
                    per serving
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSubmit}
                  className="neu-btn flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-orange-600 text-lg"
                >
                  <Send className="h-5 w-5" /> Submit Request
                </button>
                <button 
                  onClick={() => setShowForm(false)}
                  className="neu-flat px-8 py-4 rounded-2xl flex items-center justify-center text-slate-600 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {submitted && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="neu-flat rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-orange-500" />
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-5 w-5 text-orange-500" />
                <h3 className="text-xl font-bold text-slate-800">Package Information</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 neu-pressed rounded-2xl">
                  <span className="text-slate-500 font-medium">Requesting:</span>
                  <span className="font-bold text-slate-700">{quantity} servings</span>
                </div>
                <div className="flex items-center justify-between p-4 neu-pressed rounded-2xl">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-bold text-orange-600 text-right">
                    {mockDistance === null
                      ? "Waiting for volunteer..."
                      : mockDistance === 0
                      ? "Driver arrived! Provide PIN."
                      : `${mockDistance.toFixed(2)} km away`}
                  </span>
                </div>
              </div>
            </div>

            <div className="neu-flat rounded-3xl p-8 text-center space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                Provide this PIN to the Driver
              </h3>
              <div className="neu-pressed rounded-2xl p-6 max-w-sm mx-auto">
                <p className="text-4xl font-mono font-bold text-orange-600 tracking-[0.3em] ml-2">{dropOTP}</p>
              </div>
            </div>

            {/* Live Delivery Map (shown when driver is tracked) */}
            {volunteerStatus === "in_transit" && (
              <div className="neu-flat rounded-3xl overflow-hidden h-64 relative border border-white/30">
                <LiveDeliveryMap startPos={pickupPos} endPos={dropPos} progress={progress} />
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => { setSubmitted(false); setQuantity(""); }}
                className="neu-btn flex-1 py-4 rounded-2xl text-orange-600 font-bold text-lg"
              >
                New Request
              </button>
              <Link to="/" className="flex-1">
                <button className="neu-flat w-full py-4 rounded-2xl text-slate-600 font-bold text-lg">
                  Dashboard
                </button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
