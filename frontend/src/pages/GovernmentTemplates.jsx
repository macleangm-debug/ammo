import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, FileText, Bell, AlertTriangle, TrendingUp, Settings,
  Plus, Edit, Trash2, Eye, Send, Copy, ChevronRight, Search,
  Palette, Image, Shield, Mail, Award, GraduationCap, CreditCard,
  RefreshCw, Filter, Users, CheckCircle, X, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const GovernmentTemplates = ({ user, api }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("templates");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Form state for editing
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_type: "formal_notice",
    category: "general",
    primary_color: "#3b5bdb",
    secondary_color: "#8b5cf6",
    logo_url: "",
    seal_enabled: true,
    watermark_enabled: true,
    header_text: "AMMO - Government Portal",
    title: "",
    body_template: "",
    footer_text: "",
    signature_title: "Government Administrator",
    auto_send_on_event: "",
    auto_send_enabled: false
  });
  
  // Send form state
  const [sendFormData, setSendFormData] = useState({
    recipients: [],
    recipient_type: "individual",
    placeholder_values: {},
    priority: "normal"
  });
  
  const [users, setUsers] = useState([]);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [sendingDocument, setSendingDocument] = useState(false);
  
  // Sent documents state
  const [sentDocuments, setSentDocuments] = useState([]);
  const [documentStats, setDocumentStats] = useState({});

  const navItems = [
    { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
    { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
    { id: 'templates', path: '/government/templates', label: 'Documents', icon: Mail },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
    { id: 'predictive', path: '/government/predictive', label: 'Predictive', icon: TrendingUp },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchTemplates();
    fetchUsers();
    fetchSentDocuments();
    fetchDocumentStats();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get("/government/document-templates");
      setTemplates(response.data?.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/government/users-list");
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchSentDocuments = async () => {
    try {
      const response = await api.get("/government/formal-documents?limit=50");
      setSentDocuments(response.data?.documents || []);
    } catch (error) {
      console.error("Error fetching sent documents:", error);
    }
  };

  const fetchDocumentStats = async () => {
    try {
      const response = await api.get("/government/formal-documents/stats");
      setDocumentStats(response.data || {});
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getTypeConfig = (type) => {
    const configs = {
      warning_letter: {
        icon: <AlertTriangle className="w-5 h-5" />,
        bg: "bg-red-100",
        iconColor: "text-red-600",
        label: "Warning Letter"
      },
      formal_notice: {
        icon: <FileText className="w-5 h-5" />,
        bg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        label: "Formal Notice"
      },
      achievement_certificate: {
        icon: <Award className="w-5 h-5" />,
        bg: "bg-amber-100",
        iconColor: "text-amber-600",
        label: "Achievement"
      },
      license_certificate: {
        icon: <CreditCard className="w-5 h-5" />,
        bg: "bg-purple-100",
        iconColor: "text-purple-600",
        label: "License Certificate"
      },
      training_certificate: {
        icon: <GraduationCap className="w-5 h-5" />,
        bg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        label: "Training Certificate"
      },
      compliance_certificate: {
        icon: <Shield className="w-5 h-5" />,
        bg: "bg-blue-100",
        iconColor: "text-blue-600",
        label: "Compliance Certificate"
      }
    };
    return configs[type] || {
      icon: <Mail className="w-5 h-5" />,
      bg: "bg-slate-100",
      iconColor: "text-slate-600",
      label: "Document"
    };
  };

  const openEditDialog = (template = null) => {
    if (template) {
      setFormData({
        name: template.name || "",
        description: template.description || "",
        template_type: template.template_type || "formal_notice",
        category: template.category || "general",
        primary_color: template.primary_color || "#3b5bdb",
        secondary_color: template.secondary_color || "#8b5cf6",
        logo_url: template.logo_url || "",
        seal_enabled: template.seal_enabled !== false,
        watermark_enabled: template.watermark_enabled !== false,
        header_text: template.header_text || "AMMO - Government Portal",
        title: template.title || "",
        body_template: template.body_template || "",
        footer_text: template.footer_text || "",
        signature_title: template.signature_title || "Government Administrator",
        auto_send_on_event: template.auto_send_on_event || "",
        auto_send_enabled: template.auto_send_enabled || false
      });
      setSelectedTemplate(template);
    } else {
      setFormData({
        name: "",
        description: "",
        template_type: "formal_notice",
        category: "general",
        primary_color: "#3b5bdb",
        secondary_color: "#8b5cf6",
        logo_url: "",
        seal_enabled: true,
        watermark_enabled: true,
        header_text: "AMMO - Government Portal",
        title: "",
        body_template: "",
        footer_text: "",
        signature_title: "Government Administrator",
        auto_send_on_event: "",
        auto_send_enabled: false
      });
      setSelectedTemplate(null);
    }
    setEditDialogOpen(true);
  };

  const saveTemplate = async () => {
    try {
      if (selectedTemplate) {
        await api.put(`/government/document-templates/${selectedTemplate.template_id}`, formData);
        toast.success("Template updated successfully");
      } else {
        await api.post("/government/document-templates", formData);
        toast.success("Template created successfully");
      }
      setEditDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const deleteTemplate = async (template) => {
    if (template.is_standard) {
      toast.error("Cannot delete standard templates");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      await api.delete(`/government/document-templates/${template.template_id}`);
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const openPreview = async (template) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
    
    try {
      const response = await api.post(
        `/government/document-templates/${template.template_id}/preview`,
        { sample_values: {} },
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview");
    }
  };

  const openSendDialog = (template) => {
    setSelectedTemplate(template);
    setSendFormData({
      recipients: [],
      recipient_type: "individual",
      placeholder_values: {},
      priority: "normal"
    });
    setSendDialogOpen(true);
  };

  const sendDocument = async () => {
    if (sendFormData.recipients.length === 0 && sendFormData.recipient_type === "individual") {
      toast.error("Please select at least one recipient");
      return;
    }
    
    setSendingDocument(true);
    
    try {
      let recipients = sendFormData.recipients;
      if (sendFormData.recipient_type === "all_citizens") {
        recipients = ["role:citizen"];
      } else if (sendFormData.recipient_type === "all_dealers") {
        recipients = ["role:dealer"];
      }
      
      const response = await api.post("/government/formal-documents/send", {
        template_id: selectedTemplate.template_id,
        recipients: recipients,
        placeholder_values: sendFormData.placeholder_values,
        priority: sendFormData.priority
      });
      
      toast.success(response.data?.message || "Document sent successfully");
      setSendDialogOpen(false);
      fetchSentDocuments();
      fetchDocumentStats();
    } catch (error) {
      console.error("Error sending document:", error);
      toast.error("Failed to send document");
    } finally {
      setSendingDocument(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (typeFilter !== "all" && t.template_type !== typeFilter) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const templateTypes = [...new Set(templates.map(t => t.template_type))];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">AMMO</h1>
                <p className="text-xs text-slate-500">Government Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-slate-800">Document Templates</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.id === 'templates';
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600 font-medium">Total Templates</p>
                    <p className="text-2xl font-bold text-indigo-700">{templates.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-indigo-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-600 font-medium">Documents Sent</p>
                    <p className="text-2xl font-bold text-emerald-700">{documentStats.total || 0}</p>
                  </div>
                  <Send className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Read</p>
                    <p className="text-2xl font-bold text-amber-700">{documentStats.by_status?.read || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Pending</p>
                    <p className="text-2xl font-bold text-slate-700">{documentStats.by_status?.sent || 0}</p>
                  </div>
                  <Mail className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
            <button
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "templates" 
                  ? "text-indigo-600 border-indigo-600" 
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("templates")}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Templates
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "sent" 
                  ? "text-indigo-600 border-indigo-600" 
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("sent")}
            >
              <Send className="w-4 h-4 inline mr-2" />
              Sent Documents
            </button>
          </div>

          {activeTab === "templates" && (
            <>
              {/* Filters */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <select 
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    {templateTypes.map(type => (
                      <option key={type} value={type}>
                        {getTypeConfig(type).label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={fetchTemplates}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={() => openEditDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => {
                  const config = getTypeConfig(template.template_type);
                  return (
                    <Card key={template.template_id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center ${config.iconColor}`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 truncate">{template.name}</h3>
                              {template.is_standard && (
                                <Badge variant="outline" className="text-xs">Standard</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{config.label}</p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                          {template.description || template.title}
                        </p>
                        
                        {/* Color preview */}
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.primary_color }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: template.secondary_color }}
                          />
                          {template.seal_enabled && (
                            <Badge variant="outline" className="text-xs">Seal</Badge>
                          )}
                          {template.auto_send_enabled && (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700">Auto</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 pt-3 border-t">
                          <Button variant="ghost" size="sm" onClick={() => openPreview(template)}>
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openSendDialog(template)}>
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                          {!template.is_standard && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-600"
                              onClick={() => deleteTemplate(template)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "sent" && (
            <div className="space-y-4">
              {sentDocuments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Send className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-600">No documents sent yet</p>
                    <p className="text-sm text-slate-400">Send your first document using a template</p>
                  </CardContent>
                </Card>
              ) : (
                sentDocuments.map((doc) => {
                  const config = getTypeConfig(doc.document_type);
                  return (
                    <Card key={doc.document_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center ${config.iconColor}`}>
                            {config.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{doc.title}</h4>
                              <Badge variant={doc.status === "read" ? "default" : "outline"}>
                                {doc.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500">
                              To: {doc.recipient_name} • {formatDate(doc.issued_at)}
                            </p>
                          </div>
                          <Badge className={`${
                            doc.priority === "urgent" ? "bg-red-500" :
                            doc.priority === "high" ? "bg-amber-500" : "bg-slate-200 text-slate-700"
                          }`}>
                            {doc.priority}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Left column - Basic info */}
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Compliance Warning"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.template_type}
                    onChange={(e) => setFormData({...formData, template_type: e.target.value})}
                  >
                    <option value="warning_letter">Warning Letter</option>
                    <option value="formal_notice">Formal Notice</option>
                    <option value="achievement_certificate">Achievement Certificate</option>
                    <option value="license_certificate">License Certificate</option>
                    <option value="training_certificate">Training Certificate</option>
                    <option value="compliance_certificate">Compliance Certificate</option>
                  </select>
                </div>
                <div>
                  <Label>Category</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="general">General</option>
                    <option value="compliance">Compliance</option>
                    <option value="training">Training</option>
                    <option value="license">License</option>
                    <option value="achievement">Achievement</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label>Document Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Official Warning Notice"
                />
              </div>
              
              <div>
                <Label>Header Text</Label>
                <Input
                  value={formData.header_text}
                  onChange={(e) => setFormData({...formData, header_text: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Signature Title</Label>
                <Input
                  value={formData.signature_title}
                  onChange={(e) => setFormData({...formData, signature_title: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Footer Text</Label>
                <Input
                  value={formData.footer_text}
                  onChange={(e) => setFormData({...formData, footer_text: e.target.value})}
                />
              </div>
            </div>
            
            {/* Right column - Styling & Content */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Logo URL (optional)</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.seal_enabled}
                    onChange={(e) => setFormData({...formData, seal_enabled: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Show Official Seal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.watermark_enabled}
                    onChange={(e) => setFormData({...formData, watermark_enabled: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Show Watermark</span>
                </label>
              </div>
              
              <div>
                <Label>Body Template</Label>
                <p className="text-xs text-slate-500 mb-1">
                  Use placeholders: {"{{recipient_name}}"}, {"{{date}}"}, {"{{license_number}}"}, etc.
                </p>
                <Textarea
                  value={formData.body_template}
                  onChange={(e) => setFormData({...formData, body_template: e.target.value})}
                  placeholder="Dear {{recipient_name}},..."
                  rows={8}
                />
              </div>
              
              <div className="border-t pt-4">
                <Label className="mb-2 block">Automation (Optional)</Label>
                <div className="flex items-center gap-4">
                  <select 
                    className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.auto_send_on_event}
                    onChange={(e) => setFormData({...formData, auto_send_on_event: e.target.value})}
                  >
                    <option value="">No automation</option>
                    <option value="training_completion">On Training Completion</option>
                    <option value="license_renewal">On License Renewal</option>
                    <option value="compliance_violation">On Compliance Violation</option>
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.auto_send_enabled}
                      onChange={(e) => setFormData({...formData, auto_send_enabled: e.target.checked})}
                      className="rounded"
                      disabled={!formData.auto_send_on_event}
                    />
                    <span className="text-sm">Enable</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate}>
              {selectedTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => {
        setPreviewDialogOpen(open);
        if (!open && previewPdfUrl) {
          window.URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
        }
      }}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 h-full min-h-[600px]">
            {previewPdfUrl ? (
              <iframe
                src={previewPdfUrl}
                className="w-full h-full border rounded"
                title="Document Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Document Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Document: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Recipient Type</Label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                value={sendFormData.recipient_type}
                onChange={(e) => setSendFormData({...sendFormData, recipient_type: e.target.value, recipients: []})}
              >
                <option value="individual">Individual Users</option>
                <option value="all_citizens">All Citizens</option>
                <option value="all_dealers">All Dealers</option>
              </select>
            </div>
            
            {sendFormData.recipient_type === "individual" && (
              <div>
                <Label>Select Recipients</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md mt-1 p-2 space-y-1">
                  {users.filter(u => u.role !== 'admin').map((u) => (
                    <label key={u.user_id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendFormData.recipients.includes(u.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSendFormData({
                              ...sendFormData,
                              recipients: [...sendFormData.recipients, u.user_id]
                            });
                          } else {
                            setSendFormData({
                              ...sendFormData,
                              recipients: sendFormData.recipients.filter(id => id !== u.user_id)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{u.name}</span>
                      <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {sendFormData.recipients.length} selected
                </p>
              </div>
            )}
            
            <div>
              <Label>Priority</Label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                value={sendFormData.priority}
                onChange={(e) => setSendFormData({...sendFormData, priority: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendDocument} disabled={sendingDocument}>
              {sendingDocument ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GovernmentTemplates;
