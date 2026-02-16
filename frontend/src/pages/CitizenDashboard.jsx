import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Shield, Award, History, Bell, Settings,
  CreditCard, GraduationCap, Target, CheckCircle, Clock,
  TrendingUp, Calendar, ChevronRight, ShoppingBag,
  ArrowUpRight, Plus, Scan, FileText, MoreHorizontal
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

// Circular Progress Component
const CircularProgress = ({ value, max, size = 56, strokeWidth = 5, color = "hsl(var(--primary))" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{value}</span>
      </div>
    </div>
  );
};

const CitizenDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [responsibility, setResponsibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, txnRes, respRes, enrollRes] = await Promise.all([
        api.get("/citizen/profile").catch(() => ({ data: null })),
        api.get("/citizen/transactions").catch(() => ({ data: [] })),
        api.get("/citizen/responsibility").catch(() => ({ data: null })),
        api.get("/members/enrollments").catch(() => ({ data: [] }))
      ]);
      
      setProfile(profileRes.data);
      setTransactions(txnRes.data || []);
      setResponsibility(respRes.data);
      setEnrollments(enrollRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
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

  // Calculate stats
  const ariScore = responsibility?.ari_score || 40;
  const trainingHours = responsibility?.training?.hours || 16;
  const trainingTarget = responsibility?.training?.target_hours || 20;
  const complianceStreak = responsibility?.compliance_streak || 0;
  const badgesEarned = responsibility?.badges_earned?.length || 0;

  const getStatusColor = (status) => {
    const colors = {
      approved: 'bg-emerald-500',
      pending: 'bg-amber-500',
      rejected: 'bg-red-500',
      in_progress: 'bg-blue-500',
      completed: 'bg-emerald-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusBg = (status) => {
    const colors = {
      approved: 'bg-emerald-50 text-emerald-700',
      pending: 'bg-amber-50 text-amber-700',
      rejected: 'bg-red-50 text-red-700',
      in_progress: 'bg-blue-50 text-blue-700',
      completed: 'bg-emerald-50 text-emerald-700',
    };
    return colors[status] || 'bg-gray-50 text-gray-700';
  };

  // Quick Actions
  const quickActions = [
    { icon: Scan, label: 'Scan', color: 'bg-blue-500', action: () => toast.info('Scanner coming soon') },
    { icon: Plus, label: 'New', color: 'bg-emerald-500', action: () => navigate('/marketplace') },
    { icon: FileText, label: 'Reports', color: 'bg-purple-500', action: () => navigate('/dashboard/history') },
    { icon: MoreHorizontal, label: 'More', color: 'bg-gray-500', action: () => navigate('/dashboard/settings') },
  ];

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Dashboard"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Dashboard"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      {/* Mobile App-like Layout */}
      <div className="space-y-5 lg:hidden" data-testid="citizen-dashboard-mobile">
        
        {/* Welcome Card - Compact */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white">
          <p className="text-white/80 text-sm">Welcome back</p>
          <h2 className="text-xl font-bold mt-1">{user?.name?.split(' ')[0] || 'Member'} 👋</h2>
          <p className="text-white/70 text-sm mt-2">Your ARI Score is in top 25%</p>
          <Button 
            size="sm" 
            variant="secondary" 
            className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={() => navigate('/training')}
          >
            Continue Training
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border active:scale-95 transition-transform"
            >
              <div className={`w-11 h-11 rounded-full ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Stats - Horizontal Scroll */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Your Progress</h3>
            <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => navigate('/dashboard/license')}>
              See all
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {/* ARI Score */}
            <div className="flex-shrink-0 w-36 bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">ARI Score</p>
                  <p className="text-2xl font-bold mt-1">{ariScore}</p>
                  <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">
                    +5
                  </Badge>
                </div>
                <CircularProgress value={ariScore} max={100} color="#4f6ef7" />
              </div>
            </div>

            {/* Training */}
            <div className="flex-shrink-0 w-36 bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Training</p>
                  <p className="text-2xl font-bold mt-1">{trainingHours}h</p>
                  <Badge className="mt-2 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                    +2.5h
                  </Badge>
                </div>
                <CircularProgress value={trainingHours} max={trainingTarget} color="#0ea5e9" />
              </div>
            </div>

            {/* Streak */}
            <div className="flex-shrink-0 w-36 bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                  <p className="text-2xl font-bold mt-1">{complianceStreak}d</p>
                  <p className="text-[10px] text-emerald-600 mt-2 font-medium">Keep it up!</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex-shrink-0 w-36 bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Badges</p>
                  <p className="text-2xl font-bold mt-1">{badgesEarned}</p>
                  <Badge className="mt-2 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                    2 new
                  </Badge>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Courses */}
        {enrollments.filter(e => e.status !== 'completed').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Active Courses</h3>
              <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => navigate('/training')}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {enrollments.filter(e => e.status !== 'completed').slice(0, 2).map((enrollment, idx) => (
                <div 
                  key={enrollment.enrollment_id || idx} 
                  className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 active:bg-muted/50"
                  onClick={() => navigate('/training')}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{enrollment.course_name || 'Training Course'}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${enrollment.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{enrollment.progress || 0}%</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity - Card List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => navigate('/dashboard/history')}>
              View all
            </Button>
          </div>
          <div className="space-y-2">
            {transactions.slice(0, 4).map((txn, idx) => (
              <div 
                key={txn.transaction_id || idx} 
                className="bg-card rounded-xl p-4 border border-border flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  txn.item_type === 'Ammunition' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {txn.item_type === 'Ammunition' ? (
                    <Target className={`w-5 h-5 ${txn.item_type === 'Ammunition' ? 'text-blue-600' : 'text-purple-600'}`} />
                  ) : (
                    <Shield className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{txn.item_type}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBg(txn.status)}`}>
                      {txn.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Qty: {txn.quantity} • {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="bg-card rounded-xl p-8 border border-border text-center">
                <History className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Keep existing */}
      <div className="hidden lg:block space-y-6" data-testid="citizen-dashboard-desktop">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-heading font-bold">
                Hello {user?.name?.split(' ')[0] || 'Member'}! 👋
              </h2>
              <p className="text-muted-foreground max-w-md">
                Track your responsibility score, complete training courses, and maintain compliance. 
                Your current ARI score puts you in the top 25% of members.
              </p>
              <Button className="mt-2" onClick={() => navigate('/training')}>
                Continue Training
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="hidden xl:block">
              <svg viewBox="0 0 200 150" className="w-48 h-36">
                <rect x="60" y="60" width="80" height="60" rx="8" fill="hsl(var(--primary) / 0.1)" />
                <rect x="70" y="70" width="60" height="8" rx="2" fill="hsl(var(--primary) / 0.3)" />
                <rect x="70" y="85" width="40" height="6" rx="2" fill="hsl(var(--primary) / 0.2)" />
                <rect x="70" y="95" width="50" height="6" rx="2" fill="hsl(var(--primary) / 0.2)" />
                <circle cx="150" cy="50" r="25" fill="hsl(var(--primary) / 0.15)" />
                <circle cx="50" cy="100" r="20" fill="hsl(var(--primary) / 0.1)" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Your Progress</h3>
            <Button variant="link" className="text-primary" onClick={() => navigate('/dashboard/license')}>
              See all
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ARI Score</p>
                    <p className="text-3xl font-bold">{ariScore}</p>
                    <p className="text-xs text-muted-foreground">/100 points</p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +5 this month
                    </Badge>
                  </div>
                  <CircularProgress value={ariScore} max={100} size={80} color="hsl(234, 89%, 64%)" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Training Hours</p>
                    <p className="text-3xl font-bold">{trainingHours}</p>
                    <p className="text-xs text-muted-foreground">of {trainingTarget} target</p>
                    <Badge className="mt-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +2.5 hrs
                    </Badge>
                  </div>
                  <CircularProgress value={trainingHours} max={trainingTarget} size={80} color="hsl(199, 89%, 48%)" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Compliance Streak</p>
                    <p className="text-3xl font-bold">{complianceStreak}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                    <p className="text-xs text-emerald-600 mt-2 font-medium">Keep it up!</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Target className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Badges Earned</p>
                    <p className="text-3xl font-bold">{badgesEarned}</p>
                    <p className="text-xs text-muted-foreground">achievements</p>
                    <Badge className="mt-2 bg-amber-100 text-amber-700 hover:bg-amber-100">
                      <Award className="w-3 h-3 mr-1" />
                      2 pending
                    </Badge>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                    <Award className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Recent Transactions</h3>
              <Button variant="link" className="text-primary" onClick={() => navigate('/dashboard/history')}>
                View All
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Transaction ID</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((txn, idx) => (
                    <tr key={txn.transaction_id || idx} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2">
                        <p className="font-mono text-sm">{txn.transaction_id}</p>
                        <p className="text-xs text-muted-foreground">Qty: {txn.quantity}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className="capitalize text-sm">{txn.item_type}</span>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(txn.status)}`} />
                          <span className="text-sm capitalize">{txn.status?.replace('_', ' ')}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CitizenDashboard;
