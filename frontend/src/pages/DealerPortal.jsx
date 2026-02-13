import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Users, History, Settings, Send,
  MapPin, CheckCircle, Clock, AlertTriangle, RefreshCw,
  Search, XCircle, TrendingUp, Package
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
import { StatCard, DonutChart, BarChart } from "../components/Charts";

const DealerPortal = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    citizen_license: "",
    item_type: "ammunition",
    item_category: "",
    quantity: 1
  });
  
  const [gpsStatus, setGpsStatus] = useState({ lat: 40.7128, lng: -74.0060, active: true });

  const navItems = [
    { id: 'dashboard', path: '/dealer', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verify', path: '/dealer/verify', label: 'Verify Buyer', icon: Users },
    { id: 'transactions', path: '/dealer/transactions', label: 'Transactions', icon: History },
    { id: 'inventory', path: '/dealer/inventory', label: 'Inventory', icon: Package },
    { id: 'settings', path: '/dealer/settings', label: 'Settings', icon: Settings },
  ];

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
      const [profileRes, txnRes] = await Promise.all([
        api.get("/dealer/profile").catch(() => ({ data: null })),
        api.get("/dealer/transactions").catch(() => ({ data: [] }))
      ]);
      
      setProfile(profileRes.data);
      setTransactions(txnRes.data || []);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.citizen_license || !formData.item_category || !formData.quantity) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await api.post("/dealer/initiate-transaction", {
        ...formData,
        gps_lat: gpsStatus.lat,
        gps_lng: gpsStatus.lng
      });
      
      toast.success(`Verification request sent! Risk: ${response.data.risk_level.toUpperCase()}`);
      setFormData({ citizen_license: "", item_type: "ammunition", item_category: "", quantity: 1 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to initiate transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const itemCategories = {
    ammunition: ["9mm", "5.56mm", ".45 ACP", "12 Gauge", ".308", ".22 LR"],
    firearm: ["Handgun", "Rifle", "Shotgun"]
  };

  // Calculate stats
  const todayTxns = transactions.filter(t => {
    const today = new Date().toDateString();
    return new Date(t.created_at).toDateString() === today;
  });
  
  const approvedTxns = transactions.filter(t => t.status === 'approved').length;
  const pendingTxns = transactions.filter(t => t.status === 'pending').length;
  const rejectedTxns = transactions.filter(t => t.status === 'rejected').length;
  
  const approvalRate = transactions.length > 0 
    ? Math.round((approvedTxns / transactions.length) * 100)
    : 0;

  // Weekly data for chart
  const weeklyData = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 19 },
    { label: 'Wed', value: 8 },
    { label: 'Thu', value: 15 },
    { label: 'Fri', value: 22 },
    { label: 'Sat', value: 14 },
    { label: 'Sun', value: todayTxns.length || 5 },
  ];

  const getStatusStyles = (status) => {
    const styles = {
      approved: { bg: 'bg-success/10', text: 'text-success', label: 'Approved' },
      pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
      rejected: { bg: 'bg-danger/10', text: 'text-danger', label: 'Rejected' },
      review_required: { bg: 'bg-info/10', text: 'text-info', label: 'Review' }
    };
    return styles[status] || styles.pending;
  };

  const getRiskStyles = (level) => {
    const styles = {
      green: { bg: 'bg-success/10', text: 'text-success' },
      amber: { bg: 'bg-warning/10', text: 'text-warning' },
      red: { bg: 'bg-danger/10', text: 'text-danger' }
    };
    return styles[level] || styles.green;
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Dealer Dashboard"
        subtitle="Dealer Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dealer portal...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Dealer Dashboard"
      subtitle="Dealer Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="dealer-portal">
        {/* GPS Status Banner */}
        <div className="flex items-center gap-4 p-3 bg-success/5 border border-success/20 rounded-lg">
          <MapPin className="w-5 h-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium">GPS Location Active</p>
            <p className="text-xs text-muted-foreground">
              {gpsStatus.lat.toFixed(4)}, {gpsStatus.lng.toFixed(4)}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Transactions"
            value={todayTxns.length}
            subtitle="verifications"
            icon={Send}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            className="stagger-1"
          />
          <StatCard
            title="Approval Rate"
            value={`${approvalRate}%`}
            subtitle="success rate"
            icon={CheckCircle}
            iconBg="bg-success/10"
            iconColor="text-success"
            trend="up"
            trendValue="+2.5%"
            className="stagger-2"
          />
          <StatCard
            title="Pending"
            value={pendingTxns}
            subtitle="awaiting approval"
            icon={Clock}
            iconBg="bg-warning/10"
            iconColor="text-warning"
            className="stagger-3"
          />
          <StatCard
            title="Total Processed"
            value={transactions.length}
            subtitle="all time"
            icon={TrendingUp}
            iconBg="bg-info/10"
            iconColor="text-info"
            className="stagger-4"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verification Form */}
          <Card className="animate-slide-up stagger-5">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Verify Buyer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!profile ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-warning" />
                  <p className="text-muted-foreground mb-4">Setup dealer profile first</p>
                  <Button onClick={() => navigate('/setup')}>
                    Setup Profile
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Citizen License Number</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., LIC-DEMO-001"
                        value={formData.citizen_license}
                        onChange={(e) => setFormData({ ...formData, citizen_license: e.target.value.toUpperCase() })}
                        className="pl-10"
                        data-testid="citizen-license-input"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Item Type</Label>
                      <Select
                        value={formData.item_type}
                        onValueChange={(value) => setFormData({ ...formData, item_type: value, item_category: "" })}
                      >
                        <SelectTrigger data-testid="item-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ammunition">Ammunition</SelectItem>
                          <SelectItem value="firearm">Firearm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Category</Label>
                      <Select
                        value={formData.item_category}
                        onValueChange={(value) => setFormData({ ...formData, item_category: value })}
                      >
                        <SelectTrigger data-testid="item-category-select">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {itemCategories[formData.item_type]?.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      data-testid="quantity-input"
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                    data-testid="submit-verification-btn"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Verification
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Weekly Activity Chart */}
          <Card className="animate-slide-up stagger-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Weekly Activity</CardTitle>
              <Badge variant="outline">This Week</Badge>
            </CardHeader>
            <CardContent>
              <BarChart data={weeklyData} height={200} />
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="animate-slide-up stagger-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-4">
                <DonutChart 
                  value={approvalRate} 
                  total={100} 
                  size={140}
                  strokeWidth={14}
                  color="hsl(160, 84%, 39%)"
                  label="Approved"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-success/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm">Approved</span>
                  </div>
                  <span className="font-medium">{approvedTxns}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-warning/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <span className="font-medium">{pendingTxns}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-danger/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-danger" />
                    <span className="text-sm">Rejected</span>
                  </div>
                  <span className="font-medium">{rejectedTxns}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Table */}
        <Card className="animate-slide-up stagger-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Risk</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 10).map((txn) => {
                      const status = getStatusStyles(txn.status);
                      const risk = getRiskStyles(txn.risk_level);
                      return (
                        <tr key={txn.transaction_id}>
                          <td className="font-mono text-sm">{txn.transaction_id}</td>
                          <td className="capitalize text-sm">{txn.item_type} - {txn.item_category}</td>
                          <td className="text-sm">{txn.quantity}</td>
                          <td>
                            <span className={`status-badge ${risk.bg} ${risk.text}`}>
                              {txn.risk_level?.toUpperCase()} ({txn.risk_score})
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="text-sm text-muted-foreground">
                            {new Date(txn.created_at).toLocaleDateString()}
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
    </DashboardLayout>
  );
};

export default DealerPortal;
