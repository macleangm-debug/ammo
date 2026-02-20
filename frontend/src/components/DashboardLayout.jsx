import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSwipeable } from 'react-swipeable';
import { 
  Shield, Menu, X, LogOut, Sun, Moon, HelpCircle,
  MessageSquare, Search, Bell, Mail, ChevronDown, ChevronRight,
  AlertTriangle, FileText, Award, CreditCard, GraduationCap,
  Clock, Check, ExternalLink
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useTheme } from "../contexts/ThemeContext";

// Navigation paths for swipe navigation
const SWIPE_ROUTES = [
  '/dashboard',
  '/dashboard/license',
  '/training',
  '/marketplace',
  '/dashboard/history',
];

const DashboardLayout = ({ 
  children, 
  user, 
  navItems = [], 
  title = "Dashboard",
  subtitle = "",
  onLogout,
  unreadNotifications = 0,
  api
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dropdown states
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [docsDropdownOpen, setDocsDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [unreadDocs, setUnreadDocs] = useState(0);
  
  // Refs for click outside detection
  const notifDropdownRef = useRef(null);
  const docsDropdownRef = useRef(null);

  // Fetch recent notifications and documents when dropdown opens
  useEffect(() => {
    if (notifDropdownOpen && api) {
      fetchRecentNotifications();
    }
  }, [notifDropdownOpen]);

  useEffect(() => {
    if (docsDropdownOpen && api) {
      fetchRecentDocuments();
    }
  }, [docsDropdownOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
      if (docsDropdownRef.current && !docsDropdownRef.current.contains(event.target)) {
        setDocsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecentNotifications = async () => {
    // Only fetch for citizens, not government/dealer users
    if (user?.role !== 'citizen') return;
    try {
      const response = await api.get("/citizen/notifications");
      const notifications = response.data || [];
      setRecentNotifications(notifications.slice(0, 4));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchRecentDocuments = async () => {
    // Only fetch for citizens, not government/dealer users
    if (user?.role !== 'citizen') return;
    try {
      const response = await api.get("/citizen/documents");
      setRecentDocuments(response.data?.documents?.slice(0, 4) || []);
      setUnreadDocs(response.data?.unread_count || 0);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  // Swipe navigation for mobile
  const currentIndex = SWIPE_ROUTES.findIndex(route => location.pathname === route);
  
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex >= 0 && currentIndex < SWIPE_ROUTES.length - 1 && !sidebarOpen) {
        navigate(SWIPE_ROUTES[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0 && !sidebarOpen) {
        navigate(SWIPE_ROUTES[currentIndex - 1]);
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    trackTouch: true,
    delta: 80,
    swipeDuration: 400,
  });

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
    navigate("/", { replace: true });
  };

  const goToNotifications = () => {
    setNotifDropdownOpen(false);
    navigate("/dashboard/notifications");
    setSidebarOpen(false);
  };

  const goToDocuments = () => {
    setDocsDropdownOpen(false);
    navigate("/dashboard/documents");
    setSidebarOpen(false);
  };

  const toggleNotifDropdown = () => {
    setNotifDropdownOpen(!notifDropdownOpen);
    setDocsDropdownOpen(false);
  };

  const toggleDocsDropdown = () => {
    setDocsDropdownOpen(!docsDropdownOpen);
    setNotifDropdownOpen(false);
  };

  // Helper to format time ago
  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
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

  // Get notification icon based on category/type
  const getNotifIcon = (notif) => {
    const category = notif.category || notif.type;
    if (notif.priority === "urgent" || notif.priority === "high") {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    if (category === "document") return <FileText className="w-4 h-4 text-indigo-500" />;
    if (category === "training") return <GraduationCap className="w-4 h-4 text-blue-500" />;
    if (category === "compliance") return <Shield className="w-4 h-4 text-amber-500" />;
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  // Get document icon based on type
  const getDocIcon = (doc) => {
    const type = doc.document_type;
    if (type === "warning_letter") return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (type === "license_certificate") return <CreditCard className="w-4 h-4 text-purple-500" />;
    if (type === "training_certificate") return <GraduationCap className="w-4 h-4 text-emerald-500" />;
    if (type === "achievement_certificate") return <Award className="w-4 h-4 text-amber-500" />;
    return <FileText className="w-4 h-4 text-indigo-500" />;
  };

  return (
    <div className="dashboard-layout" {...swipeHandlers}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">AMMO</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  className={`sidebar-nav-item relative ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Support Card */}
        <div className="sidebar-support">
          <div className="flex items-center justify-center mb-3">
            <svg viewBox="0 0 100 80" className="w-20 h-16">
              <circle cx="30" cy="50" r="18" fill="hsl(var(--primary) / 0.2)" />
              <circle cx="70" cy="50" r="18" fill="hsl(var(--primary) / 0.15)" />
              <circle cx="50" cy="35" r="12" fill="hsl(var(--primary) / 0.3)" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1">Support 24/7</p>
          <p className="text-xs text-muted-foreground mb-3">Contact us anytime</p>
          <Button size="sm" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            Start chat
          </Button>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div 
            className="sidebar-nav-item"
            onClick={handleLogout}
            data-testid="sidebar-logout"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Mobile Header - App-like */}
        <header className="lg:hidden sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <h2 className="font-heading font-semibold">{title}</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-9 h-9">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              
              {/* Documents Icon - Mobile */}
              <div className="relative" ref={docsDropdownRef}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-9 h-9 relative"
                  onClick={toggleDocsDropdown}
                  data-testid="mobile-documents-btn"
                >
                  <Mail className="w-5 h-5" />
                  {unreadDocs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                      {unreadDocs > 99 ? '99+' : unreadDocs}
                    </span>
                  )}
                </Button>
              </div>
              
              {/* Notifications Icon - Mobile */}
              <div className="relative" ref={notifDropdownRef}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-9 h-9 relative" 
                  onClick={toggleNotifDropdown}
                  data-testid="mobile-notifications-btn"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Button>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ml-1">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-xs">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block sticky top-0 z-20 bg-card border-b border-border">
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="font-heading font-semibold text-lg">{title}</h2>
              
              {/* Search Bar */}
              <div className="flex relative flex-1 max-w-md ml-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full w-10 h-10"
                data-testid="theme-toggle"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              {/* Documents Dropdown */}
              <div className="relative" ref={docsDropdownRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-10 h-10 relative"
                  onClick={toggleDocsDropdown}
                  data-testid="desktop-documents-btn"
                >
                  <Mail className="w-5 h-5" />
                  {unreadDocs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                      {unreadDocs > 99 ? '99+' : unreadDocs}
                    </span>
                  )}
                </Button>
                
                {/* Documents Dropdown Panel */}
                {docsDropdownOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-indigo-50 to-purple-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-indigo-600" />
                          <h3 className="font-semibold text-slate-900">Documents</h3>
                        </div>
                        {unreadDocs > 0 && (
                          <Badge className="bg-indigo-100 text-indigo-700">{unreadDocs} new</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto">
                      {recentDocuments.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No documents yet</p>
                        </div>
                      ) : (
                        recentDocuments.map((doc) => (
                          <div 
                            key={doc.document_id}
                            className={`p-3 border-b border-border last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${doc.status === 'sent' ? 'bg-indigo-50/50' : ''}`}
                            onClick={() => {
                              setDocsDropdownOpen(false);
                              navigate("/dashboard/documents");
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {getDocIcon(doc)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium truncate ${doc.status === 'sent' ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {doc.title}
                                  </p>
                                  {doc.status === 'sent' && (
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {doc.body_content?.substring(0, 50)}...
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatTimeAgo(doc.issued_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-border bg-slate-50">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={goToDocuments}
                      >
                        See All Documents
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notifDropdownRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-10 h-10 relative"
                  onClick={toggleNotifDropdown}
                  data-testid="desktop-notifications-btn"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Button>
                
                {/* Notifications Dropdown Panel */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-5 h-5 text-amber-600" />
                          <h3 className="font-semibold text-slate-900">Notifications</h3>
                        </div>
                        {unreadNotifications > 0 && (
                          <Badge className="bg-amber-100 text-amber-700">{unreadNotifications} unread</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto">
                      {recentNotifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        recentNotifications.map((notif) => (
                          <div 
                            key={notif.notification_id}
                            className={`p-3 border-b border-border last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-amber-50/50' : ''}`}
                            onClick={() => {
                              setNotifDropdownOpen(false);
                              if (notif.action_url) {
                                navigate(notif.action_url);
                              } else {
                                navigate("/dashboard/notifications");
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {getNotifIcon(notif)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium truncate ${!notif.read ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {notif.title}
                                  </p>
                                  {!notif.read && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {notif.message?.substring(0, 50)}...
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {formatTimeAgo(notif.created_at)}
                                  </p>
                                  {notif.action_url && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                                      <ExternalLink className="w-2.5 h-2.5 mr-0.5" />
                                      Action
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-border bg-slate-50">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={goToNotifications}
                      >
                        See All Notifications
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-2 pl-3 ml-2 border-l border-border cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav lg:hidden">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                data-testid={`mobile-nav-${item.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
};

export default DashboardLayout;
