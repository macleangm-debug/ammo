import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Settings, LayoutDashboard, FileText, Bell, Activity, 
  AlertTriangle, Palette, Save, Loader2, Users, DollarSign,
  Clock, Shield, GraduationCap, Target, Building, CheckCircle,
  XCircle, RefreshCw, ChevronRight, AlertCircle, Hospital,
  Plus, Edit, Trash2, Globe, Percent, Calendar, Award, Play,
  Pause, Zap, History, UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
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
  { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
  { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
];

const GovernmentPolicies = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("fees");
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [hospitalForm, setHospitalForm] = useState({
    name: "", hospital_type: "national", address: "", city: "", state: "",
    country: "USA", phone: "", email: "", accreditation_number: "", accreditation_expiry: ""
  });
  const [enforcementStatus, setEnforcementStatus] = useState(null);
  const [enforcementHistory, setEnforcementHistory] = useState([]);
  const [runningEnforcement, setRunningEnforcement] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [policiesRes, currenciesRes, hospitalsRes, complianceRes, enforcementRes] = await Promise.all([
        api.get("/government/policies"),
        api.get("/government/supported-currencies"),
        api.get("/government/accredited-hospitals"),
        api.get("/government/compliance-status").catch(() => ({ data: null })),
        api.get("/government/enforcement/status").catch(() => ({ data: null }))
      ]);
      
      setPolicies(policiesRes.data);
      setCurrencies(currenciesRes.data.currencies || []);
      setHospitals(hospitalsRes.data.hospitals || []);
      setComplianceStatus(complianceRes.data);
      setEnforcementStatus(enforcementRes.data);
      
      // Fetch enforcement history
      const historyRes = await api.get("/government/enforcement/history?limit=5").catch(() => ({ data: { executions: [] } }));
      setEnforcementHistory(historyRes.data.executions || []);
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyChange = (category, field, value) => {
    setPolicies(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSavePolicies = async () => {
    try {
      setSaving(true);
      await api.put("/government/policies", policies);
      toast.success("Policies saved successfully");
    } catch (error) {
      toast.error("Failed to save policies");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async (presetName) => {
    try {
      setSaving(true);
      const response = await api.post("/government/policies/apply-preset", { preset_name: presetName });
      setPolicies(response.data.policies);
      toast.success(`Applied ${presetName} preset successfully`);
    } catch (error) {
      toast.error("Failed to apply preset");
    } finally {
      setSaving(false);
    }
  };

  const handleRunComplianceCheck = async () => {
    try {
      setSaving(true);
      const response = await api.post("/government/run-compliance-check");
      toast.success(`Compliance check completed: ${response.data.actions_taken.warnings_sent} warnings, ${response.data.actions_taken.suspensions_issued} suspensions`);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to run compliance check");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHospital = async () => {
    try {
      if (editingHospital) {
        await api.put(`/government/accredited-hospitals/${editingHospital.hospital_id}`, hospitalForm);
        toast.success("Hospital updated successfully");
      } else {
        await api.post("/government/accredited-hospitals", hospitalForm);
        toast.success("Hospital added successfully");
      }
      setShowHospitalDialog(false);
      setEditingHospital(null);
      setHospitalForm({ name: "", hospital_type: "national", address: "", city: "", state: "", country: "USA", phone: "", email: "", accreditation_number: "", accreditation_expiry: "" });
      fetchAllData();
    } catch (error) {
      toast.error("Failed to save hospital");
    }
  };

  const handleDeleteHospital = async (hospitalId) => {
    if (!confirm("Are you sure you want to deactivate this hospital?")) return;
    try {
      await api.delete(`/government/accredited-hospitals/${hospitalId}`);
      toast.success("Hospital deactivated");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to deactivate hospital");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getCurrencySymbol = () => policies?.fees?.currency_symbol || "$";

  if (loading) {
    return (
      <DashboardLayout user={user} navItems={NAV_ITEMS} title="Policy Management" subtitle="Government Portal" onLogout={handleLogout} api={api}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navItems={NAV_ITEMS} title="Policy Management" subtitle="Government Portal" onLogout={handleLogout} api={api}>
      <div className="space-y-6" data-testid="policies-page">
        {/* Header with Presets */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Platform Policies</h2>
            <p className="text-muted-foreground">Configure fees, compliance rules, and training requirements</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={policies?.preset_name || "standard"} onValueChange={handleApplyPreset}>
              <SelectTrigger className="w-[180px]" data-testid="preset-select">
                <SelectValue placeholder="Select Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict Policy</SelectItem>
                <SelectItem value="standard">Standard Policy</SelectItem>
                <SelectItem value="permissive">Permissive Policy</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSavePolicies} disabled={saving} data-testid="save-policies-btn">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save All Changes
            </Button>
          </div>
        </div>

        {/* Current Preset Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={policies?.preset_name === "strict" ? "destructive" : policies?.preset_name === "permissive" ? "secondary" : "default"}>
            {policies?.preset_name?.toUpperCase() || "STANDARD"} POLICY
          </Badge>
          {policies?.last_updated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(policies.last_updated).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Policy Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="fees"><DollarSign className="w-4 h-4 mr-1" /> Fees</TabsTrigger>
            <TabsTrigger value="escalation"><AlertCircle className="w-4 h-4 mr-1" /> Escalation</TabsTrigger>
            <TabsTrigger value="training"><GraduationCap className="w-4 h-4 mr-1" /> Training</TabsTrigger>
            <TabsTrigger value="ari"><Award className="w-4 h-4 mr-1" /> ARI</TabsTrigger>
            <TabsTrigger value="additional"><Settings className="w-4 h-4 mr-1" /> Additional</TabsTrigger>
            <TabsTrigger value="hospitals"><Hospital className="w-4 h-4 mr-1" /> Hospitals</TabsTrigger>
          </TabsList>

          {/* FEES TAB */}
          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Fee Policies
                </CardTitle>
                <CardDescription>Configure annual fees, late penalties, and currency settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Currency Selection */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select 
                      value={policies?.fees?.currency || "USD"} 
                      onValueChange={(v) => {
                        const curr = currencies.find(c => c.code === v);
                        handlePolicyChange("fees", "currency", v);
                        handlePolicyChange("fees", "currency_symbol", curr?.symbol || "$");
                      }}
                    >
                      <SelectTrigger data-testid="currency-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency Symbol</Label>
                    <Input value={policies?.fees?.currency_symbol || "$"} disabled className="bg-muted" />
                  </div>
                </div>

                <Separator />

                {/* Fee Amounts */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Member Annual License Fee</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol()}</span>
                      <Input 
                        type="number" 
                        value={policies?.fees?.member_annual_license_fee || 150} 
                        onChange={(e) => handlePolicyChange("fees", "member_annual_license_fee", parseFloat(e.target.value))}
                        className="pl-8"
                        data-testid="license-fee-input"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Annual fee to maintain a firearm license</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Per-Firearm Registration Fee</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol()}</span>
                      <Input 
                        type="number" 
                        value={policies?.fees?.per_firearm_registration_fee || 50} 
                        onChange={(e) => handlePolicyChange("fees", "per_firearm_registration_fee", parseFloat(e.target.value))}
                        className="pl-8"
                        data-testid="firearm-fee-input"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Annual fee per registered firearm</p>
                  </div>
                </div>

                <Separator />

                {/* Late Fee Policies */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Late Fee Penalty (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={policies?.fees?.late_fee_penalty_percent || 10} 
                        onChange={(e) => handlePolicyChange("fees", "late_fee_penalty_percent", parseFloat(e.target.value))}
                        data-testid="late-fee-input"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%/month</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Percentage added to overdue fees per month</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Grace Period (Days)</Label>
                    <Input 
                      type="number" 
                      value={policies?.fees?.grace_period_days || 30} 
                      onChange={(e) => handlePolicyChange("fees", "grace_period_days", parseInt(e.target.value))}
                      data-testid="grace-period-input"
                    />
                    <p className="text-xs text-muted-foreground">Days before late fees begin accruing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ESCALATION TAB */}
          <TabsContent value="escalation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Compliance Escalation
                </CardTitle>
                <CardDescription>Configure warning intervals and suspension rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Compliance Status Summary */}
                {complianceStatus && (
                  <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{complianceStatus.summary?.compliant || 0}</div>
                      <div className="text-xs text-muted-foreground">Compliant</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{complianceStatus.summary?.in_grace_period || 0}</div>
                      <div className="text-xs text-muted-foreground">In Grace</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{complianceStatus.summary?.warning_issued || 0}</div>
                      <div className="text-xs text-muted-foreground">Warned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{complianceStatus.summary?.suspended || 0}</div>
                      <div className="text-xs text-muted-foreground">Suspended</div>
                    </div>
                    <div className="text-center">
                      <Button variant="outline" size="sm" onClick={handleRunComplianceCheck} disabled={saving}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Run Check
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Escalation Settings */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Grace Period (Days)</Label>
                    <Input 
                      type="number" 
                      value={policies?.escalation?.grace_period_days || 30} 
                      onChange={(e) => handlePolicyChange("escalation", "grace_period_days", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Days after due date before warnings begin</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Warning Intervals (Days after Grace)</Label>
                    <Input 
                      value={(policies?.escalation?.warning_intervals || [3, 5, 10]).join(", ")} 
                      onChange={(e) => handlePolicyChange("escalation", "warning_intervals", e.target.value.split(",").map(v => parseInt(v.trim())).filter(v => !isNaN(v)))}
                      placeholder="3, 5, 10"
                    />
                    <p className="text-xs text-muted-foreground">Days when warnings are sent (comma-separated)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Suspension Trigger (Days after final warning)</Label>
                    <Input 
                      type="number" 
                      value={policies?.escalation?.suspension_trigger_days || 15} 
                      onChange={(e) => handlePolicyChange("escalation", "suspension_trigger_days", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-suspend on License Expiry</Label>
                    <div className="pt-2">
                      <Switch 
                        checked={policies?.escalation?.auto_suspend_on_expiry ?? true} 
                        onCheckedChange={(v) => handlePolicyChange("escalation", "auto_suspend_on_expiry", v)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Service Restrictions */}
                <h4 className="font-semibold">Service Restrictions on Suspension</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Block Dealer Transactions</div>
                      <div className="text-xs text-muted-foreground">Prevent purchases from dealers</div>
                    </div>
                    <Switch 
                      checked={policies?.escalation?.block_dealer_transactions ?? true} 
                      onCheckedChange={(v) => handlePolicyChange("escalation", "block_dealer_transactions", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Block Government Services</div>
                      <div className="text-xs text-muted-foreground">Prevent license renewals, etc.</div>
                    </div>
                    <Switch 
                      checked={policies?.escalation?.block_government_services ?? true} 
                      onCheckedChange={(v) => handlePolicyChange("escalation", "block_government_services", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Flag Firearm Repossession</div>
                      <div className="text-xs text-muted-foreground">Mark firearms for collection</div>
                    </div>
                    <Switch 
                      checked={policies?.escalation?.flag_firearm_repossession ?? true} 
                      onCheckedChange={(v) => handlePolicyChange("escalation", "flag_firearm_repossession", v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRAINING TAB */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Training & Certification Requirements
                </CardTitle>
                <CardDescription>Set mandatory training hours and certification requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Mandatory Initial Training (Hours)</Label>
                    <Input 
                      type="number" 
                      value={policies?.training?.mandatory_initial_training_hours || 8} 
                      onChange={(e) => handlePolicyChange("training", "mandatory_initial_training_hours", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Hours required for new license applicants</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Refresher Training (Hours)</Label>
                    <Input 
                      type="number" 
                      value={policies?.training?.annual_refresher_training_hours || 4} 
                      onChange={(e) => handlePolicyChange("training", "annual_refresher_training_hours", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Hours required annually for renewal</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Range Practice Sessions (Per Year)</Label>
                    <Input 
                      type="number" 
                      value={policies?.training?.range_practice_sessions_per_year || 2} 
                      onChange={(e) => handlePolicyChange("training", "range_practice_sessions_per_year", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Mandatory supervised range sessions</p>
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold">Certification Requirements</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">First Aid Certification</div>
                      <div className="text-xs text-muted-foreground">Require valid first aid/CPR certification</div>
                    </div>
                    <Switch 
                      checked={policies?.training?.first_aid_certification_required ?? true} 
                      onCheckedChange={(v) => handlePolicyChange("training", "first_aid_certification_required", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Safe Storage Training</div>
                      <div className="text-xs text-muted-foreground">Require safe storage certification</div>
                    </div>
                    <Switch 
                      checked={policies?.training?.safe_storage_training_required ?? true} 
                      onCheckedChange={(v) => handlePolicyChange("training", "safe_storage_training_required", v)}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold">Mental Health Assessment</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Mental Health Assessment Required</div>
                      <div className="text-xs text-muted-foreground">Require periodic mental health evaluation</div>
                    </div>
                    <Switch 
                      checked={policies?.training?.mental_health_assessment_required ?? true} 
                      onCheckedChange={(v) => handlePolicyChange("training", "mental_health_assessment_required", v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assessment Interval (Months)</Label>
                    <Input 
                      type="number" 
                      value={policies?.training?.mental_health_assessment_interval_months || 24} 
                      onChange={(e) => handlePolicyChange("training", "mental_health_assessment_interval_months", parseInt(e.target.value))}
                      disabled={!policies?.training?.mental_health_assessment_required}
                    />
                    <p className="text-xs text-muted-foreground">How often reassessment is required</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ARI TAB */}
          <TabsContent value="ari">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  ARI (Accountability Responsibility Index) Policies
                </CardTitle>
                <CardDescription>Configure point system for responsible ownership scoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <h4 className="font-semibold text-green-600">Point Rewards</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Per Training Hour</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.points_per_training_hour || 5} 
                      onChange={(e) => handlePolicyChange("ari", "points_per_training_hour", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Range Session</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.points_per_range_session || 10} 
                      onChange={(e) => handlePolicyChange("ari", "points_per_range_session", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Community Event</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.points_per_community_event || 15} 
                      onChange={(e) => handlePolicyChange("ari", "points_per_community_event", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Safety Course</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.points_per_safety_course || 20} 
                      onChange={(e) => handlePolicyChange("ari", "points_per_safety_course", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold text-red-600">Point Penalties</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Minor Violation</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.penalty_points_minor_violation || -10} 
                      onChange={(e) => handlePolicyChange("ari", "penalty_points_minor_violation", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Late payments, expired certs</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Major Violation</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.penalty_points_major_violation || -25} 
                      onChange={(e) => handlePolicyChange("ari", "penalty_points_major_violation", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Safety violations, negligence</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Accident-Free Year Bonus</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.bonus_accident_free_year || 10} 
                      onChange={(e) => handlePolicyChange("ari", "bonus_accident_free_year", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Annual bonus for clean record</p>
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold">Score Thresholds</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Maximum ARI Score</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.max_ari_score || 100} 
                      onChange={(e) => handlePolicyChange("ari", "max_ari_score", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum ARI for License Renewal</Label>
                    <Input 
                      type="number" 
                      value={policies?.ari?.min_ari_for_renewal || 50} 
                      onChange={(e) => handlePolicyChange("ari", "min_ari_for_renewal", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Users below this cannot renew</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADDITIONAL TAB */}
          <TabsContent value="additional">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Additional Regulatory Policies
                </CardTitle>
                <CardDescription>Background checks, insurance, waiting periods, and age restrictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <h4 className="font-semibold">Background & Safety Checks</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Background Check Renewal (Months)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.background_check_renewal_months || 12} 
                      onChange={(e) => handlePolicyChange("additional", "background_check_renewal_months", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Safe Storage Inspection</div>
                      <div className="text-xs text-muted-foreground">Require periodic inspections</div>
                    </div>
                    <Switch 
                      checked={policies?.additional?.safe_storage_inspection_required ?? true} 
                      onCheckedChange={(v) => handlePolicyChange("additional", "safe_storage_inspection_required", v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inspection Interval (Months)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.safe_storage_inspection_interval_months || 12} 
                      onChange={(e) => handlePolicyChange("additional", "safe_storage_inspection_interval_months", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold">Insurance Requirements</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Liability Insurance Required</div>
                      <div className="text-xs text-muted-foreground">Mandate insurance coverage</div>
                    </div>
                    <Switch 
                      checked={policies?.additional?.insurance_required ?? false} 
                      onCheckedChange={(v) => handlePolicyChange("additional", "insurance_required", v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Coverage Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol()}</span>
                      <Input 
                        type="number" 
                        value={policies?.additional?.insurance_minimum_coverage || 100000} 
                        onChange={(e) => handlePolicyChange("additional", "insurance_minimum_coverage", parseFloat(e.target.value))}
                        className="pl-8"
                        disabled={!policies?.additional?.insurance_required}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold">Waiting & Cooling-Off Periods</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Waiting Period for Purchases (Days)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.waiting_period_days || 7} 
                      onChange={(e) => handlePolicyChange("additional", "waiting_period_days", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Days between approval and pickup</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cooling-Off Period (Days)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.cooling_off_period_days || 3} 
                      onChange={(e) => handlePolicyChange("additional", "cooling_off_period_days", parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Days between purchases</p>
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold">Firearm Limits</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Max Firearms (Standard License)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.max_firearms_standard_license || 5} 
                      onChange={(e) => handlePolicyChange("additional", "max_firearms_standard_license", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Firearms (Collector License)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.max_firearms_collector_license || 20} 
                      onChange={(e) => handlePolicyChange("additional", "max_firearms_collector_license", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold">Age Restrictions</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Minimum Age (Handgun)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.min_age_handgun || 21} 
                      onChange={(e) => handlePolicyChange("additional", "min_age_handgun", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Age (Rifle)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.min_age_rifle || 18} 
                      onChange={(e) => handlePolicyChange("additional", "min_age_rifle", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Age (Shotgun)</Label>
                    <Input 
                      type="number" 
                      value={policies?.additional?.min_age_shotgun || 18} 
                      onChange={(e) => handlePolicyChange("additional", "min_age_shotgun", parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HOSPITALS TAB */}
          <TabsContent value="hospitals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Hospital className="w-5 h-5" />
                    Accredited Hospitals
                  </span>
                  <Button onClick={() => { setEditingHospital(null); setHospitalForm({ name: "", hospital_type: "national", address: "", city: "", state: "", country: "USA", phone: "", email: "", accreditation_number: "", accreditation_expiry: "" }); setShowHospitalDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Hospital
                  </Button>
                </CardTitle>
                <CardDescription>Manage accredited hospitals for mental health assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {hospitals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Hospital className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No accredited hospitals configured.</p>
                    <p className="text-sm">Add hospitals that can perform mental health assessments.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hospitals.map(hospital => (
                      <div key={hospital.hospital_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Hospital className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{hospital.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {hospital.city}, {hospital.state} • {hospital.hospital_type}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={hospital.status === "active" ? "default" : "secondary"}>
                            {hospital.status}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingHospital(hospital); setHospitalForm(hospital); setShowHospitalDialog(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteHospital(hospital.hospital_id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hospital Dialog */}
      <Dialog open={showHospitalDialog} onOpenChange={setShowHospitalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingHospital ? "Edit Hospital" : "Add Accredited Hospital"}</DialogTitle>
            <DialogDescription>
              Enter details for the accredited hospital
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hospital Name</Label>
                <Input value={hospitalForm.name} onChange={(e) => setHospitalForm({...hospitalForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={hospitalForm.hospital_type} onValueChange={(v) => setHospitalForm({...hospitalForm, hospital_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={hospitalForm.address} onChange={(e) => setHospitalForm({...hospitalForm, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={hospitalForm.city} onChange={(e) => setHospitalForm({...hospitalForm, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={hospitalForm.state} onChange={(e) => setHospitalForm({...hospitalForm, state: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={hospitalForm.country} onChange={(e) => setHospitalForm({...hospitalForm, country: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={hospitalForm.phone} onChange={(e) => setHospitalForm({...hospitalForm, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={hospitalForm.email} onChange={(e) => setHospitalForm({...hospitalForm, email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Accreditation Number</Label>
                <Input value={hospitalForm.accreditation_number} onChange={(e) => setHospitalForm({...hospitalForm, accreditation_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Accreditation Expiry</Label>
                <Input type="date" value={hospitalForm.accreditation_expiry} onChange={(e) => setHospitalForm({...hospitalForm, accreditation_expiry: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHospitalDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveHospital}>
              {editingHospital ? "Update" : "Add"} Hospital
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GovernmentPolicies;
