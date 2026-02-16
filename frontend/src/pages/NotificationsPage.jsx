import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, CreditCard, GraduationCap, ShoppingBag, 
  History, Bell, Settings, CheckCircle, AlertTriangle,
  Info, Trash2, Check, BellOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const NotificationsPage = ({ user, api }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
    { id: 'notifications', path: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/citizen/notifications");
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Generate sample notifications for demo
      setNotifications([
        {
          id: '1',
          type: 'success',
          title: 'License Approved',
          message: 'Your license renewal has been approved.',
          timestamp: new Date().toISOString(),
          read: false
        },
        {
          id: '2',
          type: 'warning',
          title: 'Training Reminder',
          message: 'You have 2 courses pending completion.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: false
        },
        {
          id: '3',
          type: 'info',
          title: 'New Course Available',
          message: 'Advanced Safety Training is now available.',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          read: true
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    toast.success("Marked as read");
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast.success("Notification deleted");
  };

  const getTypeIcon = (type) => {
    const icons = {
      success: <CheckCircle className="w-5 h-5 text-success" />,
      warning: <AlertTriangle className="w-5 h-5 text-warning" />,
      info: <Info className="w-5 h-5 text-info" />,
      error: <AlertTriangle className="w-5 h-5 text-danger" />,
    };
    return icons[type] || icons.info;
  };

  const getTypeBg = (type) => {
    const bgs = {
      success: 'bg-success/10',
      warning: 'bg-warning/10',
      info: 'bg-info/10',
      error: 'bg-danger/10',
    };
    return bgs[type] || bgs.info;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Notifications"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Notifications"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="notifications-page">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`transition-all ${!notification.read ? 'border-primary/30 bg-primary/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${getTypeBg(notification.type)} flex items-center justify-center flex-shrink-0`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteNotification(notification.id)}
                            title="Delete"
                            className="text-muted-foreground hover:text-danger"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
