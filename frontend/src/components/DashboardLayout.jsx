import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Shield, Menu, X, LogOut, Sun, Moon, HelpCircle,
  MessageSquare, Search, Bell, Mail, ChevronDown
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useTheme } from "../contexts/ThemeContext";

const DashboardLayout = ({ 
  children, 
  user, 
  navItems = [], 
  title = "Dashboard",
  subtitle = "",
  onLogout 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="dashboard-layout">
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
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border">
          <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu-btn lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              
              {/* Page Title */}
              <h2 className="font-heading font-semibold text-lg">{title}</h2>
              
              {/* Search Bar */}
              <div className="hidden md:flex relative flex-1 max-w-md ml-8">
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

              {/* Messages */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 relative"
              >
                <Mail className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>

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
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6 pb-24 lg:pb-6">
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
                <span className="text-[10px] mt-1">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
};

export default DashboardLayout;
