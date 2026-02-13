import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Bell, CreditCard, History, CheckCircle, 
  XCircle, AlertTriangle, LogOut, User, ChevronRight,
  Fingerprint, Clock, AlertCircle, Lock, Award, Star
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import GamificationPanel from "../components/GamificationPanel";
import LicenseAlerts from "../components/LicenseAlerts";

const CitizenDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyDialog, setVerifyDialog] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, txnRes, notifRes] = await Promise.all([
        api.get("/citizen/profile").catch(() => ({ data: null })),
        api.get("/citizen/transactions").catch(() => ({ data: [] })),
        api.get("/citizen/notifications").catch(() => ({ data: [] }))
      ]);
      
      setProfile(profileRes.data);
      setTransactions(txnRes.data || []);
      setNotifications(notifRes.data || []);
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

  const getRiskBadge = (level) => {
    const styles = {
      green: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      red: "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
    };
    return styles[level] || styles.green;
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      review_required: "bg-blue-500/10 text-blue-500 border-blue-500/20"
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-mono text-sm">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="citizen-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            <span className="font-heading font-bold text-lg text-gray-900">AEGIS</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => {}}
              data-testid="notifications-btn"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
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
        {/* User Welcome */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">
              Welcome, {user?.name?.split(' ')[0] || 'Citizen'}
            </h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Pending Verification Alerts */}
        {pendingNotifications.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                Pending Verifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingNotifications.map((notif) => (
                <div 
                  key={notif.notification_id}
                  className="bg-white rounded-lg p-4 border border-amber-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const txn = transactions.find(t => t.transaction_id === notif.transaction_id);
                      setVerifyDialog(txn || { transaction_id: notif.transaction_id, ...notif });
                      markAsRead(notif.notification_id);
                    }}
                    data-testid={`verify-btn-${notif.notification_id}`}
                  >
                    Verify
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* License Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono text-white/70 mb-1">DIGITAL LICENSE</p>
                <h2 className="font-heading text-2xl font-bold mb-4">
                  {profile?.license_number || 'Not Registered'}
                </h2>
              </div>
              <CreditCard className="w-10 h-10 text-white/30" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-white/70">TYPE</p>
                <p className="font-medium capitalize">{profile?.license_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-white/70">STATUS</p>
                <div className="flex items-center gap-2">
                  {profile?.license_status === 'active' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="font-medium">Active</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="font-medium capitalize">{profile?.license_status || 'Inactive'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {profile?.compliance_score || 0}
                </p>
                <p className="text-xs text-gray-500">Compliance Score</p>
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {profile?.total_purchases || 0}
                </p>
                <p className="text-xs text-gray-500">Total Purchases</p>
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {profile?.license_expiry 
                    ? Math.max(0, Math.floor((new Date(profile.license_expiry) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0}
                </p>
                <p className="text-xs text-gray-500">Days Until Expiry</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {!profile && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-gray-900">Complete Your Profile</h3>
                <p className="text-sm text-gray-600">Register your license to enable verifications</p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate('/setup')}
                data-testid="setup-profile-btn"
              >
                Setup Profile
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {transactions.map((txn, index) => (
                    <div 
                      key={txn.transaction_id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                      data-testid={`transaction-${txn.transaction_id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          txn.status === 'approved' ? 'bg-emerald-100' :
                          txn.status === 'rejected' ? 'bg-red-100' :
                          txn.status === 'pending' ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          {txn.status === 'approved' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                           txn.status === 'rejected' ? <XCircle className="w-5 h-5 text-red-600" /> :
                           txn.status === 'pending' ? <Clock className="w-5 h-5 text-amber-600" /> :
                           <AlertTriangle className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {txn.item_type} - {txn.item_category}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {txn.transaction_id} • Qty: {txn.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusBadge(txn.status)} border`}>
                          {txn.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
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
      </main>

      {/* Verification Dialog */}
      <Dialog open={!!verifyDialog} onOpenChange={() => setVerifyDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-blue-600" />
              Verification Request
            </DialogTitle>
            <DialogDescription>
              A dealer is requesting verification for a transaction.
            </DialogDescription>
          </DialogHeader>
          
          {verifyDialog && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="font-mono">{verifyDialog.transaction_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Item</span>
                  <span className="capitalize">{verifyDialog.item_type} - {verifyDialog.item_category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span>{verifyDialog.quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Risk Level</span>
                  <Badge className={`${getRiskBadge(verifyDialog.risk_level)} border`}>
                    {verifyDialog.risk_level?.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              {verifyDialog.risk_factors?.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-xs font-medium text-amber-800 mb-1">Risk Factors:</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    {verifyDialog.risk_factors.map((factor, i) => (
                      <li key={i}>• {factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleVerification(true)}
                disabled={processing}
                data-testid="approve-transaction-btn"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleVerification(false)}
                disabled={processing}
                data-testid="reject-transaction-btn"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
            <Button 
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => handleVerification(false, true)}
              disabled={processing}
              data-testid="distress-btn"
            >
              <Lock className="w-4 h-4 mr-2" />
              Silent Distress Signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CitizenDashboard;
