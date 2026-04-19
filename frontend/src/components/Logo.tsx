import { UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-3 ${className}`}>
      <img src="/logo-circle.png" alt="Lefto Logo" className="w-12 h-12 object-contain drop-shadow-md hover:scale-105 transition-transform" />
      <span className="text-4xl font-black tracking-tighter text-[#f26513] font-sleek">Lefto</span>
    </Link>
  );
}
