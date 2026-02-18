import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Users, History, Settings, Send,
  MapPin, CheckCircle, Clock, AlertTriangle, RefreshCw,
  Search, XCircle, TrendingUp, Package, DollarSign, Shield,
  ArrowUpRight, Calendar, Filter, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts';

const DealerPortal = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState("month");
  const [salesTimeRange, setSalesTimeRange] = useState("month");
  
  const [formData, setFormData] = useState({
    citizen_license: "",
    item_type: "ammunition",
    item_category: "",
    quantity: 1
  });
  
  const [gpsStatus, setGpsStatus] = useState({ lat: 40.7128, lng: -74.0060, active: true });

  // Analytics data states
  const [analyticsData, setAnalyticsData] = useState({
    totalTransactions: 0,
    activeTransactions: 0,
    completedTransactions: 0,
    rejectedTransactions: 0,
    revenue: 0,
    transactionsByMonth: [],
    salesByMonth: [],
    categoryBreakdown: [],
    recentActivity: []
  });

  const navItems = [
    { id: 'dashboard', path: '/dealer', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verify', path: '/dealer/verify', label: 'Verify Buyer', icon: Users },
    { id: 'transactions', path: '/dealer/transactions', label: 'Transactions', icon: History },
    { id: 'inventory', path: '/dealer/inventory', label: 'Inventory', icon: Package },
    { id: 'settings', path: '/dealer/settings', label: 'Settings', icon: Settings },
  ];

  // Color palette matching the inspiration
  const COLORS = {
    primary: '#3b5bdb',
    success: '#40c057',
    warning: '#fab005',
    danger: '#fa5252',
    purple: '#be4bdb',
    cyan: '#15aabf',
    categories: ['#3b5bdb', '#40c057', '#fab005', '#fa5252', '#be4bdb', '#15aabf']
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setGpsStatus(prev => ({
        ...prev,
        lat: prev.lat + (Math.random() - 0.5) * 0.0001,
        lng: prev.lng + (Math.random() - 0.5) * 0.0001
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, transactionsRes, inventoryRes] = await Promise.all([
        api.get("/dealer/profile"),
        api.get("/dealer/transactions"),
        api.get("/dealer/inventory").catch(() => ({ data: { items: [], stats: {} } }))
      ]);

      setProfile(profileRes.data);
      const txns = transactionsRes.data.transactions || [];
      setTransactions(txns);
      setInventory(inventoryRes.data?.items || []);

      // Process analytics
      processAnalytics(txns, inventoryRes.data?.items || []);
    } catch (error) {
      console.error("Error fetching dealer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (txns, items) => {
    const completed = txns.filter(t => t.status === 'completed');
    const pending = txns.filter(t => t.status === 'pending');
    const rejected = txns.filter(t => t.status === 'rejected');

    // Generate mock monthly data for charts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const transactionsByMonth = months.map((month, idx) => ({
      month,
      completed: Math.floor(Math.random() * 50) + 20 + (completed.length / 3),
      pending: Math.floor(Math.random() * 20) + 5,
      rejected: Math.floor(Math.random() * 10) + 2
    }));

    const salesByMonth = months.map((month, idx) => ({
      month,
      sales: Math.floor(Math.random() * 5000) + 2000 + (idx * 300)
    }));

    // Category breakdown from inventory
    const categoryCount = {};
    items.forEach(item => {
      const cat = item.category || 'other';
      categoryCount[cat] = (categoryCount[cat] || 0) + (item.quantity || 1);
    });
    
    const categoryBreakdown = Object.entries(categoryCount).map(([name, value], idx) => ({
      name: name.replace('_', ' '),
      value,
      color: COLORS.categories[idx % COLORS.categories.length]
    }));

    // If no inventory, add sample categories
    if (categoryBreakdown.length === 0) {
      const sampleCategories = [
        { name: 'Firearms', value: 45, color: COLORS.primary },
        { name: 'Ammunition', value: 30, color: COLORS.success },
        { name: 'Accessories', value: 15, color: COLORS.warning },
        { name: 'Safety Equipment', value: 10, color: COLORS.purple }
      ];
      categoryBreakdown.push(...sampleCategories);
    }

    // Calculate revenue (mock)
    const revenue = completed.length * 250 + Math.random() * 1000;

    setAnalyticsData({
      totalTransactions: txns.length,
      activeTransactions: pending.length,
      completedTransactions: completed.length,
      rejectedTransactions: rejected.length,
      revenue,
      transactionsByMonth,
      salesByMonth,
      categoryBreakdown,
      recentActivity: txns.slice(0, 5)
    });
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-emerald-100 text-emerald-700",
      pending: "bg-amber-100 text-amber-700",
      rejected: "bg-red-100 text-red-700"
    };
    return <Badge className={styles[status] || "bg-gray-100"}>{status}</Badge>;
  };

  // Stats for top cards
  const stats = [
    {
      title: "Total Transactions",
      value: formatNumber(analyticsData.totalTransactions || profile?.total_transactions || 0),
      bgColor: "bg-[#3b5bdb]",
      textColor: "text-white"
    },
    {
      title: "Pending",
      value: formatNumber(analyticsData.activeTransactions),
      percentage: analyticsData.totalTransactions ? formatPercentage((analyticsData.activeTransactions / analyticsData.totalTransactions) * 100) + " of total" : "0%",
      bgColor: "bg-[#d0f0c0]",
      textColor: "text-emerald-700"
    },
    {
      title: "Completed",
      value: formatNumber(analyticsData.completedTransactions),
      percentage: analyticsData.totalTransactions ? formatPercentage((analyticsData.completedTransactions / analyticsData.totalTransactions) * 100) + " of total" : "0%",
      bgColor: "bg-[#c7f9cc]",
      textColor: "text-emerald-800"
    },
    {
      title: "Rejected",
      value: formatNumber(analyticsData.rejectedTransactions),
      percentage: analyticsData.totalTransactions ? formatPercentage((analyticsData.rejectedTransactions / analyticsData.totalTransactions) * 100) + " of total" : "0%",
      bgColor: "bg-[#ffe8e8]",
      textColor: "text-red-700"
    },
    {
      title: "Revenue",
      value: formatCurrency(analyticsData.revenue),
      percentage: analyticsData.totalTransactions ? formatPercentage((analyticsData.revenue / (analyticsData.totalTransactions * 300)) * 100) + " of target" : "0%",
      bgColor: "bg-[#e8e0f8]",
      textColor: "text-purple-700"
    }
  ];

  // Average values by category
  const avgCheckData = [
    { name: 'Firearms', value: 450, color: COLORS.primary },
    { name: 'Ammunition', value: 125, color: COLORS.success },
    { name: 'Accessories', value: 85, color: COLORS.warning },
    { name: 'Safety', value: 65, color: COLORS.cyan },
    { name: 'Storage', value: 175, color: COLORS.purple }
  ];

  // Processing time by state
  const processingTimeData = [
    { name: 'New York', time: 2, status: 'fast' },
    { name: 'California', time: 5, status: 'normal' },
    { name: 'Texas', time: 3, status: 'fast' },
    { name: 'Florida', time: 6, status: 'slow' },
    { name: 'Illinois', time: 8, status: 'slow' }
  ];

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Analytics"
        subtitle="Dealer Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <Package className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Analytics"
      subtitle="Dealer Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="dealer-analytics">
        {/* GPS Status Banner */}
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">GPS Location Active</p>
            <p className="text-xs text-emerald-600">{gpsStatus.lat.toFixed(4)}, {gpsStatus.lng.toFixed(4)}</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700">Live</Badge>
        </div>

        {/* Top Stats Cards - Matching inspiration layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-4 ${stat.bgColor} ${stat.textColor}`}
            >
              <p className="text-xs opacity-80 mb-1">{stat.title}</p>
              <p className="text-2xl lg:text-3xl font-bold">{stat.value}</p>
              {stat.percentage && (
                <p className="text-xs opacity-70 mt-1">{stat.percentage}</p>
              )}
            </div>
          ))}
        </div>

        {/* Charts Row 1 - Transactions & Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transactions Bar Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Transactions</CardTitle>
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
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.transactionsByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                  />
                  <Bar dataKey="completed" stackId="a" fill={COLORS.success} radius={[0, 0, 0, 0]} name="Completed" />
                  <Bar dataKey="pending" stackId="a" fill={COLORS.warning} radius={[0, 0, 0, 0]} name="Pending" />
                  <Bar dataKey="rejected" stackId="a" fill="#ffb3b3" radius={[4, 4, 0, 0]} name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.success }} />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.warning }} />
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffb3b3' }} />
                  <span className="text-xs text-muted-foreground">Rejected</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales Line Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Sales</CardTitle>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {['week', 'month', 'year'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setSalesTimeRange(range)}
                      className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                        salesTimeRange === range
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
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analyticsData.salesByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Sales']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke={COLORS.primary} 
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4 overflow-x-auto pb-2">
                <Badge variant="outline" className="text-xs bg-blue-50">All</Badge>
                <Badge variant="outline" className="text-xs">Firearms</Badge>
                <Badge variant="outline" className="text-xs">Ammunition</Badge>
                <Badge variant="outline" className="text-xs">Accessories</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 - Categories, Avg Check, Processing Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Category Breakdown - Donut Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Popular Categories</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0">
                  See All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {analyticsData.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">All</p>
                      <p className="text-xs font-medium">Products</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {analyticsData.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm capitalize">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {analyticsData.categoryBreakdown.length > 0 
                          ? `${Math.round((cat.value / analyticsData.categoryBreakdown.reduce((a, b) => a + b.value, 0)) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Check - Horizontal Bar */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Av. Transaction</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0">
                  See All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {avgCheckData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold">${item.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(item.value / 500) * 100}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Processing Time - Horizontal Bar */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Av. Processing Time</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0">
                  See All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processingTimeData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <span className="text-sm w-24 truncate">{item.name}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.status === 'fast' ? 'bg-emerald-400' :
                          item.status === 'normal' ? 'bg-cyan-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${(item.time / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">{item.time} days</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm bg-emerald-400" />
                  <span className="text-xs text-muted-foreground">Fast</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm bg-cyan-400" />
                  <span className="text-xs text-muted-foreground">Normal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm bg-red-400" />
                  <span className="text-xs text-muted-foreground">Slow</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/dealer/transactions')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsData.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analyticsData.recentActivity.map((txn, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      txn.status === 'completed' ? 'bg-emerald-100' :
                      txn.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      {txn.status === 'completed' ? (
                        <CheckCircle className={`w-5 h-5 text-emerald-600`} />
                      ) : txn.status === 'pending' ? (
                        <Clock className={`w-5 h-5 text-amber-600`} />
                      ) : (
                        <XCircle className={`w-5 h-5 text-red-600`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{txn.item_type} - {txn.quantity} units</p>
                        {getStatusBadge(txn.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString()} • {txn.citizen_name || 'Customer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${txn.total || (txn.quantity * 25).toFixed(2)}</p>
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

export default DealerPortal;
