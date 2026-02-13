import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, TrendingDown, AlertTriangle, Users, Activity,
  Brain, Zap, Target, Shield, RefreshCw, Play, Settings,
  ChevronRight, ArrowUp, ArrowDown, Minus, Clock, CheckCircle,
  AlertCircle, BarChart3, PieChart, Home, Bell, XCircle,
  Plus, Edit, Trash2, Eye
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { StatCard, DonutChart, BarChart, ProgressBar } from "../components/Charts";

const PredictiveAnalytics = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardData, setDashboardData] = useState(null);
  const [thresholds, setThresholds] = useState([]);
  const [preventiveWarnings, setPreventiveWarnings] = useState([]);
  const [processing, setProcessing] = useState(false);
  
  // Threshold dialog
  const [thresholdDialog, setThresholdDialog] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState(null);
  const [newThreshold, setNewThreshold] = useState({
    name: "",
    metric: "compliance_score",
    operator: "lt",
    value: 50,
    warning_value: 60,
    severity: "medium",
    auto_action: "send_preventive_warning",
    notification_message: "",
    is_active: true
  });

  const navItems = [
    { id: 'home', path: '/government', label: 'Back to Dashboard', icon: Home },
    { id: 'predictive', path: '/government/predictive', label: 'Predictive Analytics', icon: Brain },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts Center', icon: AlertTriangle },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, thresholdsRes, warningsRes] = await Promise.all([
        api.get("/government/predictive/dashboard").catch(() => ({ data: null })),
        api.get("/government/thresholds").catch(() => ({ data: { thresholds: [] } })),
        api.get("/government/preventive-warnings").catch(() => ({ data: { warnings: [] } }))
      ]);
      
      setDashboardData(dashboardRes.data);
      setThresholds(thresholdsRes.data?.thresholds || []);
      setPreventiveWarnings(warningsRes.data?.warnings || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 403) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [api, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const runPredictiveAnalysis = async () => {
    setProcessing(true);
    try {
      const response = await api.post("/government/predictive/run-analysis");
      toast.success(`Analysis complete: ${response.data.warnings_generated} warnings, ${response.data.alerts_generated} alerts generated`);
      fetchData();
    } catch (error) {
      toast.error("Failed to run predictive analysis");
    } finally {
      setProcessing(false);
    }
  };

  const runThresholdCheck = async () => {
    setProcessing(true);
    try {
      const response = await api.post("/government/thresholds/run-check");
      toast.success(`Check complete: ${response.data.warnings_sent} warnings sent, ${response.data.alerts_created} alerts created`);
      fetchData();
    } catch (error) {
      toast.error("Failed to run threshold check");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateThreshold = async () => {
    setProcessing(true);
    try {
      if (editingThreshold) {
        await api.put(`/government/thresholds/${editingThreshold.threshold_id}`, newThreshold);
        toast.success("Threshold updated");
      } else {
        await api.post("/government/thresholds", newThreshold);
        toast.success("Threshold created");
      }
      setThresholdDialog(false);
      setEditingThreshold(null);
      resetThresholdForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to save threshold");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteThreshold = async (thresholdId) => {
    if (!confirm("Are you sure you want to delete this threshold?")) return;
    
    try {
      await api.delete(`/government/thresholds/${thresholdId}`);
      toast.success("Threshold deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete threshold");
    }
  };

  const openEditThreshold = (threshold) => {
    setEditingThreshold(threshold);
    setNewThreshold({
      name: threshold.name,
      metric: threshold.metric,
      operator: threshold.operator,
      value: threshold.value,
      warning_value: threshold.warning_value || null,
      severity: threshold.severity,
      auto_action: threshold.auto_action || "send_preventive_warning",
      notification_message: threshold.notification_message || "",
      is_active: threshold.is_active
    });
    setThresholdDialog(true);
  };

  const resetThresholdForm = () => {
    setNewThreshold({
      name: "",
      metric: "compliance_score",
      operator: "lt",
      value: 50,
      warning_value: 60,
      severity: "medium",
      auto_action: "send_preventive_warning",
      notification_message: "",
      is_active: true
    });
  };

  const getTrajectoryColor = (trajectory) => {
    const colors = {
      improving: "text-success",
      stable: "text-info",
      declining: "text-warning",
      critical_decline: "text-danger"
    };
    return colors[trajectory] || colors.stable;
  };

  const getTrajectoryBg = (trajectory) => {
    const colors = {
      improving: "bg-success/10",
      stable: "bg-info/10",
      declining: "bg-warning/10",
      critical_decline: "bg-danger/10"
    };
    return colors[trajectory] || colors.stable;
  };

  const getTrajectoryIcon = (trajectory) => {
    if (trajectory === "improving") return <TrendingUp className="w-4 h-4 text-success" />;
    if (trajectory === "stable") return <Minus className="w-4 h-4 text-info" />;
    if (trajectory === "declining") return <TrendingDown className="w-4 h-4 text-warning" />;
    return <TrendingDown className="w-4 h-4 text-danger" />;
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Predictive Analytics"
        subtitle="AI-Powered Risk Forecasting"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading predictive analytics...</p>
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
      title="Predictive Analytics"
      subtitle="AI-Powered Risk Forecasting"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="predictive-analytics">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Risk Prediction & Automated Alerts</h2>
            <p className="text-sm text-muted-foreground">Proactively identify and prevent compliance issues</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={runThresholdCheck}
              disabled={processing}
            >
              <Zap className="w-4 h-4 mr-2" />
              Run Threshold Check
            </Button>
            <Button 
              onClick={runPredictiveAnalysis}
              disabled={processing}
              data-testid="run-analysis-btn"
            >
              <Brain className="w-4 h-4 mr-2" />
              Run Predictive Analysis
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Citizens Analyzed"
                value={data?.summary?.total_analyzed || 0}
                subtitle="in prediction model"
                icon={Users}
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <StatCard
                title="High Risk"
                value={data?.summary?.high_risk_count || 0}
                subtitle="need attention"
                icon={AlertTriangle}
                iconBg="bg-danger/10"
                iconColor="text-danger"
              />
              <StatCard
                title="Declining"
                value={data?.summary?.declining_count || 0}
                subtitle="risk trajectory"
                icon={TrendingDown}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Needs Intervention"
                value={data?.summary?.needs_intervention || 0}
                subtitle="immediate action"
                icon={Zap}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-500"
              />
            </div>

            {/* Trajectory & Risk Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Trajectory Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Risk Trajectory Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-success" />
                        <span className="font-medium">Improving</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-success">{data?.trajectory_distribution?.improving || 0}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({data?.summary?.total_analyzed > 0 ? Math.round((data?.trajectory_distribution?.improving || 0) / data.summary.total_analyzed * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Minus className="w-5 h-5 text-info" />
                        <span className="font-medium">Stable</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-info">{data?.trajectory_distribution?.stable || 0}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({data?.summary?.total_analyzed > 0 ? Math.round((data?.trajectory_distribution?.stable || 0) / data.summary.total_analyzed * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-warning" />
                        <span className="font-medium">Declining</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-warning">{data?.trajectory_distribution?.declining || 0}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({data?.summary?.total_analyzed > 0 ? Math.round((data?.trajectory_distribution?.declining || 0) / data.summary.total_analyzed * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-danger/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-danger" />
                        <span className="font-medium">Critical Decline</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-danger">{data?.trajectory_distribution?.critical_decline || 0}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({data?.summary?.total_analyzed > 0 ? Math.round((data?.trajectory_distribution?.critical_decline || 0) / data.summary.total_analyzed * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Level Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Predicted Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-6">
                    <DonutChart 
                      value={data?.risk_distribution?.critical || 0}
                      total={data?.summary?.total_analyzed || 1}
                      size={150}
                      strokeWidth={20}
                      color="hsl(0, 84%, 60%)"
                      label="Critical"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-danger/10 rounded-lg">
                      <p className="text-2xl font-bold text-danger">{data?.risk_distribution?.critical || 0}</p>
                      <p className="text-xs text-muted-foreground">Critical (70+)</p>
                    </div>
                    <div className="text-center p-2 bg-warning/10 rounded-lg">
                      <p className="text-2xl font-bold text-warning">{data?.risk_distribution?.high || 0}</p>
                      <p className="text-xs text-muted-foreground">High (50-69)</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{data?.risk_distribution?.medium || 0}</p>
                      <p className="text-xs text-muted-foreground">Medium (30-49)</p>
                    </div>
                    <div className="text-center p-2 bg-success/10 rounded-lg">
                      <p className="text-2xl font-bold text-success">{data?.risk_distribution?.low || 0}</p>
                      <p className="text-xs text-muted-foreground">Low (0-29)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Common Risk Factors */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Most Common Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data?.common_risk_factors?.slice(0, 6).map((factor, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{factor.factor}</span>
                        <Badge variant="outline">{factor.count}</Badge>
                      </div>
                      <ProgressBar value={factor.percentage} max={100} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">{factor.percentage}% of citizens</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* High Risk Citizens & Approaching Threshold */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* High Risk Citizens */}
              <Card className="border-danger/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-danger flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    High Risk Citizens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!data?.high_risk_citizens || data.high_risk_citizens.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                      <p>No high risk citizens detected</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {data.high_risk_citizens.slice(0, 10).map((citizen, idx) => (
                        <div key={idx} className="p-3 bg-danger/5 border border-danger/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{citizen.name}</span>
                            <Badge variant="destructive">{Math.round(citizen.risk_score)}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getTrajectoryIcon(citizen.trajectory)}
                            <span className="capitalize">{citizen.trajectory.replace("_", " ")}</span>
                          </div>
                          {citizen.top_factors?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {citizen.top_factors.map((f, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {f.factor?.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approaching Threshold */}
              <Card className="border-warning/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-warning flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Approaching Critical Threshold
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!data?.approaching_threshold || data.approaching_threshold.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                      <p>No citizens approaching threshold</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {data.approaching_threshold.slice(0, 10).map((citizen, idx) => (
                        <div key={idx} className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{citizen.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{Math.round(citizen.current_score)}</span>
                              <ArrowDown className="w-4 h-4 text-warning" />
                              <span className="text-sm font-bold text-warning">{Math.round(citizen.predicted_score)}</span>
                            </div>
                          </div>
                          {citizen.days_to_critical && (
                            <p className="text-xs text-warning">
                              ~{citizen.days_to_critical} days to critical threshold
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Regional Risk Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Regional Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {data?.regional_analysis && Object.entries(data.regional_analysis).map(([region, stats]) => (
                    <div key={region} className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold capitalize mb-3">{region}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Risk</span>
                          <span className={`font-bold ${stats.avg_score >= 50 ? 'text-danger' : stats.avg_score >= 30 ? 'text-warning' : 'text-success'}`}>
                            {stats.avg_score}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">High Risk</span>
                          <span className="font-medium">{stats.high_risk}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Declining</span>
                          <span className="font-medium">{stats.declining}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* THRESHOLDS TAB */}
          <TabsContent value="thresholds" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Automated Alert Thresholds</h3>
                <p className="text-sm text-muted-foreground">Configure automatic warnings and alerts</p>
              </div>
              <Button onClick={() => { resetThresholdForm(); setEditingThreshold(null); setThresholdDialog(true); }} data-testid="create-threshold-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Threshold
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {thresholds.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No thresholds configured</p>
                    <p className="text-sm">Create thresholds to automatically monitor citizens</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {thresholds.map((threshold) => (
                      <div 
                        key={threshold.threshold_id} 
                        className={`p-4 rounded-lg border ${threshold.is_active ? 'bg-muted/20' : 'bg-muted/5 opacity-60'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{threshold.name}</h4>
                              <Badge variant={threshold.is_active ? "default" : "secondary"}>
                                {threshold.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <Badge className={
                                threshold.severity === "critical" ? "bg-danger" :
                                threshold.severity === "high" ? "bg-warning" :
                                threshold.severity === "medium" ? "bg-yellow-500" : "bg-info"
                              }>
                                {threshold.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              When <strong>{threshold.metric.replace(/_/g, " ")}</strong> is{" "}
                              <strong>{threshold.operator === "lt" ? "less than" : threshold.operator === "gt" ? "greater than" : threshold.operator}</strong>{" "}
                              <strong>{threshold.value}</strong>
                              {threshold.warning_value && (
                                <span> (warn at {threshold.warning_value})</span>
                              )}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Action: {threshold.auto_action?.replace(/_/g, " ")}</span>
                              {threshold.region && <span>Region: {threshold.region}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditThreshold(threshold)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteThreshold(threshold.threshold_id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WARNINGS TAB */}
          <TabsContent value="warnings" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Preventive Warnings Sent</h3>
                <p className="text-sm text-muted-foreground">Warnings sent to citizens approaching thresholds</p>
              </div>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Pending"
                value={preventiveWarnings.filter(w => w.status === "pending").length}
                subtitle="awaiting action"
                icon={Clock}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />
              <StatCard
                title="Acknowledged"
                value={preventiveWarnings.filter(w => w.status === "acknowledged").length}
                subtitle="citizen aware"
                icon={CheckCircle}
                iconBg="bg-info/10"
                iconColor="text-info"
              />
              <StatCard
                title="Action Taken"
                value={preventiveWarnings.filter(w => w.status === "action_taken").length}
                subtitle="resolved"
                icon={Shield}
                iconBg="bg-success/10"
                iconColor="text-success"
              />
            </div>

            <Card>
              <CardContent className="pt-6">
                {preventiveWarnings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No preventive warnings sent yet</p>
                    <p className="text-sm">Run threshold check to generate warnings</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {preventiveWarnings.map((warning) => (
                      <div 
                        key={warning.warning_id} 
                        className={`p-4 rounded-lg border ${
                          warning.status === "pending" ? "bg-warning/5 border-warning/20" :
                          warning.status === "acknowledged" ? "bg-info/5 border-info/20" :
                          "bg-success/5 border-success/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{warning.user_id}</span>
                              <Badge variant={
                                warning.status === "pending" ? "warning" :
                                warning.status === "acknowledged" ? "default" : "success"
                              }>
                                {warning.status}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">{warning.message}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Type: {warning.warning_type?.replace(/_/g, " ")}</span>
                              <span>Current: {warning.current_value} → Threshold: {warning.threshold_value}</span>
                              {warning.days_to_threshold && (
                                <span className="text-warning">~{warning.days_to_threshold} days to breach</span>
                              )}
                            </div>
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

      {/* Threshold Dialog */}
      <Dialog open={thresholdDialog} onOpenChange={setThresholdDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {editingThreshold ? "Edit Threshold" : "Create Alert Threshold"}
            </DialogTitle>
            <DialogDescription>
              Configure automatic monitoring and preventive warnings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Threshold Name</label>
              <Input
                placeholder="e.g., Low Compliance Warning"
                value={newThreshold.name}
                onChange={(e) => setNewThreshold({...newThreshold, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Metric</label>
                <Select 
                  value={newThreshold.metric} 
                  onValueChange={(v) => setNewThreshold({...newThreshold, metric: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliance_score">Compliance Score</SelectItem>
                    <SelectItem value="ari_score">ARI Score</SelectItem>
                    <SelectItem value="training_hours">Training Hours</SelectItem>
                    <SelectItem value="violations">Violations</SelectItem>
                    <SelectItem value="purchase_count_30d">Purchases (30 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Operator</label>
                <Select 
                  value={newThreshold.operator} 
                  onValueChange={(v) => setNewThreshold({...newThreshold, operator: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt">Less than</SelectItem>
                    <SelectItem value="lte">Less than or equal</SelectItem>
                    <SelectItem value="gt">Greater than</SelectItem>
                    <SelectItem value="gte">Greater than or equal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Critical Threshold</label>
                <Input
                  type="number"
                  value={newThreshold.value}
                  onChange={(e) => setNewThreshold({...newThreshold, value: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Warning Threshold (Pre-alert)</label>
                <Input
                  type="number"
                  placeholder="e.g., 60"
                  value={newThreshold.warning_value || ""}
                  onChange={(e) => setNewThreshold({...newThreshold, warning_value: e.target.value ? parseFloat(e.target.value) : null})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <Select 
                  value={newThreshold.severity} 
                  onValueChange={(v) => setNewThreshold({...newThreshold, severity: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Auto Action</label>
                <Select 
                  value={newThreshold.auto_action} 
                  onValueChange={(v) => setNewThreshold({...newThreshold, auto_action: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_preventive_warning">Send Preventive Warning</SelectItem>
                    <SelectItem value="warn">Send Critical Alert</SelectItem>
                    <SelectItem value="flag_review">Flag for Review</SelectItem>
                    <SelectItem value="block_license">Block License (Critical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Notification Message (Optional)</label>
              <Textarea
                placeholder="Custom message to send to citizen..."
                value={newThreshold.notification_message}
                onChange={(e) => setNewThreshold({...newThreshold, notification_message: e.target.value})}
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <input
                type="checkbox"
                id="is_active"
                checked={newThreshold.is_active}
                onChange={(e) => setNewThreshold({...newThreshold, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Threshold is active
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateThreshold}
              disabled={processing || !newThreshold.name}
              data-testid="submit-threshold-btn"
            >
              {editingThreshold ? "Update" : "Create"} Threshold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PredictiveAnalytics;
