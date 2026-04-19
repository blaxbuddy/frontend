import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Truck, MapPin, Package, CheckCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LiveDeliveryMap } from "@/components/dashboard/LiveDeliveryMap";
import { Logo } from "@/components/Logo";

type FlowState = "offline" | "waiting" | "notification" | "pickup_otp" | "in_transit" | "drop_otp" | "completed";

export default function VolunteerPortal() {
  const { user, logout } = useAuth();
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

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen neu-bg relative font-sleek text-slate-700 overflow-hidden">
      {/* Decorative glowing blobs for the reflective greenish glass effect */}
      <div className="absolute top-[10%] left-[-10%] w-96 h-96 bg-purple-400/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-96 h-96 bg-purple-300/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-purple-500 text-white shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden md:block pl-6 border-l border-purple-400">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-white" />
              <h1 className="text-xl font-bold">Volunteer Portal</h1>
            </div>
            <p className="text-sm text-purple-100 mt-0.5">Transport food donations to those in need</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right text-sm mr-2 hidden md:block">
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-purple-100 capitalize">{user?.role}</p>
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

      <main className="container mx-auto px-6 py-10 max-w-2xl space-y-8 relative z-10">
        {/* Online/Offline Toggle */}
        <div className="neu-flat rounded-3xl p-6 flex items-center justify-between animate-fade-in-up">
          <div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Status</div>
            <div className={`text-xl font-bold ${isOnline ? "text-purple-600" : "text-slate-400"}`}>
              {isOnline ? "Online" : "Offline"}
            </div>
          </div>
          
          <button 
            onClick={() => handleToggle(!isOnline)}
            className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 ${isOnline ? 'bg-purple-500 shadow-inner' : 'neu-pressed'}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isOnline ? 'translate-x-8' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Status text */}
        <div className="text-center text-sm font-semibold text-slate-500 neu-pressed rounded-2xl py-4 px-6 animate-fade-in-up">
          {statusText[flowState]}
        </div>

        {/* Notification overlay */}
        {flowState === "notification" && (
          <div className="neu-flat rounded-3xl p-8 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 left-0 w-2 h-full bg-purple-500" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 neu-pressed rounded-full">
                <Truck className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">New Delivery Request</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 neu-pressed rounded-2xl">
                <MapPin className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Pickup</div>
                  <div className="text-slate-800 font-medium">{latestDonation?.pickupAddress || "Sarafa Bazaar, Indore"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 neu-pressed rounded-2xl">
                <MapPin className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Drop-off</div>
                  <div className="text-slate-800 font-medium">{latestDonation?.ngoAddress || "Annapurna Rasoi, Near Sirpur Lake"}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 neu-pressed rounded-2xl border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <span className="text-slate-600 text-sm font-semibold">Package:</span>
                </div>
                <span className="text-purple-700 font-bold text-right">
                  {latestDonation?.quantity || 50} kg, {latestDonation?.foodType || "Surplus Jalebi + Garadu"}
                </span>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button 
                onClick={handleAccept} 
                className="neu-btn flex-1 py-4 rounded-2xl text-emerald-600 font-bold text-lg"
              >
                Accept ✓
              </button>
              <button 
                onClick={handleDecline} 
                className="neu-flat flex-1 py-4 rounded-2xl text-rose-500 font-bold text-lg"
              >
                Decline ✗
              </button>
            </div>
          </div>
        )}

        {/* Pickup OTP verification */}
        {flowState === "pickup_otp" && (
          <div className="neu-flat rounded-3xl p-8 text-center space-y-6 animate-fade-in-up">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Pickup Verification</h3>
            <p className="text-slate-600 max-w-sm mx-auto">
              Enter the OTP provided by the donor to confirm you've collected the food.
            </p>
            <input
              type="text"
              maxLength={4}
              placeholder="••••"
              value={pickupOtpInput}
              onChange={(e) => setPickupOtpInput(e.target.value)}
              className="neu-input w-full max-w-[200px] mx-auto block text-center text-3xl tracking-[0.5em] font-bold py-4 rounded-2xl"
            />
            <button 
              onClick={verifyPickup} 
              className="neu-btn w-full max-w-xs mx-auto py-4 rounded-2xl text-purple-600 font-bold text-lg"
            >
              Verify & Start Journey
            </button>
          </div>
        )}

        {/* In transit */}
        {flowState === "in_transit" && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="neu-flat rounded-3xl p-8 text-center space-y-4">
              <div className="mx-auto w-20 h-20 neu-pressed rounded-full flex items-center justify-center">
                <Truck className="h-10 w-10 text-purple-500 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">In Transit</h3>
              <p className="text-slate-600 font-medium">
                Navigating to Annapurna Rasoi, Near Sirpur Lake...
              </p>
            </div>
            
            <div className="neu-flat rounded-3xl overflow-hidden h-64 relative border border-white/30">
              <LiveDeliveryMap startPos={pickupPos} endPos={dropPos} progress={transitProgress} />
            </div>
          </div>
        )}

        {/* Drop-off OTP verification */}
        {flowState === "drop_otp" && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="neu-flat rounded-3xl p-8 text-center space-y-6">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Delivery Verification</h3>
              <p className="text-slate-600 max-w-sm mx-auto">
                Enter the OTP provided by the NGO to confirm successful delivery.
              </p>
              <input
                type="text"
                maxLength={4}
                placeholder="••••"
                value={dropOtpInput}
                onChange={(e) => setDropOtpInput(e.target.value)}
                className="neu-input w-full max-w-[200px] mx-auto block text-center text-3xl tracking-[0.5em] font-bold py-4 rounded-2xl"
              />
              <button 
                onClick={verifyDrop} 
                className="neu-btn w-full max-w-xs mx-auto py-4 rounded-2xl text-emerald-600 font-bold text-lg"
              >
                Verify & Complete
              </button>
            </div>
            
            <div className="neu-flat rounded-3xl overflow-hidden h-64 relative border border-white/30">
              <LiveDeliveryMap startPos={pickupPos} endPos={dropPos} progress={1} />
            </div>
          </div>
        )}

        {/* Dashboard button for active deliveries */}
        {['pickup_otp', 'in_transit', 'drop_otp'].includes(flowState) && (
          <div className="pt-4 animate-fade-in-up">
            <Link to="/">
              <button className="neu-flat w-full py-4 rounded-2xl text-slate-600 font-bold text-lg">
                View Live Map Dashboard
              </button>
            </Link>
          </div>
        )}

        {/* Completed */}
        {flowState === "completed" && (
          <div className="neu-flat rounded-3xl p-10 text-center space-y-6 animate-fade-in-up">
            <div className="mx-auto w-24 h-24 neu-pressed rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-slate-800">Delivery Complete!</h3>
              <p className="text-slate-600 text-lg">Thank you for helping feed people in need. 🙏</p>
            </div>
            
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => { setFlowState("waiting"); setTimeout(() => setFlowState("notification"), 3000); }}
                className="neu-btn flex-1 py-4 rounded-2xl text-purple-600 font-bold text-lg"
              >
                Accept More
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
