import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, CreditCard, GraduationCap, ShoppingBag, 
  History, Bell, Settings, CheckCircle, AlertTriangle, 
  Calendar, Shield, Clock, RefreshCw, Download, FileText,
  Send, Loader2, Scale
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
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
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const LicensePage = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myReviews, setMyReviews] = useState([]);
  
  // Dialog states
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Renewal form
  const [renewalForm, setRenewalForm] = useState({
    reason_for_renewal: "standard",
    address_changed: false,
    new_address: "",
    training_current: true,
    recent_training_certificate: "",
    any_incidents: false,
    incident_details: "",
    region: "northeast"
  });
  
  // Appeal form
  const [appealForm, setAppealForm] = useState({
    original_decision_type: "license_rejection",
    original_decision_id: "",
    original_decision_date: "",
    grounds_for_appeal: "",
    supporting_evidence: "",
    requested_outcome: "",
    region: "northeast"
  });

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
    fetchProfile();
    fetchMyReviews();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/citizen/profile");
      setProfile(response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load license information");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyReviews = async () => {
    try {
      const response = await api.get("/citizen/my-reviews");
      setMyReviews(response.data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };
  
  const handleSubmitRenewal = async () => {
    setSubmitting(true);
    try {
      await api.post("/citizen/license-renewal", {
        ...renewalForm,
        expiry_date: profile?.license_expiry || ""
      });
      toast.success("License renewal request submitted successfully!");
      setShowRenewalDialog(false);
      setRenewalForm({
        reason_for_renewal: "standard", address_changed: false, new_address: "",
        training_current: true, recent_training_certificate: "", any_incidents: false,
        incident_details: "", region: "northeast"
      });
      fetchMyReviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit renewal request");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleSubmitAppeal = async () => {
    if (!appealForm.grounds_for_appeal || !appealForm.requested_outcome) {
      toast.error("Please provide grounds for appeal and requested outcome");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/citizen/appeal", appealForm);
      toast.success("Appeal submitted successfully!");
      setShowAppealDialog(false);
      setAppealForm({
        original_decision_type: "license_rejection", original_decision_id: "",
        original_decision_date: "", grounds_for_appeal: "", supporting_evidence: "",
        requested_outcome: "", region: "northeast"
      });
      fetchMyReviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit appeal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-success/10 text-success border-success/20',
      pending: 'bg-warning/10 text-warning border-warning/20',
      expired: 'bg-danger/10 text-danger border-danger/20',
      suspended: 'bg-danger/10 text-danger border-danger/20',
    };
    return colors[status] || colors.pending;
  };

  const daysUntilExpiry = profile?.license_expiry 
    ? Math.ceil((new Date(profile.license_expiry) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="My License"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading license information...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="My License"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="license-page">
        {/* License Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">License Number</p>
                  <p className="text-2xl font-bold font-mono">{profile?.license_number || 'Not Registered'}</p>
                </div>
              </div>
              <Badge className={`text-sm px-4 py-2 ${getStatusColor(profile?.license_status)}`}>
                {profile?.license_status?.toUpperCase() || 'N/A'}
              </Badge>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  License Type
                </p>
                <p className="font-semibold capitalize">{profile?.license_type || 'Standard'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expiry Date
                </p>
                <p className="font-semibold">
                  {profile?.license_expiry 
                    ? new Date(profile.license_expiry).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Days Remaining
                </p>
                <p className={`font-semibold ${daysUntilExpiry < 30 ? 'text-warning' : daysUntilExpiry < 7 ? 'text-danger' : 'text-success'}`}>
                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compliance Score</p>
                  <p className="text-xl font-bold">{profile?.compliance_score || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchases</p>
                  <p className="text-xl font-bold">{profile?.total_purchases || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Biometric Status</p>
                  <p className="text-xl font-bold">{profile?.biometric_verified ? 'Verified' : 'Pending'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Violations</p>
                  <p className="text-xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">License Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => setShowRenewalDialog(true)}
                data-testid="renew-license-btn"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Renew License</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => setShowAppealDialog(true)}
                data-testid="file-appeal-btn"
              >
                <Scale className="w-5 h-5" />
                <span>File Appeal</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                <Download className="w-5 h-5" />
                <span>Download PDF</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => navigate('/dashboard/history')}>
                <FileText className="w-5 h-5" />
                <span>View History</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* My Pending Requests */}
        {myReviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myReviews.map((review) => (
                  <div 
                    key={review.review_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        {review.item_type === 'license_renewal' ? (
                          <RefreshCw className="w-4 h-4 text-primary" />
                        ) : review.item_type === 'appeal' ? (
                          <Scale className="w-4 h-4 text-primary" />
                        ) : (
                          <FileText className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm capitalize">
                          {review.item_type?.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      review.status === 'approved' ? 'bg-green-100 text-green-800' :
                      review.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {review.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registered Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{user?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium">{user?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{profile?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{profile?.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renewal Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              License Renewal
            </DialogTitle>
            <DialogDescription>
              Submit a request to renew your license before it expires.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Renewal</Label>
              <Select value={renewalForm.reason_for_renewal} onValueChange={(v) => setRenewalForm({...renewalForm, reason_for_renewal: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Renewal</SelectItem>
                  <SelectItem value="early_renewal">Early Renewal</SelectItem>
                  <SelectItem value="expired">Expired License</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={renewalForm.region} onValueChange={(v) => setRenewalForm({...renewalForm, region: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="northeast">Northeast</SelectItem>
                  <SelectItem value="southeast">Southeast</SelectItem>
                  <SelectItem value="midwest">Midwest</SelectItem>
                  <SelectItem value="southwest">Southwest</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={renewalForm.address_changed}
                  onChange={(e) => setRenewalForm({...renewalForm, address_changed: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">My address has changed</span>
              </label>
              
              {renewalForm.address_changed && (
                <Input 
                  placeholder="New address"
                  value={renewalForm.new_address}
                  onChange={(e) => setRenewalForm({...renewalForm, new_address: e.target.value})}
                />
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={renewalForm.training_current}
                onChange={(e) => setRenewalForm({...renewalForm, training_current: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">My safety training is up to date</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={renewalForm.any_incidents}
                onChange={(e) => setRenewalForm({...renewalForm, any_incidents: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">I have had incidents to report</span>
            </label>
            
            {renewalForm.any_incidents && (
              <Textarea 
                placeholder="Please describe any incidents..."
                value={renewalForm.incident_details}
                onChange={(e) => setRenewalForm({...renewalForm, incident_details: e.target.value})}
                rows={3}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitRenewal} disabled={submitting} data-testid="submit-renewal-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appeal Dialog */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              File an Appeal
            </DialogTitle>
            <DialogDescription>
              Appeal a previous decision regarding your license or transactions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Type of Decision Being Appealed</Label>
              <Select value={appealForm.original_decision_type} onValueChange={(v) => setAppealForm({...appealForm, original_decision_type: v})}>
                <SelectTrigger data-testid="appeal-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="license_rejection">License Application Rejection</SelectItem>
                  <SelectItem value="license_revocation">License Revocation</SelectItem>
                  <SelectItem value="transaction_rejection">Transaction Rejection</SelectItem>
                  <SelectItem value="compliance_violation">Compliance Violation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="decision_id">Decision/Reference ID</Label>
                <Input 
                  id="decision_id"
                  value={appealForm.original_decision_id}
                  onChange={(e) => setAppealForm({...appealForm, original_decision_id: e.target.value})}
                  placeholder="e.g., REV-12345"
                  data-testid="appeal-decision-id-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="decision_date">Decision Date</Label>
                <Input 
                  id="decision_date"
                  type="date"
                  value={appealForm.original_decision_date}
                  onChange={(e) => setAppealForm({...appealForm, original_decision_date: e.target.value})}
                  data-testid="appeal-date-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grounds">Grounds for Appeal *</Label>
              <Textarea 
                id="grounds"
                value={appealForm.grounds_for_appeal}
                onChange={(e) => setAppealForm({...appealForm, grounds_for_appeal: e.target.value})}
                placeholder="Explain why you believe the decision should be reconsidered..."
                rows={4}
                data-testid="appeal-grounds-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Supporting Evidence</Label>
              <Textarea 
                id="evidence"
                value={appealForm.supporting_evidence}
                onChange={(e) => setAppealForm({...appealForm, supporting_evidence: e.target.value})}
                placeholder="Describe any supporting evidence you have..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Requested Outcome *</Label>
              <Input 
                id="outcome"
                value={appealForm.requested_outcome}
                onChange={(e) => setAppealForm({...appealForm, requested_outcome: e.target.value})}
                placeholder="What outcome are you requesting?"
                data-testid="appeal-outcome-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppealDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitAppeal} disabled={submitting} data-testid="submit-appeal-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Appeal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LicensePage;
