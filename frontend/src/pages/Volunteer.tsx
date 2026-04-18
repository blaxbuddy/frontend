import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Truck, MapPin, Package, CheckCircle2 } from "lucide-react";
import { LiveDeliveryMap } from "@/components/dashboard/LiveDeliveryMap";

type FlowState = "offline" | "waiting" | "notification" | "pickup_otp" | "in_transit" | "drop_otp" | "completed";

export default function VolunteerPortal() {
  const [flowState, setFlowState] = useState<FlowState>("offline");
  const [isOnline, setIsOnline] = useState(false);
  const [pickupOtpInput, setPickupOtpInput] = useState("");
  const [dropOtpInput, setDropOtpInput] = useState("");
  const [transitProgress, setTransitProgress] = useState(0);

  const handleToggle = useCallback((checked: boolean) => {
    setIsOnline(checked);
    if (checked) {
      setFlowState("waiting");
      // Simulate receiving an order after 2.5 seconds
      setTimeout(() => setFlowState("notification"), 2500);
    } else {
      setFlowState("offline");
    }
  }, []);

  const handleAccept = () => {
    setFlowState("pickup_otp");
    toast({ title: "📍 Navigating to pickup location..." });
    // Simulate arriving at pickup
    setTimeout(() => {
      toast({ title: "Arrived at pickup!", description: "Please verify OTP." });
    }, 2000);
  };

  const handleDecline = () => {
    setFlowState("waiting");
    toast({ title: "Order declined", description: "Waiting for next request..." });
    // Re-trigger a mock order
    if (isOnline) {
      setTimeout(() => setFlowState("notification"), 3000);
    }
  };

  const verifyPickup = () => {
    const realOTP = localStorage.getItem("pickupOTP") ?? "5319";
    if (pickupOtpInput === realOTP) {
      setFlowState("in_transit");
      setPickupOtpInput("");
      setTransitProgress(0);
      
      // Notify NGO page that driver is en route
      localStorage.setItem("volunteerStatus", "in_transit");

      toast({ title: "✅ Package secured!", description: "Navigating to NGO drop-off..." });
      // Simulate arriving at NGO (10 seconds to match the NGO page distance countdown)
      setTimeout(() => {
        setFlowState("drop_otp");
        toast({ title: "Arrived at NGO!", description: "Enter drop-off OTP." });
      }, 10000);
    } else {
      toast({ title: "❌ Wrong OTP", variant: "destructive" });
    }
  };

  const verifyDrop = () => {
    const realOTP = localStorage.getItem("dropOTP") ?? "8642";
    if (dropOtpInput === realOTP) {
      setFlowState("completed");
      setDropOtpInput("");
      localStorage.setItem("volunteerStatus", "completed");
      toast({ title: "🎉 Delivery Complete!" });
    } else {
      toast({ title: "❌ Wrong OTP", variant: "destructive" });
    }
  };

  // Cleanup on unmount
  useEffect(() => () => setFlowState("offline"), []);

  // Update progress for map animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (flowState === "in_transit") {
      // 10 seconds total: update every 100ms (100 steps of 0.01)
      interval = setInterval(() => {
        setTransitProgress((prev) => Math.min(1, prev + 0.01));
      }, 100);
    } else if (flowState === "drop_otp" || flowState === "completed") {
      setTransitProgress(1);
    }
    return () => clearInterval(interval);
  }, [flowState]);

  // Fetch latest donation on mount or when state changes
  const latestDonation = JSON.parse(localStorage.getItem("latestDonation") || "null");

  const statusText: Record<FlowState, string> = {
    offline: "Ready to help? Go online to receive orders.",
    waiting: "Waiting for delivery requests...",
    notification: "New delivery request received!",
    pickup_otp: "At pickup location — verify OTP",
    in_transit: "Package secured! Navigating to drop-off...",
    drop_otp: "At NGO — verify drop-off OTP",
    completed: "✅ Delivery Complete!",
  };

  // Fixed coordinates for the demo: Sarafa Bazaar (pickup) -> Sirpur Lake (NGO)
  const pickupPos = { lat: 22.7185, lng: 75.8569 };
  const dropPos = { lat: 22.6864, lng: 75.8534 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <h1 className="text-2xl font-bold">LEFTO — Volunteer Portal</h1>
              </div>
              <p className="text-sm opacity-90 mt-0.5">Our Working Hands 🙌</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
              Dashboard →
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-2xl space-y-6">
        {/* Online/Offline Toggle */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className={`text-lg font-bold ${isOnline ? "text-green-600" : "text-gray-500"}`}>
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>
            <Switch checked={isOnline} onCheckedChange={handleToggle} />
          </CardContent>
        </Card>

        {/* Status text */}
        <div className="text-center text-sm text-gray-600 bg-white/60 rounded-lg py-3 px-4 backdrop-blur">
          {statusText[flowState]}
        </div>

        {/* Notification overlay */}
        {flowState === "notification" && (
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">🆕 New Delivery Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <span><strong>Pickup:</strong> {latestDonation?.pickupAddress || "Sarafa Bazaar, Indore"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span><strong>Drop:</strong> {latestDonation?.ngoAddress || "Annapurna Rasoi, Near Sirpur Lake"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span><strong>Distance:</strong> 2.4 km from current location</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800 font-medium">
                    Package: {latestDonation?.quantity || 50} kg, {latestDonation?.foodType || "Surplus Jalebi + Garadu"}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700">
                  Accept ✓
                </Button>
                <Button onClick={handleDecline} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                  Decline ✗
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pickup OTP verification */}
        {flowState === "pickup_otp" && (
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">🔐 Pickup Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Enter the OTP provided by the restaurant to confirm pickup.</p>
              <Input
                type="text"
                maxLength={4}
                placeholder="••••"
                value={pickupOtpInput}
                onChange={(e) => setPickupOtpInput(e.target.value)}
                className="text-center text-2xl tracking-[0.5em] font-bold"
              />
              <Button onClick={verifyPickup} className="w-full bg-orange-500 hover:bg-orange-600">
                Verify & Start Journey
              </Button>
            </CardContent>
          </Card>
        )}

        {/* In transit */}
        {flowState === "in_transit" && (
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-blue-50 border-l-4 border-l-blue-500">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
                <div className="text-lg font-semibold text-blue-800">In Transit</div>
                <p className="text-sm text-blue-600">Navigating to Annapurna Rasoi, Near Sirpur Lake...</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-xl overflow-hidden h-64">
              <LiveDeliveryMap startPos={pickupPos} endPos={dropPos} progress={transitProgress} />
            </Card>
          </div>
        )}

        {/* Drop-off OTP verification */}
        {flowState === "drop_otp" && (
          <div className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">🔐 Delivery Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Enter the OTP provided by the NGO to confirm successful delivery.</p>
                <Input
                  type="text"
                  maxLength={4}
                  placeholder="••••"
                  value={dropOtpInput}
                  onChange={(e) => setDropOtpInput(e.target.value)}
                  className="text-center text-2xl tracking-[0.5em] font-bold"
                />
                <Button onClick={verifyDrop} className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Verify & Complete
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-xl overflow-hidden h-64">
              <LiveDeliveryMap startPos={pickupPos} endPos={dropPos} progress={1} />
            </Card>
          </div>
        )}

        {/* Completed */}
        {flowState === "completed" && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-800">Delivery Complete!</div>
              <p className="text-gray-600">Thank you for helping feed people in need. 🙏</p>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => { setFlowState("waiting"); setTimeout(() => setFlowState("notification"), 3000); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Accept More
                </Button>
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
