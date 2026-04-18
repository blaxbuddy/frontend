import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, HeartHandshake, Package, MapPin, Send } from "lucide-react";
import { LiveDeliveryMap } from "@/components/dashboard/LiveDeliveryMap";

export default function NgoPortal() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [mockDistance, setMockDistance] = useState<number | null>(null);
  const [dropOTP, setDropOTP] = useState("----");

  const [volunteerStatus, setVolunteerStatus] = useState<string | null>(null);

  useEffect(() => {
    // Listen for cross-tab storage changes
    const handleStorage = () => {
      setVolunteerStatus(localStorage.getItem("volunteerStatus"));
    };
    window.addEventListener("storage", handleStorage);
    
    // Also poll occasionally in case events miss
    const pollInterval = setInterval(handleStorage, 1000);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(pollInterval);
    };
  }, []);

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

  const handleSubmit = () => {
    if (!quantity) {
      toast({ title: "Please specify food quantity", variant: "destructive" });
      return;
    }

    setDropOTP(localStorage.getItem("dropOTP") ?? "----");
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

  // Fixed coordinates for the demo: Sarafa Bazaar (pickup) -> Sirpur Lake (NGO)
  const pickupPos = { lat: 22.7185, lng: 75.8569 };
  const dropPos = { lat: 22.6864, lng: 75.8534 };
  const maxDistance = 2.4;
  const progress = mockDistance !== null ? Math.max(0, Math.min(1, (maxDistance - mockDistance) / maxDistance)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5" />
                <h1 className="text-2xl font-bold">LEFTO — NGO Portal</h1>
              </div>
              <p className="text-sm opacity-90 mt-0.5">Request surplus food donations for those in need</p>
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
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                <HeartHandshake className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Need Food for People?</h2>
                <p className="text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
                  Submit a request and we'll match you with nearby restaurants that have surplus food ready for pickup.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg px-8 py-6 text-lg"
              >
                Request a Donation! 💚
              </Button>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Package className="h-5 w-5 text-emerald-500" />
                Set Food Requirement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="foodQuantity" className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-emerald-500" /> Required Quantity
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="foodQuantity"
                      type="number"
                      placeholder="e.g. 50"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    <div className="flex items-center px-4 bg-gray-100 rounded-md text-sm text-gray-600 whitespace-nowrap">
                      per serving
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 gap-2"
                  >
                    <Send className="h-4 w-4" /> Submit Request
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {submitted && (
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" /> Package Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-500">Requesting:</span>{" "}
                  <span className="font-semibold">{quantity} per serving</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Distance:</span>{" "}
                  <span className="font-semibold">
                    {mockDistance === null
                      ? "Waiting for volunteer pickup..."
                      : mockDistance === 0
                      ? "🎉 Driver is at location! Please provide PIN."
                      : `${mockDistance.toFixed(2)} km`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🔐 Provide this PIN to the Driver</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-center">
                  {dropOTP.split("").map((digit, i) => (
                    <div key={i} className="w-12 h-14 bg-white rounded-xl border-2 border-emerald-200 flex items-center justify-center text-2xl font-bold text-emerald-700 shadow-sm">
                      {digit}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Live Delivery Map (shown when driver is tracked) */}
            {volunteerStatus === "in_transit" && (
              <Card className="border-0 shadow-xl overflow-hidden h-64">
                <LiveDeliveryMap startPos={pickupPos} endPos={dropPos} progress={progress} />
              </Card>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => { setSubmitted(false); setQuantity(""); }}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                New Request
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
