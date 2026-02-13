import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Activity, Users, Building, AlertTriangle, 
  CheckCircle, XCircle, Clock, LogOut, TrendingUp,
  Eye, AlertCircle, RefreshCw, Search, Filter,
  ChevronDown, BarChart3, Map, Calendar
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

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
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
      green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      red: "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
    };
    return styles[level] || styles.green;
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      rejected: "bg-red-500/10 text-red-400 border-red-500/30",
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      review_required: "bg-blue-500/10 text-blue-400 border-blue-500/30"
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-aegis-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-aegis-signal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/50 font-mono text-sm">LOADING COMMAND CENTER...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aegis-navy text-white" data-testid="government-dashboard">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-heavy">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-aegis-signal" />
              <div>
                <span className="font-heading font-bold text-lg">AEGIS</span>
                <span className="text-xs font-mono text-white/40 ml-2">GOV COMMAND</span>
              </div>
            </div>
            
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-mono text-emerald-400">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white"
              onClick={fetchData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <div className="h-6 w-px bg-white/10"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">{user?.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/50 hover:text-white"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-aegis-slate border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-5 h-5 text-aegis-signal" />
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-heading font-bold">{stats?.total_citizens || 0}</p>
              <p className="text-sm text-white/50">Registered Citizens</p>
            </CardContent>
          </Card>
          
          <Card className="bg-aegis-slate border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Building className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-mono text-white/40">ACTIVE</span>
              </div>
              <p className="text-3xl font-heading font-bold">{stats?.total_dealers || 0}</p>
              <p className="text-sm text-white/50">Licensed Dealers</p>
            </CardContent>
          </Card>
          
          <Card className="bg-aegis-slate border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-mono text-emerald-400">+{stats?.today_transactions || 0} TODAY</span>
              </div>
              <p className="text-3xl font-heading font-bold">{stats?.total_transactions || 0}</p>
              <p className="text-sm text-white/50">Total Transactions</p>
            </CardContent>
          </Card>
          
          <Card className={`bg-aegis-slate border-white/10 ${stats?.distress_alerts > 0 ? 'border-red-500/50' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <AlertCircle className={`w-5 h-5 ${stats?.distress_alerts > 0 ? 'text-red-400 animate-pulse' : 'text-white/30'}`} />
                <span className="text-xs font-mono text-red-400">ALERT</span>
              </div>
              <p className="text-3xl font-heading font-bold text-red-400">{stats?.distress_alerts || 0}</p>
              <p className="text-sm text-white/50">Distress Signals</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <Card className="bg-aegis-slate border-white/10">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-emerald-400">
                  {stats?.risk_distribution?.low || 0}
                </p>
                <p className="text-sm text-white/50">Low Risk Transactions</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-aegis-slate border-white/10">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-amber-400">
                  {stats?.risk_distribution?.medium || 0}
                </p>
                <p className="text-sm text-white/50">Medium Risk</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-aegis-slate border-white/10">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-red-400">
                  {stats?.risk_distribution?.high || 0}
                </p>
                <p className="text-sm text-white/50">High Risk Flagged</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Heatmaps Section */}
        <div className="mb-6">
          <RiskHeatmaps api={api} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Transaction Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-aegis-slate border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5" />
                  Transaction Feed
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger className="w-32 h-8 bg-aegis-navy border-white/10 text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="review_required">Review Required</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.risk_level}
                    onValueChange={(value) => setFilters({ ...filters, risk_level: value })}
                  >
                    <SelectTrigger className="w-32 h-8 bg-aegis-navy border-white/10 text-sm">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Risk</SelectItem>
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
                      <div className="text-center py-12 text-white/50">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-white/20" />
                        <p>No transactions found</p>
                      </div>
                    ) : (
                      transactions.map((txn) => (
                        <div 
                          key={txn.transaction_id}
                          className="p-4 bg-aegis-navy/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                          data-testid={`gov-txn-${txn.transaction_id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-white/50">{txn.transaction_id}</span>
                              <Badge className={`${getStatusBadge(txn.status)} border text-xs`}>
                                {txn.status?.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge className={`${getRiskBadge(txn.risk_level)} border text-xs`}>
                                {txn.risk_level?.toUpperCase()} ({txn.risk_score})
                              </Badge>
                            </div>
                            <span className="text-xs text-white/40">
                              {new Date(txn.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="grid grid-cols-3 gap-6 text-sm">
                              <div>
                                <p className="text-white/40 text-xs">Item</p>
                                <p className="capitalize">{txn.item_type} - {txn.item_category}</p>
                              </div>
                              <div>
                                <p className="text-white/40 text-xs">Quantity</p>
                                <p>{txn.quantity}</p>
                              </div>
                              <div>
                                <p className="text-white/40 text-xs">Citizen ID</p>
                                <p className="font-mono text-xs">{txn.citizen_id}</p>
                              </div>
                            </div>
                            
                            {txn.status === 'review_required' && (
                              <Button
                                size="sm"
                                className="bg-aegis-signal hover:bg-blue-600"
                                onClick={() => setReviewDialog(txn)}
                                data-testid={`review-btn-${txn.transaction_id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            )}
                          </div>
                          
                          {txn.risk_factors?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                              <p className="text-xs text-white/40 mb-1">Risk Factors:</p>
                              <div className="flex flex-wrap gap-2">
                                {txn.risk_factors.map((factor, i) => (
                                  <span 
                                    key={i}
                                    className={`text-xs px-2 py-1 rounded ${
                                      factor.includes('DISTRESS') 
                                        ? 'bg-red-500/20 text-red-400' 
                                        : 'bg-white/5 text-white/60'
                                    }`}
                                  >
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {txn.ai_analysis && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                              <p className="text-xs text-white/40 mb-1">AI Analysis:</p>
                              <p className="text-sm text-white/70">{txn.ai_analysis}</p>
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
            <Card className="bg-aegis-slate border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-white/50">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm">No active alerts</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div 
                          key={alert.notification_id}
                          className="p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                        >
                          <p className="text-sm font-medium text-red-400">{alert.title}</p>
                          <p className="text-xs text-white/60 mt-1">{alert.message}</p>
                          <p className="text-xs text-white/40 mt-2">
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
            <Card className="bg-aegis-slate border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="w-5 h-5" />
                  Audit Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div 
                        key={log.log_id}
                        className="p-3 bg-aegis-navy/50 rounded-lg border border-white/5 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-aegis-signal">
                            {log.action.toUpperCase().replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-white/40">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-white/60">
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
        <DialogContent className="sm:max-w-lg bg-aegis-slate border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-aegis-signal" />
              Review Transaction
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Review flagged transaction and make a decision.
            </DialogDescription>
          </DialogHeader>
          
          {reviewDialog && (
            <div className="space-y-4 py-4">
              <div className="bg-aegis-navy/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Transaction ID</span>
                  <span className="font-mono">{reviewDialog.transaction_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Item</span>
                  <span className="capitalize">{reviewDialog.item_type} - {reviewDialog.item_category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Quantity</span>
                  <span>{reviewDialog.quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Risk Score</span>
                  <Badge className={`${getRiskBadge(reviewDialog.risk_level)} border`}>
                    {reviewDialog.risk_level?.toUpperCase()} ({reviewDialog.risk_score})
                  </Badge>
                </div>
              </div>
              
              {reviewDialog.risk_factors?.length > 0 && (
                <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-400 mb-2">Risk Factors:</p>
                  <ul className="text-xs text-white/70 space-y-1">
                    {reviewDialog.risk_factors.map((factor, i) => (
                      <li key={i}>• {factor}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {reviewDialog.ai_analysis && (
                <div className="bg-aegis-signal/10 rounded-lg p-3 border border-aegis-signal/20">
                  <p className="text-xs font-medium text-aegis-signal mb-2">AI Analysis:</p>
                  <p className="text-sm text-white/70">{reviewDialog.ai_analysis}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm text-white/70">Review Notes</label>
                <Textarea
                  placeholder="Add notes for audit trail..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="bg-aegis-navy border-white/10 text-white placeholder:text-white/30 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleReview("approved")}
              disabled={processing}
              data-testid="admin-approve-btn"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={() => handleReview("rejected")}
              disabled={processing}
              data-testid="admin-reject-btn"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GovernmentDashboard;
