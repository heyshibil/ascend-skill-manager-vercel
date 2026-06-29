import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { Loader2 } from "lucide-react";

const AdminRoute = () => {
  const { user, isAuthenticated, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Authorized admins see the child components
  return <Outlet />;
};

export default AdminRoute;
