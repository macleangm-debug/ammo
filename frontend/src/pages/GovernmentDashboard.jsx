import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Activity, Users, Building, AlertTriangle, 
  CheckCircle, XCircle, Clock, Eye, RefreshCw, MapPin,
  TrendingUp, TrendingDown, Shield, Filter, Search,
  BarChart3, PieChart, Map, Settings
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
import { StatCard, DonutChart, BarChart, ProgressBar } from "../components/Charts";

const GovernmentDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", risk_level: "" });
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const navItems = [
    { id: 'overview', path: '/government', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', path: '/government/transactions', label: 'Transactions', icon: Activity },
    { id: 'citizens', path: '/government/citizens', label: 'Citizens', icon: Users },
    { id: 'dealers', path: '/government/dealers', label: 'Dealers', icon: Building },
    { id: 'analytics', path: '/government/analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'map', path: '/government/map', label: 'Risk Map', icon: Map },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.risk_level) params.append("risk_level", filters.risk_level);
      
      const [statsRes, txnRes, alertsRes] = await Promise.all([
        api.get("/admin/dashboard-stats"),
        api.get(`/admin/transactions?${params.toString()}`),
        api.get("/admin/alerts")
      ]);
      
      setStats(statsRes.data);
      setTransactions(txnRes.data || []);
      setAlerts(alertsRes.data || []);
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

  // Calculate additional stats
  const riskDistribution = stats?.risk_distribution || { low: 0, medium: 0, high: 0 };
  const totalRisk = riskDistribution.low + riskDistribution.medium + riskDistribution.high;

  // Weekly trend data
  const weeklyData = [
    { label: 'Mon', value: 145 },
    { label: 'Tue', value: 232 },
    { label: 'Wed', value: 189 },
    { label: 'Thu', value: 267 },
    { label: 'Fri', value: 298 },
    { label: 'Sat', value: 176 },
    { label: 'Sun', value: stats?.today_transactions || 124 },
  ];

  // Regional data for display
  const regionalData = [
    { region: 'Northeast', transactions: 2450, risk: 12, color: 'bg-info' },
    { region: 'Southeast', transactions: 3120, risk: 18, color: 'bg-success' },
    { region: 'Midwest', transactions: 1890, risk: 8, color: 'bg-primary' },
    { region: 'Southwest', transactions: 2780, risk: 15, color: 'bg-warning' },
    { region: 'West', transactions: 3450, risk: 22, color: 'bg-danger' },
  ];

  const getStatusStyles = (status) => {
    const styles = {
      approved: { bg: 'bg-success/10', text: 'text-success', label: 'Approved' },
      pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
      rejected: { bg: 'bg-danger/10', text: 'text-danger', label: 'Rejected' },
      review_required: { bg: 'bg-info/10', text: 'text-info', label: 'Review Required' }
    };
    return styles[status] || styles.pending;
  };

  const getRiskStyles = (level) => {
    const styles = {
      green: { bg: 'bg-success/10', text: 'text-success', label: 'Low' },
      amber: { bg: 'bg-warning/10', text: 'text-warning', label: 'Medium' },
      red: { bg: 'bg-danger/10', text: 'text-danger', label: 'High' }
    };
    return styles[level] || styles.green;
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="National Overview"
        subtitle="Government Command"
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
      title="National Overview"
      subtitle="Government Command"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="government-dashboard">
        {/* Alert Banner */}
        {stats?.distress_alerts > 0 && (
          <div className="flex items-center gap-4 p-4 bg-danger/10 border border-danger/30 rounded-lg animate-pulse">
            <AlertTriangle className="w-6 h-6 text-danger" />
            <div className="flex-1">
              <p className="font-semibold text-danger">Active Distress Alerts</p>
              <p className="text-sm text-muted-foreground">
                {stats.distress_alerts} citizen(s) triggered silent distress signal
              </p>
            </div>
            <Button variant="destructive" size="sm">
              View Alerts
            </Button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Citizens"
            value={stats?.total_citizens?.toLocaleString() || '0'}
            subtitle="registered members"
            icon={Users}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            trend="up"
            trendValue="+124 today"
            className="stagger-1"
          />
          <StatCard
            title="Active Dealers"
            value={stats?.total_dealers?.toLocaleString() || '0'}
            subtitle="licensed dealers"
            icon={Building}
            iconBg="bg-warning/10"
            iconColor="text-warning"
            trend="up"
            trendValue="+8 this week"
            className="stagger-2"
          />
          <StatCard
            title="Today's Transactions"
            value={stats?.today_transactions?.toLocaleString() || '0'}
            subtitle="verifications"
            icon={Activity}
            iconBg="bg-success/10"
            iconColor="text-success"
            trend="up"
            trendValue="+15.3%"
            className="stagger-3"
          />
          <StatCard
            title="Total Processed"
            value={stats?.total_transactions?.toLocaleString() || '0'}
            subtitle="all time"
            icon={CheckCircle}
            iconBg="bg-info/10"
            iconColor="text-info"
            className="stagger-4"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction Trends - Wide */}
          <Card className="lg:col-span-2 animate-slide-up stagger-5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Transaction Trends</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">This Week</Badge>
                <Button variant="ghost" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <BarChart data={weeklyData} height={220} />
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          <Card className="animate-slide-up stagger-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <DonutChart 
                    value={totalRisk > 0 ? Math.round((riskDistribution.low / totalRisk) * 100) : 0} 
                    total={100} 
                    size={140}
                    strokeWidth={14}
                    color="hsl(160, 84%, 39%)"
                    label="Low Risk"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm">Low Risk</span>
                  </div>
                  <span className="font-semibold text-success">{riskDistribution.low}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-sm">Medium Risk</span>
                  </div>
                  <span className="font-semibold text-warning">{riskDistribution.medium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-danger" />
                    <span className="text-sm">High Risk</span>
                  </div>
                  <span className="font-semibold text-danger">{riskDistribution.high}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Regional Overview */}
        <Card className="animate-slide-up stagger-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Regional Overview</CardTitle>
            <Button variant="outline" size="sm">
              <Map className="w-4 h-4 mr-2" />
              View Map
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {regionalData.map((region, idx) => (
                <div key={region.region} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{region.region}</span>
                    <div className={`w-2 h-2 rounded-full ${region.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{region.transactions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">transactions</p>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <AlertTriangle className="w-3 h-3 text-warning" />
                    <span className="text-muted-foreground">{region.risk} high risk</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Feed with Filters */}
        <Card className="animate-slide-up stagger-6">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base font-semibold">Live Transaction Feed</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.status || "all_status"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all_status" ? "" : value })}
              >
                <SelectTrigger className="w-32 h-9">
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
                <SelectTrigger className="w-28 h-9">
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
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Item</th>
                      <th>Citizen</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 15).map((txn) => {
                      const status = getStatusStyles(txn.status);
                      const risk = getRiskStyles(txn.risk_level);
                      return (
                        <tr key={txn.transaction_id}>
                          <td className="font-mono text-sm">{txn.transaction_id}</td>
                          <td className="capitalize text-sm">
                            {txn.item_type} - {txn.item_category}
                            <span className="block text-xs text-muted-foreground">Qty: {txn.quantity}</span>
                          </td>
                          <td className="text-sm">{txn.citizen_id?.slice(0, 12)}...</td>
                          <td>
                            <span className={`status-badge ${risk.bg} ${risk.text}`}>
                              {risk.label} ({txn.risk_score})
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="text-sm text-muted-foreground">
                            {new Date(txn.created_at).toLocaleString()}
                          </td>
                          <td>
                            {txn.status === 'review_required' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReviewDialog(txn)}
                                data-testid={`review-btn-${txn.transaction_id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Review Transaction
            </DialogTitle>
            <DialogDescription>
              Review this flagged transaction and make a decision.
            </DialogDescription>
          </DialogHeader>
          
          {reviewDialog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{reviewDialog.transaction_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Item</p>
                  <p className="text-sm capitalize">{reviewDialog.item_type} - {reviewDialog.item_category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="text-sm">{reviewDialog.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                  <Badge className={`${getRiskStyles(reviewDialog.risk_level).bg} ${getRiskStyles(reviewDialog.risk_level).text}`}>
                    {reviewDialog.risk_level?.toUpperCase()} ({reviewDialog.risk_score})
                  </Badge>
                </div>
              </div>
              
              {reviewDialog.risk_factors?.length > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm font-medium text-warning mb-2">Risk Factors:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {reviewDialog.risk_factors.map((factor, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add notes for audit trail..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              className="flex-1 bg-success hover:bg-success/90"
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
    </DashboardLayout>
  );
};

export default GovernmentDashboard;
