import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Settings, LayoutDashboard, FileText, Bell, Activity, 
  AlertTriangle, Target, Palette, Save, Loader2, User,
  Building, Mail, Phone, Globe, Shield, Key, Database
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

// Government navigation items
const NAV_ITEMS = [
  { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
  { id: 'templates', path: '/government/templates', label: 'Templates', icon: FileText },
  { id: 'cert-config', path: '/government/certificate-config', label: 'Cert Config', icon: Palette },
  { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
  { id: 'predictive', path: '/government/predictive', label: 'Analytics', icon: Activity },
  { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
  { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
];

const GovernmentSettings = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("organization");
  
  // Settings state
  const [settings, setSettings] = useState({
    // Organization
    organizationName: "AMMO Government Portal",
    organizationEmail: "admin@ammo.gov",
    organizationPhone: "+1 (555) 123-4567",
    organizationWebsite: "https://ammo.gov",
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    alertNotifications: true,
    reviewNotifications: true,
    
    // Security
    twoFactorAuth: false,
    sessionTimeout: 30,
    ipWhitelist: "",
    
    // System
    maintenanceMode: false,
    debugMode: false,
    dataRetentionDays: 365
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardLayout user={user} api={api} navItems={NAV_ITEMS} subtitle="Government Portal">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-500 mt-1">
                Manage your government portal settings and preferences
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Configure your organization's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Organization Name</Label>
                    <Input
                      value={settings.organizationName}
                      onChange={(e) => updateSetting("organizationName", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={settings.organizationEmail}
                      onChange={(e) => updateSetting("organizationEmail", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={settings.organizationPhone}
                      onChange={(e) => updateSetting("organizationPhone", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={settings.organizationWebsite}
                      onChange={(e) => updateSetting("organizationWebsite", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-slate-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-slate-500">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) => updateSetting("smsNotifications", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alert Notifications</p>
                    <p className="text-sm text-slate-500">Get notified about system alerts</p>
                  </div>
                  <Switch
                    checked={settings.alertNotifications}
                    onCheckedChange={(checked) => updateSetting("alertNotifications", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Review Notifications</p>
                    <p className="text-sm text-slate-500">Get notified about pending reviews</p>
                  </div>
                  <Switch
                    checked={settings.reviewNotifications}
                    onCheckedChange={(checked) => updateSetting("reviewNotifications", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security options for your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-slate-500">Add an extra layer of security</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => updateSetting("twoFactorAuth", checked)}
                  />
                </div>
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value))}
                    className="mt-1 w-32"
                  />
                </div>
                <div>
                  <Label>IP Whitelist</Label>
                  <Input
                    value={settings.ipWhitelist}
                    onChange={(e) => updateSetting("ipWhitelist", e.target.value)}
                    placeholder="Enter comma-separated IP addresses"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave empty to allow all IPs</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-level options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-slate-500">Put the portal in maintenance mode</p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => updateSetting("maintenanceMode", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Debug Mode</p>
                    <p className="text-sm text-slate-500">Enable detailed error logging</p>
                  </div>
                  <Switch
                    checked={settings.debugMode}
                    onCheckedChange={(checked) => updateSetting("debugMode", checked)}
                  />
                </div>
                <div>
                  <Label>Data Retention (days)</Label>
                  <Input
                    type="number"
                    value={settings.dataRetentionDays}
                    onChange={(e) => updateSetting("dataRetentionDays", parseInt(e.target.value))}
                    className="mt-1 w-32"
                  />
                  <p className="text-xs text-slate-500 mt-1">How long to keep historical data</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default GovernmentSettings;
