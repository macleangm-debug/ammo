import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, CreditCard, GraduationCap, ShoppingBag, 
  History, Bell, Settings, Mail, FileText, Award, AlertTriangle,
  Shield, Download, Archive, RefreshCw, Search, ArrowLeft,
  Calendar, User, Clock, Share2, MessageCircle, Send, Copy, Check
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [copied, setCopied] = useState(false);

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
      if (selectedDocument?.document_id === doc.document_id) {
        setSelectedDocument({ ...selectedDocument, status: "archived" });
      }
      toast.success("Document archived");
    } catch (error) {
      console.error("Error archiving document:", error);
      toast.error("Failed to archive document");
    }
  };

  // Share functions
  const shareToWhatsApp = (doc) => {
    const text = `Check out this official document from AMMO:\n\n${doc.title}\n\nIssued on: ${formatDate(doc.issued_at)}\nFrom: ${doc.issued_by_name}\n\n${doc.body_content?.substring(0, 200)}...`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success("Opening WhatsApp...");
  };

  const shareToTelegram = (doc) => {
    const text = `Check out this official document from AMMO:\n\n${doc.title}\n\nIssued on: ${formatDate(doc.issued_at)}\n\n${doc.body_content?.substring(0, 200)}...`;
    const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success("Opening Telegram...");
  };

  const copyToClipboard = async (doc) => {
    const text = `AMMO Official Document\n\n${doc.title}\n\nIssued: ${formatDate(doc.issued_at)}\nFrom: ${doc.issued_by_name}\n\n${doc.body_content}\n\nDocument ID: ${doc.document_id}`;
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy - please try selecting and copying manually");
    }
  };

  const shareNative = async (doc) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.title,
          text: `Official document from AMMO: ${doc.title}`,
          url: window.location.href
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error("Failed to share");
        }
      }
    } else {
      copyToClipboard(doc);
    }
  };

  const getTypeConfig = (type) => {
    const configs = {
      warning_letter: {
        icon: <AlertTriangle className="w-5 h-5" />,
        bg: "bg-red-100",
        iconColor: "text-red-600",
        borderColor: "border-red-300",
        label: "Warning Letter",
        headerBg: "bg-gradient-to-r from-red-500 to-red-600"
      },
      formal_notice: {
        icon: <FileText className="w-5 h-5" />,
        bg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        borderColor: "border-indigo-300",
        label: "Formal Notice",
        headerBg: "bg-gradient-to-r from-indigo-500 to-indigo-600"
      },
      achievement_certificate: {
        icon: <Award className="w-5 h-5" />,
        bg: "bg-amber-100",
        iconColor: "text-amber-600",
        borderColor: "border-amber-300",
        label: "Achievement Certificate",
        headerBg: "bg-gradient-to-r from-amber-500 to-amber-600"
      },
      license_certificate: {
        icon: <CreditCard className="w-5 h-5" />,
        bg: "bg-purple-100",
        iconColor: "text-purple-600",
        borderColor: "border-purple-300",
        label: "License Certificate",
        headerBg: "bg-gradient-to-r from-purple-500 to-purple-600"
      },
      training_certificate: {
        icon: <GraduationCap className="w-5 h-5" />,
        bg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        borderColor: "border-emerald-300",
        label: "Training Certificate",
        headerBg: "bg-gradient-to-r from-emerald-500 to-emerald-600"
      },
      compliance_certificate: {
        icon: <Shield className="w-5 h-5" />,
        bg: "bg-blue-100",
        iconColor: "text-blue-600",
        borderColor: "border-blue-300",
        label: "Compliance Certificate",
        headerBg: "bg-gradient-to-r from-blue-500 to-blue-600"
      }
    };
    return configs[type] || {
      icon: <Mail className="w-5 h-5" />,
      bg: "bg-slate-100",
      iconColor: "text-slate-600",
      borderColor: "border-slate-300",
      label: "Document",
      headerBg: "bg-gradient-to-r from-slate-500 to-slate-600"
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
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        api={api}
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

  // Document Detail View (Inline)
  if (selectedDocument) {
    const config = getTypeConfig(selectedDocument.document_type);
    const priorityBadge = getPriorityBadge(selectedDocument.priority);

    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Document"
        subtitle="Member Portal"
        onLogout={handleLogout}
        unreadNotifications={unreadNotifications}
        api={api}
      >
        <div className="space-y-6" data-testid="document-detail">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => setSelectedDocument(null)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </Button>

          {/* Document Card */}
          <Card className="overflow-hidden border-0 shadow-lg">
            {/* Header */}
            <div className={`${config.headerBg} p-6 text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">{config.label}</p>
                    <h1 className="text-2xl font-bold">{selectedDocument.title}</h1>
                  </div>
                </div>
                <Badge className={`${priorityBadge.className} shadow-md`}>
                  {priorityBadge.label}
                </Badge>
              </div>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-6 mt-6 text-white/90 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Issued: {formatDate(selectedDocument.issued_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>From: {selectedDocument.issued_by_name}</span>
                </div>
                {selectedDocument.read_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Read: {formatDateTime(selectedDocument.read_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <CardContent className="p-6 lg:p-8">
              {/* Official Seal Indicator */}
              {selectedDocument.seal_enabled && (
                <div className="flex items-center gap-2 mb-6 text-sm text-slate-500">
                  <Shield className="w-4 h-4" />
                  <span>This document contains an official AMMO seal</span>
                </div>
              )}

              {/* Document Body */}
              <div 
                className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-700"
                style={{ 
                  borderLeft: `4px solid ${selectedDocument.primary_color || '#3b5bdb'}`,
                  paddingLeft: '1.5rem',
                  marginLeft: '0'
                }}
              >
                {selectedDocument.body_content}
              </div>

              {/* Footer Text */}
              {selectedDocument.footer_text && (
                <div className="mt-8 pt-6 border-t border-dashed border-slate-200">
                  <p className="text-sm text-slate-500 italic">{selectedDocument.footer_text}</p>
                </div>
              )}

              {/* Document Info */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">
                  Document ID: <span className="font-mono">{selectedDocument.document_id}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Signed by: {selectedDocument.signature_title || "Government Administrator"}
                </p>
              </div>
            </CardContent>

            {/* Actions Footer */}
            <div className="border-t bg-slate-50 p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Share Options */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share this document
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => shareToWhatsApp(selectedDocument)}
                      className="gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => shareToTelegram(selectedDocument)}
                      className="gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Send className="w-4 h-4" />
                      Telegram
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(selectedDocument)}
                      className="gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    {navigator.share && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => shareNative(selectedDocument)}
                        className="gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        More
                      </Button>
                    )}
                  </div>
                </div>

                {/* Download & Archive */}
                <div className="flex items-center gap-2">
                  {selectedDocument.status !== "archived" && (
                    <Button 
                      variant="outline"
                      onClick={() => archiveDocument(selectedDocument)}
                      className="gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      Archive
                    </Button>
                  )}
                  <Button 
                    onClick={() => downloadDocument(selectedDocument)}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Documents List View
  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Documents"
      subtitle="Member Portal"
      onLogout={handleLogout}
      unreadNotifications={unreadNotifications}
      api={api}
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
                    {documents.filter(d => d.document_type?.includes('certificate')).length}
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
    </DashboardLayout>
  );
};

export default DocumentsPage;
