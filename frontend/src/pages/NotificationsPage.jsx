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
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-indigo-700">{notifications.length}</p>
                </div>
                <Bell className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Unread</p>
                  <p className="text-2xl font-bold text-amber-700">{unreadCount}</p>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 font-bold">{unreadCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Urgent</p>
                  <p className="text-2xl font-bold text-red-700">
                    {notifications.filter(n => n.priority === "urgent" || n.priority === "high").length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Read</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {notifications.filter(n => n.read).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant={filter === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("all")}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button 
              variant={filter === "unread" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("unread")}
              data-testid="filter-unread"
            >
              Unread ({unreadCount})
            </Button>
            {categories.length > 0 && (
              <select 
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                data-testid="category-filter"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchNotifications} data-testid="refresh-btn">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} data-testid="mark-all-read-btn">
                <Check className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">
                  {filter === "unread" ? "No unread notifications" : "No notifications"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filter === "unread" ? "You're all caught up!" : "Check back later for updates"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const config = getTypeConfig(notification.type, notification.category, notification.priority);
              const priorityBadge = getPriorityBadge(notification.priority);
              const senderLabel = getSenderLabel(notification.sent_by);
              
              return (
                <Card 
                  key={notification.notification_id} 
                  className={`transition-all hover:shadow-md ${!notification.read ? `border-l-4 ${config.borderColor} bg-white` : 'bg-slate-50/50 border-slate-100'}`}
                  data-testid={`notification-${notification.notification_id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
                        {config.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-semibold ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-xs ${priorityBadge.className}`}>
                              {priorityBadge.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className={`text-sm ${!notification.read ? 'text-slate-700' : 'text-slate-500'} mb-2`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>{formatTimestamp(notification.created_at)}</span>
                            {notification.category && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{notification.category}</span>
                              </>
                            )}
                            {senderLabel && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs py-0">
                                  {senderLabel}
                                </Badge>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {notification.action_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(notification.action_url)}
                                className="text-indigo-600 hover:text-indigo-700"
                                data-testid={`action-btn-${notification.notification_id}`}
                              >
                                {notification.action_label || "View"}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => markAsRead(notification.notification_id)}
                                title="Mark as read"
                                className="text-slate-400 hover:text-indigo-600"
                                data-testid={`mark-read-btn-${notification.notification_id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
