import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Activity, Users, Building, AlertTriangle, 
  CheckCircle, XCircle, Clock, Eye, RefreshCw, MapPin,
  TrendingUp, TrendingDown, Shield, Filter, Search,
  BarChart3, PieChart, Map, Settings, DollarSign, GraduationCap,
  Bell, AlertCircle, UserX, Ban, MessageSquare, FileText,
  ChevronRight, Zap, Target, Scale, BookOpen, Award
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { StatCard, DonutChart, BarChart, ProgressBar } from "../components/Charts";

const GovernmentDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [trainingData, setTrainingData] = useState(null);
  const [dealerData, setDealerData] = useState(null);
  const [complianceData, setComplianceData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [courses, setCourses] = useState([]);
  
  // Dialog states
  const [alertDialog, setAlertDialog] = useState(null);
  const [courseDialog, setCourseDialog] = useState(false);
  const [interventionNotes, setInterventionNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // New course form
  const [newCourse, setNewCourse] = useState({
    name: "",
    description: "",
    region: "national",
    cost: 0,
    duration_hours: 4,
    is_compulsory: false,
    category: "safety",
    ari_boost: 5,
    ari_penalty_for_skip: 0,
    deadline_days: 30
  });

  const navItems = [
    { id: 'overview', path: '/government', label: 'Overview', icon: LayoutDashboard },
    { id: 'revenue', path: '/government/revenue', label: 'Revenue', icon: DollarSign },
    { id: 'training', path: '/government/training', label: 'Training', icon: GraduationCap },
    { id: 'dealers', path: '/government/dealers', label: 'Dealers', icon: Building },
    { id: 'compliance', path: '/government/compliance', label: 'Compliance', icon: Scale },
    { id: 'alerts', path: '/government/alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      const [summaryRes, revenueRes, trainingRes, dealerRes, complianceRes, alertsRes, coursesRes] = await Promise.all([
        api.get("/government/dashboard-summary").catch(() => ({ data: null })),
        api.get("/government/analytics/revenue").catch(() => ({ data: null })),
        api.get("/government/analytics/training").catch(() => ({ data: null })),
        api.get("/government/analytics/dealers").catch(() => ({ data: null })),
        api.get("/government/analytics/compliance").catch(() => ({ data: null })),
        api.get("/government/alerts/active").catch(() => ({ data: null })),
        api.get("/government/courses").catch(() => ({ data: { courses: [] } })),
      ]);
      
      setDashboardSummary(summaryRes.data);
      setRevenueData(revenueRes.data);
      setTrainingData(trainingRes.data);
      setDealerData(dealerRes.data);
      setComplianceData(complianceRes.data);
      setAlertsData(alertsRes.data);
      setCourses(coursesRes.data?.courses || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 403) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/", { replace: true });
      }
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

  const handleIntervention = async (action) => {
    if (!alertDialog) return;
    setProcessing(true);
    
    try {
      await api.post(`/government/alerts/intervene/${alertDialog.alert_id}`, {
        action,
        notes: interventionNotes
      });
      
      toast.success(`Intervention '${action}' executed successfully`);
      setAlertDialog(null);
      setInterventionNotes("");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to execute intervention");
    } finally {
      setProcessing(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await api.post(`/government/alerts/acknowledge/${alertId}`);
      toast.success("Alert acknowledged");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const handleCreateCourse = async () => {
    setProcessing(true);
    try {
      await api.post("/government/courses", newCourse);
      toast.success("Course created successfully");
      setCourseDialog(false);
      setNewCourse({
        name: "",
        description: "",
        region: "national",
        cost: 0,
        duration_hours: 4,
        is_compulsory: false,
        category: "safety",
        ari_boost: 5,
        ari_penalty_for_skip: 0,
        deadline_days: 30
      });
      fetchAllData();
    } catch (error) {
      toast.error("Failed to create course");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  // Revenue trend data for chart
  const revenueTrendData = revenueData?.trends?.map(t => ({
    label: t.month,
    value: t.total
  })) || [];

  // Compliance by region for chart
  const complianceChartData = complianceData?.ari_by_region ? 
    Object.entries(complianceData.ari_by_region).map(([region, data]) => ({
      label: region.charAt(0).toUpperCase() + region.slice(1),
      value: data.avg_ari
    })) : [];

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-danger text-white",
      high: "bg-warning/80 text-white",
      medium: "bg-warning/50 text-warning-foreground",
      low: "bg-info/50 text-info-foreground"
    };
    return colors[severity] || colors.medium;
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Government Command"
        subtitle="National Oversight Dashboard"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading command center...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Government Command"
      subtitle="National Oversight Dashboard"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="government-dashboard">
        {/* Critical Alerts Banner */}
        {alertsData?.by_severity?.critical > 0 && (
          <div className="flex items-center gap-4 p-4 bg-danger/10 border border-danger/30 rounded-lg animate-pulse">
            <AlertTriangle className="w-6 h-6 text-danger" />
            <div className="flex-1">
              <p className="font-semibold text-danger">Critical Alerts Require Attention</p>
              <p className="text-sm text-muted-foreground">
                {alertsData.by_severity.critical} critical alert(s) need immediate intervention
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setActiveTab("alerts")}>
              View Alerts
            </Button>
          </div>
        )}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Revenue</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="dealers" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Dealers</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 relative">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
              {alertsData?.total_active > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center">
                  {alertsData.total_active}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Citizens"
                value={dashboardSummary?.overview?.total_citizens?.toLocaleString() || '0'}
                subtitle="registered members"
                icon={Users}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                trend="up"
                trendValue={`${dashboardSummary?.overview?.license_compliance_rate || 0}% compliant`}
              />
              <StatCard
                title="Active Dealers"
                value={dealerData?.active_dealers?.toLocaleString() || '0'}
                subtitle="licensed dealers"
                icon={Building}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Monthly Revenue"
                value={formatCurrency(dashboardSummary?.revenue?.this_month)}
                subtitle="this month"
                icon={DollarSign}
                iconBg="bg-success/10"
                iconColor="text-success"
                trend="up"
                trendValue="+12.5%"
              />
              <StatCard
                title="Active Alerts"
                value={alertsData?.total_active || 0}
                subtitle={`${alertsData?.by_severity?.critical || 0} critical`}
                icon={AlertTriangle}
                iconBg="bg-danger/10"
                iconColor="text-danger"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Trend */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold">Revenue Trends</CardTitle>
                  <Badge variant="outline">Last 6 Months</Badge>
                </CardHeader>
                <CardContent>
                  <BarChart data={revenueTrendData} height={200} />
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-success">{formatCurrency(revenueData?.by_type?.course_fee)}</p>
                      <p className="text-xs text-muted-foreground">Course Fees</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{formatCurrency((revenueData?.by_type?.license_fee || 0) + (revenueData?.by_type?.renewal_fee || 0))}</p>
                      <p className="text-xs text-muted-foreground">License Fees</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-warning">{formatCurrency(revenueData?.by_type?.membership_fee)}</p>
                      <p className="text-xs text-muted-foreground">Membership</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Quick Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">{trainingData?.completion_rate || 0}%</p>
                        <p className="text-xs text-muted-foreground">Training Completion</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Scale className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{complianceData?.license_stats?.renewal_rate || 0}%</p>
                        <p className="text-xs text-muted-foreground">License Renewal Rate</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <Clock className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">{complianceData?.license_stats?.expiring_soon || 0}</p>
                        <p className="text-xs text-muted-foreground">Licenses Expiring (30d)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-danger/10 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-danger" />
                      </div>
                      <div>
                        <p className="font-medium">{trainingData?.overdue || 0}</p>
                        <p className="text-xs text-muted-foreground">Overdue Enrollments</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Regional Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Regional Compliance Overview</CardTitle>
                <Button variant="outline" size="sm">
                  <Map className="w-4 h-4 mr-2" />
                  View Map
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {complianceData?.ari_by_region && Object.entries(complianceData.ari_by_region).map(([region, data]) => (
                    <div key={region} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{region}</span>
                        <Badge variant={data.avg_ari >= 70 ? "success" : data.avg_ari >= 50 ? "warning" : "destructive"} className="text-xs">
                          {data.avg_ari >= 70 ? "Good" : data.avg_ari >= 50 ? "Fair" : "Low"}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">{data.avg_ari}</p>
                      <p className="text-xs text-muted-foreground">Avg ARI Score</p>
                      <div className="mt-2">
                        <ProgressBar value={data.avg_ari} max={100} className="h-1.5" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{data.citizens} citizens</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REVENUE TAB */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Revenue"
                value={formatCurrency(revenueData?.total_revenue)}
                subtitle="all time"
                icon={DollarSign}
                iconBg="bg-success/10"
                iconColor="text-success"
              />
              <StatCard
                title="Course Fees"
                value={formatCurrency(revenueData?.by_type?.course_fee)}
                subtitle="training revenue"
                icon={GraduationCap}
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <StatCard
                title="License Fees"
                value={formatCurrency((revenueData?.by_type?.license_fee || 0) + (revenueData?.by_type?.renewal_fee || 0))}
                subtitle="licenses & renewals"
                icon={FileText}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Membership Fees"
                value={formatCurrency(revenueData?.by_type?.membership_fee)}
                subtitle="member registrations"
                icon={Users}
                iconBg="bg-info/10"
                iconColor="text-info"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Revenue by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-4">
                    <DonutChart 
                      value={revenueData?.by_type?.course_fee || 0}
                      total={revenueData?.total_revenue || 1}
                      size={160}
                      strokeWidth={20}
                      color="hsl(160, 84%, 39%)"
                      label="Course Fees"
                    />
                  </div>
                  <div className="space-y-3">
                    {revenueData?.type_breakdown?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Revenue by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenueData?.by_region && Object.entries(revenueData.by_region).map(([region, amount]) => (
                      <div key={region}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm capitalize">{region}</span>
                          <span className="font-semibold">{formatCurrency(amount)}</span>
                        </div>
                        <ProgressBar 
                          value={amount} 
                          max={Math.max(...Object.values(revenueData.by_region))} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TRAINING TAB */}
          <TabsContent value="training" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Course Management</h2>
              <Button onClick={() => setCourseDialog(true)} data-testid="create-course-btn">
                <BookOpen className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Courses"
                value={trainingData?.total_courses || 0}
                subtitle={`${trainingData?.compulsory_courses || 0} compulsory`}
                icon={BookOpen}
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <StatCard
                title="Total Enrollments"
                value={trainingData?.total_enrollments || 0}
                subtitle="all courses"
                icon={Users}
                iconBg="bg-success/10"
                iconColor="text-success"
              />
              <StatCard
                title="Completion Rate"
                value={`${trainingData?.completion_rate || 0}%`}
                subtitle={`${trainingData?.completed || 0} completed`}
                icon={Award}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Overdue"
                value={trainingData?.overdue || 0}
                subtitle="need follow-up"
                icon={AlertCircle}
                iconBg="bg-danger/10"
                iconColor="text-danger"
              />
            </div>

            {/* Compliance by Region */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Training Compliance by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {trainingData?.compliance_by_region && Object.entries(trainingData.compliance_by_region).map(([region, rate]) => (
                    <div key={region} className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-3xl font-bold">{rate}%</p>
                      <p className="text-sm text-muted-foreground capitalize">{region}</p>
                      <ProgressBar value={rate} max={100} className="h-1.5 mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Course List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Active Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Course Name</th>
                        <th>Region</th>
                        <th>Type</th>
                        <th>Cost</th>
                        <th>Duration</th>
                        <th>ARI Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.filter(c => c.status === 'active').map((course) => (
                        <tr key={course.course_id}>
                          <td>
                            <div>
                              <p className="font-medium">{course.name}</p>
                              <p className="text-xs text-muted-foreground">{course.category}</p>
                            </div>
                          </td>
                          <td className="capitalize">{course.region}</td>
                          <td>
                            <Badge variant={course.is_compulsory ? "destructive" : "secondary"}>
                              {course.is_compulsory ? "Compulsory" : "Optional"}
                            </Badge>
                          </td>
                          <td>{formatCurrency(course.cost)}</td>
                          <td>{course.duration_hours}h</td>
                          <td>
                            <span className="text-success">+{course.ari_boost}</span>
                            {course.ari_penalty_for_skip > 0 && (
                              <span className="text-danger ml-2">-{course.ari_penalty_for_skip}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEALERS TAB */}
          <TabsContent value="dealers" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Dealers"
                value={dealerData?.total_dealers || 0}
                subtitle={`${dealerData?.active_dealers || 0} active`}
                icon={Building}
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <StatCard
                title="Firearm Sales"
                value={(dealerData?.total_firearm_sales || 0).toLocaleString()}
                subtitle="total units"
                icon={Target}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Ammunition Sales"
                value={(dealerData?.total_ammunition_sales || 0).toLocaleString()}
                subtitle="total units"
                icon={Zap}
                iconBg="bg-info/10"
                iconColor="text-info"
              />
              <StatCard
                title="Flagged Dealers"
                value={dealerData?.flagged_dealers?.length || 0}
                subtitle="need review"
                icon={AlertTriangle}
                iconBg="bg-danger/10"
                iconColor="text-danger"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Dealers by Volume */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Top Dealers by Transaction Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dealerData?.top_by_volume?.slice(0, 5).map((dealer, idx) => (
                      <div key={dealer.dealer_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium">{dealer.business_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{dealer.region}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{dealer.total_transactions}</p>
                          <p className="text-xs text-muted-foreground">transactions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dealers by Region */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Dealers by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart 
                    data={dealerData?.by_region ? Object.entries(dealerData.by_region).map(([region, count]) => ({
                      label: region.charAt(0).toUpperCase() + region.slice(1),
                      value: count
                    })) : []} 
                    height={200} 
                  />
                </CardContent>
              </Card>
            </div>

            {/* Flagged Dealers */}
            {dealerData?.flagged_dealers?.length > 0 && (
              <Card className="border-danger/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-danger flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Flagged Dealers - Require Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Dealer</th>
                          <th>Region</th>
                          <th>Avg Risk Score</th>
                          <th>Compliance Score</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealerData.flagged_dealers.map((dealer) => (
                          <tr key={dealer.dealer_id}>
                            <td className="font-medium">{dealer.business_name}</td>
                            <td className="capitalize">{dealer.region}</td>
                            <td>
                              <Badge variant={dealer.avg_risk_score > 60 ? "destructive" : "warning"}>
                                {dealer.avg_risk_score}
                              </Badge>
                            </td>
                            <td>
                              <Badge variant={dealer.compliance_score < 70 ? "destructive" : "warning"}>
                                {dealer.compliance_score}
                              </Badge>
                            </td>
                            <td className="capitalize">{dealer.license_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* COMPLIANCE TAB */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Citizens"
                value={complianceData?.total_citizens || 0}
                subtitle="registered members"
                icon={Users}
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <StatCard
                title="Active Licenses"
                value={complianceData?.license_stats?.active || 0}
                subtitle={`${complianceData?.license_stats?.renewal_rate || 0}% renewal rate`}
                icon={FileText}
                iconBg="bg-success/10"
                iconColor="text-success"
              />
              <StatCard
                title="Expiring Soon"
                value={complianceData?.license_stats?.expiring_soon || 0}
                subtitle="next 30 days"
                icon={Clock}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Suspended"
                value={complianceData?.license_stats?.suspended || 0}
                subtitle="need intervention"
                icon={Ban}
                iconBg="bg-danger/10"
                iconColor="text-danger"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ARI Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">ARI Tier Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-6">
                    <DonutChart 
                      value={complianceData?.tier_distribution?.elite_custodian || 0}
                      total={(complianceData?.tier_distribution?.sentinel || 0) + (complianceData?.tier_distribution?.guardian || 0) + (complianceData?.tier_distribution?.elite_custodian || 0) || 1}
                      size={160}
                      strokeWidth={20}
                      color="hsl(262, 83%, 58%)"
                      label="Elite"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-500" />
                        <span>Elite Custodian (85-100)</span>
                      </div>
                      <span className="font-bold text-purple-500">{complianceData?.tier_distribution?.elite_custodian || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <span>Guardian (60-84)</span>
                      </div>
                      <span className="font-bold text-blue-500">{complianceData?.tier_distribution?.guardian || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-500" />
                        <span>Sentinel (0-59)</span>
                      </div>
                      <span className="font-bold text-green-500">{complianceData?.tier_distribution?.sentinel || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Regional ARI */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Average ARI by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart data={complianceChartData} height={250} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Active"
                value={alertsData?.total_active || 0}
                subtitle="alerts"
                icon={Bell}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Critical"
                value={alertsData?.by_severity?.critical || 0}
                subtitle="immediate action"
                icon={AlertTriangle}
                iconBg="bg-danger/10"
                iconColor="text-danger"
              />
              <StatCard
                title="High Priority"
                value={alertsData?.by_severity?.high || 0}
                subtitle="needs attention"
                icon={AlertCircle}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Medium/Low"
                value={(alertsData?.by_severity?.medium || 0) + (alertsData?.by_severity?.low || 0)}
                subtitle="monitoring"
                icon={Eye}
                iconBg="bg-info/10"
                iconColor="text-info"
              />
            </div>

            {/* Alert List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Active Alerts & Red Flags</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchAllData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {(!alertsData?.alerts || alertsData.alerts.length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success opacity-50" />
                    <p>No active alerts. System is healthy.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertsData.alerts.map((alert) => (
                      <div 
                        key={alert.alert_id} 
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' ? 'border-danger/50 bg-danger/5' :
                          alert.severity === 'high' ? 'border-warning/50 bg-warning/5' :
                          'border-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              alert.severity === 'critical' ? 'bg-danger/10' :
                              alert.severity === 'high' ? 'bg-warning/10' :
                              'bg-info/10'
                            }`}>
                              {alert.alert_type === 'intervention' ? (
                                <UserX className={`w-5 h-5 ${
                                  alert.severity === 'critical' ? 'text-danger' :
                                  alert.severity === 'high' ? 'text-warning' :
                                  'text-info'
                                }`} />
                              ) : (
                                <AlertTriangle className={`w-5 h-5 ${
                                  alert.severity === 'critical' ? 'text-danger' :
                                  alert.severity === 'high' ? 'text-warning' :
                                  'text-info'
                                }`} />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{alert.title}</h4>
                                <Badge className={getSeverityColor(alert.severity)}>
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>User: {alert.user_id}</span>
                                <span>Type: {alert.alert_type}</span>
                                <span>Reason: {alert.trigger_reason?.replace(/_/g, ' ')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {alert.status === 'active' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleAcknowledgeAlert(alert.alert_id)}
                                >
                                  Acknowledge
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => setAlertDialog(alert)}
                                  data-testid={`intervene-btn-${alert.alert_id}`}
                                >
                                  Intervene
                                </Button>
                              </>
                            )}
                            {alert.status === 'acknowledged' && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => setAlertDialog(alert)}
                              >
                                Take Action
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Intervention Dialog */}
      <Dialog open={!!alertDialog} onOpenChange={() => setAlertDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <UserX className="w-5 h-5" />
              Member Intervention
            </DialogTitle>
            <DialogDescription>
              Take action on this flagged member. All actions are logged for audit.
            </DialogDescription>
          </DialogHeader>
          
          {alertDialog && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm"><strong>Alert:</strong> {alertDialog.title}</p>
                <p className="text-sm"><strong>User ID:</strong> {alertDialog.user_id}</p>
                <p className="text-sm"><strong>Severity:</strong> <Badge className={getSeverityColor(alertDialog.severity)}>{alertDialog.severity}</Badge></p>
                <p className="text-sm"><strong>Reason:</strong> {alertDialog.trigger_reason?.replace(/_/g, ' ')}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Intervention Notes (Required)</label>
                <Textarea
                  placeholder="Explain the reason for intervention..."
                  value={interventionNotes}
                  onChange={(e) => setInterventionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              className="flex-1"
              variant="outline"
              onClick={() => handleIntervention("warning")}
              disabled={processing || !interventionNotes}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Warning
            </Button>
            <Button 
              className="flex-1 bg-warning hover:bg-warning/90"
              onClick={() => handleIntervention("suspend")}
              disabled={processing || !interventionNotes}
            >
              <Clock className="w-4 h-4 mr-2" />
              Suspend License
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={() => handleIntervention("block_license")}
              disabled={processing || !interventionNotes}
            >
              <Ban className="w-4 h-4 mr-2" />
              Block License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Course Dialog */}
      <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Create New Training Course
            </DialogTitle>
            <DialogDescription>
              Add a new course for firearm owners. Compulsory courses will notify all citizens in the selected region.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Course Name</label>
              <Input
                placeholder="e.g., Advanced Safety Training"
                value={newCourse.name}
                onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Course description..."
                value={newCourse.description}
                onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <Select 
                  value={newCourse.region} 
                  onValueChange={(value) => setNewCourse({...newCourse, region: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National (All Regions)</SelectItem>
                    <SelectItem value="northeast">Northeast</SelectItem>
                    <SelectItem value="southeast">Southeast</SelectItem>
                    <SelectItem value="midwest">Midwest</SelectItem>
                    <SelectItem value="southwest">Southwest</SelectItem>
                    <SelectItem value="west">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={newCourse.category} 
                  onValueChange={(value) => setNewCourse({...newCourse, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="tactical">Tactical</SelectItem>
                    <SelectItem value="refresher">Refresher</SelectItem>
                    <SelectItem value="specialized">Specialized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost ($)</label>
                <Input
                  type="number"
                  value={newCourse.cost}
                  onChange={(e) => setNewCourse({...newCourse, cost: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (hours)</label>
                <Input
                  type="number"
                  value={newCourse.duration_hours}
                  onChange={(e) => setNewCourse({...newCourse, duration_hours: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <input
                type="checkbox"
                id="compulsory"
                checked={newCourse.is_compulsory}
                onChange={(e) => setNewCourse({...newCourse, is_compulsory: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="compulsory" className="text-sm font-medium">
                Make this course compulsory
              </label>
            </div>
            
            {newCourse.is_compulsory && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg space-y-3">
                <p className="text-sm text-warning font-medium">Compulsory Course Settings</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">ARI Boost</label>
                    <Input
                      type="number"
                      value={newCourse.ari_boost}
                      onChange={(e) => setNewCourse({...newCourse, ari_boost: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Skip Penalty</label>
                    <Input
                      type="number"
                      value={newCourse.ari_penalty_for_skip}
                      onChange={(e) => setNewCourse({...newCourse, ari_penalty_for_skip: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Deadline (days)</label>
                    <Input
                      type="number"
                      value={newCourse.deadline_days}
                      onChange={(e) => setNewCourse({...newCourse, deadline_days: parseInt(e.target.value) || 30})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCourse}
              disabled={processing || !newCourse.name || !newCourse.description}
              data-testid="submit-course-btn"
            >
              Create Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GovernmentDashboard;
