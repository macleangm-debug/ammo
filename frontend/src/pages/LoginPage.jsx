import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, ArrowLeft, User, Lock, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const LoginPage = ({ api }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", { username, password });
      const { user } = response.data;
      
      toast.success(`Welcome back, ${user.name}!`);
      
      // Navigate based on role
      if (user.role === "admin") {
        navigate("/government", { state: { user }, replace: true });
      } else if (user.role === "dealer") {
        navigate("/dealer", { state: { user }, replace: true });
      } else {
        navigate("/dashboard", { state: { user }, replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.detail || "Login failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setIsLoading(true);
    setError("");

    try {
      // First setup demo data
      await api.post("/demo/setup");
      // Then login as the role
      const response = await api.post(`/demo/login/${role}`);
      const { user } = response.data;
      
      toast.success(`Logged in as Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`);
      
      if (role === "admin") {
        navigate("/government", { state: { user }, replace: true });
      } else if (role === "dealer") {
        navigate("/dealer", { state: { user }, replace: true });
      } else {
        navigate("/dashboard", { state: { user }, replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.detail || "Demo login failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="gap-2"
          data-testid="back-to-home-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Welcome to AMMO</h1>
            <p className="text-muted-foreground mt-2">Sign in to access your account</p>
          </div>

          {/* Login Form */}
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="username-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="toggle-password-btn"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={isLoading}
                data-testid="login-submit-btn"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or try demo accounts</span>
              </div>
            </div>

            {/* Demo Login Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin("citizen")}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 h-auto py-3"
                data-testid="demo-citizen-btn"
              >
                <User className="w-5 h-5" />
                <span className="text-xs">Citizen</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin("dealer")}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 h-auto py-3"
                data-testid="demo-dealer-btn"
              >
                <Shield className="w-5 h-5" />
                <span className="text-xs">Dealer</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDemoLogin("admin")}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 h-auto py-3"
                data-testid="demo-admin-btn"
              >
                <Lock className="w-5 h-5" />
                <span className="text-xs">Admin</span>
              </Button>
            </div>

            {/* Credentials Info */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-mono bg-muted px-1 rounded">citizen</span> / <span className="font-mono bg-muted px-1 rounded">demo123</span> - Member access</p>
                <p><span className="font-mono bg-muted px-1 rounded">dealer</span> / <span className="font-mono bg-muted px-1 rounded">demo123</span> - Dealer portal</p>
                <p><span className="font-mono bg-muted px-1 rounded">admin</span> / <span className="font-mono bg-muted px-1 rounded">admin123</span> - Government access</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
