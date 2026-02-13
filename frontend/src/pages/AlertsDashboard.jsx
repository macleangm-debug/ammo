import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, Users, TrendingUp, TrendingDown, Clock, 
  CheckCircle, XCircle, Eye, RefreshCw, MapPin, Filter,
  ChevronRight, Zap, Target, Shield, Bell, AlertCircle,
  UserX, Ban, MessageSquare, Activity, BarChart3, PieChart,
  ArrowUp, ArrowDown, Minus, Calendar, Settings, Home
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
import { StatCard, DonutChart, BarChart, ProgressBar } from "../components/Charts";

const AlertsDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    severity: "",
    category: "",
    region: "",
    status: "",
    time_period: "30d"
  });
  
  // Dialog states
  const [alertDialog, setAlertDialog] = useState(null);
  const [interventionNotes, setInterventionNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const navItems = [
    { id: 'home', path: '/government', label: 'Back to Dashboard', icon: Home },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts Dashboard', icon: AlertTriangle },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.severity) params.append("severity", filters.severity);
      if (filters.category) params.append("category", filters.category);
      if (filters.region) params.append("region", filters.region);
      if (filters.status) params.append("status", filters.status);
      params.append("time_period", filters.time_period);
      
      const response = await api.get(`/government/alerts/dashboard?${params.toString()}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching alerts dashboard:", error);
      if (error.response?.status === 403) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [api, filters, navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
      fetchData();
    } catch (error) {
      toast.error("Failed to execute intervention");
    } finally {
      setProcessing(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api.post(`/government/alerts/acknowledge/${alertId}`);
      toast.success("Alert acknowledged");
      fetchData();
    } catch (error) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const resetFilters = () => {
    setFilters({
      severity: "",
      category: "",
      region: "",
      status: "",
      time_period: "30d"
    });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-danger text-white",
      high: "bg-warning text-white",
      medium: "bg-yellow-500/80 text-white",
      low: "bg-info/80 text-white"
    };
    return colors[severity] || colors.medium;
  };

  const getHealthColor = (health) => {
    const colors = {
      critical: "text-danger",
      warning: "text-warning",
      elevated: "text-yellow-500",
      healthy: "text-success"
    };
    return colors[health] || colors.healthy;
  };

  const getHealthBg = (health) => {
    const colors = {
      critical: "bg-danger/10 border-danger/30",
      warning: "bg-warning/10 border-warning/30",
      elevated: "bg-yellow-500/10 border-yellow-500/30",
      healthy: "bg-success/10 border-success/30"
    };
    return colors[health] || colors.healthy;
  };

  const TrendIndicator = ({ value, suffix = "%" }) => {
    if (value > 0) {
      return (
        <span className="flex items-center gap-1 text-danger">
          <ArrowUp className="w-3 h-3" />
          +{value}{suffix}
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center gap-1 text-success">
          <ArrowDown className="w-3 h-3" />
          {value}{suffix}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="w-3 h-3" />
        Stable
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Alerts & Red Flags"
        subtitle="National Risk Monitoring Center"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-danger border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading alerts dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const data = dashboardData;

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Alerts & Red Flags"
      subtitle="National Risk Monitoring Center"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="alerts-dashboard">
        {/* Critical Alert Banner */}
        {data?.priority_queue?.unacknowledged_critical > 0 && (
          <div className="flex items-center gap-4 p-4 bg-danger/10 border border-danger/30 rounded-lg animate-pulse">
            <AlertTriangle className="w-6 h-6 text-danger" />
            <div className="flex-1">
              <p className="font-semibold text-danger">
                {data.priority_queue.unacknowledged_critical} Unacknowledged Critical Alert(s)
              </p>
              <p className="text-sm text-muted-foreground">
                {data.priority_queue.critical_over_24h} critical alerts open more than 24 hours
              </p>
            </div>
          </div>
        )}

        {/* Filters Row */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={filters.time_period} onValueChange={(v) => setFilters({...filters, time_period: v})}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.severity || "all_severity"} onValueChange={(v) => setFilters({...filters, severity: v === "all_severity" ? "" : v})}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_severity">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.category || "all_category"} onValueChange={(v) => setFilters({...filters, category: v === "all_category" ? "" : v})}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_category">All Categories</SelectItem>
                  <SelectItem value="compliance_drop">Compliance Drop</SelectItem>
                  <SelectItem value="compulsory_training_missed">Training Overdue</SelectItem>
                  <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                  <SelectItem value="threshold_breach">Threshold Breach</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.region || "all_regions"} onValueChange={(v) => setFilters({...filters, region: v === "all_regions" ? "" : v})}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_regions">All Regions</SelectItem>
                  <SelectItem value="northeast">Northeast</SelectItem>
                  <SelectItem value="southeast">Southeast</SelectItem>
                  <SelectItem value="midwest">Midwest</SelectItem>
                  <SelectItem value="southwest">Southwest</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.status || "active_acknowledged"} onValueChange={(v) => setFilters({...filters, status: v === "active_acknowledged" ? "" : v})}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active_acknowledged">Active & Acknowledged</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged Only</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset
              </Button>
              
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics - Percentage Based */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Flagged Citizens</p>
                  <p className="text-3xl font-bold">{data?.summary?.alert_rate_percentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    {data?.summary?.unique_flagged_users?.toLocaleString()} of {data?.summary?.total_citizens?.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {data?.summary?.alert_rate_per_10k} per 10,000 members
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${data?.trends?.trend_direction === 'up' ? 'border-l-danger' : data?.trends?.trend_direction === 'down' ? 'border-l-success' : 'border-l-muted'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Alert Trend</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{data?.trends?.current_period}</p>
                    <TrendIndicator value={data?.trends?.trend_percentage} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    vs {data?.trends?.previous_period} prev period
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${data?.trends?.trend_direction === 'up' ? 'bg-danger/10' : data?.trends?.trend_direction === 'down' ? 'bg-success/10' : 'bg-muted'}`}>
                  {data?.trends?.trend_direction === 'up' ? (
                    <TrendingUp className="w-6 h-6 text-danger" />
                  ) : data?.trends?.trend_direction === 'down' ? (
                    <TrendingDown className="w-6 h-6 text-success" />
                  ) : (
                    <Activity className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${data?.trends?.resolution_velocity >= 0 ? 'border-l-success' : 'border-l-warning'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Resolution Velocity</p>
                  <p className="text-3xl font-bold">
                    {data?.trends?.resolution_velocity >= 0 ? '+' : ''}{data?.trends?.resolution_velocity}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data?.trends?.resolved_this_period} resolved, {data?.trends?.new_this_period} new
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${data?.trends?.resolution_velocity >= 0 ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <Zap className={`w-6 h-6 ${data?.trends?.resolution_velocity >= 0 ? 'text-success' : 'text-warning'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Resolution Time</p>
                  <p className="text-3xl font-bold">{data?.trends?.avg_resolution_hours || 0}h</p>
                  <p className="text-sm text-muted-foreground">
                    {data?.resolution_metrics?.resolution_rate}% resolution rate
                  </p>
                </div>
                <div className="p-3 bg-info/10 rounded-xl">
                  <Clock className="w-6 h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row - Severity & Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Severity Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Alerts by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-danger/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-danger" />
                    <span className="font-medium">Critical</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-danger">{data?.by_severity?.critical || 0}</span>
                    {data?.priority_queue?.critical_over_24h > 0 && (
                      <p className="text-xs text-danger">{data.priority_queue.critical_over_24h} over 24h</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="font-medium">High</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-warning">{data?.by_severity?.high || 0}</span>
                    {data?.priority_queue?.high_over_48h > 0 && (
                      <p className="text-xs text-warning">{data.priority_queue.high_over_48h} over 48h</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="font-medium">Medium</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{data?.by_severity?.medium || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-info" />
                    <span className="font-medium">Low</span>
                  </div>
                  <span className="text-xl font-bold text-info">{data?.by_severity?.low || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Alerts by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.by_category?.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{cat.category}</span>
                      <span className="text-sm font-medium">{cat.count} ({cat.percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all" 
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
                {(!data?.by_category || data.by_category.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                    <p>No alerts in this category</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Risk Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Risk Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Citizens in Watch Status</span>
                    <Badge variant="warning">{data?.risk_summary?.citizens_in_watch || 0}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data?.risk_summary?.watch_percentage}% of total population
                  </p>
                  <ProgressBar 
                    value={data?.risk_summary?.watch_percentage || 0} 
                    max={100} 
                    color="bg-warning"
                    showLabel={false}
                    className="mt-2"
                  />
                </div>
                
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Approaching Threshold</span>
                    <Badge className="bg-yellow-500">{data?.risk_summary?.approaching_threshold || 0}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Citizens with compliance score 40-60
                  </p>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Resolution Rate</span>
                    <span className="text-lg font-bold text-success">{data?.resolution_metrics?.resolution_rate || 0}%</span>
                  </div>
                  <ProgressBar 
                    value={data?.resolution_metrics?.resolution_rate || 0} 
                    max={100} 
                    color="bg-success"
                    showLabel={false}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Regional Heat Map */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Regional Alert Heat Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {data?.regional_heat_map?.map((region) => (
                <div 
                  key={region.region_id} 
                  className={`p-4 rounded-lg border ${getHealthBg(region.health_status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{region.region}</span>
                    <Badge className={getSeverityColor(region.health_status === 'critical' ? 'critical' : region.health_status === 'warning' ? 'high' : region.health_status === 'elevated' ? 'medium' : 'low')}>
                      {region.health_status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Alert Rate</span>
                      <span className={`text-lg font-bold ${getHealthColor(region.health_status)}`}>
                        {region.alert_rate_per_10k}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">per 10,000 citizens</p>
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Active Alerts</span>
                        <span className="font-medium">{region.active_alerts}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Citizens</span>
                        <span className="font-medium">{region.total_citizens?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Queue & Alert List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority Queue */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-danger flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Priority Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.priority_queue?.critical_over_24h > 0 && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-danger">Critical &gt; 24h</span>
                    <Badge variant="destructive">{data.priority_queue.critical_over_24h}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
                </div>
              )}
              
              {data?.priority_queue?.high_over_48h > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-warning">High Priority &gt; 48h</span>
                    <Badge className="bg-warning">{data.priority_queue.high_over_48h}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
                </div>
              )}
              
              {data?.priority_queue?.unacknowledged_critical > 0 && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-500">Unacknowledged Critical</span>
                    <Badge className="bg-purple-500">{data.priority_queue.unacknowledged_critical}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Not yet reviewed</p>
                </div>
              )}
              
              {data?.priority_queue?.critical_over_24h === 0 && 
               data?.priority_queue?.high_over_48h === 0 && 
               data?.priority_queue?.unacknowledged_critical === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p className="text-sm">No urgent items in queue</p>
                </div>
              )}

              {/* Oldest Unresolved */}
              {data?.priority_queue?.items?.oldest_unresolved?.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Oldest Unresolved</p>
                  {data.priority_queue.items.oldest_unresolved.slice(0, 3).map((alert) => (
                    <div key={alert.alert_id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(alert.age_hours)}h old</p>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)} size="sm">
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alert List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Active Alerts ({data?.summary?.total_active || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.alerts || data.alerts.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success opacity-50" />
                  <p>No alerts match your filters</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {data.alerts.slice(0, 20).map((alert) => (
                    <div 
                      key={alert.alert_id} 
                      className={`p-4 rounded-lg border ${
                        alert.severity === 'critical' ? 'border-danger/50 bg-danger/5' :
                        alert.severity === 'high' ? 'border-warning/50 bg-warning/5' :
                        'border-muted bg-muted/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold truncate">{alert.title}</h4>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            {alert.age_hours && (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(alert.age_hours)}h ago
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{alert.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>User: {alert.user_id}</span>
                            <span>•</span>
                            <span className="capitalize">{alert.trigger_reason?.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {alert.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAcknowledge(alert.alert_id)}
                            >
                              Ack
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setAlertDialog(alert)}
                          >
                            Action
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
                {alertDialog.age_hours && (
                  <p className="text-sm"><strong>Age:</strong> {Math.round(alertDialog.age_hours)} hours</p>
                )}
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
              Suspend
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
    </DashboardLayout>
  );
};

export default AlertsDashboard;
