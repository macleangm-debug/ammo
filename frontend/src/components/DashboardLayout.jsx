import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Shield, Menu, X, LogOut, Sun, Moon, HelpCircle,
  MessageSquare
} from "lucide-react";
import { Button } from "./ui/button";
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg">AMMO</h1>
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
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">Need help?</p>
          <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
            <MessageSquare className="w-4 h-4 mr-2" />
            Get Support
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
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu-btn lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              
              <div>
                <h2 className="font-heading font-semibold text-xl">{title}</h2>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
                data-testid="theme-toggle"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-3 border-l border-border">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-semibold">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
