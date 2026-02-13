import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Activity, Users, Building, AlertTriangle, 
  CheckCircle, XCircle, Clock, LogOut, TrendingUp,
  Eye, AlertCircle, RefreshCw, Search, Filter,
  ChevronDown, BarChart3, Map, Calendar, Radio,
  Cpu, Wifi, Zap, Target, Globe
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import ThemeToggle from "../components/ThemeToggle";
import RiskHeatmaps from "../components/RiskHeatmaps";

const GovernmentDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", risk_level: "" });
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 30000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, [filters]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.risk_level) params.append("risk_level", filters.risk_level);
      
      const [statsRes, txnRes, alertsRes, logsRes] = await Promise.all([
        api.get("/admin/dashboard-stats"),
        api.get(`/admin/transactions?${params.toString()}`),
        api.get("/admin/alerts"),
        api.get("/admin/audit-logs?limit=50")
      ]);
      
      setStats(statsRes.data);
      setTransactions(txnRes.data || []);
      setAlerts(alertsRes.data || []);
      setAuditLogs(logsRes.data || []);
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
      navigate("/", { replace: true });
    } catch (error) {
      navigate("/", { replace: true });
    }
  };

  const handleReview = async (decision) => {
    if (!reviewDialog) return;
    setProcessing(true);
    
    try {
      await api.post(`/admin/review-transaction/${reviewDialog.transaction_id}`, {
        decision,
        notes: reviewNotes
      });
      
      toast.success(`Transaction ${decision}`);
      setReviewDialog(null);
      setReviewNotes("");
      fetchData();
    } catch (error) {
      toast.error("Failed to process review");
    } finally {
      setProcessing(false);
    }
  };

  const getRiskBadge = (level) => {
    const styles = {
      green: "bg-tactical-success/10 text-tactical-success border-tactical-success/30",
      amber: "bg-tactical-warning/10 text-tactical-warning border-tactical-warning/30",
      red: "bg-tactical-danger/10 text-tactical-danger border-tactical-danger/30 animate-pulse"
    };
    return styles[level] || styles.green;
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-tactical-success/10 text-tactical-success border-tactical-success/30",
      rejected: "bg-tactical-danger/10 text-tactical-danger border-tactical-danger/30",
      pending: "bg-tactical-warning/10 text-tactical-warning border-tactical-warning/30",
      review_required: "bg-tactical-primary/10 text-tactical-primary border-tactical-primary/30"
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="loading-radar mx-auto mb-4" />
          <p className="text-muted-foreground font-mono text-sm">LOADING COMMAND CENTER...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="government-dashboard">
      {/* Command Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-heavy">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Shield className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
              </div>
              <div>
                <span className="font-heading font-bold text-lg">AMMO</span>
                <span className="font-mono text-xxs text-muted-foreground ml-2 hidden sm:inline">GOV COMMAND</span>
              </div>
            </div>
            
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-tactical-success/10 rounded-sm border border-tactical-success/30">
              <div className="w-2 h-2 rounded-full bg-tactical-success animate-pulse shadow-glow-green" />
              <span className="font-mono text-xs text-tactical-success">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* System Time */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-card rounded-sm border border-border">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="font-mono text-xs">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground font-mono text-xs"
              onClick={fetchData}
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">REFRESH</span>
            </Button>
            
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            
            <div className="h-6 w-px bg-border hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* System Status Bar */}
        <div className="px-4 lg:px-6 py-2 border-t border-border bg-card/30 flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Cpu className="w-3 h-3 text-tactical-success" />
            <span className="font-mono text-xxs text-muted-foreground">SYSTEM: OPERATIONAL</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Wifi className="w-3 h-3 text-tactical-success" />
            <span className="font-mono text-xxs text-muted-foreground">NETWORK: SECURE</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Radio className="w-3 h-3 text-primary animate-pulse" />
            <span className="font-mono text-xxs text-muted-foreground">FEED: ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Globe className="w-3 h-3 text-tactical-cyan" />
            <span className="font-mono text-xxs text-muted-foreground">REGION: NATIONAL</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 lg:pt-32 p-4 lg:p-6">
        {/* Stats Grid - Bento Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card border-border card-tactical">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-5 h-5 text-primary" />
                <TrendingUp className="w-4 h-4 text-tactical-success" />
              </div>
              <p className="font-heading text-3xl font-bold">{stats?.total_citizens || 0}</p>
              <p className="font-mono text-xs text-muted-foreground">REGISTERED CITIZENS</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border card-tactical">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Building className="w-5 h-5 text-tactical-warning" />
                <span className="font-mono text-xxs text-muted-foreground">ACTIVE</span>
              </div>
              <p className="font-heading text-3xl font-bold">{stats?.total_dealers || 0}</p>
              <p className="font-mono text-xs text-muted-foreground">LICENSED DEALERS</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border card-tactical">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-5 h-5 text-tactical-success" />
                <span className="font-mono text-xxs text-tactical-success">+{stats?.today_transactions || 0} TODAY</span>
              </div>
              <p className="font-heading text-3xl font-bold">{stats?.total_transactions || 0}</p>
              <p className="font-mono text-xs text-muted-foreground">TOTAL TRANSACTIONS</p>
            </CardContent>
          </Card>
          
          <Card className={`glass-card border-border card-tactical ${stats?.distress_alerts > 0 ? 'border-tactical-danger/50 animate-border-glow' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <AlertCircle className={`w-5 h-5 ${stats?.distress_alerts > 0 ? 'text-tactical-danger animate-pulse' : 'text-muted-foreground'}`} />
                <span className="font-mono text-xxs text-tactical-danger">ALERT</span>
              </div>
              <p className={`font-heading text-3xl font-bold ${stats?.distress_alerts > 0 ? 'text-tactical-danger' : ''}`}>
                {stats?.distress_alerts || 0}
              </p>
              <p className="font-mono text-xs text-muted-foreground">DISTRESS SIGNALS</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-tactical-success/10 flex items-center justify-center border border-tactical-success/30">
                <CheckCircle className="w-6 h-6 text-tactical-success" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-tactical-success">
                  {stats?.risk_distribution?.low || 0}
                </p>
                <p className="font-mono text-xs text-muted-foreground">LOW RISK</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-tactical-warning/10 flex items-center justify-center border border-tactical-warning/30">
                <AlertTriangle className="w-6 h-6 text-tactical-warning" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-tactical-warning">
                  {stats?.risk_distribution?.medium || 0}
                </p>
                <p className="font-mono text-xs text-muted-foreground">MEDIUM RISK</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-tactical-danger/10 flex items-center justify-center border border-tactical-danger/30">
                <XCircle className="w-6 h-6 text-tactical-danger" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-tactical-danger">
                  {stats?.risk_distribution?.high || 0}
                </p>
                <p className="font-mono text-xs text-muted-foreground">HIGH RISK</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Heatmaps */}
        <div className="mb-6">
          <RiskHeatmaps api={api} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Transaction Feed */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  TRANSACTION FEED
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={filters.status || "all_status"}
                    onValueChange={(value) => setFilters({ ...filters, status: value === "all_status" ? "" : value })}
                  >
                    <SelectTrigger className="w-28 h-8 bg-background border-border font-mono text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_status">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="review_required">Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.risk_level || "all_risk"}
                    onValueChange={(value) => setFilters({ ...filters, risk_level: value === "all_risk" ? "" : value })}
                  >
                    <SelectTrigger className="w-24 h-8 bg-background border-border font-mono text-xs">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_risk">All Risk</SelectItem>
                      <SelectItem value="green">Low</SelectItem>
                      <SelectItem value="amber">Medium</SelectItem>
                      <SelectItem value="red">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-mono text-sm">NO TRANSACTIONS FOUND</p>
                      </div>
                    ) : (
                      transactions.map((txn, index) => (
                        <div 
                          key={txn.transaction_id}
                          className={`p-4 bg-card/50 rounded-lg border border-border hover:border-primary/30 transition-colors animate-slide-up stagger-${(index % 5) + 1}`}
                          data-testid={`gov-txn-${txn.transaction_id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">{txn.transaction_id}</span>
                              <Badge className={`${getStatusBadge(txn.status)} border font-mono text-xxs`}>
                                {txn.status?.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge className={`${getRiskBadge(txn.risk_level)} border font-mono text-xxs`}>
                                {txn.risk_level?.toUpperCase()} ({txn.risk_score})
                              </Badge>
                            </div>
                            <span className="font-mono text-xxs text-muted-foreground">
                              {new Date(txn.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-sm">
                              <div>
                                <p className="font-mono text-xxs text-muted-foreground">ITEM</p>
                                <p className="capitalize text-sm">{txn.item_type} - {txn.item_category}</p>
                              </div>
                              <div>
                                <p className="font-mono text-xxs text-muted-foreground">QTY</p>
                                <p className="text-sm">{txn.quantity}</p>
                              </div>
                              <div>
                                <p className="font-mono text-xxs text-muted-foreground">CITIZEN</p>
                                <p className="font-mono text-xs truncate max-w-[100px]">{txn.citizen_id}</p>
                              </div>
                            </div>
                            
                            {txn.status === 'review_required' && (
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 font-mono text-xs"
                                onClick={() => setReviewDialog(txn)}
                                data-testid={`review-btn-${txn.transaction_id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                REVIEW
                              </Button>
                            )}
                          </div>
                          
                          {txn.risk_factors?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="font-mono text-xxs text-muted-foreground mb-2">RISK FACTORS:</p>
                              <div className="flex flex-wrap gap-2">
                                {txn.risk_factors.map((factor, i) => (
                                  <span 
                                    key={i}
                                    className={`font-mono text-xxs px-2 py-1 rounded-sm ${
                                      factor.includes('DISTRESS') 
                                        ? 'bg-tactical-danger/20 text-tactical-danger' 
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {txn.ai_analysis && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="font-mono text-xxs text-muted-foreground mb-1">AI ANALYSIS:</p>
                              <p className="text-sm text-muted-foreground">{txn.ai_analysis}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Distress Alerts */}
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                  <AlertCircle className="w-5 h-5 text-tactical-danger" />
                  SYSTEM ALERTS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-tactical-success" />
                    <p className="font-mono text-xs">NO ACTIVE ALERTS</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div 
                          key={alert.notification_id}
                          className="p-3 bg-tactical-danger/10 rounded-lg border border-tactical-danger/30"
                        >
                          <p className="text-sm font-medium text-tactical-danger">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                          <p className="font-mono text-xxs text-muted-foreground mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Audit Log */}
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                  <Activity className="w-5 h-5" />
                  AUDIT LOG
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {auditLogs.map((log, index) => (
                      <div 
                        key={log.log_id}
                        className={`p-3 bg-card/50 rounded-lg border border-border text-sm animate-slide-up stagger-${(index % 5) + 1}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xxs text-primary">
                            {log.action.toUpperCase().replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-xxs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="font-mono text-xxs text-muted-foreground">
                          Actor: {log.actor_id} ({log.actor_role})
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="sm:max-w-lg glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Eye className="w-5 h-5 text-primary" />
              REVIEW TRANSACTION
            </DialogTitle>
            <DialogDescription>
              Review flagged transaction and make a decision.
            </DialogDescription>
          </DialogHeader>
          
          {reviewDialog && (
            <div className="space-y-4 py-4">
              <div className="bg-card rounded-lg p-4 space-y-3 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">TRANSACTION ID</span>
                  <span className="font-mono text-xs">{reviewDialog.transaction_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">ITEM</span>
                  <span className="capitalize">{reviewDialog.item_type} - {reviewDialog.item_category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">QUANTITY</span>
                  <span>{reviewDialog.quantity}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="font-mono text-xs text-muted-foreground">RISK SCORE</span>
                  <Badge className={`${getRiskBadge(reviewDialog.risk_level)} border font-mono text-xs`}>
                    {reviewDialog.risk_level?.toUpperCase()} ({reviewDialog.risk_score})
                  </Badge>
                </div>
              </div>
              
              {reviewDialog.risk_factors?.length > 0 && (
                <div className="bg-tactical-warning/10 rounded-lg p-3 border border-tactical-warning/30">
                  <p className="font-mono text-xs font-medium text-tactical-warning mb-2">RISK FACTORS:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {reviewDialog.risk_factors.map((factor, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-tactical-warning" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {reviewDialog.ai_analysis && (
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
                  <p className="font-mono text-xs font-medium text-primary mb-2">AI ANALYSIS:</p>
                  <p className="text-sm text-muted-foreground">{reviewDialog.ai_analysis}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="font-mono text-xs text-muted-foreground">REVIEW NOTES</label>
                <Textarea
                  placeholder="Add notes for audit trail..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="bg-background border-border font-mono text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              className="flex-1 bg-tactical-success hover:bg-tactical-success/90 font-mono text-xs"
              onClick={() => handleReview("approved")}
              disabled={processing}
              data-testid="admin-approve-btn"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              APPROVE
            </Button>
            <Button 
              variant="destructive"
              className="flex-1 font-mono text-xs"
              onClick={() => handleReview("rejected")}
              disabled={processing}
              data-testid="admin-reject-btn"
            >
              <XCircle className="w-4 h-4 mr-2" />
              REJECT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GovernmentDashboard;
