import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, MapPin, Clock, Send, LogOut, UtensilsCrossed, Truck } from "lucide-react";
import { geocodeAddress } from "@/lib/geocode";
import { Logo } from "@/components/Logo";
import { requiredVehicleForWeight, matchPickupsToDrivers, type VehicleType, type Driver, type Pickup } from "@/lib/bipartiteMatch";

type DonationForm = {
  foodType: string;
  quantity: string;
  readyTime: string;
  pickupAddress: string;
  ngoAddress: string;
};

export default function RestaurantPortal() {
  const { user, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<DonationForm>({
    foodType: "",
    quantity: "",
    readyTime: "",
    pickupAddress: "",
    ngoAddress: "",
  });

  const [pickupOTP, setPickupOTP] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!form.foodType || !form.quantity || !form.pickupAddress) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (!user) {
      toast({ title: "User not properly authenticated", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const generatedPickupOTP = Math.floor(1000 + Math.random() * 9000).toString();
      const generatedDropOTP = Math.floor(1000 + Math.random() * 9000).toString();
      setPickupOTP(generatedPickupOTP);

      localStorage.setItem("pickupOTP", generatedPickupOTP);
      localStorage.setItem("dropOTP", generatedDropOTP);

      // Get or create business for this restaurant (use localStorage to persist)
      let businessId = localStorage.getItem("restaurant_business_id");

      if (!businessId) {
        let lat = 22.7196;
        let lng = 75.8577;
        const geo = await geocodeAddress(form.pickupAddress + ", Indore, MP");
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }

        // Create a new business for this restaurant user
        const { data: newBiz, error: newBizError } = await supabase
          .from("businesses")
          .insert([{
            name: user.name,
            address: form.pickupAddress,
            lat,
            lng,
          }])
          .select("id")
          .single();

        if (newBizError) {
          console.warn("Create business warning:", newBizError);
          businessId = `biz_${Date.now()}`;
        } else if (newBiz?.id) {
          businessId = newBiz.id;
          localStorage.setItem("restaurant_business_id", businessId);
        }
      }

      const { data: shelters, error: shelterError } = await supabase
        .from("shelters")
        .select("id")
        .limit(1);

      if (shelterError && shelterError.code !== "PGRST116") {
        console.warn("Shelters query warning:", shelterError);
      }

      let shelterId: string;

      if (shelters && shelters.length > 0) {
        shelterId = shelters[0].id;
      } else {
        let shelterLat = 22.7196;
        let shelterLng = 75.8577;
        let shelterName = "Default NGO Shelter";
        let shelterAddr = "Indore, MP";

        if (form.ngoAddress) {
          shelterName = "Target NGO";
          shelterAddr = form.ngoAddress;
          const ngoGeo = await geocodeAddress(form.ngoAddress + ", Indore, MP");
          if (ngoGeo) {
            shelterLat = ngoGeo.lat;
            shelterLng = ngoGeo.lng;
          }
        } else {
          // If no NGO provided, try to spread out the default NGO a bit
          shelterLat = 22.6864;
          shelterLng = 75.8534;
        }

        const { data: newShelter, error: newShelterError } = await supabase
          .from("shelters")
          .insert([{
            name: shelterName,
            address: shelterAddr,
            lat: shelterLat,
            lng: shelterLng,
          }])
          .select("id")
          .single();

        if (newShelterError) {
          console.warn("Create shelter warning:", newShelterError);
          shelterId = `shelter_${Date.now()}`;
        } else {
          shelterId = newShelter.id;
        }
      }

      const weightKg = parseInt(form.quantity);
      const vehicleNeeded = requiredVehicleForWeight(weightKg);

      const { data: pickup, error: pickupError } = await (supabase
        .from("pickups")
        .insert([{
          business_id: businessId,
          shelter_id: shelterId,
          food_description: form.foodType,
          quantity: weightKg,
          weight_kg: weightKg,
          required_vehicle: vehicleNeeded,
          pickup_otp: generatedPickupOTP,
          drop_otp: generatedDropOTP,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          user_id: user.supabaseUserId || user.id,
        } as any])
        .select()
        .single() as any);

      if (pickupError) {
        console.warn("Pickup creation warning:", pickupError);
      }

      // ── Bipartite Matching: find a suitable volunteer ──────────
      let assignedDriverName: string | null = null;
      try {
        // Fetch all online volunteers from Supabase
        const { data: volunteers } = await (supabase
          .from('app_users' as any)
          .select('id, name, vehicle_type')
          .eq('role', 'volunteer') as any);

        if (volunteers && volunteers.length > 0) {
          const drivers: Driver[] = volunteers.map((v: any) => ({
            id: v.id,
            name: v.name,
            vehicleType: (v.vehicle_type || '2-wheeler') as VehicleType,
            isOnline: true, // treat all registered volunteers as available for now
          }));

          const pickupForMatch: Pickup = {
            id: pickup?.id || 'temp',
            weightKg,
            requiredVehicle: vehicleNeeded,
          };

          const matches = matchPickupsToDrivers([pickupForMatch], drivers);
          
          if (matches.length > 0) {
            const match = matches[0];
            assignedDriverName = match.driverName;
            
            // Update the pickup with the assigned driver
            if (pickup?.id) {
              await (supabase
                .from('pickups' as any)
                .update({ assigned_driver_id: match.driverId, status: 'assigned' })
                .eq('id', pickup.id) as any);
            }
          }
        }
      } catch (matchErr) {
        console.warn('Bipartite matching error (non-critical):', matchErr);
      }

      localStorage.setItem("latestDonation", JSON.stringify({
        ...form,
        pickupId: pickup?.id,
        timestamp: new Date().toISOString(),
        pickupOTP: generatedPickupOTP,
        dropOTP: generatedDropOTP,
        requiredVehicle: vehicleNeeded,
        assignedDriver: assignedDriverName,
      }));

      setSubmitted(true);
      setShowForm(false);

      toast({
        title: "🎉 Donation submitted!",
        description: `${form.quantity} kg of ${form.foodType} ready for pickup.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit donation";
      toast({ title: errorMessage, variant: "destructive" });
      console.error("Submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof DonationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen neu-bg relative font-sleek text-slate-700 overflow-hidden">
      {/* Decorative glowing blobs for the reflective greenish glass effect */}
      <div className="absolute top-[10%] left-[-10%] w-96 h-96 bg-emerald-400/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-96 h-96 bg-emerald-300/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-emerald-500 text-white shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden md:block pl-6 border-l border-emerald-400">
            <h1 className="text-xl font-bold tracking-tight text-white">Donor Portal</h1>
            <p className="text-sm text-emerald-100 mt-0.5">Donate surplus food seamlessly as a Donor</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="font-medium text-white">{user?.name}</p>
            <p className="text-xs text-emerald-100 uppercase tracking-widest">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold bg-white/20 hover:bg-white/30 transition-colors text-white backdrop-blur-md"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-2xl relative z-10">
        {!showForm && !submitted && (
          <div className="neu-flat rounded-3xl p-10 text-center space-y-8 animate-fade-in-up">
            <div className="mx-auto w-24 h-24 neu-flat rounded-full flex items-center justify-center">
              <Package className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800">Surplus Food to Give?</h2>
              <p className="text-slate-500 mt-3 max-w-md mx-auto leading-relaxed text-lg">
                Turn your excess food into hope. Connect with local volunteers instantly in a sleek, seamless way.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="neu-btn text-emerald-600 px-10 py-4 rounded-2xl text-lg w-full max-w-sm mx-auto flex items-center justify-center gap-2"
            >
              <Package className="h-5 w-5" />
              Start Donation
            </button>
          </div>
        )}

        {showForm && (
          <div className="neu-flat rounded-3xl p-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/20">
              <div className="p-3 neu-pressed rounded-full">
                <UtensilsCrossed className="h-6 w-6 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Donation Details</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="foodType" className="flex items-center gap-2 text-sm font-semibold text-slate-600 ml-1">
                  <Package className="h-4 w-4 text-emerald-500" /> Food Type
                </label>
                <input
                  id="foodType"
                  className="neu-input w-full px-5 py-4 rounded-2xl text-slate-700 placeholder-slate-400 transition-shadow"
                  placeholder="e.g. Poha, Dal Bafla, Biryani..."
                  value={form.foodType}
                  onChange={(e) => updateField("foodType", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="quantity" className="flex items-center gap-2 text-sm font-semibold text-slate-600 ml-1">
                    <Package className="h-4 w-4 text-emerald-500" /> Weight (Kg)
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    className="neu-input w-full px-5 py-4 rounded-2xl text-slate-700 placeholder-slate-400"
                    placeholder="e.g. 5"
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="readyTime" className="flex items-center gap-2 text-sm font-semibold text-slate-600 ml-1">
                    <Clock className="h-4 w-4 text-emerald-500" /> Ready Time
                  </label>
                  <input
                    id="readyTime"
                    type="time"
                    className="neu-input w-full px-5 py-4 rounded-2xl text-slate-700"
                    value={form.readyTime}
                    onChange={(e) => updateField("readyTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="pickupAddress" className="flex items-center gap-2 text-sm font-semibold text-slate-600 ml-1">
                  <MapPin className="h-4 w-4 text-emerald-500" /> Pickup Address
                </label>
                <input
                  id="pickupAddress"
                  className="neu-input w-full px-5 py-4 rounded-2xl text-slate-700 placeholder-slate-400"
                  placeholder="Donor address in Indore"
                  value={form.pickupAddress}
                  onChange={(e) => updateField("pickupAddress", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="ngoAddress" className="flex items-center gap-2 text-sm font-semibold text-slate-600 ml-1">
                  <MapPin className="h-4 w-4 text-orange-500" /> Target NGO (optional)
                </label>
                <input
                  id="ngoAddress"
                  className="neu-input w-full px-5 py-4 rounded-2xl text-slate-700 placeholder-slate-400"
                  placeholder="Leave blank for automatic assignment"
                  value={form.ngoAddress}
                  onChange={(e) => updateField("ngoAddress", e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="neu-btn flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-emerald-600 text-lg"
                >
                  <Send className="h-5 w-5" /> 
                  {isSubmitting ? "Submitting..." : "Confirm Donation"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  disabled={isSubmitting}
                  className="neu-flat px-8 py-4 rounded-2xl text-slate-500 hover:text-slate-700 font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {submitted && (
          <div className="neu-flat rounded-3xl p-10 text-center space-y-8 animate-fade-in-up">
            <div className="mx-auto w-24 h-24 neu-flat rounded-full flex items-center justify-center">
              <span className="text-4xl">🎉</span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Success!</h3>
              <p className="text-slate-500 text-lg">Your donation is live. Volunteers are being notified now.</p>
            </div>
            
            <div className="neu-pressed rounded-2xl p-6 max-w-sm mx-auto">
              <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-2">Pickup OTP</p>
              <p className="text-4xl font-mono font-bold text-emerald-600 tracking-widest">{pickupOTP}</p>
            </div>

            {/* Vehicle & Driver Info */}
            <div className="neu-pressed rounded-2xl p-5 max-w-sm mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
                  <Truck className="h-4 w-4" /> Required Vehicle
                </span>
                <span className="font-bold text-slate-700 capitalize">
                  {JSON.parse(localStorage.getItem("latestDonation") || "{}").requiredVehicle || "2-wheeler"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">Assigned Driver</span>
                <span className="font-bold text-emerald-600">
                  {JSON.parse(localStorage.getItem("latestDonation") || "{}").assignedDriver || "Searching..."}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 max-w-sm mx-auto mt-6">
              <button
                onClick={() => setSubmitted(false)}
                className="neu-btn text-emerald-600 px-6 py-4 rounded-2xl text-lg flex-1"
              >
                New Donation
              </button>
              <Link to="/" className="flex-1">
                <button className="neu-flat w-full px-6 py-4 rounded-2xl text-slate-600 text-lg font-bold">
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