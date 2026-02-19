import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, CreditCard, GraduationCap, ShoppingBag, 
  History, Bell, Settings, CheckCircle, AlertTriangle,
  Info, Trash2, Check, BellOff, Shield, BookOpen, FileText,
  Zap, MessageSquare, Filter, RefreshCw, ExternalLink
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const NotificationsPage = ({ user, api }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, by category
  const [categoryFilter, setCategoryFilter] = useState("all");

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
    setLoading(true);
    try {
      const response = await api.get("/citizen/notifications");
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
      setNotifications([]);
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

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/citizen/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.notification_id === notificationId ? { ...n, read: true } : n
      ));
      toast.success("Marked as read");
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => 
          api.post(`/citizen/notifications/${n.notification_id}/read`)
        )
      );
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  // Map notification types to icons and styles
  const getTypeConfig = (type, category, priority) => {
    // Priority-based styling
    if (priority === "urgent") {
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        bg: "bg-red-100",
        iconColor: "text-red-600",
        borderColor: "border-red-200"
      };
    }
    
    // Category-based icons
    const categoryConfigs = {
      compliance: {
        icon: <Shield className="w-5 h-5" />,
        bg: "bg-amber-100",
        iconColor: "text-amber-600",
        borderColor: "border-amber-200"
      },
      training: {
        icon: <BookOpen className="w-5 h-5" />,
        bg: "bg-blue-100",
        iconColor: "text-blue-600",
        borderColor: "border-blue-200"
      },
      license: {
        icon: <CreditCard className="w-5 h-5" />,
        bg: "bg-purple-100",
        iconColor: "text-purple-600",
        borderColor: "border-purple-200"
      },
      system: {
        icon: <Zap className="w-5 h-5" />,
        bg: "bg-slate-100",
        iconColor: "text-slate-600",
        borderColor: "border-slate-200"
      },
      general: {
        icon: <MessageSquare className="w-5 h-5" />,
        bg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        borderColor: "border-indigo-200"
      }
    };
    
    // Type-based fallbacks
    const typeConfigs = {
      alert: {
        icon: <AlertTriangle className="w-5 h-5" />,
        bg: "bg-amber-100",
        iconColor: "text-amber-600",
        borderColor: "border-amber-200"
      },
      reminder: {
        icon: <Bell className="w-5 h-5" />,
        bg: "bg-blue-100",
        iconColor: "text-blue-600",
        borderColor: "border-blue-200"
      },
      announcement: {
        icon: <FileText className="w-5 h-5" />,
        bg: "bg-green-100",
        iconColor: "text-green-600",
        borderColor: "border-green-200"
      },
      success: {
        icon: <CheckCircle className="w-5 h-5" />,
        bg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        borderColor: "border-emerald-200"
      }
    };
    
    return categoryConfigs[category] || typeConfigs[type] || {
      icon: <Info className="w-5 h-5" />,
      bg: "bg-slate-100",
      iconColor: "text-slate-600",
      borderColor: "border-slate-200"
    };
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      urgent: { label: "Urgent", className: "bg-red-500 text-white" },
      high: { label: "High", className: "bg-amber-500 text-white" },
      normal: { label: "Normal", className: "bg-slate-200 text-slate-700" },
      low: { label: "Low", className: "bg-slate-100 text-slate-500" }
    };
    return configs[priority] || configs.normal;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSenderLabel = (sentBy) => {
    if (!sentBy) return null;
    if (sentBy.startsWith("trigger:")) return "Automated";
    return "Government";
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread" && n.read) return false;
    if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const categories = [...new Set(notifications.map(n => n.category).filter(Boolean))];

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
