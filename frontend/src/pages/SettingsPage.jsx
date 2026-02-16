import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, CreditCard, GraduationCap, ShoppingBag, 
  History, Bell, Settings, User, Lock, BellRing, Palette,
  Shield, Save, Eye, EyeOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { useTheme } from "../contexts/ThemeContext";

const SettingsPage = ({ user, api }) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [settings, setSettings] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    privacy: {
      showProfile: true,
      showActivity: false,
    }
  });

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
    { id: 'notifications', path: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Settings"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6 max-w-4xl" data-testid="settings-page">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>Manage your password and security options</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-info" />
              </div>
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={settings.notifications.email}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, email: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
              </div>
              <Switch
                checked={settings.notifications.push}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, push: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Receive text message alerts</p>
              </div>
              <Switch
                checked={settings.notifications.sms}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, sms: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
