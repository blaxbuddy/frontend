import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UtensilsCrossed, Package, MapPin, Clock, Send, LogOut } from "lucide-react";

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

    if (!user?.supabaseUserId) {
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
        // Create a new business for this restaurant user
        const { data: newBiz, error: newBizError } = await supabase
          .from("businesses")
          .insert([{
            name: user.name,
            address: form.pickupAddress,
            lat: 22.7196,
            lng: 75.8577,
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
        const { data: newShelter, error: newShelterError } = await supabase
          .from("shelters")
          .insert([{
            name: "Default NGO Shelter",
            address: "Indore, MP",
            lat: 22.7196,
            lng: 75.8577,
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

      const { data: pickup, error: pickupError } = await (supabase
        .from("pickups")
        .insert([{
          business_id: businessId,
          shelter_id: shelterId,
          food_description: form.foodType,
          quantity: parseInt(form.quantity),
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          user_id: user.supabaseUserId,
        } as any])
        .select()
        .single() as any);

      if (pickupError) {
        console.warn("Pickup creation warning:", pickupError);
      }

      localStorage.setItem("latestDonation", JSON.stringify({
        ...form,
        pickupId: pickup?.id,
        timestamp: new Date().toISOString(),
        pickupOTP: generatedPickupOTP,
        dropOTP: generatedDropOTP,
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <header className="bg-gradient-to-r from-amber-600 to-orange-500 text-white">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                <h1 className="text-2xl font-bold">LEFTO — Restaurant Portal</h1>
              </div>
              <p className="text-sm opacity-90 mt-0.5">Donate surplus food to those in need</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <p>Welcome, {user?.name}</p>
              <p className="text-xs opacity-75">Role: {user?.role}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-white/10 border-white/20 hover:bg-white/20 text-white gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-2xl">
        {!showForm && !submitted && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardContent className="pt-10 pb-10 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Package className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Surplus Food to Give?</h2>
                <p className="text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
                  Turn your excess food into hope. Connect with local volunteers and make a real difference today.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg px-8 py-6 text-lg"
              >
                Donate Today! 🍽️
              </Button>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <UtensilsCrossed className="h-5 w-5 text-amber-500" />
                Food Donation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="foodType" className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-amber-500" /> Food Type
                  </Label>
                  <Input
                    id="foodType"
                    placeholder="e.g. Poha, Dal Bafla, Biryani..."
                    value={form.foodType}
                    onChange={(e) => updateField("foodType", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-amber-500" /> Approx. Weight (Kg)
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="e.g. 5"
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="readyTime" className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Ready for Pickup
                  </Label>
                  <Input
                    id="readyTime"
                    type="time"
                    value={form.readyTime}
                    onChange={(e) => updateField("readyTime", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupAddress" className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" /> Pickup Address
                  </Label>
                  <Input
                    id="pickupAddress"
                    placeholder="Restaurant address in Indore"
                    value={form.pickupAddress}
                    onChange={(e) => updateField("pickupAddress", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ngoAddress" className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-green-500" /> Target NGO (optional)
                  </Label>
                  <Input
                    id="ngoAddress"
                    placeholder="Leave blank for automatic assignment"
                    value={form.ngoAddress}
                    onChange={(e) => updateField("ngoAddress", e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2">
                    <Send className="h-4 w-4" /> {isSubmitting ? "Submitting..." : "Confirm Donation"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {submitted && (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
            <CardContent className="pt-10 pb-10 text-center space-y-6">
              <div className="text-5xl">🎉</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Donation Submitted!</h3>
                <p className="text-gray-600">Your donation has been posted. Volunteers will pick it up shortly.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900"><strong>Pickup OTP:</strong> {pickupOTP}</p>
              </div>
              <Button
                onClick={() => setSubmitted(false)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                Make Another Donation
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}