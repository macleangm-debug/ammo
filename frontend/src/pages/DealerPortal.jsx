import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Lock, MapPin, Send, History, CheckCircle, 
  XCircle, AlertTriangle, LogOut, User, Clock, Search,
  Building, RefreshCw, Activity, Radio, Crosshair, Cpu,
  Wifi, Target, Zap
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
import ThemeToggle from "../components/ThemeToggle";

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

  const itemCategories = {
    ammunition: ["9mm", "5.56mm", ".45 ACP", "12 Gauge", ".308", ".22 LR"],
    firearm: ["Handgun", "Rifle", "Shotgun"]
  };

  const todayTxns = transactions.filter(t => {
    const today = new Date().toDateString();
    return new Date(t.created_at).toDateString() === today;
  });

  const approvalRate = transactions.length > 0 
    ? Math.round((transactions.filter(t => t.status === 'approved').length / transactions.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="loading-radar mx-auto mb-4" />
          <p className="text-muted-foreground font-mono text-sm">INITIALIZING TERMINAL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="dealer-portal">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border hidden lg:flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <span className="font-heading font-bold text-lg">AMMO</span>
              <p className="font-mono text-xxs text-muted-foreground">DEALER TERMINAL</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="flex items-center gap-3">
              <Crosshair className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm">Verify Buyer</span>
            </div>
          </div>
          <div className="px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5" />
              <span className="text-sm">Transactions</span>
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
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
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 glass-heavy px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-heading font-bold">AMMO</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="font-heading text-lg font-bold">Verification Terminal</h1>
              <p className="text-xs text-muted-foreground font-mono">
                {profile?.business_name || 'Dealer'} • {profile?.license_number || 'Setup Required'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* GPS Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-tactical-success/10 rounded-lg border border-tactical-success/30">
              <MapPin className="w-4 h-4 text-tactical-success" />
              <span className="font-mono text-xs text-tactical-success">
                {gpsStatus.lat.toFixed(4)}, {gpsStatus.lng.toFixed(4)}
              </span>
              <div className="w-2 h-2 rounded-full bg-tactical-success animate-pulse shadow-glow-green" />
            </div>
            
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-6">
          {/* System Status Bar */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border whitespace-nowrap">
              <Cpu className="w-4 h-4 text-tactical-success" />
              <span className="font-mono text-xs">SYSTEM ONLINE</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border whitespace-nowrap">
              <Wifi className="w-4 h-4 text-tactical-success" />
              <span className="font-mono text-xs">CONNECTED</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border whitespace-nowrap">
              <Radio className="w-4 h-4 text-primary animate-pulse" />
              <span className="font-mono text-xs">LIVE FEED</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Verification Form */}
            <Card className="glass-card border-border tactical-corners">
              <div className="corner-bl" />
              <div className="corner-br" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                  <Lock className="w-5 h-5 text-primary" />
                  INITIATE VERIFICATION
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!profile ? (
                  <div className="text-center py-12">
                    <Building className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground mb-4">Setup dealer profile first</p>
                    <Button 
                      onClick={() => navigate('/setup')}
                      className="bg-primary hover:bg-primary/90 font-mono text-xs"
                      data-testid="setup-dealer-btn"
                    >
                      SETUP PROFILE
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label className="font-mono text-xs text-muted-foreground">CITIZEN LICENSE NUMBER</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g., LIC-DEMO-001"
                          value={formData.citizen_license}
                          onChange={(e) => setFormData({ ...formData, citizen_license: e.target.value.toUpperCase() })}
                          className="pl-10 bg-background border-border font-mono text-sm focus:border-primary"
                          data-testid="citizen-license-input"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-mono text-xs text-muted-foreground">ITEM TYPE</Label>
                        <Select
                          value={formData.item_type}
                          onValueChange={(value) => setFormData({ ...formData, item_type: value, item_category: "" })}
                        >
                          <SelectTrigger className="bg-background border-border" data-testid="item-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ammunition">Ammunition</SelectItem>
                            <SelectItem value="firearm">Firearm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="font-mono text-xs text-muted-foreground">CATEGORY</Label>
                        <Select
                          value={formData.item_category}
                          onValueChange={(value) => setFormData({ ...formData, item_category: value })}
                        >
                          <SelectTrigger className="bg-background border-border" data-testid="item-category-select">
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
                      <Label className="font-mono text-xs text-muted-foreground">QUANTITY</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        className="bg-background border-border font-mono focus:border-primary"
                        data-testid="quantity-input"
                      />
                    </div>
                    
                    <Button 
                      type="submit"
                      className="w-full h-12 bg-primary hover:bg-primary/90 font-mono text-sm tracking-wide shadow-tactical hover:shadow-tactical-lg transition-all"
                      disabled={submitting}
                      data-testid="submit-verification-btn"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          PROCESSING...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          SEND VERIFICATION REQUEST
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Stats & Transactions */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="w-5 h-5 text-primary" />
                      <span className="font-mono text-xxs text-muted-foreground">TODAY</span>
                    </div>
                    <p className="font-heading text-3xl font-bold">{todayTxns.length}</p>
                    <p className="font-mono text-xs text-muted-foreground">Transactions</p>
                  </CardContent>
                </Card>
                
                <Card className="glass-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Target className="w-5 h-5 text-tactical-success" />
                      <span className="font-mono text-xxs text-muted-foreground">RATE</span>
                    </div>
                    <p className="font-heading text-3xl font-bold text-tactical-success">{approvalRate}%</p>
                    <p className="font-mono text-xs text-muted-foreground">Approval Rate</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card className="glass-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-mono text-sm">
                    <History className="w-5 h-5" />
                    RECENT TRANSACTIONS
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={fetchData}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-mono text-sm">NO TRANSACTIONS YET</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-3">
                        {transactions.slice(0, 10).map((txn, index) => (
                          <div 
                            key={txn.transaction_id}
                            className={`p-4 bg-card/50 rounded-lg border border-border hover:border-primary/30 transition-colors animate-slide-up stagger-${(index % 5) + 1}`}
                            data-testid={`txn-${txn.transaction_id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-xs text-muted-foreground">{txn.transaction_id}</span>
                              <Badge className={`${getStatusBadge(txn.status)} border font-mono text-xxs`}>
                                {txn.status?.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {txn.item_type} - {txn.item_category}
                                </p>
                                <p className="font-mono text-xs text-muted-foreground">Qty: {txn.quantity}</p>
                              </div>
                              <div className="text-right">
                                <Badge className={`${getRiskBadge(txn.risk_level)} border font-mono text-xxs`}>
                                  {txn.risk_level?.toUpperCase()}
                                </Badge>
                                <p className="font-mono text-xxs text-muted-foreground mt-1">
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
        </div>
      </main>
    </div>
  );
};

export default DealerPortal;
