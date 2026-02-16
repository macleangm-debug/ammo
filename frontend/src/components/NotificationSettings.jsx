import { useState, useEffect } from "react";
import { 
  Bell, BellOff, Smartphone, Mail, MessageSquare, 
  Shield, AlertTriangle, GraduationCap, ShoppingBag,
  Check, X, Loader2, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const NotificationSettings = ({ user, api }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  
  const [preferences, setPreferences] = useState({
    push_enabled: false,
    email_enabled: true,
    sms_enabled: false,
    // Notification types
    transaction_alerts: true,
    training_reminders: true,
    license_alerts: true,
    compliance_alerts: true,
    marketplace_updates: false,
    security_alerts: true,
    promotional: false
  });

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
    
    fetchNotificationStatus();
  }, []);

  const fetchNotificationStatus = async () => {
    try {
      const response = await api.get("/notifications/status");
      setPushSubscribed(response.data.subscribed);
      setPreferences(prev => ({ ...prev, push_enabled: response.data.subscribed }));
    } catch (error) {
      console.error("Error fetching notification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === "granted") {
        await subscribeToPush();
      } else if (permission === "denied") {
        toast.error("Push notification permission denied");
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      toast.error("Failed to request notification permission");
    }
  };

  const subscribeToPush = async () => {
    setSaving(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // This would be your VAPID public key in production
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        )
      });

      // Send subscription to backend
      await api.post("/notifications/subscribe", {
        subscription: subscription.toJSON()
      });

      setPushSubscribed(true);
      setPreferences(prev => ({ ...prev, push_enabled: true }));
      toast.success("Push notifications enabled!");
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setSaving(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setSaving(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      await api.post("/notifications/unsubscribe");

      setPushSubscribed(false);
      setPreferences(prev => ({ ...prev, push_enabled: false }));
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable push notifications");
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribeFromPush();
    } else {
      if (pushPermission === "granted") {
        await subscribeToPush();
      } else {
        await requestPushPermission();
      }
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    // In a full implementation, you'd save this to the backend
    toast.success("Preference updated");
  };

  // Helper function for VAPID key conversion
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notification-settings">
      {/* Push Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive instant alerts on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushSupported ? (
            <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">Not Supported</p>
                <p className="text-sm text-muted-foreground">
                  Push notifications are not supported in this browser
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${pushSubscribed ? 'bg-success/10' : 'bg-muted'}`}>
                    {pushSubscribed ? (
                      <Bell className="w-5 h-5 text-success" />
                    ) : (
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Browser Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      {pushSubscribed ? "Enabled - You'll receive alerts instantly" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={pushSubscribed ? "outline" : "default"}
                  onClick={handlePushToggle}
                  disabled={saving}
                  data-testid="push-toggle-btn"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : pushSubscribed ? (
                    "Disable"
                  ) : (
                    "Enable"
                  )}
                </Button>
              </div>

              {pushPermission === "denied" && (
                <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-lg">
                  <X className="w-5 h-5 text-danger mt-0.5" />
                  <div>
                    <p className="font-medium text-danger">Permission Denied</p>
                    <p className="text-sm text-muted-foreground">
                      You've blocked notifications for this site. To enable them, click the lock icon 
                      in your browser's address bar and allow notifications.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
            </div>
            <Switch
              checked={preferences.email_enabled}
              onCheckedChange={(v) => handlePreferenceChange("email_enabled", v)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Important alerts via text message
                  <Badge variant="outline" className="ml-2 text-xs">Coming Soon</Badge>
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.sms_enabled}
              onCheckedChange={(v) => handlePreferenceChange("sms_enabled", v)}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
          <CardDescription>Choose what you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Transaction Alerts</p>
                <p className="text-sm text-muted-foreground">Verification requests and approvals</p>
              </div>
            </div>
            <Switch
              checked={preferences.transaction_alerts}
              onCheckedChange={(v) => handlePreferenceChange("transaction_alerts", v)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-info" />
              <div>
                <p className="font-medium">Training Reminders</p>
                <p className="text-sm text-muted-foreground">Course deadlines and updates</p>
              </div>
            </div>
            <Switch
              checked={preferences.training_reminders}
              onCheckedChange={(v) => handlePreferenceChange("training_reminders", v)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">License Alerts</p>
                <p className="text-sm text-muted-foreground">Expiry reminders and status changes</p>
              </div>
            </div>
            <Switch
              checked={preferences.license_alerts}
              onCheckedChange={(v) => handlePreferenceChange("license_alerts", v)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium">Compliance Alerts</p>
                <p className="text-sm text-muted-foreground">ARI score changes and warnings</p>
              </div>
            </div>
            <Switch
              checked={preferences.compliance_alerts}
              onCheckedChange={(v) => handlePreferenceChange("compliance_alerts", v)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium">Marketplace Updates</p>
                <p className="text-sm text-muted-foreground">Order status and new products</p>
              </div>
            </div>
            <Switch
              checked={preferences.marketplace_updates}
              onCheckedChange={(v) => handlePreferenceChange("marketplace_updates", v)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-danger" />
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-sm text-muted-foreground">Login attempts and account activity</p>
              </div>
            </div>
            <Switch
              checked={preferences.security_alerts}
              onCheckedChange={(v) => handlePreferenceChange("security_alerts", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      {pushSubscribed && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Test Push Notification</p>
                <p className="text-sm text-muted-foreground">Send a test notification to verify setup</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  new Notification("AMMO Test", {
                    body: "Push notifications are working!",
                    icon: "/icons/icon-192x192.png"
                  });
                }}
              >
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationSettings;
