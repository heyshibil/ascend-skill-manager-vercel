import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import useUIStore from "./store/useUIStore";
import LoadingScreen from "./components/ui/LoadingScreen";
import { Toaster } from "sonner";

const App = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);

  const isAppReady = useUIStore((state) => state.isAppReady);
  const setAppReady = useUIStore((state) => state.setAppReady);

  const [showLoader, setShowLoader] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle ready state transition for synchronous routes
  useEffect(() => {
    if (!isCheckingAuth && !isLandingPage) {
      setAppReady(true);
    }
  }, [isCheckingAuth, isLandingPage, setAppReady]);

  // Sync exiting state when app is ready
  useEffect(() => {
    if (isAppReady) {
      setIsExiting(true);
    }
  }, [isAppReady]);

  const handleExited = () => {
    setShowLoader(false);
  };

  return (
    <>
      {showLoader && (
        <LoadingScreen isExiting={isExiting} onExited={handleExited} />
      )}
      {!isCheckingAuth && <Outlet />}
      <Toaster
        theme={isAdminRoute ? "light" : "dark"}
        position="top-center"
        richColors
        duration={3000}
      />
    </>
  );
};

export default App;
