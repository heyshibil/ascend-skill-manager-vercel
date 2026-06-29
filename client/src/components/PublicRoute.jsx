import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { Loader2 } from "lucide-react";

const PublicRoute = () => {
  const { isAuthenticated, isCheckingAuth, user } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-canvas)]">
        <Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (user.onboardingStatus === "pending_test") {
      return <Navigate to={`/test?skill=${encodeURIComponent(user.coreLanguage || 'JavaScript')}`} replace />;
    }
    if (user.onboardingStatus === "pending_discovery") {
      return <Navigate to="/discovery" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
