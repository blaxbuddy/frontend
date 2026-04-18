import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, UtensilsCrossed, Package, MapPin, Clock, Send } from "lucide-react";

type DonationForm = {
  foodType: string;
  quantity: string;
  readyTime: string;
  pickupAddress: string;
  ngoAddress: string;
};

export default function RestaurantPortal() {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.foodType || !form.quantity || !form.pickupAddress) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    // Generate dynamic OTPs
    const generatedPickupOTP = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedDropOTP = Math.floor(1000 + Math.random() * 9000).toString();
    setPickupOTP(generatedPickupOTP);

    // Store OTPs for volunteer verification
    localStorage.setItem("pickupOTP", generatedPickupOTP);
    localStorage.setItem("dropOTP", generatedDropOTP);
    localStorage.setItem("latestDonation", JSON.stringify({
      ...form,
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
  };

  const updateField = (field: keyof DonationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
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
          <Link to="/">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
              Dashboard →
            </Button>
          </Link>
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
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2">
                    <Send className="h-4 w-4" /> Confirm Donation
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {submitted && (
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur border-l-4 border-l-green-500">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">✅</div>
                  <h3 className="text-lg font-semibold">Donation Submitted Successfully!</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Food:</strong> {form.foodType} ({form.quantity} kg)</p>
                  <p><strong>Pickup:</strong> {form.pickupAddress}</p>
                  {form.ngoAddress && <p><strong>Target NGO:</strong> {form.ngoAddress}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">📍 Pickup Verification PIN</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">Share this PIN with the volunteer when they arrive:</p>
                <div className="flex gap-2 justify-center">
                  {pickupOTP.split("").map((digit, i) => (
                    <div key={i} className="w-12 h-14 bg-white rounded-xl border-2 border-blue-200 flex items-center justify-center text-2xl font-bold text-blue-700 shadow-sm">
                      {digit}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => { setSubmitted(false); setForm({ foodType: "", quantity: "", readyTime: "", pickupAddress: "", ngoAddress: "" }); }}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
              >
                Donate Again
              </Button>
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full">View on Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
