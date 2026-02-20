import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, LayoutDashboard, FileText, Bell, Activity, 
  AlertTriangle, Settings, Loader2, Users, Flag, 
  CheckCircle, XCircle, Eye, Edit, Trash2, Plus,
  ChevronRight, RefreshCw, Palette, Handshake, Zap,
  AlertCircle, Clock, MapPin, TrendingUp, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const NAV_ITEMS = [
  { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'owners', path: '/government/owners', label: 'Owners', icon: Users },
  { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
  { id: 'templates', path: '/government/templates', label: 'Templates', icon: FileText },
  { id: 'cert-config', path: '/government/certificate-config', label: 'Cert Config', icon: Palette },
  { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
  { id: 'predictive', path: '/government/predictive', label: 'Analytics', icon: Activity },
  { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
  { id: 'flagging', path: '/government/flagging', label: 'Flagging', icon: Flag },
  { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
  { id: 'partners', path: '/government/partners', label: 'Partners', icon: Handshake },
  { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
];

const CATEGORY_ICONS = {
  quantity: TrendingUp,
  frequency: Clock,
  profile: Users,
  compliance: Shield,
  location: MapPin,
  time: Clock,
  dealer: Users,
  risk: AlertTriangle,
  custom: Zap
};

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200"
};

const FlaggingRules = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [flags, setFlags] = useState([]);
  const [stats, setStats] = useState({});
  const [flagStats, setFlagStats] = useState({});
  const [activeTab, setActiveTab] = useState("rules");
  const [editingRule, setEditingRule] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testForm, setTestForm] = useState({
    citizen_id: "",
    dealer_id: "",
    item_type: "firearm",
    quantity: 10,
    risk_score: 0
  });

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, flagsRes] = await Promise.all([
        api.get("/government/flagging-rules"),
        api.get("/government/flagged-transactions?limit=20")
      ]);
      setRules(rulesRes.data.rules || []);
      setStats(rulesRes.data.stats || {});
      setFlags(flagsRes.data.flags || []);
      setFlagStats(flagsRes.data.stats || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load flagging data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      await api.put(`/government/flagging-rules/${rule.rule_id}`, {
        enabled: !rule.enabled
      });
      toast.success(`Rule ${rule.enabled ? 'disabled' : 'enabled'}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update rule");
    }
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule.rule_id) {
        await api.put(`/government/flagging-rules/${editingRule.rule_id}`, editingRule);
      } else {
        await api.post("/government/flagging-rules", editingRule);
      }
      toast.success("Rule saved successfully");
      setShowEditDialog(false);
      setEditingRule(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to save rule");
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!ruleId.startsWith("custom_")) {
      toast.error("Cannot delete default rules");
      return;
    }
    try {
      await api.delete(`/government/flagging-rules/${ruleId}`);
      toast.success("Rule deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  const handleResolveFlag = async (flagId, action) => {
    try {
      await api.post(`/government/flagged-transactions/${flagId}/resolve`, {
        action,
        notes: `Resolved by admin with action: ${action}`
      });
      toast.success(`Flag ${action === 'cleared' ? 'cleared' : 'blocked'}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve flag");
    }
  };

  const handleTestRules = async () => {
    try {
      const res = await api.post("/government/flagging/test-transaction", testForm);
      setTestResult(res.data);
    } catch (error) {
      toast.error("Test failed");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getCategoryIcon = (category) => {
    const Icon = CATEGORY_ICONS[category] || Flag;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navItems={NAV_ITEMS} title="Transaction Flagging" subtitle="Government Portal" onLogout={handleLogout} api={api}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navItems={NAV_ITEMS} title="Transaction Flagging" subtitle="Government Portal" onLogout={handleLogout} api={api}>
      <div className="space-y-6" data-testid="flagging-rules-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Flag className="w-7 h-7 text-primary" />
              Auto-Detection Rules
            </h2>
            <p className="text-muted-foreground">
              Configure rules to automatically flag suspicious transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
              <Zap className="w-4 h-4 mr-2" />
              Test Rules
            </Button>
            <Button onClick={() => {
              setEditingRule({ name: "", description: "", category: "custom", severity: "medium", conditions: {}, auto_review: false });
              setShowEditDialog(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total_rules || 0}</div>
                <div className="text-sm text-muted-foreground">Total Rules</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.enabled_rules || 0}</div>
                <div className="text-sm text-green-600">Active Rules</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{flagStats.unresolved || 0}</div>
                <div className="text-sm text-red-600">Unresolved Flags</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{flagStats.by_severity?.high || 0}</div>
                <div className="text-sm text-orange-600">High Severity</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{flagStats.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Flags</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules">Flagging Rules</TabsTrigger>
            <TabsTrigger value="flags">Flagged Transactions ({flagStats.unresolved || 0})</TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.rule_id} className={`${!rule.enabled ? 'opacity-60' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        rule.category === 'quantity' ? 'bg-blue-100 text-blue-600' :
                        rule.category === 'compliance' ? 'bg-purple-100 text-purple-600' :
                        rule.category === 'risk' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getCategoryIcon(rule.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant="outline" className={SEVERITY_COLORS[rule.severity]}>
                            {rule.severity}
                          </Badge>
                          {rule.auto_review && (
                            <Badge variant="secondary" className="text-xs">Auto-Review</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Category: {rule.category}</span>
                          {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                            <span>
                              Conditions: {Object.entries(rule.conditions).map(([k, v]) => 
                                `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : v}`
                              ).join(' | ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingRule(rule);
                        setShowEditDialog(true);
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {rule.rule_id?.startsWith("custom_") && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.rule_id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Flags Tab */}
          <TabsContent value="flags" className="space-y-4">
            {flags.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">No Flagged Transactions</h3>
                  <p className="text-muted-foreground">All transactions are clear</p>
                </CardContent>
              </Card>
            ) : (
              flags.map((flag) => (
                <Card key={flag.flag_id} className={`border-l-4 ${
                  flag.severity === 'critical' ? 'border-l-red-500' :
                  flag.severity === 'high' ? 'border-l-orange-500' :
                  flag.severity === 'medium' ? 'border-l-amber-500' :
                  'border-l-blue-500'
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Flag className={`w-4 h-4 ${
                            flag.severity === 'high' ? 'text-orange-500' : 'text-amber-500'
                          }`} />
                          <span className="font-medium">Transaction: {flag.transaction_id}</span>
                          <Badge className={SEVERITY_COLORS[flag.severity]}>{flag.severity}</Badge>
                          {flag.resolved && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">Resolved</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Flagged: {new Date(flag.flagged_at).toLocaleString()}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {flag.rule_details?.map((rule, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {rule.rule_name}: {rule.reason}
                            </Badge>
                          ))}
                        </div>
                        {flag.transaction && (
                          <div className="text-sm bg-muted/50 p-2 rounded mt-2">
                            <span className="font-medium">Details:</span> {flag.transaction.item_type} x{flag.transaction.quantity} | 
                            Risk Score: {flag.transaction.risk_score} | 
                            Status: {flag.transaction.status}
                          </div>
                        )}
                      </div>
                      {!flag.resolved && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleResolveFlag(flag.flag_id, 'cleared')}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleResolveFlag(flag.flag_id, 'blocked')}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Block
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Rule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule?.rule_id ? 'Edit Rule' : 'Create Custom Rule'}</DialogTitle>
            <DialogDescription>Configure the flagging rule parameters</DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input 
                  value={editingRule.name || ''} 
                  onChange={(e) => setEditingRule({...editingRule, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  value={editingRule.description || ''} 
                  onChange={(e) => setEditingRule({...editingRule, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <Select value={editingRule.severity} onValueChange={(v) => setEditingRule({...editingRule, severity: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch 
                    checked={editingRule.auto_review || false}
                    onCheckedChange={(v) => setEditingRule({...editingRule, auto_review: v})}
                  />
                  <label className="text-sm">Auto-create review</label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRule}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Rules Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Flagging Rules</DialogTitle>
            <DialogDescription>Test rules against a sample transaction</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Citizen ID</label>
              <Input 
                value={testForm.citizen_id}
                onChange={(e) => setTestForm({...testForm, citizen_id: e.target.value})}
                placeholder="demo_citizen_001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dealer ID</label>
              <Input 
                value={testForm.dealer_id}
                onChange={(e) => setTestForm({...testForm, dealer_id: e.target.value})}
                placeholder="demo_dealer_001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Item Type</label>
              <Select value={testForm.item_type} onValueChange={(v) => setTestForm({...testForm, item_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="firearm">Firearm</SelectItem>
                  <SelectItem value="ammunition">Ammunition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input 
                type="number"
                value={testForm.quantity}
                onChange={(e) => setTestForm({...testForm, quantity: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <Button onClick={handleTestRules} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Run Test
          </Button>
          {testResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {testResult.would_be_flagged ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                <span className="font-semibold">
                  {testResult.would_be_flagged ? 'Would be FLAGGED' : 'Would NOT be flagged'}
                </span>
              </div>
              {testResult.flagging_result?.triggered_rules?.length > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="text-sm font-medium">Triggered Rules:</div>
                  {testResult.flagging_result.triggered_rules.map((rule, idx) => (
                    <div key={idx} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                      <span className="font-medium">{rule.rule_name}</span>: {rule.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FlaggingRules;
