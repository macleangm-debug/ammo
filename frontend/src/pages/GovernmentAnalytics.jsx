import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Activity, Users, Building, AlertTriangle, 
  TrendingUp, TrendingDown, Shield, Filter, Search,
  BarChart3, PieChart as PieChartIcon, Map, Settings, Download,
  Bell, Calendar, FileText, ChevronRight, Zap, Target, 
  RefreshCw, MapPin, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus, Globe, Flag, Handshake
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
  RadialBar,
  ComposedChart,
  Legend
} from 'recharts';

const GovernmentAnalytics = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [period, setPeriod] = useState("30d");
  const [selectedRegion, setSelectedRegion] = useState(null);
  
  // Data states
  const [trendsData, setTrendsData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [anomaliesData, setAnomaliesData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [regionalDrilldown, setRegionalDrilldown] = useState(null);
  const [scheduledReports, setScheduledReports] = useState([]);
  
  // Dialog states
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showRegionDialog, setShowRegionDialog] = useState(false);
  const [exportType, setExportType] = useState("summary");
  const [exportFormat, setExportFormat] = useState("csv");
  
  // New report form
  const [newReport, setNewReport] = useState({
    name: "",
    report_type: "summary",
    schedule: "weekly",
    recipients: ""
  });

  // Color palette
  const COLORS = {
    primary: '#3b5bdb',
    success: '#40c057',
    warning: '#fab005',
    danger: '#fa5252',
    purple: '#be4bdb',
    cyan: '#15aabf',
    gray: '#868e96'
  };

  const navItems = [
    { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'owners', path: '/government/owners', label: 'Owners', icon: Users },
    { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
    { id: 'templates', path: '/government/templates', label: 'Templates', icon: FileText },
    { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
    { id: 'analytics', path: '/government/analytics', label: 'Analytics', icon: Activity },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
    { id: 'flagging', path: '/government/flagging', label: 'Flagging', icon: Flag },
    { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
    { id: 'partners', path: '/government/partners', label: 'Partners', icon: Handshake },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  const fetchAllData = useCallback(async () => {
    try {
      const [trendsRes, heatmapRes, anomaliesRes, performanceRes, reportsRes] = await Promise.all([
        api.get(`/government/analytics/trends?period=${period}`).catch(() => ({ data: {} })),
        api.get("/government/analytics/heatmap").catch(() => ({ data: { heatmap_data: [] } })),
        api.get("/government/analytics/anomalies").catch(() => ({ data: { anomalies: [] } })),
        api.get("/government/analytics/performance").catch(() => ({ data: {} })),
        api.get("/government/analytics/reports").catch(() => ({ data: { reports: [] } }))
      ]);

      setTrendsData(trendsRes.data);
      setHeatmapData(heatmapRes.data);
      setAnomaliesData(anomaliesRes.data);
      setPerformanceData(performanceRes.data);
      setScheduledReports(reportsRes.data.reports || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, period]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleRegionClick = async (region) => {
    setSelectedRegion(region);
    try {
      const res = await api.get(`/government/analytics/regional-drilldown/${region}`);
      setRegionalDrilldown(res.data);
      setShowRegionDialog(true);
    } catch (error) {
      toast.error("Failed to load regional data");
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/government/analytics/export?format=${exportFormat}&data_type=${exportType}&period=${period}`);
      
      if (exportFormat === "csv") {
        // Download CSV
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${exportType}_${period}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Export downloaded successfully");
      } else {
        toast.success(`Exported ${res.data.record_count} records`);
      }
      setShowExportDialog(false);
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const handleCreateReport = async () => {
    try {
      const recipients = newReport.recipients.split(',').map(e => e.trim()).filter(e => e);
      await api.post("/government/analytics/reports", {
        ...newReport,
        recipients
      });
      toast.success("Report scheduled successfully");
      setShowReportDialog(false);
      setNewReport({ name: "", report_type: "summary", schedule: "weekly", recipients: "" });
      fetchAllData();
    } catch (error) {
      toast.error("Failed to create report");
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      await api.delete(`/government/analytics/reports/${reportId}`);
      toast.success("Report deleted");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete report");
    }
  };

  const handleRunReport = async (reportId) => {
    try {
      await api.post(`/government/analytics/reports/${reportId}/run`);
      toast.success("Report generated successfully");
    } catch (error) {
      toast.error("Failed to generate report");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Helper function to get trend indicator
  const getTrendIndicator = (change) => {
    if (change > 0) return { icon: ArrowUpRight, color: "text-green-500", bg: "bg-green-100" };
    if (change < 0) return { icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-100" };
    return { icon: Minus, color: "text-gray-500", bg: "bg-gray-100" };
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  // Get status color for heatmap
  const getStatusColor = (status) => {
    switch (status) {
      case "good": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "critical": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

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
          <Activity className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  const currentData = trendsData?.current || {};
  const previousData = trendsData?.previous || {};
  const changes = previousData?.changes || {};

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="National Oversight"
      subtitle="Government Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="government-analytics">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-gray-500">Comprehensive insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px]" data-testid="period-select">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              data-testid="export-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Trend Cards with Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              title: "New Licenses", 
              value: currentData.licenses || 0, 
              change: changes.licenses || 0,
              icon: Users,
              color: COLORS.primary
            },
            { 
              title: "Transactions", 
              value: currentData.transactions || 0, 
              change: changes.transactions || 0,
              icon: Activity,
              color: COLORS.success
            },
            { 
              title: "Violations", 
              value: currentData.violations || 0, 
              change: changes.violations || 0,
              icon: AlertTriangle,
              color: COLORS.danger,
              invertColor: true
            },
            { 
              title: "Revenue", 
              value: currentData.revenue || 0, 
              change: changes.revenue || 0,
              icon: TrendingUp,
              color: COLORS.purple,
              isCurrency: true
            }
          ].map((item, idx) => {
            const trend = getTrendIndicator(item.invertColor ? -item.change : item.change);
            const TrendIcon = trend.icon;
            const ItemIcon = item.icon;
            
            return (
              <Card key={idx} className="hover:shadow-md transition-shadow" data-testid={`trend-card-${idx}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${item.color}20` }}>
                      <ItemIcon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    {item.change !== 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trend.bg} ${trend.color}`}>
                        <TrendIcon className="w-3 h-3" />
                        {Math.abs(item.change)}%
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">{item.title}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {item.isCurrency ? formatCurrency(item.value) : formatNumber(item.value)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      vs. {item.isCurrency ? formatCurrency(previousData[item.title.toLowerCase().replace(' ', '_')] || 0) : formatNumber(previousData[item.title.toLowerCase().replace(' ', '_')] || 0)} previous
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Daily Trend Chart */}
        <Card data-testid="daily-trend-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Daily Activity Trends
            </CardTitle>
            <CardDescription>Licenses and transactions over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trendsData?.daily_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="licenses" name="Licenses" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="transactions" name="Transactions" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Regional Heatmap and Anomalies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Heatmap */}
          <Card data-testid="regional-heatmap">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Regional Compliance Heatmap
              </CardTitle>
              <CardDescription>Click a region for detailed breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(heatmapData?.heatmap_data || []).map((region, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRegionClick(region.region)}
                    data-testid={`region-${region.region.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(region.status)}`} />
                      <div>
                        <p className="font-medium text-gray-900">{region.region}</p>
                        <p className="text-xs text-gray-500">{region.population} citizens</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold" style={{ color: region.status === 'good' ? COLORS.success : (region.status === 'warning' ? COLORS.warning : COLORS.danger) }}>
                          {region.compliance_rate}%
                        </p>
                        <p className="text-xs text-gray-500">compliance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{region.violation_count}</p>
                        <p className="text-xs text-gray-500">violations</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500">≥90%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-xs text-gray-500">75-89%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-500">&lt;75%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anomaly Detection */}
          <Card data-testid="anomaly-detection">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Anomaly Detection
                {anomaliesData?.total_detected > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {anomaliesData.total_detected} detected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Automatically flagged unusual patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {anomaliesData?.anomalies?.length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {anomaliesData.anomalies.map((anomaly, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg border-l-4 bg-gray-50"
                      style={{ borderLeftColor: anomaly.severity === 'critical' ? COLORS.danger : (anomaly.severity === 'high' ? '#f59e0b' : COLORS.warning) }}
                      data-testid={`anomaly-${idx}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(anomaly.severity)}>
                              {anomaly.severity}
                            </Badge>
                            <span className="text-sm font-medium text-gray-900">{anomaly.title}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Current: {anomaly.current_value}</span>
                        <span>Expected: {anomaly.expected_value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                  <p className="text-gray-600 font-medium">No anomalies detected</p>
                  <p className="text-sm text-gray-400">All metrics are within normal ranges</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card data-testid="performance-metrics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance Metrics & SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* License Processing */}
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">License Processing</span>
                  <Badge variant={performanceData?.processing_metrics?.license_applications?.sla_compliance_rate >= 90 ? "default" : "destructive"}>
                    {performanceData?.processing_metrics?.license_applications?.sla_compliance_rate || 0}% SLA
                  </Badge>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {performanceData?.processing_metrics?.license_applications?.avg_processing_hours || 0}
                  </span>
                  <span className="text-sm text-gray-500 mb-1">avg hours</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Target: {performanceData?.processing_metrics?.license_applications?.sla_target_hours || 72} hours
                </p>
              </div>

              {/* Alert Resolution */}
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Alert Resolution</span>
                  <Badge variant={performanceData?.processing_metrics?.alert_resolution?.sla_compliance_rate >= 90 ? "default" : "destructive"}>
                    {performanceData?.processing_metrics?.alert_resolution?.sla_compliance_rate || 0}% SLA
                  </Badge>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {performanceData?.processing_metrics?.alert_resolution?.avg_resolution_hours || 0}
                  </span>
                  <span className="text-sm text-gray-500 mb-1">avg hours</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Target: {performanceData?.processing_metrics?.alert_resolution?.sla_target_hours || 24} hours
                </p>
              </div>

              {/* System Health */}
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">System Health</span>
                  <Badge variant="default">
                    {performanceData?.system_health?.uptime_percentage || 99.9}% uptime
                  </Badge>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {performanceData?.system_health?.active_sessions || 0}
                  </span>
                  <span className="text-sm text-gray-500 mb-1">active sessions</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {performanceData?.system_health?.total_users || 0} total users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Reports */}
        <Card data-testid="scheduled-reports">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduled Reports
              </CardTitle>
              <CardDescription>Automated report generation</CardDescription>
            </div>
            <Button onClick={() => setShowReportDialog(true)} data-testid="create-report-btn">
              <FileText className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </CardHeader>
          <CardContent>
            {scheduledReports.length > 0 ? (
              <div className="space-y-3">
                {scheduledReports.map((report, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                    data-testid={`report-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{report.name}</p>
                        <p className="text-xs text-gray-500">
                          {report.schedule} • {report.report_type} • {report.format?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.is_active ? "default" : "secondary"}>
                        {report.is_active ? "Active" : "Paused"}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRunReport(report.report_id)}
                      >
                        Run Now
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteReport(report.report_id)}
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-600">No scheduled reports</p>
                <p className="text-sm text-gray-400">Create a report to automate data delivery</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Analytics Data</DialogTitle>
              <DialogDescription>Choose the data type and format to export</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data Type</label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger data-testid="export-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Statistics</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                    <SelectItem value="compliance">Compliance Data</SelectItem>
                    <SelectItem value="violations">Violations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger data-testid="export-format-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
              <Button onClick={handleExport} data-testid="confirm-export-btn">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Report</DialogTitle>
              <DialogDescription>Set up automated report generation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Report Name</label>
                <Input 
                  value={newReport.name}
                  onChange={(e) => setNewReport({...newReport, name: e.target.value})}
                  placeholder="Weekly Compliance Summary"
                  data-testid="report-name-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Report Type</label>
                <Select value={newReport.report_type} onValueChange={(v) => setNewReport({...newReport, report_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                    <SelectItem value="violations">Violations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Schedule</label>
                <Select value={newReport.schedule} onValueChange={(v) => setNewReport({...newReport, schedule: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Recipients (comma-separated emails)</label>
                <Input 
                  value={newReport.recipients}
                  onChange={(e) => setNewReport({...newReport, recipients: e.target.value})}
                  placeholder="admin@example.com, manager@example.com"
                  data-testid="report-recipients-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateReport} disabled={!newReport.name} data-testid="create-report-confirm-btn">
                Create Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Regional Drilldown Dialog */}
        <Dialog open={showRegionDialog} onOpenChange={setShowRegionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedRegion} Region Details</DialogTitle>
              <DialogDescription>Detailed breakdown of regional metrics</DialogDescription>
            </DialogHeader>
            {regionalDrilldown && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <p className="text-2xl font-bold text-blue-600">{regionalDrilldown.summary?.total_citizens || 0}</p>
                    <p className="text-xs text-blue-600">Total Citizens</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <p className="text-2xl font-bold text-green-600">{regionalDrilldown.summary?.compliance_rate || 0}%</p>
                    <p className="text-xs text-green-600">Compliance Rate</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(regionalDrilldown.revenue?.total || 0)}</p>
                    <p className="text-xs text-purple-600">Total Revenue</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 text-center">
                    <p className="text-2xl font-bold text-red-600">{regionalDrilldown.violations?.total || 0}</p>
                    <p className="text-xs text-red-600">Violations</p>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">License Status Breakdown</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{regionalDrilldown.summary?.compliant || 0}</p>
                      <p className="text-xs text-gray-500">Compliant</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-yellow-600">{regionalDrilldown.summary?.warning || 0}</p>
                      <p className="text-xs text-gray-500">Warning</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{regionalDrilldown.summary?.suspended || 0}</p>
                      <p className="text-xs text-gray-500">Suspended</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-600">{regionalDrilldown.summary?.expired || 0}</p>
                      <p className="text-xs text-gray-500">Expired</p>
                    </div>
                  </div>
                </div>

                {/* Top Issues */}
                {regionalDrilldown.violations?.top_issues?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Top Issues</h4>
                    <div className="space-y-2">
                      {regionalDrilldown.violations.top_issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-gray-50">
                          <span className="text-sm text-gray-700">{issue.type}</span>
                          <Badge variant="outline">{issue.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRegionDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GovernmentAnalytics;
