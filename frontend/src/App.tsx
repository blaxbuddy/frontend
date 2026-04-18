import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import Login from "./pages/Login.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RestaurantPortal from "./pages/Restaurant.tsx";
import NgoPortal from "./pages/Ngo.tsx";
import VolunteerPortal from "./pages/Volunteer.tsx";

const queryClient = new QueryClient();

// Wrapper component to redirect logged-in users away from login page
const LoginWrapper = () => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return <Login />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginWrapper />} />
    <Route
      path="/"
      element={
        <PrivateRoute>
          <Index />
        </PrivateRoute>
      }
    />
    <Route
      path="/restaurant"
      element={
        <PrivateRoute requiredRoles={["restaurant"]}>
          <RestaurantPortal />
        </PrivateRoute>
      }
    />
    <Route
      path="/ngo"
      element={
        <PrivateRoute requiredRoles={["ngo"]}>
          <NgoPortal />
        </PrivateRoute>
      }
    />
    <Route
      path="/volunteer"
      element={
        <PrivateRoute requiredRoles={["volunteer"]}>
          <VolunteerPortal />
        </PrivateRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;