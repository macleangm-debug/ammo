import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Shield, Award, History, Bell, Settings,
  CreditCard, GraduationCap, Target, CheckCircle, Clock,
  AlertTriangle, TrendingUp, Calendar, Users, XCircle, ShoppingBag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { StatCard, DonutChart, BarChart, ProgressBar } from "../components/Charts";

const CitizenDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [responsibility, setResponsibility] = useState(null);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
    { id: 'notifications', path: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, txnRes, respRes] = await Promise.all([
        api.get("/citizen/profile").catch(() => ({ data: null })),
        api.get("/citizen/transactions").catch(() => ({ data: [] })),
        api.get("/citizen/responsibility").catch(() => ({ data: null }))
      ]);
      
      setProfile(profileRes.data);
      setTransactions(txnRes.data || []);
      setResponsibility(respRes.data);
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

  // Calculate stats
  const ariScore = responsibility?.ari_score || 0;
  const tier = responsibility?.tier || { name: 'Sentinel', tier_id: 'sentinel' };
  const trainingHours = responsibility?.training?.hours || 0;
  const trainingTarget = responsibility?.training?.target_hours || 24;
  const complianceStreak = responsibility?.compliance_streak || 0;
  const badgesEarned = responsibility?.badges_earned?.length || 0;
  
  const approvedTxns = transactions.filter(t => t.status === 'approved').length;
  const pendingTxns = transactions.filter(t => t.status === 'pending').length;
  const rejectedTxns = transactions.filter(t => t.status === 'rejected').length;

  // Monthly activity data for bar chart
  const monthlyData = [
    { label: 'J', value: 2 },
    { label: 'F', value: 5 },
    { label: 'M', value: 3 },
    { label: 'A', value: 8 },
    { label: 'M', value: 4 },
    { label: 'J', value: 6 },
    { label: 'J', value: 7 },
    { label: 'A', value: 3 },
    { label: 'S', value: 5 },
    { label: 'O', value: 4 },
    { label: 'N', value: 6 },
    { label: 'D', value: transactions.length || 2 },
  ];

  const getTierColor = (tierName) => {
    const colors = {
      'Sentinel': 'hsl(160, 84%, 39%)',
      'Guardian': 'hsl(217, 91%, 60%)',
      'Elite Custodian': 'hsl(262, 83%, 58%)'
    };
    return colors[tierName] || colors.Sentinel;
  };

  const getStatusStyles = (status) => {
    const styles = {
      approved: { bg: 'bg-success/10', text: 'text-success', label: 'Approved' },
      pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
      rejected: { bg: 'bg-danger/10', text: 'text-danger', label: 'Rejected' },
      review_required: { bg: 'bg-info/10', text: 'text-info', label: 'Review' }
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Dashboard"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Dashboard"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="citizen-dashboard">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="ARI Score"
            value={ariScore}
            subtitle="/100 points"
            icon={Award}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            trend="up"
            trendValue="+5 this month"
            className="stagger-1"
          />
          <StatCard
            title="Training Hours"
            value={trainingHours}
            subtitle={`of ${trainingTarget} target`}
            icon={GraduationCap}
            iconBg="bg-info/10"
            iconColor="text-info"
            trend="up"
            trendValue="+2.5 hrs"
            className="stagger-2"
          />
          <StatCard
            title="Compliance Streak"
            value={`${complianceStreak} days`}
            subtitle="Keep it up!"
            icon={Target}
            iconBg="bg-success/10"
            iconColor="text-success"
            className="stagger-3"
          />
          <StatCard
            title="Badges Earned"
            value={badgesEarned}
            subtitle="achievements"
            icon={Shield}
            iconBg="bg-warning/10"
            iconColor="text-warning"
            className="stagger-4"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Chart */}
            <Card className="animate-slide-up stagger-5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Monthly Activity</CardTitle>
                <select className="text-sm bg-transparent border border-border rounded-md px-2 py-1">
                  <option>2024</option>
                  <option>2023</option>
                </select>
              </CardHeader>
              <CardContent>
                <BarChart data={monthlyData} height={180} />
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="animate-slide-up stagger-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/history')}>
                  View All
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
                          <th>Transaction</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 5).map((txn) => {
                          const status = getStatusStyles(txn.status);
                          return (
                            <tr key={txn.transaction_id}>
                              <td>
                                <div>
                                  <p className="font-medium text-sm">{txn.transaction_id}</p>
                                  <p className="text-xs text-muted-foreground">Qty: {txn.quantity}</p>
                                </div>
                              </td>
                              <td className="capitalize text-sm">{txn.item_type}</td>
                              <td className="text-sm text-muted-foreground">
                                {new Date(txn.created_at).toLocaleDateString()}
                              </td>
                              <td>
                                <span className={`status-badge ${status.bg} ${status.text}`}>
                                  {status.label}
                                </span>
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

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Tier Progress */}
            <Card className="animate-slide-up stagger-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Current Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <DonutChart 
                    value={ariScore} 
                    total={100} 
                    size={140}
                    strokeWidth={14}
                    color={getTierColor(tier.name)}
                    label="ARI"
                  />
                </div>
                <div className="text-center mb-4">
                  <Badge 
                    className="text-sm px-4 py-1"
                    style={{ 
                      backgroundColor: `${getTierColor(tier.name)}20`,
                      color: getTierColor(tier.name)
                    }}
                  >
                    {tier.name}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress to next tier</span>
                      <span className="font-medium">
                        {ariScore >= 85 ? '100%' : ariScore >= 60 ? `${Math.round(((ariScore - 60) / 25) * 100)}%` : `${Math.round((ariScore / 60) * 100)}%`}
                      </span>
                    </div>
                    <ProgressBar 
                      value={ariScore >= 85 ? 100 : ariScore >= 60 ? ariScore - 60 : ariScore} 
                      max={ariScore >= 85 ? 100 : ariScore >= 60 ? 25 : 60}
                      color={`bg-[${getTierColor(tier.name)}]`}
                      showLabel={false}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Summary */}
            <Card className="animate-slide-up stagger-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-success/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="text-sm">Approved</span>
                    </div>
                    <span className="font-semibold text-success">{approvedTxns}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-warning/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-warning" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-semibold text-warning">{pendingTxns}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-danger/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-danger" />
                      <span className="text-sm">Rejected</span>
                    </div>
                    <span className="font-semibold text-danger">{rejectedTxns}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* License Info */}
            <Card className="animate-slide-up stagger-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">License Number</p>
                    <p className="font-semibold">{profile?.license_number || 'Not Registered'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <p className="font-medium capitalize">{profile?.license_status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Expires</p>
                    <p className="font-medium">
                      {profile?.license_expiry 
                        ? new Date(profile.license_expiry).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CitizenDashboard;
