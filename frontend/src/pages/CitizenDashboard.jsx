import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Shield, Award, History, Bell, Settings,
  CreditCard, GraduationCap, Target, CheckCircle, Clock,
  TrendingUp, TrendingDown, Calendar, ChevronRight, ShoppingBag,
  ArrowUpRight, Plus, Scan, FileText, Package, DollarSign,
  AlertTriangle, MapPin, Flame, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { formatNumber, formatCurrency, formatPercentage } from "../utils/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line
} from 'recharts';


const CitizenDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [responsibility, setResponsibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [activeTimeRange, setActiveTimeRange] = useState("month");

  // Color palette
  const COLORS = {
    primary: '#3b5bdb',
    success: '#40c057',
    warning: '#fab005',
    danger: '#fa5252',
    purple: '#be4bdb',
    cyan: '#15aabf'
  };

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, transactionsRes, responsibilityRes, enrollmentsRes] = await Promise.all([
        api.get("/citizen/profile"),
        api.get("/citizen/transactions"),
        api.get("/citizen/responsibility-index").catch(() => ({ data: {} })),
        api.get("/members/enrollments").catch(() => ({ data: { enrollments: [] } }))
      ]);

      setProfile(profileRes.data);
      setTransactions(transactionsRes.data.transactions || []);
      setResponsibility(responsibilityRes.data);
      const enrollData = enrollmentsRes.data?.enrollments || enrollmentsRes.data || [];
      setEnrollments(Array.isArray(enrollData) ? enrollData : []);
    } catch (error) {
      console.error("Error fetching citizen data:", error);
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

  // Generate analytics data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  
  const activityByMonth = months.map((month, idx) => ({
    month,
    purchases: Math.floor(Math.random() * 5) + 1,
    training: Math.floor(Math.random() * 3),
    compliance: Math.floor(Math.random() * 2) + 1
  }));

  const spendingByMonth = months.map((month, idx) => ({
    month,
    amount: Math.floor(Math.random() * 500) + 100 + idx * 30
  }));

  // Category breakdown of purchases
  const purchaseCategories = [
    { name: 'Ammunition', value: 45, color: COLORS.primary },
    { name: 'Accessories', value: 25, color: COLORS.success },
    { name: 'Training', value: 20, color: COLORS.warning },
    { name: 'Safety Gear', value: 10, color: COLORS.purple }
  ];

  // Compliance activities
  const complianceActivities = [
    { name: 'Storage Check', completed: true, date: '2026-02-15' },
    { name: 'Background Renewal', completed: true, date: '2026-01-20' },
    { name: 'Safety Course', completed: false, date: '2026-03-01' },
    { name: 'License Renewal', completed: false, date: '2026-06-15' }
  ];

  // Stats
  const ariScore = responsibility?.ari_score || profile?.ari_score || 40;
  const trainingHours = responsibility?.training_hours || 16;
  const complianceStreak = responsibility?.compliance_streak || 0;
  const totalSpent = transactions.reduce((sum, t) => sum + (t.total || 0), 0) || 1250;
  const pendingItems = transactions.filter(t => t.status === 'pending').length;

  const stats = [
    {
      title: "ARI Score",
      value: ariScore,
      percentage: "+5 this month",
      bgColor: "bg-[#3b5bdb]",
      textColor: "text-white",
      icon: Target
    },
    {
      title: "Training Hours",
      value: `${trainingHours}h`,
      percentage: "+2.5h this month",
      bgColor: "bg-[#c7f9cc]",
      textColor: "text-emerald-800",
      icon: GraduationCap
    },
    {
      title: "Compliance Streak",
      value: `${complianceStreak} days`,
      percentage: "Keep it up!",
      bgColor: "bg-[#d0f0c0]",
      textColor: "text-emerald-700",
      icon: CheckCircle
    },
    {
      title: "Total Spent",
      value: formatCurrency(totalSpent),
      percentage: "This year",
      bgColor: "bg-[#e8e0f8]",
      textColor: "text-purple-700",
      icon: DollarSign
    },
    {
      title: "Pending",
      value: formatNumber(pendingItems),
      percentage: pendingItems > 0 ? "Action needed" : "All clear",
      bgColor: pendingItems > 0 ? "bg-[#ffe8e8]" : "bg-[#c7f9cc]",
      textColor: pendingItems > 0 ? "text-red-700" : "text-emerald-800",
      icon: pendingItems > 0 ? Clock : CheckCircle
    }
  ];

  // Training progress
  const trainingProgress = [
    { name: 'Safety Basics', progress: 100, color: COLORS.success },
    { name: 'Legal Compliance', progress: 75, color: COLORS.primary },
    { name: 'Storage Best Practices', progress: 50, color: COLORS.warning },
    { name: 'Advanced Safety', progress: 25, color: COLORS.cyan }
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
          <Shield className="w-12 h-12 text-primary animate-pulse" />
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
      <div className="space-y-6" data-testid="citizen-analytics">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 text-white">
          <p className="text-sm opacity-80">Welcome back</p>
          <h2 className="text-2xl font-bold mt-1">{profile?.name || user?.name || 'Member'} 👋</h2>
          <p className="text-sm opacity-80 mt-2">
            Your ARI Score is in top {ariScore > 50 ? '25%' : ariScore > 30 ? '50%' : '75%'}
          </p>
          <Button 
            variant="secondary" 
            size="sm" 
            className="mt-4"
            onClick={() => navigate('/training')}
          >
            Continue Training <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className={`rounded-xl p-4 ${stat.bgColor} ${stat.textColor}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs opacity-80 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs opacity-70 mt-1">{stat.percentage}</p>
                  </div>
                  <Icon className="w-5 h-5 opacity-70" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row 1 - Activity & Spending */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Bar Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Your Activity</CardTitle>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {['week', 'month', 'year'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setActiveTimeRange(range)}
                      className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                        activeTimeRange === range
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                  />
                  <Bar dataKey="purchases" stackId="a" fill={COLORS.primary} name="Purchases" />
                  <Bar dataKey="training" stackId="a" fill={COLORS.success} name="Training" />
                  <Bar dataKey="compliance" stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} name="Compliance" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.primary }} />
                  <span className="text-xs text-muted-foreground">Purchases</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.success }} />
                  <span className="text-xs text-muted-foreground">Training</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.warning }} />
                  <span className="text-xs text-muted-foreground">Compliance</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spending Line Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Spending</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0" onClick={() => navigate('/dashboard/history')}>
                  View History <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={spendingByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                    formatter={(value) => [formatCurrency(value), 'Spent']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke={COLORS.purple} 
                    strokeWidth={2}
                    fill="url(#spendingGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 - Categories, Training, Compliance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Purchase Categories */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Purchases by Category</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0" onClick={() => navigate('/marketplace')}>
                  Shop <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative" style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={purchaseCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {purchaseCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatNumber(purchaseCategories.reduce((a, b) => a + b.value, 0))}</p>
                      <p className="text-[10px] text-muted-foreground">Items</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {purchaseCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatPercentage(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training Progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Training Progress</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0" onClick={() => navigate('/training')}>
                  Continue <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trainingProgress.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-semibold">{formatPercentage(item.progress)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${item.progress}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Compliance */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Compliance Checklist</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0">
                  See All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceActivities.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      item.completed ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      {item.completed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.completed ? 'Completed' : `Due: ${new Date(item.date).toLocaleDateString()}`}
                      </p>
                    </div>
                    {!item.completed && (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/history')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
                <Button variant="link" className="mt-2" onClick={() => navigate('/marketplace')}>
                  Browse Marketplace
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((txn, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      txn.status === 'completed' ? 'bg-emerald-100' :
                      txn.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      {txn.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : txn.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Package className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{txn.item_type} - {txn.quantity} units</p>
                        <Badge className={`text-xs ${
                          txn.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          txn.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {txn.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString()} • {txn.dealer_name || 'Dealer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(txn.total || txn.quantity * 25)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CitizenDashboard;
