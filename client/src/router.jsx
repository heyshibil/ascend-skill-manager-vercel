import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import App from "./App";
import Login from "./pages/Login";

// Lazy-load landing page to code-split Three.js (~200KB) from the app bundle
const LandingPage = lazy(() => import("./pages/LandingPage"));
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailChange from "./pages/VerifyEmailChange";
import VerifyPasswordChange from "./pages/VerifyPasswordChange";
import SkillSelect from "./pages/SkillSelect";
import VerificationTest from "./pages/VerificationTest";
import ScoreReport from "./pages/ScoreReport";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import QuestionsManager from "./pages/admin/QuestionsManager";
import QuestionsViewer from "./pages/admin/QuestionsViewer";
import AdminMarket from "./pages/admin/AdminMarket";
import UsersManagement from "./pages/admin/UsersManagement";
import AdminSkills from "./pages/admin/AdminSkills";
import SkillControl from "./pages/SkillControl";
import BoostMcqTest from "./pages/BoostMcqTest";
import BoostCompilerTest from "./pages/BoostCompilerTest";
import MarketIntel from "./pages/MarketIntel";
import Settings from "./pages/Settings";
import Problems from "./pages/Problems";
import ProblemWorkspace from "./pages/ProblemWorkspace";
import Leaderboard from "./pages/Leaderboard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Suspense fallback={<div style={{ background: '#0C0C0B', minHeight: '100vh' }} />}><LandingPage /></Suspense> },
      { path: "login", element: <Login /> },
      {
        path: "verify-email/:token",
        element: <VerifyEmail />,
      },
      {
        path: "verify-email-change/:token",
        element: <VerifyEmailChange />,
      },
      {
        path: "verify-password-change/:token",
        element: <VerifyPasswordChange />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "discovery",
            element: <SkillSelect />,
          },
          {
            path: "test",
            element: <VerificationTest />,
          },
          {
            path: "report",
            element: <ScoreReport />,
          },
          {
            path: "dashboard",
            element: <DashboardLayout />,
            children: [
              { index: true, element: <DashboardHome /> },
              { path: "skill-control", element: <SkillControl /> },
              { path: "boost/mcq", element: <BoostMcqTest /> },
              { path: "boost/compiler", element: <BoostCompilerTest /> },
              { path: "problems", element: <Problems /> },
              { path: "problems/:questionId", element: <ProblemWorkspace /> },
              { path: "leaderboard", element: <Leaderboard /> },
              { path: "market-intel", element: <MarketIntel /> },
              { path: "settings", element: <Settings /> },
            ],
          },
        ],
      },

      // -- Admin Branch --
      {
        path: "admin",
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: "questions", element: <QuestionsManager /> },
              { path: "questions/viewer", element: <QuestionsViewer /> },
              { path: "market", element: <AdminMarket /> },
              { path: "users", element: <UsersManagement /> },
              { path: "skills", element: <AdminSkills /> },
            ],
          },
        ],
      },
    ],
  },
]);
