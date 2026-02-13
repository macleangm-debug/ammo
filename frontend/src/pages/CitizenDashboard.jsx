import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Bell, CreditCard, History, CheckCircle, 
  XCircle, AlertTriangle, LogOut, User, ChevronRight,
  Fingerprint, Clock, AlertCircle, Lock, Award, Star,
  Target, GraduationCap, Flame, Calendar, Radio
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import ThemeToggle from "../components/ThemeToggle";
import GamificationPanel from "../components/GamificationPanel";
import LicenseAlerts from "../components/LicenseAlerts";

const CitizenDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [responsibility, setResponsibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyDialog, setVerifyDialog] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, txnRes, notifRes, respRes] = await Promise.all([
        api.get("/citizen/profile").catch(() => ({ data: null })),
        api.get("/citizen/transactions").catch(() => ({ data: [] })),
        api.get("/citizen/notifications").catch(() => ({ data: [] })),
        api.get("/citizen/responsibility").catch(() => ({ data: null }))
      ]);
      
      setProfile(profileRes.data);
      setTransactions(txnRes.data || []);
      setNotifications(notifRes.data || []);
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
      navigate("/", { replace: true });
    } catch (error) {
      navigate("/", { replace: true });
    }
  };

  const handleVerification = async (approved, distress = false) => {
    if (!verifyDialog) return;
    setProcessing(true);
    
    try {
      await api.post(`/citizen/verify/${verifyDialog.transaction_id}`, {
        approved,
        distress_trigger: distress
      });
      
      if (distress) {
        toast.error("Distress signal sent. Stay safe.", { duration: 5000 });
      } else if (approved) {
        toast.success("Transaction approved successfully");
      } else {
        toast.info("Transaction rejected");
      }
      
      setVerifyDialog(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to process verification");
    } finally {
      setProcessing(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/citizen/notifications/${notificationId}/read`);
      fetchData();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const pendingNotifications = notifications.filter(n => !n.read && n.type === "verification_request");
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTierColor = (tierName) => {
    const colors = {
      'Sentinel': 'text-tactical-success',
      'Guardian': 'text-tactical-primary',
      'Elite Custodian': 'text-tactical-elite'
    };
    return colors[tierName] || 'text-primary';
  };

  const getTierBg = (tierName) => {
    const colors = {
      'Sentinel': 'bg-tactical-success/10 border-tactical-success/30',
      'Guardian': 'bg-tactical-primary/10 border-tactical-primary/30',
      'Elite Custodian': 'bg-tactical-elite/10 border-tactical-elite/30'
    };
    return colors[tierName] || 'bg-primary/10 border-primary/30';
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
          <p className="text-muted-foreground font-mono text-sm">LOADING PROFILE...</p>
        </div>
      </div>
    );
  }

  const ariScore = responsibility?.ari_score || 0;
  const tier = responsibility?.tier || { name: 'Sentinel' };

  return (
    <div className="min-h-screen bg-background" data-testid="citizen-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-heavy">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <span className="font-heading font-bold text-lg">AMMO</span>
              <p className="text-xxs font-mono text-muted-foreground">MEMBER PORTAL</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => {}}
              data-testid="notifications-btn"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-tactical-danger text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* User Welcome & ARI Overview */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* User Card */}
          <Card className="glass-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="font-heading text-xl font-bold">
                    {user?.name?.split(' ')[0] || 'Member'}
                  </h1>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`px-2 py-1 rounded-sm text-xs font-mono border ${getTierBg(tier.name)}`}>
                      <span className={getTierColor(tier.name)}>{tier.name?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ARI Score Card */}
          <Card className="glass-card border-border tactical-corners overflow-visible">
            <div className="corner-bl" />
            <div className="corner-br" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground tracking-wider">ARI SCORE</p>
                  <div className="flex items-end gap-1">
                    <span className={`font-heading text-4xl font-bold ${getTierColor(tier.name)}`}>
                      {ariScore}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1">/100</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg ${getTierBg(tier.name)} flex items-center justify-center`}>
                  {tier.name === 'Elite Custodian' ? (
                    <Award className={`w-6 h-6 ${getTierColor(tier.name)}`} />
                  ) : (
                    <Shield className={`w-6 h-6 ${getTierColor(tier.name)}`} />
                  )}
                </div>
              </div>
              <Progress value={ariScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {ariScore >= 85 ? 'Exemplary responsibility' : 
                 ariScore >= 60 ? `${85 - ariScore} points to Elite Custodian` : 
                 `${60 - ariScore} points to Guardian`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verification Alerts */}
        {pendingNotifications.length > 0 && (
          <Card className="border-tactical-warning/30 bg-tactical-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-tactical-warning">
                <Radio className="w-5 h-5 animate-pulse" />
                PENDING VERIFICATIONS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingNotifications.map((notif) => (
                <div 
                  key={notif.notification_id}
                  className="glass-card rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{notif.title}</p>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 font-mono text-xs"
                    onClick={() => {
                      const txn = transactions.find(t => t.transaction_id === notif.transaction_id);
                      setVerifyDialog(txn || { transaction_id: notif.transaction_id, ...notif });
                      markAsRead(notif.notification_id);
                    }}
                    data-testid={`verify-btn-${notif.notification_id}`}
                  >
                    VERIFY
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* License Card */}
        <Card className="overflow-hidden border-0">
          <div className="bg-gradient-to-br from-tactical-slate to-tactical-navy p-6 text-white relative">
            {/* Scanlines */}
            <div className="absolute inset-0 scanlines opacity-30" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-mono text-xs text-white/50 tracking-wider mb-1">DIGITAL LICENSE</p>
                  <h2 className="font-heading text-2xl font-bold tracking-wide">
                    {profile?.license_number || 'NOT REGISTERED'}
                  </h2>
                </div>
                <CreditCard className="w-10 h-10 text-white/20" />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="font-mono text-xxs text-white/50 tracking-wider">TYPE</p>
                  <p className="font-medium uppercase">{profile?.license_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-mono text-xxs text-white/50 tracking-wider">STATUS</p>
                  <div className="flex items-center gap-2">
                    {profile?.license_status === 'active' ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-tactical-success animate-pulse shadow-glow-green" />
                        <span className="font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-tactical-danger" />
                        <span className="font-medium uppercase">{profile?.license_status || 'Inactive'}</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-xxs text-white/50 tracking-wider">EXPIRES</p>
                  <p className="font-medium">
                    {profile?.license_expiry 
                      ? new Date(profile.license_expiry).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <CardContent className="p-6 bg-card">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-heading text-2xl font-bold text-primary">
                  {profile?.compliance_score || 0}
                </p>
                <p className="font-mono text-xxs text-muted-foreground tracking-wider">COMPLIANCE</p>
              </div>
              <div>
                <p className="font-heading text-2xl font-bold">
                  {responsibility?.training?.hours || 0}
                </p>
                <p className="font-mono text-xxs text-muted-foreground tracking-wider">TRAINING HRS</p>
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-tactical-warning">
                  {profile?.license_expiry 
                    ? Math.max(0, Math.floor((new Date(profile.license_expiry) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0}
                </p>
                <p className="font-mono text-xxs text-muted-foreground tracking-wider">DAYS LEFT</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {!profile && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold">Complete Your Profile</h3>
                <p className="text-sm text-muted-foreground">Register your license to enable verifications</p>
              </div>
              <Button 
                className="bg-primary hover:bg-primary/90 font-mono text-xs"
                onClick={() => navigate('/setup')}
                data-testid="setup-profile-btn"
              >
                SETUP PROFILE
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-card border border-border">
            <TabsTrigger value="rewards" className="flex items-center gap-2 font-mono text-xs data-[state=active]:bg-primary/10">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">REWARDS</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2 font-mono text-xs data-[state=active]:bg-primary/10">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">HISTORY</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 font-mono text-xs data-[state=active]:bg-primary/10">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">ALERTS</span>
            </TabsTrigger>
          </TabsList>

          {/* Rewards/Gamification Tab */}
          <TabsContent value="rewards">
            <GamificationPanel api={api} />
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions">
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                  <History className="w-5 h-5 text-primary" />
                  TRANSACTION HISTORY
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-mono text-sm">NO TRANSACTIONS YET</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {transactions.map((txn, index) => (
                        <div 
                          key={txn.transaction_id}
                          className={`flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors animate-slide-up stagger-${(index % 5) + 1}`}
                          data-testid={`transaction-${txn.transaction_id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              txn.status === 'approved' ? 'bg-tactical-success/10' :
                              txn.status === 'rejected' ? 'bg-tactical-danger/10' :
                              txn.status === 'pending' ? 'bg-tactical-warning/10' : 'bg-tactical-primary/10'
                            }`}>
                              {txn.status === 'approved' ? <CheckCircle className="w-5 h-5 text-tactical-success" /> :
                               txn.status === 'rejected' ? <XCircle className="w-5 h-5 text-tactical-danger" /> :
                               txn.status === 'pending' ? <Clock className="w-5 h-5 text-tactical-warning" /> :
                               <AlertTriangle className="w-5 h-5 text-tactical-primary" />}
                            </div>
                            <div>
                              <p className="font-medium capitalize">
                                {txn.item_type} - {txn.item_category}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {txn.transaction_id} • Qty: {txn.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={`${getStatusBadge(txn.status)} border font-mono text-xs`}>
                              {txn.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(txn.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <LicenseAlerts api={api} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Verification Dialog */}
      <Dialog open={!!verifyDialog} onOpenChange={() => setVerifyDialog(null)}>
        <DialogContent className="sm:max-w-md glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Fingerprint className="w-5 h-5 text-primary" />
              VERIFICATION REQUEST
            </DialogTitle>
            <DialogDescription>
              A dealer is requesting verification for a transaction.
            </DialogDescription>
          </DialogHeader>
          
          {verifyDialog && (
            <div className="space-y-4 py-4">
              <div className="bg-card rounded-lg p-4 space-y-3 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-mono text-xs">TRANSACTION ID</span>
                  <span className="font-mono text-xs">{verifyDialog.transaction_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-mono text-xs">ITEM</span>
                  <span className="capitalize">{verifyDialog.item_type} - {verifyDialog.item_category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-mono text-xs">QUANTITY</span>
                  <span>{verifyDialog.quantity}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground font-mono text-xs">RISK LEVEL</span>
                  <Badge className={`${getRiskBadge(verifyDialog.risk_level)} border font-mono text-xs`}>
                    {verifyDialog.risk_level?.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              {verifyDialog.risk_factors?.length > 0 && (
                <div className="bg-tactical-warning/10 rounded-lg p-3 border border-tactical-warning/30">
                  <p className="font-mono text-xs font-medium text-tactical-warning mb-2">RISK FACTORS:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {verifyDialog.risk_factors.map((factor, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-tactical-warning" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button 
                className="flex-1 bg-tactical-success hover:bg-tactical-success/90 font-mono text-xs"
                onClick={() => handleVerification(true)}
                disabled={processing}
                data-testid="approve-transaction-btn"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                APPROVE
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-tactical-danger/30 text-tactical-danger hover:bg-tactical-danger/10 font-mono text-xs"
                onClick={() => handleVerification(false)}
                disabled={processing}
                data-testid="reject-transaction-btn"
              >
                <XCircle className="w-4 h-4 mr-2" />
                REJECT
              </Button>
            </div>
            <Button 
              variant="destructive"
              className="w-full font-mono text-xs"
              onClick={() => handleVerification(false, true)}
              disabled={processing}
              data-testid="distress-btn"
            >
              <Lock className="w-4 h-4 mr-2" />
              SILENT DISTRESS SIGNAL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CitizenDashboard;
