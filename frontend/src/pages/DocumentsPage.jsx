import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, CreditCard, GraduationCap, ShoppingBag, 
  History, Bell, Settings, Mail, FileText, Award, AlertTriangle,
  Shield, Download, Eye, Archive, Filter, RefreshCw, Search,
  ChevronRight, Calendar, User, CheckCircle, Clock
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const DocumentsPage = ({ user, api }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
    { id: 'documents', path: '/dashboard/documents', label: 'Documents', icon: Mail },
    { id: 'notifications', path: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchDocuments();
    fetchUnreadNotifications();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/citizen/documents");
      setDocuments(response.data?.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const response = await api.get("/citizen/notifications");
      const notifications = response.data || [];
      setUnreadNotifications(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const viewDocument = async (doc) => {
    try {
      const response = await api.get(`/citizen/documents/${doc.document_id}`);
      setSelectedDocument(response.data);
      setViewDialogOpen(true);
      
      // Update local state if it was unread
      if (doc.status === "sent") {
        setDocuments(documents.map(d => 
          d.document_id === doc.document_id ? { ...d, status: "read" } : d
        ));
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      toast.error("Failed to load document");
    }
  };

  const downloadDocument = async (doc) => {
    try {
      const response = await api.get(`/citizen/documents/${doc.document_id}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AMMO_${doc.document_type}_${doc.document_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Document downloaded");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const archiveDocument = async (doc) => {
    try {
      await api.post(`/citizen/documents/${doc.document_id}/archive`);
      setDocuments(documents.map(d => 
        d.document_id === doc.document_id ? { ...d, status: "archived" } : d
      ));
      toast.success("Document archived");
    } catch (error) {
      console.error("Error archiving document:", error);
      toast.error("Failed to archive document");
    }
  };

  const getTypeConfig = (type) => {
    const configs = {
      warning_letter: {
        icon: <AlertTriangle className="w-5 h-5" />,
        bg: "bg-red-100",
        iconColor: "text-red-600",
        borderColor: "border-red-300",
        label: "Warning Letter"
      },
      formal_notice: {
        icon: <FileText className="w-5 h-5" />,
        bg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        borderColor: "border-indigo-300",
        label: "Formal Notice"
      },
      achievement_certificate: {
        icon: <Award className="w-5 h-5" />,
        bg: "bg-amber-100",
        iconColor: "text-amber-600",
        borderColor: "border-amber-300",
        label: "Achievement"
      },
      license_certificate: {
        icon: <CreditCard className="w-5 h-5" />,
        bg: "bg-purple-100",
        iconColor: "text-purple-600",
        borderColor: "border-purple-300",
        label: "License Certificate"
      },
      training_certificate: {
        icon: <GraduationCap className="w-5 h-5" />,
        bg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        borderColor: "border-emerald-300",
        label: "Training Certificate"
      },
      compliance_certificate: {
        icon: <Shield className="w-5 h-5" />,
        bg: "bg-blue-100",
        iconColor: "text-blue-600",
        borderColor: "border-blue-300",
        label: "Compliance Certificate"
      }
    };
    return configs[type] || {
      icon: <Mail className="w-5 h-5" />,
      bg: "bg-slate-100",
      iconColor: "text-slate-600",
      borderColor: "border-slate-300",
      label: "Document"
    };
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      urgent: { label: "Urgent", className: "bg-red-500 text-white" },
      high: { label: "Important", className: "bg-amber-500 text-white" },
      normal: { label: "Normal", className: "bg-slate-200 text-slate-700" },
      low: { label: "Info", className: "bg-slate-100 text-slate-500" }
    };
    return configs[priority] || configs.normal;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (filter === "unread" && doc.status !== "sent") return false;
    if (filter === "archived" && doc.status !== "archived") return false;
    if (filter === "read" && doc.status !== "read") return false;
    if (typeFilter !== "all" && doc.document_type !== typeFilter) return false;
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const unreadCount = documents.filter(d => d.status === "sent").length;
  const documentTypes = [...new Set(documents.map(d => d.document_type))];

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Documents"
        subtitle="Member Portal"
        onLogout={handleLogout}
        unreadNotifications={unreadNotifications}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Documents"
      subtitle="Member Portal"
      onLogout={handleLogout}
      unreadNotifications={unreadNotifications}
    >
      <div className="space-y-6" data-testid="documents-page">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-indigo-700">{documents.length}</p>
                </div>
                <Mail className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Unread</p>
                  <p className="text-2xl font-bold text-amber-700">{unreadCount}</p>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Certificates</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {documents.filter(d => d.document_type.includes('certificate')).length}
                  </p>
                </div>
                <Award className="w-8 h-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Warnings</p>
                  <p className="text-2xl font-bold text-red-700">
                    {documents.filter(d => d.document_type === 'warning_letter').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant={filter === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button 
              variant={filter === "unread" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("unread")}
            >
              Unread ({unreadCount})
            </Button>
            <Button 
              variant={filter === "read" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("read")}
            >
              Read
            </Button>
            <Button 
              variant={filter === "archived" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("archived")}
            >
              Archived
            </Button>
            
            {documentTypes.length > 0 && (
              <select 
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>
                    {getTypeConfig(type).label}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchDocuments}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">No documents</p>
                <p className="text-sm text-muted-foreground">
                  {filter === "unread" ? "No unread documents" : "No documents found"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDocuments.map((doc) => {
              const config = getTypeConfig(doc.document_type);
              const priorityBadge = getPriorityBadge(doc.priority);
              const isUnread = doc.status === "sent";
              
              return (
                <Card 
                  key={doc.document_id} 
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    isUnread ? `border-l-4 ${config.borderColor} bg-white` : 'bg-slate-50/50 border-slate-100'
                  }`}
                  onClick={() => viewDocument(doc)}
                  data-testid={`document-${doc.document_id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
                        {config.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-semibold ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}>
                              {doc.title}
                            </h4>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            )}
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${priorityBadge.className}`}>
                            {priorityBadge.label}
                          </Badge>
                        </div>
                        
                        <p className={`text-sm line-clamp-2 mb-2 ${isUnread ? 'text-slate-700' : 'text-slate-500'}`}>
                          {doc.body_content?.substring(0, 150)}...
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.issued_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {doc.issued_by_name}
                            </span>
                            <Badge variant="outline" className="text-xs py-0">
                              {config.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => downloadDocument(doc)}
                              title="Download PDF"
                              className="text-slate-400 hover:text-indigo-600"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {doc.status !== "archived" && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => archiveDocument(doc)}
                                title="Archive"
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Document View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDocument && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${getTypeConfig(selectedDocument.document_type).bg} flex items-center justify-center ${getTypeConfig(selectedDocument.document_type).iconColor}`}>
                    {getTypeConfig(selectedDocument.document_type).icon}
                  </div>
                  <div>
                    <span className="block">{selectedDocument.title}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {getTypeConfig(selectedDocument.document_type).label}
                    </span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {/* Document metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Issued: {formatDate(selectedDocument.issued_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    From: {selectedDocument.issued_by_name}
                  </div>
                  <Badge className={getPriorityBadge(selectedDocument.priority).className}>
                    {getPriorityBadge(selectedDocument.priority).label}
                  </Badge>
                </div>
                
                {/* Document content */}
                <div 
                  className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ 
                    borderLeft: `4px solid ${selectedDocument.primary_color}`,
                    paddingLeft: '1rem'
                  }}
                >
                  {selectedDocument.body_content}
                </div>
                
                {/* Document footer */}
                <div className="text-xs text-muted-foreground border-t pt-4">
                  <p>{selectedDocument.footer_text}</p>
                  <p className="mt-2">Document ID: {selectedDocument.document_id}</p>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={() => downloadDocument(selectedDocument)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button onClick={() => setViewDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DocumentsPage;
