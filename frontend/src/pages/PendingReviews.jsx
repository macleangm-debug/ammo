import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Activity, AlertTriangle, Settings, Target,
  FileText, Building, Clock, CheckCircle, XCircle, Eye,
  ChevronRight, Search, Filter, RefreshCw, Loader2,
  User, Users, Mail, Calendar, MapPin, ArrowUpRight, Shield, Bell, Palette, Handshake
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

const PendingReviews = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({});
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewDetail, setReviewDetail] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [noteText, setNoteText] = useState("");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'owners', path: '/government/owners', label: 'Owners', icon: Users },
    { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
    { id: 'templates', path: '/government/templates', label: 'Templates', icon: FileText },
    { id: 'cert-config', path: '/government/certificate-config', label: 'Cert Config', icon: Palette },
    { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
    { id: 'predictive', path: '/government/predictive', label: 'Analytics', icon: Activity },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
    { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
    { id: 'partners', path: '/government/partners', label: 'Partners', icon: Handshake },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  const typeLabels = {
    license_application: "License Application",
    license_renewal: "License Renewal",
    dealer_certification: "Dealer Certification",
    flagged_transaction: "Flagged Transaction",
    compliance_violation: "Compliance Violation",
    appeal: "Appeal"
  };

  const typeIcons = {
    license_application: FileText,
    license_renewal: RefreshCw,
    dealer_certification: Building,
    flagged_transaction: AlertTriangle,
    compliance_violation: XCircle,
    appeal: Shield
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    under_review: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    escalated: "bg-purple-100 text-purple-800",
    withdrawn: "bg-gray-100 text-gray-800"
  };

  const priorityColors = {
    low: "bg-slate-100 text-slate-700",
    normal: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700"
  };

  useEffect(() => {
    fetchReviews();
    fetchCounts();
  }, [statusFilter, typeFilter, regionFilter]);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.append("item_type", typeFilter);
      if (regionFilter && regionFilter !== "all") params.append("region", regionFilter);
      params.append("limit", "50");
      
      const response = await api.get(`/reviews?${params.toString()}`);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, typeFilter, regionFilter]);

  const fetchCounts = useCallback(async () => {
    try {
      const response = await api.get("/reviews/pending-count");
      setCounts(response.data);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  }, [api]);

  const handleViewDetail = useCallback(async (review) => {
    setSelectedReview(review);
    try {
      const response = await api.get(`/reviews/${review.review_id}`);
      setReviewDetail(response.data);
    } catch (error) {
      toast.error("Failed to load review details");
    }
  }, [api]);

  const handleDecision = useCallback(async (decision) => {
    if (!decisionReason.trim()) {
      toast.error("Please provide a reason for your decision");
      return;
    }
    setProcessing(true);
    try {
      await api.put(`/reviews/${selectedReview.review_id}`, {
        status: decision,
        decision_reason: decisionReason
      });
      toast.success(`Review ${decision === 'approved' ? 'approved' : 'rejected'} successfully`);
      setSelectedReview(null);
      setReviewDetail(null);
      setDecisionReason("");
      fetchReviews();
      fetchCounts();
    } catch (error) {
      toast.error("Failed to update review");
    } finally {
      setProcessing(false);
    }
  }, [api, decisionReason, selectedReview, fetchReviews, fetchCounts]);

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim()) return;
    setProcessing(true);
    try {
      await api.put(`/reviews/${selectedReview.review_id}`, {
        note: noteText
      });
      toast.success("Note added successfully");
      setNoteText("");
      handleViewDetail(selectedReview);
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setProcessing(false);
    }
  }, [api, noteText, selectedReview, handleViewDetail]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.submitter_name?.toLowerCase().includes(query) ||
      r.submitter_email?.toLowerCase().includes(query) ||
      r.review_id?.toLowerCase().includes(query) ||
      r.item_type?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Pending Reviews"
      subtitle="Government Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setStatusFilter("pending"); setTypeFilter("all"); }}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-primary">{counts.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total Pending</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTypeFilter("license_application")}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{counts.license_applications || 0}</div>
              <div className="text-xs text-muted-foreground">License Apps</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTypeFilter("license_renewal")}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{counts.license_renewals || 0}</div>
              <div className="text-xs text-muted-foreground">Renewals</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTypeFilter("dealer_certification")}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{counts.dealer_certifications || 0}</div>
              <div className="text-xs text-muted-foreground">Dealer Certs</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTypeFilter("flagged_transaction")}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{counts.flagged_transactions || 0}</div>
              <div className="text-xs text-muted-foreground">Flagged Txns</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTypeFilter("compliance_violation")}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{counts.compliance_violations || 0}</div>
              <div className="text-xs text-muted-foreground">Violations</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setTypeFilter("appeal")}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{counts.appeals || 0}</div>
              <div className="text-xs text-muted-foreground">Appeals</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Search by name, email, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="review-search-input"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="status-filter-select">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="type-filter-select">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="license_application">License Application</SelectItem>
                  <SelectItem value="license_renewal">License Renewal</SelectItem>
                  <SelectItem value="dealer_certification">Dealer Certification</SelectItem>
                  <SelectItem value="flagged_transaction">Flagged Transaction</SelectItem>
                  <SelectItem value="compliance_violation">Compliance Violation</SelectItem>
                  <SelectItem value="appeal">Appeal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[150px]" data-testid="region-filter-select">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="northeast">Northeast</SelectItem>
                  <SelectItem value="southeast">Southeast</SelectItem>
                  <SelectItem value="midwest">Midwest</SelectItem>
                  <SelectItem value="southwest">Southwest</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { setStatusFilter("pending"); setTypeFilter("all"); setRegionFilter("all"); setSearchQuery(""); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Review Items ({filteredReviews.length})</span>
              <Button variant="outline" size="sm" onClick={fetchReviews}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No reviews found matching your criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReviews.map((review) => {
                  const TypeIcon = typeIcons[review.item_type] || FileText;
                  return (
                    <div 
                      key={review.review_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleViewDetail(review)}
                      data-testid={`review-item-${review.review_id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TypeIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{typeLabels[review.item_type]}</span>
                            <Badge className={priorityColors[review.priority] || priorityColors.normal}>
                              {review.priority}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                            {review.submitter_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {review.submitter_name}
                              </span>
                            )}
                            {review.region && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {review.region}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[review.status]}>
                          {review.status?.replace(/_/g, ' ')}
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Detail Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => { setSelectedReview(null); setReviewDetail(null); setDecisionReason(""); setNoteText(""); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReview && (() => {
                const TypeIcon = typeIcons[selectedReview.item_type] || FileText;
                return <TypeIcon className="w-5 h-5 text-primary" />;
              })()}
              {selectedReview && typeLabels[selectedReview.item_type]}
            </DialogTitle>
            <DialogDescription>
              Review ID: {selectedReview?.review_id}
            </DialogDescription>
          </DialogHeader>
          
          {reviewDetail && (
            <div className="space-y-6">
              {/* Status & Priority */}
              <div className="flex items-center gap-3">
                <Badge className={statusColors[reviewDetail.review?.status]}>
                  {reviewDetail.review?.status?.replace(/_/g, ' ')}
                </Badge>
                <Badge className={priorityColors[reviewDetail.review?.priority]}>
                  {reviewDetail.review?.priority} priority
                </Badge>
                {reviewDetail.review?.region && (
                  <Badge variant="outline">{reviewDetail.review.region}</Badge>
                )}
              </div>

              {/* Submitter Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Submitter Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{reviewDetail.review?.submitter_name || "Anonymous"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">{reviewDetail.review?.submitter_email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="ml-2">{formatDate(reviewDetail.review?.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="ml-2">{reviewDetail.review?.submitted_by || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Application Data */}
              {reviewDetail.associated_data && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Application Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(reviewDetail.associated_data).map(([key, value]) => {
                      if (key.includes('_at') || key.includes('_id') || key === 'review_id') return null;
                      if (typeof value === 'boolean') value = value ? 'Yes' : 'No';
                      if (Array.isArray(value)) value = value.join(', ') || 'None';
                      if (typeof value === 'object') return null;
                      return (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="ml-2 font-medium">{value || 'N/A'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {reviewDetail.review?.notes?.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Notes</h4>
                  <div className="space-y-3">
                    {reviewDetail.review.notes.map((note, idx) => (
                      <div key={idx} className="bg-muted/50 rounded p-3 text-sm">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                          <span>{note.author_name}</span>
                          <span>{formatDate(note.timestamp)}</span>
                        </div>
                        <p>{note.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Note - with isolated state to prevent parent re-renders */}
              {(reviewDetail.review?.status === 'pending' || reviewDetail.review?.status === 'under_review') && (
                <NoteInput
                  noteText={noteText}
                  onNoteChange={setNoteText}
                  onAddNote={handleAddNote}
                  processing={processing}
                />
              )}

              {/* Decision - with isolated state to prevent parent re-renders */}
              {(reviewDetail.review?.status === 'pending' || reviewDetail.review?.status === 'under_review') && (
                <DecisionInput
                  decisionReason={decisionReason}
                  onReasonChange={setDecisionReason}
                  onDecision={handleDecision}
                  processing={processing}
                />
              )}

              {/* Decision Made */}
              {reviewDetail.review?.decided_at && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Decision</h4>
                  <div className="text-sm">
                    <p><strong>Status:</strong> {reviewDetail.review.status}</p>
                    <p><strong>Decided by:</strong> {reviewDetail.review.decided_by}</p>
                    <p><strong>Date:</strong> {formatDate(reviewDetail.review.decided_at)}</p>
                    {reviewDetail.review.decision_reason && (
                      <p className="mt-2"><strong>Reason:</strong> {reviewDetail.review.decision_reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedReview(null); setReviewDetail(null); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// Memoized Note Input Component to isolate re-renders
const NoteInput = memo(({ noteText, onNoteChange, onAddNote, processing }) => {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-semibold mb-3">Add Note</h4>
      <div className="flex gap-2">
        <Input 
          placeholder="Add a note..."
          value={noteText}
          onChange={(e) => onNoteChange(e.target.value)}
          className="flex-1"
          data-testid="note-input"
        />
        <Button onClick={onAddNote} disabled={processing || !noteText.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
});

NoteInput.displayName = 'NoteInput';

// Memoized Decision Input Component to isolate re-renders
const DecisionInput = memo(({ decisionReason, onReasonChange, onDecision, processing }) => {
  return (
    <div className="border-t pt-4">
      <h4 className="font-semibold mb-3">Make Decision</h4>
      <div className="space-y-3">
        <Textarea 
          placeholder="Reason for decision (required)..."
          value={decisionReason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          data-testid="decision-reason-input"
        />
        <div className="flex gap-3">
          <Button 
            onClick={() => onDecision('approved')} 
            disabled={processing}
            className="bg-green-600 hover:bg-green-700"
            data-testid="approve-btn"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Approve
          </Button>
          <Button 
            onClick={() => onDecision('rejected')} 
            disabled={processing}
            variant="destructive"
            data-testid="reject-btn"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
});

DecisionInput.displayName = 'DecisionInput';

export default PendingReviews;
