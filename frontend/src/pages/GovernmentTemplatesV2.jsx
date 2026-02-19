import { useState, useEffect } from "react";
import { 
  FileText, Send, AlertTriangle, Award, Shield, GraduationCap, 
  CheckCircle, Bell, Loader2, Star, ChevronDown, ChevronRight,
  Users, UserCheck, Settings2, Zap, Clock, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Template category configuration
const TEMPLATE_CATEGORIES = [
  {
    id: "warning",
    name: "Warning Letters",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description: "Official warnings for compliance violations"
  },
  {
    id: "license",
    name: "License Certificates",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "License issuance and renewal certificates"
  },
  {
    id: "training",
    name: "Training Certificates",
    icon: GraduationCap,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Training completion and safety certifications"
  },
  {
    id: "achievement",
    name: "Achievement Certificates",
    icon: Award,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "Recognition for excellence and milestones"
  },
  {
    id: "compliance",
    name: "Compliance Certificates",
    icon: Shield,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    description: "Compliance verification and audit clearance"
  },
  {
    id: "notice",
    name: "Formal Notices",
    icon: Bell,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    description: "Official notices and policy updates"
  }
];

const GovernmentTemplatesV2 = ({ user, api }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultTemplates, setDefaultTemplates] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sendingDocument, setSendingDocument] = useState(false);
  const [users, setUsers] = useState([]);
  const [automationSettings, setAutomationSettings] = useState({});
  const [activeTab, setActiveTab] = useState("categories");
  
  // Send form state
  const [sendFormData, setSendFormData] = useState({
    recipients: [],
    recipient_type: "individual",
    issuer_signature_name: "",
    issuer_designation: "",
    organization_name: "AMMO Government Portal",
    priority: "normal",
    // For batch/training completion
    training_course_id: "",
    batch_mode: false
  });

  useEffect(() => {
    fetchTemplates();
    fetchUsers();
    loadDefaultTemplates();
  }, []);

  const fetchTemplates = async () => {
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
      const response = await api.get("/admin/users");
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const loadDefaultTemplates = () => {
    // Load from localStorage or API
    const saved = localStorage.getItem("ammo_default_templates");
    if (saved) {
      setDefaultTemplates(JSON.parse(saved));
    }
  };

  const setDefaultTemplate = (categoryId, templateId) => {
    const updated = { ...defaultTemplates, [categoryId]: templateId };
    setDefaultTemplates(updated);
    localStorage.setItem("ammo_default_templates", JSON.stringify(updated));
    toast.success("Default template updated");
  };

  const getCategoryTemplates = (categoryId) => {
    const categoryMap = {
      "warning": ["warning_letter"],
      "license": ["license_certificate"],
      "training": ["training_certificate"],
      "achievement": ["achievement_certificate"],
      "compliance": ["compliance_certificate"],
      "notice": ["formal_notice"]
    };
    
    const types = categoryMap[categoryId] || [];
    return templates.filter(t => types.includes(t.template_type));
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const openSendDialog = (category) => {
    const defaultTemplateId = defaultTemplates[category.id];
    const categoryTemplates = getCategoryTemplates(category.id);
    
    if (!defaultTemplateId && categoryTemplates.length > 0) {
      // Auto-set first template as default if none set
      setDefaultTemplate(category.id, categoryTemplates[0].template_id);
    }
    
    setSelectedCategory(category);
    setSendFormData({
      recipients: [],
      recipient_type: "individual",
      issuer_signature_name: user?.name || "",
      issuer_designation: "Government Administrator",
      organization_name: "AMMO Government Portal",
      priority: "normal",
      training_course_id: "",
      batch_mode: false
    });
    setSendDialogOpen(true);
  };

  const sendDocument = async () => {
    if (sendFormData.recipient_type === "individual" && sendFormData.recipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }
    
    const templateId = defaultTemplates[selectedCategory.id];
    if (!templateId) {
      toast.error("Please set a default template for this category first");
      return;
    }
    
    // Validate signature for certificates
    const isCertificate = ["training", "achievement", "compliance", "license"].includes(selectedCategory.id);
    if (isCertificate && !sendFormData.issuer_signature_name) {
      toast.error("Please enter the issuer's signature name");
      return;
    }
    
    setSendingDocument(true);
    
    try {
      let recipients = sendFormData.recipients;
      if (sendFormData.recipient_type === "all_citizens") {
        recipients = ["role:citizen"];
      } else if (sendFormData.recipient_type === "all_dealers") {
        recipients = ["role:dealer"];
      } else if (sendFormData.recipient_type === "training_completers") {
        // For batch training completion
        recipients = ["training:" + sendFormData.training_course_id];
      }
      
      const response = await api.post("/government/formal-documents/send", {
        template_id: templateId,
        recipients: recipients,
        placeholder_values: {},
        priority: sendFormData.priority,
        issuer_signature_name: sendFormData.issuer_signature_name,
        issuer_designation: sendFormData.issuer_designation,
        organization_name: sendFormData.organization_name
      });
      
      toast.success(response.data?.message || "Document sent successfully");
      setSendDialogOpen(false);
    } catch (error) {
      console.error("Error sending document:", error);
      toast.error("Failed to send document");
    } finally {
      setSendingDocument(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} api={api} portalType="government">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} api={api} portalType="government">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Certificate & Document Templates</h1>
          <p className="text-slate-500 mt-1">
            Select a category and send official documents using pre-configured templates
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="categories">Send Documents</TabsTrigger>
            <TabsTrigger value="automation">Automation Settings</TabsTrigger>
            <TabsTrigger value="history">Sent History</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TEMPLATE_CATEGORIES.map((category) => {
                const CategoryIcon = category.icon;
                const categoryTemplates = getCategoryTemplates(category.id);
                const defaultTemplateId = defaultTemplates[category.id];
                const defaultTemplate = categoryTemplates.find(t => t.template_id === defaultTemplateId);
                const isExpanded = expandedCategories[category.id];
                
                return (
                  <Card 
                    key={category.id} 
                    className={`${category.bgColor} ${category.borderColor} border-2 hover:shadow-lg transition-shadow`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                            <CategoryIcon className={`w-6 h-6 ${category.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">{categoryTemplates.length} templates</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-4">{category.description}</p>
                      
                      {/* Default Template Display */}
                      <div className="bg-white rounded-lg p-3 mb-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-500">Default Template:</span>
                          <button 
                            onClick={() => toggleCategory(category.id)}
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            Change
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        </div>
                        
                        {defaultTemplate ? (
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium">{defaultTemplate.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">No default set</span>
                        )}
                        
                        {/* Expandable template list */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            {categoryTemplates.map((template) => (
                              <button
                                key={template.template_id}
                                onClick={() => setDefaultTemplate(category.id, template.template_id)}
                                className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                                  defaultTemplateId === template.template_id
                                    ? "bg-indigo-50 text-indigo-700 font-medium"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{template.name}</span>
                                  {defaultTemplateId === template.template_id && (
                                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                                  )}
                                </div>
                                {template.is_standard && (
                                  <Badge variant="outline" className="text-xs mt-1">Standard</Badge>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Send Button */}
                      <Button 
                        className="w-full"
                        onClick={() => openSendDialog(category)}
                        disabled={categoryTemplates.length === 0}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send {category.name.replace("s", "")}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Automation Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Training Completion Auto-Send */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">Training Completion Certificate</p>
                        <p className="text-sm text-slate-500">Auto-send when user completes training</p>
                      </div>
                    </div>
                    <Badge className="bg-green-600">Active</Badge>
                  </div>
                  
                  {/* License Expiry Reminder */}
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium">License Renewal Reminder</p>
                        <p className="text-sm text-slate-500">Auto-send 30 days before expiry</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-600">Active</Badge>
                  </div>
                  
                  {/* Compliance Warning */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium">Compliance Violation Warning</p>
                        <p className="text-sm text-slate-500">Auto-send when ARI drops below threshold</p>
                      </div>
                    </div>
                    <Badge variant="outline">Disabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recently Sent Documents</CardTitle>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 text-center py-8">
                  Sent documents will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Send Dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedCategory && (
                  <>
                    <selectedCategory.icon className={`w-5 h-5 ${selectedCategory.color}`} />
                    Send {selectedCategory?.name?.replace("s", "")}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Recipient Type */}
              <div>
                <Label>Send To</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                  value={sendFormData.recipient_type}
                  onChange={(e) => setSendFormData({...sendFormData, recipient_type: e.target.value, recipients: []})}
                >
                  <option value="individual">Select Individual Users</option>
                  <option value="all_citizens">All Citizens (Broadcast)</option>
                  <option value="all_dealers">All Dealers (Broadcast)</option>
                  {selectedCategory?.id === "training" && (
                    <option value="training_completers">Training Course Completers (Batch)</option>
                  )}
                </select>
              </div>
              
              {/* Individual Selection */}
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
              
              {/* Batch Count Display */}
              {sendFormData.recipient_type === "all_citizens" && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Will send to all {users.filter(u => u.role === 'citizen').length} citizens
                    </span>
                  </div>
                </div>
              )}
              
              {sendFormData.recipient_type === "all_dealers" && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-700">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Will send to all {users.filter(u => u.role === 'dealer').length} dealers
                    </span>
                  </div>
                </div>
              )}
              
              {/* Signature Section - For Certificates */}
              {["training", "achievement", "compliance", "license"].includes(selectedCategory?.id) && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <Label className="text-indigo-700 font-semibold">Issuing Authority</Label>
                  </div>
                  
                  <div className="space-y-3 bg-indigo-50 p-3 rounded-lg">
                    <div>
                      <Label className="text-sm">Signatory Name *</Label>
                      <Input
                        value={sendFormData.issuer_signature_name}
                        onChange={(e) => setSendFormData({...sendFormData, issuer_signature_name: e.target.value})}
                        placeholder="e.g., Dr. James Smith"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm">Designation/Title</Label>
                      <Input
                        value={sendFormData.issuer_designation}
                        onChange={(e) => setSendFormData({...sendFormData, issuer_designation: e.target.value})}
                        placeholder="e.g., Chief Training Officer"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm">Organization</Label>
                      <Input
                        value={sendFormData.organization_name}
                        onChange={(e) => setSendFormData({...sendFormData, organization_name: e.target.value})}
                        placeholder="e.g., AMMO Government Portal"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-100 p-2 rounded">
                      <CheckCircle className="w-3 h-3" />
                      <span>QR code for verification will be embedded in the certificate</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                  value={sendFormData.priority}
                  onChange={(e) => setSendFormData({...sendFormData, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High (Important Badge)</option>
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
    </DashboardLayout>
  );
};

export default GovernmentTemplatesV2;
