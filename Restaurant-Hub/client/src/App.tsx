import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/api";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

// Public Pages
import PublicHome from "@/pages/PublicHome";
import Login from "@/pages/Login";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import MenuManagement from "@/pages/admin/MenuManagement";
import Settings from "@/pages/admin/Settings";
import ImageManager from "@/pages/admin/ImageManager";

// ✅ فحص اتصال API (يستخدم نفس منطق api.ts: نسبي في الإنتاج /api)
async function checkApiHealth() {
  try {
    const url = getApiUrl("test");
    const response = await fetch(url, { credentials: "include" });
    return response.ok;
  } catch (error) {
    console.error("API connection error:", error);
    return false;
  }
}

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [apiConnected, setApiConnected] = useState(true);

  useEffect(() => {
    checkApiHealth().then(setApiConnected);
  }, []);

  if (!apiConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p className="text-muted-foreground mb-6">
            Cannot connect to the server. Please make sure:
          </p>
          <ul className="text-left text-sm text-muted-foreground mb-6 space-y-2">
            <li>• Backend server is running</li>
            <li>• PostgreSQL database is started</li>
            <li>• No firewall blocking the connection</li>
          </ul>
          <div className="text-xs text-muted-foreground mt-4">
            Tried: {getApiUrl("test")}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

// Admin Layout Container
function AdminContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}

function Router() {
  const { user } = useAuth();
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    // تأخير التحميل حتى يصبح API جاهزاً
    const timer = setTimeout(() => {
      setApiReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!apiReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Starting application...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={PublicHome} />
      <Route path="/admin/login">
        {user ? <Redirect to="/admin" /> : <Login />}
      </Route>

      {/* Admin Routes - جميعها داخل AdminContainer */}
      <Route path="/admin">
        <AdminContainer>
          <ProtectedRoute component={AdminDashboard} />
        </AdminContainer>
      </Route>
      
      <Route path="/admin/menu">
        <AdminContainer>
          <ProtectedRoute component={MenuManagement} />
        </AdminContainer>
      </Route>
      
      <Route path="/admin/settings">
        <AdminContainer>
          <ProtectedRoute component={Settings} />
        </AdminContainer>
      </Route>
      
      <Route path="/admin/images">
        <AdminContainer>
          <ProtectedRoute component={ImageManager} />
        </AdminContainer>
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;