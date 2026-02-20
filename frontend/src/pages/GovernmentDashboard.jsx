import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Activity, Users, Building, AlertTriangle, 
  CheckCircle, XCircle, Clock, Eye, RefreshCw, MapPin,
  TrendingUp, TrendingDown, Shield, Filter, Search,
  BarChart3, PieChart as PieChartIcon, Map, Settings, DollarSign, GraduationCap,
  Bell, AlertCircle, UserX, Ban, MessageSquare, FileText,
  ChevronRight, Zap, Target, Scale, BookOpen, Award, ArrowUpRight, Palette, Handshake
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { formatNumber, formatCurrency, formatPercentage, formatCompact } from "../utils/formatters";
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
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from 'recharts';

const GovernmentDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTimeRange, setActiveTimeRange] = useState("month");
  const [complianceTimeRange, setComplianceTimeRange] = useState("month");
  
  // Data states
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [trainingData, setTrainingData] = useState(null);
  const [dealerData, setDealerData] = useState(null);
  const [complianceData, setComplianceData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  
  // Dialog states
  const [alertDialog, setAlertDialog] = useState(null);
  const [interventionNotes, setInterventionNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Color palette
  const COLORS = {
    primary: '#3b5bdb',
    success: '#40c057',
    warning: '#fab005',
    danger: '#fa5252',
    purple: '#be4bdb',
    cyan: '#15aabf',
    categories: ['#3b5bdb', '#40c057', '#fab005', '#fa5252', '#be4bdb', '#15aabf']
  };

  const navItems = [
    { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'owners', path: '/government/owners', label: 'Owners', icon: Users },
    { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
    { id: 'templates', path: '/government/templates', label: 'Templates', icon: FileText },
    { id: 'cert-config', path: '/government/certificate-config', label: 'Cert Config', icon: Palette },
    { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
    { id: 'predictive', path: '/government/predictive', label: 'Analytics', icon: Activity },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
    { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
    { id: 'partners', path: '/government/partners', label: 'Partners', icon: Handshake },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [summaryRes, revenueRes, trainingRes, dealerRes, complianceRes, alertsRes] = await Promise.all([
        api.get("/government/dashboard-summary").catch(() => ({ data: {} })),
        api.get("/government/revenue-stats").catch(() => ({ data: {} })),
        api.get("/government/training-stats").catch(() => ({ data: {} })),
        api.get("/government/dealer-stats").catch(() => ({ data: {} })),
        api.get("/government/compliance-overview").catch(() => ({ data: {} })),
        api.get("/government/alerts").catch(() => ({ data: { alerts: [] } }))
      ]);

      setDashboardSummary(summaryRes.data);
      setRevenueData(revenueRes.data);
      setTrainingData(trainingRes.data);
      setDealerData(dealerRes.data);
      setComplianceData(complianceRes.data);
      setAlertsData(alertsRes.data);
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

  const handleResolveAlert = async (alertId) => {
    setProcessing(true);
    try {
      await api.put(`/government/alerts/${alertId}`, { 
        status: "resolved",
        notes: interventionNotes 
      });
      toast.success("Alert resolved successfully");
      setAlertDialog(null);
      setInterventionNotes("");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to resolve alert");
    } finally {
      setProcessing(false);
    }
  };

  // Generate analytics data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  
  const registrationsByMonth = months.map((month, idx) => ({
    month,
    newLicenses: Math.floor(Math.random() * 500) + 200 + idx * 30,
    renewals: Math.floor(Math.random() * 300) + 150,
    revocations: Math.floor(Math.random() * 30) + 5
  }));

  const complianceByMonth = months.map((month, idx) => ({
    month,
    compliant: Math.floor(Math.random() * 1000) + 800 + idx * 50,
    violations: Math.floor(Math.random() * 50) + 10
  }));

  const revenueByMonth = months.map((month, idx) => ({
    month,
    revenue: Math.floor(Math.random() * 50000) + 30000 + idx * 5000
  }));

  // Category breakdown
  const categoryData = [
    { name: 'Firearms', value: 45000, color: COLORS.primary },
    { name: 'Ammunition', value: 125000, color: COLORS.success },
    { name: 'Accessories', value: 35000, color: COLORS.warning },
    { name: 'Training', value: 28000, color: COLORS.purple }
  ];

  // Regional compliance
  const regionalData = [
    { name: 'Northeast', compliant: 94, color: COLORS.success },
    { name: 'Southeast', compliant: 91, color: COLORS.success },
    { name: 'Midwest', compliant: 88, color: COLORS.warning },
    { name: 'Southwest', compliant: 85, color: COLORS.warning },
    { name: 'West', compliant: 92, color: COLORS.success }
  ];

  // Alert severity distribution
  const alertSeverity = [
    { name: 'Critical', value: alertsData?.alerts?.filter(a => a.severity === 'critical').length || 5, color: COLORS.danger },
    { name: 'High', value: alertsData?.alerts?.filter(a => a.severity === 'high').length || 12, color: COLORS.warning },
    { name: 'Medium', value: alertsData?.alerts?.filter(a => a.severity === 'medium').length || 28, color: COLORS.cyan },
    { name: 'Low', value: alertsData?.alerts?.filter(a => a.severity === 'low').length || 45, color: COLORS.success }
  ];

  // Mobile chart data
  const reviewQueueData = [
    { name: 'Urgent', license: 12, dealer: 5, violation: 8, fill: COLORS.danger },
    { name: 'High', license: 45, dealer: 20, violation: 15, fill: COLORS.warning },
    { name: 'Normal', license: 180, dealer: 65, violation: 30, fill: COLORS.primary }
  ];

  // Processing time trend (last 7 days average)
  const processingTrend = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    hours: Math.floor(Math.random() * 20) + 15
  }));

  // Escalation rate
  const totalResolved = 450;
  const escalated = 45;
  const escalationRate = (escalated / totalResolved) * 100;
  const escalationData = [
    { name: 'Resolved', value: totalResolved - escalated, fill: COLORS.success },
    { name: 'Escalated', value: escalated, fill: COLORS.warning }
  ];

  // Review type breakdown for the pending queue
  const reviewBreakdown = dashboardSummary?.pending_reviews_breakdown || {
    license_applications: 85,
    license_renewals: 42,
    dealer_certifications: 28,
    flagged_transactions: 15,
    compliance_violations: 12,
    appeals: 8
  };

  // Stats data
  const totalLicenses = dashboardSummary?.total_licenses || 2400000;
  const activeDealers = dashboardSummary?.active_dealers || 15800;
  const totalRevenue = revenueData?.total_revenue || 4250000;
  const complianceRate = complianceData?.compliance_rate || 94.2;
  const pendingReviews = dashboardSummary?.pending_reviews || 1247;

  const stats = [
    {
      title: "Licensed Owners",
      value: formatCompact(totalLicenses),
      percentage: "+2.4% this month",
      bgColor: "bg-[#3b5bdb]",
      textColor: "text-white"
    },
    {
      title: "Active Dealers",
      value: formatNumber(activeDealers),
      percentage: "+1.2% this month",
      bgColor: "bg-[#c7f9cc]",
      textColor: "text-emerald-800"
    },
    {
      title: "Compliance Rate",
      value: formatPercentage(complianceRate, 1),
      percentage: "+0.8% this month",
      bgColor: "bg-[#d0f0c0]",
      textColor: "text-emerald-700"
    },
    {
      title: "Pending Reviews",
      value: formatNumber(pendingReviews),
      percentage: "-5.2% this week",
      bgColor: "bg-[#ffe8e8]",
      textColor: "text-red-700"
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(totalRevenue),
      percentage: "+8.5% this month",
      bgColor: "bg-[#e8e0f8]",
      textColor: "text-purple-700"
    }
  ];

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="National Oversight"
        subtitle="Government Portal"
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
      title="National Oversight"
      subtitle="Government Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="government-analytics">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-4 ${stat.bgColor} ${stat.textColor}`}
            >
              <p className="text-xs opacity-80 mb-1">{stat.title}</p>
              <p className="text-2xl lg:text-3xl font-bold">{stat.value}</p>
              <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                {stat.percentage.startsWith('+') ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {stat.percentage}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile-Optimized Charts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Review Queue by Priority */}
          <Card className="overflow-hidden col-span-2 lg:col-span-1">
            <CardContent className="pt-4 pb-2 px-3">
              <p className="text-xs text-muted-foreground mb-2 text-center">Review Queue by Priority</p>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reviewQueueData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={45} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="license" stackId="a" fill={COLORS.primary} name="License" />
                    <Bar dataKey="dealer" stackId="a" fill={COLORS.success} name="Dealer" />
                    <Bar dataKey="violation" stackId="a" fill={COLORS.warning} name="Violation" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-2 mt-1 text-[9px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{backgroundColor: COLORS.primary}}></span>License</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{backgroundColor: COLORS.success}}></span>Dealer</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{backgroundColor: COLORS.warning}}></span>Violation</span>
              </div>
            </CardContent>
          </Card>

          {/* Processing Time Trend */}
          <Card className="overflow-hidden">
            <CardContent className="pt-4 pb-2 px-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Avg. Processing</p>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processingTrend}>
                      <Line 
                        type="monotone" 
                        dataKey="hours" 
                        stroke={COLORS.primary} 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">~24h avg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escalation Rate */}
          <Card className="overflow-hidden">
            <CardContent className="pt-4 pb-2 px-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Escalation Rate</p>
                <div className="relative w-20 h-20 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={escalationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={22}
                        outerRadius={35}
                        dataKey="value"
                      >
                        {escalationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold">{escalationRate.toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {escalated} of {totalResolved} escalated
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Regional Compliance Mini */}
          <Card className="overflow-hidden">
            <CardContent className="pt-4 pb-2 px-3">
              <p className="text-xs text-muted-foreground mb-2 text-center">Regional Compliance</p>
              <div className="space-y-1">
                {regionalData.map((region, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-14 truncate">{region.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${region.compliant}%`,
                          backgroundColor: region.compliant >= 90 ? COLORS.success : region.compliant >= 80 ? COLORS.warning : COLORS.danger
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-medium w-6">{region.compliant}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Type Breakdown */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pending Reviews by Type</CardTitle>
              <Button variant="link" size="sm" className="text-xs" onClick={() => navigate('/government/reviews')}>
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { key: 'license_applications', label: 'License Apps', icon: FileText, color: COLORS.primary },
                { key: 'license_renewals', label: 'Renewals', icon: RefreshCw, color: COLORS.success },
                { key: 'dealer_certifications', label: 'Dealer Certs', icon: Building, color: COLORS.warning },
                { key: 'flagged_transactions', label: 'Flagged', icon: AlertTriangle, color: COLORS.danger },
                { key: 'compliance_violations', label: 'Violations', icon: XCircle, color: COLORS.purple },
                { key: 'appeals', label: 'Appeals', icon: Scale, color: COLORS.cyan }
              ].map((item) => {
                const Icon = item.icon;
                const count = reviewBreakdown[item.key] || 0;
                return (
                  <div 
                    key={item.key}
                    className="flex flex-col items-center p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate('/government/reviews')}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${item.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-lg font-bold">{count}</span>
                    <span className="text-[10px] text-muted-foreground text-center">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Charts Row 1 - Registrations & Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registrations Bar Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">License Registrations</CardTitle>
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
                <BarChart data={registrationsByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                    formatter={(value) => formatNumber(value)}
                  />
                  <Bar dataKey="newLicenses" stackId="a" fill={COLORS.primary} name="New Licenses" />
                  <Bar dataKey="renewals" stackId="a" fill={COLORS.success} name="Renewals" />
                  <Bar dataKey="revocations" stackId="a" fill={COLORS.danger} radius={[4, 4, 0, 0]} name="Revocations" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.primary }} />
                  <span className="text-xs text-muted-foreground">New Licenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.success }} />
                  <span className="text-xs text-muted-foreground">Renewals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.danger }} />
                  <span className="text-xs text-muted-foreground">Revocations</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Line Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Revenue Collection</CardTitle>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {['week', 'month', 'year'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setComplianceTimeRange(range)}
                      className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                        complianceTimeRange === range
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
                <AreaChart data={revenueByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={COLORS.success} 
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4 overflow-x-auto pb-2">
                <Badge variant="outline" className="text-xs bg-emerald-50">All Sources</Badge>
                <Badge variant="outline" className="text-xs">Licenses</Badge>
                <Badge variant="outline" className="text-xs">Renewals</Badge>
                <Badge variant="outline" className="text-xs">Training</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 - Categories, Regional, Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Transaction Categories</CardTitle>
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
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xs font-medium">{formatCompact(categoryData.reduce((a, b) => a + b.value, 0))}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {categoryData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPercentage((cat.value / categoryData.reduce((a, b) => a + b.value, 0)) * 100)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regional Compliance */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Regional Compliance</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0">
                  See All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regionalData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-semibold">{formatPercentage(item.compliant)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${item.compliant}%`,
                          backgroundColor: item.compliant >= 90 ? COLORS.success : COLORS.warning
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alert Severity */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Alert Distribution</CardTitle>
                <Button variant="link" size="sm" className="text-xs text-primary p-0" onClick={() => navigate('/government/alerts-dashboard')}>
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
                        data={alertSeverity}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {alertSeverity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatNumber(alertSeverity.reduce((a, b) => a + b.value, 0))}</p>
                      <p className="text-xs text-muted-foreground">Alerts</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {alertSeverity.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alert.color }} />
                        <span className="text-sm">{alert.name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatNumber(alert.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Recent Alerts
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/government/alerts-dashboard')}>
                View All Alerts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!alertsData?.alerts?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertsData.alerts.slice(0, 5).map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.severity === 'critical' ? 'bg-red-100' :
                      alert.severity === 'high' ? 'bg-amber-100' :
                      alert.severity === 'medium' ? 'bg-cyan-100' : 'bg-emerald-100'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'high' ? 'text-amber-600' :
                        alert.severity === 'medium' ? 'text-cyan-600' : 'text-emerald-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{alert.alert_type?.replace(/_/g, ' ')}</p>
                        <Badge className={`text-xs ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'high' ? 'bg-amber-100 text-amber-700' :
                          alert.severity === 'medium' ? 'bg-cyan-100 text-cyan-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {alert.description || 'No description'}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setAlertDialog(alert)}
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Review Dialog */}
      <Dialog open={!!alertDialog} onOpenChange={() => setAlertDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Review Alert
            </DialogTitle>
            <DialogDescription>
              {alertDialog?.alert_type?.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>
          
          {alertDialog && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">{alertDialog.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Severity</p>
                  <Badge className={`mt-1 ${
                    alertDialog.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    alertDialog.severity === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'
                  }`}>
                    {alertDialog.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(alertDialog.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  placeholder="Add notes about the resolution..."
                  value={interventionNotes}
                  onChange={(e) => setInterventionNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleResolveAlert(alertDialog?.alert_id)}
              disabled={processing}
            >
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GovernmentDashboard;
