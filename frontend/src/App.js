import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import CitizenDashboard from "./pages/CitizenDashboard";
import LicensePage from "./pages/LicensePage";
import HistoryPage from "./pages/HistoryPage";
import NotificationsPage from "./pages/NotificationsPage";
import DocumentsPage from "./pages/DocumentsPage";
import SettingsPage from "./pages/SettingsPage";
import DealerPortal from "./pages/DealerPortal";
import DealerInventory from "./pages/DealerInventory";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import AlertsDashboard from "./pages/AlertsDashboard";
import PredictiveAnalytics from "./pages/PredictiveAnalytics";
import PendingReviews from "./pages/PendingReviews";
import GovernmentNotifications from "./pages/GovernmentNotifications";
import GovernmentTemplates from "./pages/GovernmentTemplates";
import Marketplace from "./pages/Marketplace";
import ProfileSetup from "./pages/ProfileSetup";
import TrainingCourses from "./pages/TrainingCourses";

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registration successful:', registration.scope);
      })
      .catch((error) => {
        console.log('[SW] Registration failed:', error);
      });
  });
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await api.post("/auth/session", { session_id: sessionId });
          const user = response.data;
          
          // Clear the hash from URL
          window.history.replaceState(null, "", window.location.pathname);
          
          // Navigate based on role
          if (user.role === "admin") {
            navigate("/government", { state: { user }, replace: true });
          } else if (user.role === "dealer") {
            navigate("/dealer", { state: { user }, replace: true });
          } else {
            navigate("/dashboard", { state: { user }, replace: true });
          }
        } catch (error) {
          console.error("Auth error:", error);
          navigate("/", { replace: true });
        }
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-aegis-navy flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-aegis-signal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/70 font-mono text-sm">AUTHENTICATING...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [user, setUser] = useState(location.state?.user || null);
  const [isLoading, setIsLoading] = useState(!location.state?.user);

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location.state, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-aegis-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-aegis-signal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70 font-mono text-sm">VERIFYING ACCESS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === "admin") {
      return <Navigate to="/government" replace />;
    } else if (user?.role === "dealer") {
      return <Navigate to="/dealer" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children({ user, api });
};

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage api={api} />} />
      <Route path="/login" element={<LoginPage api={api} />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            {({ user, api }) => <CitizenDashboard user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/license"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            {({ user, api }) => <LicensePage user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/history"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            {({ user, api }) => <HistoryPage user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/notifications"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            {({ user, api }) => <NotificationsPage user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/documents"
        element={
          <ProtectedRoute allowedRoles={["citizen", "dealer", "admin"]}>
            {({ user, api }) => <DocumentsPage user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            {({ user, api }) => <SettingsPage user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dealer"
        element={
          <ProtectedRoute allowedRoles={["dealer", "admin"]}>
            {({ user, api }) => <DealerPortal user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dealer/inventory"
        element={
          <ProtectedRoute allowedRoles={["dealer", "admin"]}>
            {({ user, api }) => <DealerInventory user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/government"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            {({ user, api }) => <GovernmentDashboard user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/government/alerts-dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            {({ user, api }) => <AlertsDashboard user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/government/predictive"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            {({ user, api }) => <PredictiveAnalytics user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/government/reviews"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            {({ user, api }) => <PendingReviews user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/government/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            {({ user, api }) => <GovernmentNotifications user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/marketplace"
        element={
          <ProtectedRoute allowedRoles={["citizen", "dealer", "admin"]}>
            {({ user, api }) => <Marketplace user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/training"
        element={
          <ProtectedRoute allowedRoles={["citizen", "dealer", "admin"]}>
            {({ user, api }) => <TrainingCourses user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/setup"
        element={
          <ProtectedRoute allowedRoles={["citizen", "dealer", "admin"]}>
            {({ user, api }) => <ProfileSetup user={user} api={api} />}
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ammo-theme">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
