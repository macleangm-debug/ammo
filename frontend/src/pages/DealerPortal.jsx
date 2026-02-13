import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Lock, MapPin, Send, History, CheckCircle, 
  XCircle, AlertTriangle, LogOut, User, Clock, Search,
  Building, RefreshCw, Activity
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

const DealerPortal = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    citizen_license: "",
    item_type: "ammunition",
    item_category: "",
    quantity: 1
  });
  
  // GPS simulation
  const [gpsStatus, setGpsStatus] = useState({ lat: 40.7128, lng: -74.0060, active: true });

  useEffect(() => {
    fetchData();
    // Simulate GPS updates
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
      navigate("/", { replace: true });
    } catch (error) {
      navigate("/", { replace: true });
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

  const itemCategories = {
    ammunition: ["9mm", "5.56mm", ".45 ACP", "12 Gauge", ".308", ".22 LR"],
    firearm: ["Handgun", "Rifle", "Shotgun"]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-aegis-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-aegis-signal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/50 font-mono text-sm">INITIALIZING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aegis-navy text-white" data-testid="dealer-portal">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-aegis-slate border-r border-white/10 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-aegis-signal" />
            <div>
              <span className="font-heading font-bold text-lg">AMMO</span>
              <p className="text-xs text-white/50">DEALER PORTAL</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-3 py-2 bg-aegis-signal/10 rounded-lg border border-aegis-signal/30 text-aegis-signal">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5" />
              <span className="font-medium">Verify Buyer</span>
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5" />
              <span>Transactions</span>
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-aegis-signal/20 flex items-center justify-center">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-aegis-signal" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-white/50 truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white hover:bg-white/5"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 glass-heavy px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold">Verification Terminal</h1>
            <p className="text-sm text-white/50">
              {profile?.business_name || 'Dealer'} • {profile?.license_number || 'Setup Required'}
            </p>
          </div>
          
          {/* GPS Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xs text-emerald-400">
                {gpsStatus.lat.toFixed(4)}, {gpsStatus.lng.toFixed(4)}
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="p-6 grid lg:grid-cols-2 gap-6">
          {/* Verification Form */}
          <Card className="bg-aegis-slate border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lock className="w-5 h-5 text-aegis-signal" />
                Initiate Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!profile ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 mx-auto mb-3 text-white/30" />
                  <p className="text-white/50 mb-4">Setup dealer profile first</p>
                  <Button 
                    onClick={() => navigate('/setup')}
                    className="bg-aegis-signal hover:bg-blue-600"
                    data-testid="setup-dealer-btn"
                  >
                    Setup Profile
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white/70">Citizen License Number</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        placeholder="e.g., LIC-DEMO-001"
                        value={formData.citizen_license}
                        onChange={(e) => setFormData({ ...formData, citizen_license: e.target.value.toUpperCase() })}
                        className="pl-10 bg-aegis-navy border-white/10 text-white placeholder:text-white/30 focus:border-aegis-signal"
                        data-testid="citizen-license-input"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/70">Item Type</Label>
                      <Select
                        value={formData.item_type}
                        onValueChange={(value) => setFormData({ ...formData, item_type: value, item_category: "" })}
                      >
                        <SelectTrigger className="bg-aegis-navy border-white/10 text-white" data-testid="item-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ammunition">Ammunition</SelectItem>
                          <SelectItem value="firearm">Firearm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white/70">Category</Label>
                      <Select
                        value={formData.item_category}
                        onValueChange={(value) => setFormData({ ...formData, item_category: value })}
                      >
                        <SelectTrigger className="bg-aegis-navy border-white/10 text-white" data-testid="item-category-select">
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
                    <Label className="text-white/70">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="bg-aegis-navy border-white/10 text-white focus:border-aegis-signal"
                      data-testid="quantity-input"
                    />
                  </div>
                  
                  <Button 
                    type="submit"
                    className="w-full h-12 bg-aegis-signal hover:bg-blue-600 text-white font-medium shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all"
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
                        Send Verification Request
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-aegis-slate border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-aegis-signal" />
                    <span className="text-xs font-mono text-white/50">TODAY</span>
                  </div>
                  <p className="text-3xl font-heading font-bold">
                    {transactions.filter(t => {
                      const today = new Date().toDateString();
                      return new Date(t.created_at).toDateString() === today;
                    }).length}
                  </p>
                  <p className="text-sm text-white/50">Transactions</p>
                </CardContent>
              </Card>
              
              <Card className="bg-aegis-slate border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-mono text-white/50">RATE</span>
                  </div>
                  <p className="text-3xl font-heading font-bold">
                    {transactions.length > 0 
                      ? Math.round((transactions.filter(t => t.status === 'approved').length / transactions.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-white/50">Approval Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card className="bg-aegis-slate border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <History className="w-5 h-5" />
                  Recent Transactions
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white/50 hover:text-white"
                  onClick={fetchData}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-white/20" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {transactions.slice(0, 10).map((txn) => (
                        <div 
                          key={txn.transaction_id}
                          className="p-4 bg-aegis-navy/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                          data-testid={`txn-${txn.transaction_id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-white/50">{txn.transaction_id}</span>
                            <Badge className={`${getStatusBadge(txn.status)} border text-xs`}>
                              {txn.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium capitalize">
                                {txn.item_type} - {txn.item_category}
                              </p>
                              <p className="text-xs text-white/40">Qty: {txn.quantity}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={`${getRiskBadge(txn.risk_level)} border text-xs`}>
                                {txn.risk_level?.toUpperCase()}
                              </Badge>
                              <p className="text-xs text-white/40 mt-1">
                                Score: {txn.risk_score}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DealerPortal;
