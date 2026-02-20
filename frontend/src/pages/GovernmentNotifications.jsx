import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Activity, AlertTriangle, Settings, Target,
  FileText, Bell, Send, Plus, Trash2, Edit, Eye, Check,
  Users, Zap, Clock, ChevronRight, RefreshCw, Loader2,
  Mail, Megaphone, Shield, GraduationCap, CreditCard,
  ToggleLeft, ToggleRight, Play, Filter, Search, X, Palette, Award
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const GovernmentNotifications = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("send");
  
  // Data states
  const [stats, setStats] = useState({});
  const [triggers, setTriggers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [usersList, setUsersList] = useState({ users: [], role_counts: {} });
  const [schedulerStatus, setSchedulerStatus] = useState({ scheduler_running: false, triggers: [], recent_executions: [] });
  const [executions, setExecutions] = useState([]);
  
  // Dialog states
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [executingTrigger, setExecutingTrigger] = useState(null);
  
  // Send notification form
  const [sendForm, setSendForm] = useState({
    target: "all",
    title: "",
    message: "",
    type: "announcement",
    category: "general",
    priority: "normal",
    action_url: "",
    action_label: ""
  });
  
  // Trigger form
  const [triggerForm, setTriggerForm] = useState({
    name: "",
    description: "",
    event_type: "license_expiring",
    conditions: { days_before: 30 },
    template_title: "",
    template_message: "",
    notification_type: "reminder",
    notification_category: "compliance",
    priority: "normal",
    target_roles: ["citizen"],
    schedule_interval: "daily",
    enabled: true
  });
  
  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: "",
    title: "",
    message: "",
    type: "announcement",
    category: "general",
    priority: "normal"
  });

  const navItems = [
    { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
    { id: 'templates', path: '/government/templates', label: 'Templates', icon: FileText },
    { id: 'cert-config', path: '/government/certificate-config', label: 'Cert Config', icon: Palette },
    { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
    { id: 'predictive', path: '/government/predictive', label: 'Analytics', icon: Activity },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
    { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
  ];

  const eventTypes = [
    { value: "license_expiring", label: "License Expiring", icon: CreditCard },
    { value: "training_incomplete", label: "Training Incomplete", icon: GraduationCap },
    { value: "compliance_warning", label: "Compliance Warning", icon: Shield },
    { value: "transaction_flagged", label: "Transaction Flagged", icon: AlertTriangle },
    { value: "review_status_changed", label: "Review Status Changed", icon: FileText },
    { value: "custom", label: "Custom Event", icon: Zap }
  ];

  const categoryIcons = {
    general: Megaphone,
    compliance: Shield,
    training: GraduationCap,
    license: CreditCard,
    transaction: Activity,
    system: Settings
  };

  const priorityColors = {
    low: "bg-slate-100 text-slate-700",
    normal: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700"
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, triggersRes, templatesRes, notificationsRes, usersRes, schedulerRes, executionsRes] = await Promise.all([
        api.get("/government/notification-stats").catch(() => ({ data: {} })),
        api.get("/government/notification-triggers").catch(() => ({ data: { triggers: [] } })),
        api.get("/government/notification-templates").catch(() => ({ data: { templates: [] } })),
        api.get("/government/notifications?limit=20").catch(() => ({ data: { notifications: [] } })),
        api.get("/government/users-list").catch(() => ({ data: { users: [], role_counts: {} } })),
        api.get("/government/triggers/scheduler-status").catch(() => ({ data: { scheduler_running: false, triggers: [], recent_executions: [] } })),
        api.get("/government/triggers/executions?limit=20").catch(() => ({ data: { executions: [] } }))
      ]);
      
      setStats(statsRes.data);
      setTriggers(triggersRes.data.triggers || []);
      setTemplates(templatesRes.data.templates || []);
      setSentNotifications(notificationsRes.data.notifications || []);
      setUsersList(usersRes.data);
      setSchedulerStatus(schedulerRes.data);
      setExecutions(executionsRes.data.executions || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTrigger = async (triggerId) => {
    setExecutingTrigger(triggerId);
    try {
      const response = await api.post(`/government/triggers/${triggerId}/execute`);
      toast.success(`Trigger executed: ${response.data.notifications_sent} notifications sent`);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to execute trigger");
    } finally {
      setExecutingTrigger(null);
    }
  };

  const handleRunAllTriggers = async () => {
    setSubmitting(true);
    try {
      const response = await api.post("/government/triggers/run-all");
      toast.success(response.data.message);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to run triggers");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleScheduler = async () => {
    setSubmitting(true);
    try {
      if (schedulerStatus.scheduler_running) {
        await api.post("/government/triggers/scheduler/stop");
        toast.success("Scheduler stopped");
      } else {
        await api.post("/government/triggers/scheduler/start");
        toast.success("Scheduler started");
      }
      fetchAllData();
    } catch (error) {
      toast.error("Failed to toggle scheduler");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNotification = async () => {
    if (!sendForm.title || !sendForm.message) {
      toast.error("Title and message are required");
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post("/government/notifications/send", sendForm);
      toast.success(response.data.message);
      setShowSendDialog(false);
      setSendForm({
        target: "all", title: "", message: "", type: "announcement",
        category: "general", priority: "normal", action_url: "", action_label: ""
      });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send notification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTrigger = async () => {
    if (!triggerForm.name || !triggerForm.template_title || !triggerForm.template_message) {
      toast.error("Name, title, and message are required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingTrigger) {
        await api.put(`/government/notification-triggers/${editingTrigger.trigger_id}`, triggerForm);
        toast.success("Trigger updated successfully");
      } else {
        await api.post("/government/notification-triggers", triggerForm);
        toast.success("Trigger created successfully");
      }
      setShowTriggerDialog(false);
      setEditingTrigger(null);
      setTriggerForm({
        name: "", description: "", event_type: "license_expiring",
        conditions: { days_before: 30 }, template_title: "", template_message: "",
        notification_type: "reminder", notification_category: "compliance",
        priority: "normal", target_roles: ["citizen"], enabled: true
      });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save trigger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTrigger = async (trigger) => {
    try {
      await api.put(`/government/notification-triggers/${trigger.trigger_id}`, {
        enabled: !trigger.enabled
      });
      toast.success(`Trigger ${trigger.enabled ? 'disabled' : 'enabled'}`);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to update trigger");
    }
  };

  const handleTestTrigger = async (triggerId) => {
    try {
      await api.post(`/government/notification-triggers/${triggerId}/test`);
      toast.success("Test notification sent to your account");
    } catch (error) {
      toast.error("Failed to send test");
    }
  };

  const handleDeleteTrigger = async (triggerId) => {
    if (!confirm("Delete this trigger?")) return;
    try {
      await api.delete(`/government/notification-triggers/${triggerId}`);
      toast.success("Trigger deleted");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete trigger");
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.title || !templateForm.message) {
      toast.error("Name, title, and message are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/government/notification-templates", templateForm);
      toast.success("Template created successfully");
      setShowTemplateDialog(false);
      setTemplateForm({
        name: "", title: "", message: "", type: "announcement",
        category: "general", priority: "normal"
      });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm("Delete this template?")) return;
    try {
      await api.delete(`/government/notification-templates/${templateId}`);
      toast.success("Template deleted");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const applyTemplate = (template) => {
    setSendForm({
      ...sendForm,
      title: template.title,
      message: template.message,
      type: template.type,
      category: template.category,
      priority: template.priority
    });
    setShowSendDialog(true);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navItems={navItems} title="Notifications" subtitle="Government Portal" onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navItems={navItems} title="Notifications" subtitle="Government Portal" onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-bold">{stats.total_sent || 0}</p>
                </div>
                <Send className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Read Rate</p>
                  <p className="text-2xl font-bold">{stats.read_rate || 0}%</p>
                </div>
                <Eye className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last 7 Days</p>
                  <p className="text-2xl font-bold">{stats.recent_7_days || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Triggers</p>
                  <p className="text-2xl font-bold">{stats.active_triggers || 0}</p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="send" data-testid="tab-send">
              <Send className="w-4 h-4 mr-2" />
              Send
            </TabsTrigger>
            <TabsTrigger value="triggers" data-testid="tab-triggers">
              <Zap className="w-4 h-4 mr-2" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <Clock className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Send Notification</span>
                  <Button onClick={() => setShowSendDialog(true)} data-testid="send-notification-btn">
                    <Send className="w-4 h-4 mr-2" />
                    Compose
                  </Button>
                </CardTitle>
                <CardDescription>Send announcements and alerts to users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Quick Send Cards */}
                  <div 
                    className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                    onClick={() => {
                      setSendForm({ ...sendForm, target: "all", type: "announcement", category: "general" });
                      setShowSendDialog(true);
                    }}
                    data-testid="quick-send-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">All Users</p>
                        <p className="text-xs text-muted-foreground">{usersList.role_counts?.citizen + usersList.role_counts?.dealer + usersList.role_counts?.admin || 0} users</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 border rounded-lg hover:border-green-500 cursor-pointer transition-colors"
                    onClick={() => {
                      setSendForm({ ...sendForm, target: "role:citizen", type: "announcement", category: "general" });
                      setShowSendDialog(true);
                    }}
                    data-testid="quick-send-citizens"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">All Citizens</p>
                        <p className="text-xs text-muted-foreground">{usersList.role_counts?.citizen || 0} members</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 border rounded-lg hover:border-orange-500 cursor-pointer transition-colors"
                    onClick={() => {
                      setSendForm({ ...sendForm, target: "role:dealer", type: "announcement", category: "general" });
                      setShowSendDialog(true);
                    }}
                    data-testid="quick-send-dealers"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">All Dealers</p>
                        <p className="text-xs text-muted-foreground">{usersList.role_counts?.dealer || 0} dealers</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Templates */}
            {templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {templates.slice(0, 5).map((template) => (
                      <Button 
                        key={template.template_id} 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTemplate(template)}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Triggers Tab */}
          <TabsContent value="triggers" className="space-y-4">
            {/* Scheduler Controls */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span>Trigger Scheduler</span>
                    <Badge className={schedulerStatus.scheduler_running ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {schedulerStatus.scheduler_running ? 'Running' : 'Stopped'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRunAllTriggers}
                      disabled={submitting}
                      data-testid="run-all-triggers-btn"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Run All Now
                    </Button>
                    <Button 
                      variant={schedulerStatus.scheduler_running ? "destructive" : "default"}
                      size="sm"
                      onClick={handleToggleScheduler}
                      disabled={submitting}
                      data-testid="toggle-scheduler-btn"
                    >
                      {schedulerStatus.scheduler_running ? (
                        <><X className="w-4 h-4 mr-1" />Stop</>
                      ) : (
                        <><Play className="w-4 h-4 mr-1" />Start</>
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Check Interval</p>
                    <p className="font-medium">{schedulerStatus.check_interval || '1 hour'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Enabled Triggers</p>
                    <p className="font-medium">{schedulerStatus.enabled_triggers || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Execution</p>
                    <p className="font-medium">
                      {schedulerStatus.recent_executions?.[0]?.started_at 
                        ? formatDate(schedulerStatus.recent_executions[0].started_at)
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Notifications Sent (Recent)</p>
                    <p className="font-medium">
                      {schedulerStatus.recent_executions?.reduce((sum, e) => sum + (e.notifications_sent || 0), 0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Triggers List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Automated Triggers</span>
                  <Button onClick={() => { setEditingTrigger(null); setShowTriggerDialog(true); }} data-testid="create-trigger-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    New Trigger
                  </Button>
                </CardTitle>
                <CardDescription>Configure automatic notifications based on events</CardDescription>
              </CardHeader>
              <CardContent>
                {triggers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No triggers configured yet</p>
                    <p className="text-sm">Create triggers to automate notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {triggers.map((trigger) => {
                      const EventIcon = eventTypes.find(e => e.value === trigger.event_type)?.icon || Zap;
                      const isExecuting = executingTrigger === trigger.trigger_id;
                      return (
                        <div 
                          key={trigger.trigger_id}
                          className={`flex items-center justify-between p-4 border rounded-lg ${trigger.enabled ? '' : 'opacity-60 bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trigger.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                              <EventIcon className={`w-5 h-5 ${trigger.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{trigger.name}</p>
                                <Badge className={priorityColors[trigger.priority]}>{trigger.priority}</Badge>
                                <Badge variant="outline" className="text-[10px]">{trigger.schedule_interval || 'daily'}</Badge>
                                {!trigger.enabled && <Badge variant="outline">Disabled</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{trigger.description || trigger.template_title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>Event: {eventTypes.find(e => e.value === trigger.event_type)?.label || trigger.event_type}</span>
                                {trigger.last_executed_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Last run: {formatDate(trigger.last_executed_at)}
                                  </span>
                                )}
                                {trigger.last_execution_result && (
                                  <span className={`flex items-center gap-1 ${trigger.last_execution_result.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                                    {trigger.last_execution_result.status === 'completed' ? (
                                      <><Check className="w-3 h-3" />{trigger.last_execution_result.notifications_sent} sent</>
                                    ) : (
                                      <><X className="w-3 h-3" />Failed</>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleToggleTrigger(trigger)}
                              title={trigger.enabled ? 'Disable' : 'Enable'}
                            >
                              {trigger.enabled ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleExecuteTrigger(trigger.trigger_id)}
                              disabled={isExecuting}
                              title="Execute Now"
                            >
                              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleTestTrigger(trigger.trigger_id)}
                              title="Test (send to self)"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEditingTrigger(trigger);
                                setTriggerForm({
                                  name: trigger.name,
                                  description: trigger.description || "",
                                  event_type: trigger.event_type,
                                  conditions: trigger.conditions || {},
                                  template_title: trigger.template_title,
                                  template_message: trigger.template_message,
                                  notification_type: trigger.notification_type,
                                  notification_category: trigger.notification_category,
                                  priority: trigger.priority,
                                  target_roles: trigger.target_roles || ["citizen"],
                                  enabled: trigger.enabled
                                });
                                setShowTriggerDialog(true);
                              }}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteTrigger(trigger.trigger_id)}
                              title="Delete"
                              className="text-muted-foreground hover:text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Saved Templates</span>
                  <Button onClick={() => setShowTemplateDialog(true)} data-testid="create-template-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </CardTitle>
                <CardDescription>Reusable notification templates for quick sending</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No templates saved yet</p>
                    <p className="text-sm">Create templates for frequently used notifications</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => {
                      const CategoryIcon = categoryIcons[template.category] || Megaphone;
                      return (
                        <div 
                          key={template.template_id}
                          className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CategoryIcon className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{template.name}</p>
                                <Badge variant="outline" className="text-xs">{template.category}</Badge>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteTemplate(template.template_id)}
                              className="text-muted-foreground hover:text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium mb-1">{template.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{template.message}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3 w-full"
                            onClick={() => applyTemplate(template)}
                          >
                            <Send className="w-3 h-3 mr-2" />
                            Use Template
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {/* Trigger Executions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Trigger Executions</span>
                  <Button variant="outline" size="sm" onClick={fetchAllData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>History of automated trigger runs</CardDescription>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No trigger executions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {executions.slice(0, 10).map((exec) => (
                      <div 
                        key={exec.execution_id}
                        className="flex items-center justify-between p-3 border rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            exec.status === 'completed' ? 'bg-green-500' :
                            exec.status === 'failed' ? 'bg-red-500' :
                            exec.status === 'running' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
                          }`} />
                          <div>
                            <p className="font-medium">{exec.trigger_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(exec.started_at)}
                              {exec.details?.manual && ' • Manual run'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {exec.status === 'completed' && (
                            <span className="text-green-600 text-xs">
                              {exec.notifications_sent} sent / {exec.users_matched} matched
                            </span>
                          )}
                          {exec.status === 'failed' && (
                            <span className="text-red-600 text-xs" title={exec.error_message}>Failed</span>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">{exec.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {sentNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No notifications sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentNotifications.map((notif) => (
                      <div 
                        key={notif.notification_id}
                        className="flex items-start gap-4 p-3 border rounded-lg"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${notif.read ? 'bg-gray-300' : 'bg-primary'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{notif.title}</p>
                            <Badge className={priorityColors[notif.priority] || priorityColors.normal} variant="outline">
                              {notif.priority}
                            </Badge>
                            {notif.sent_by?.startsWith('trigger:') && (
                              <Badge variant="outline" className="text-[10px]">Auto</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{notif.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{formatDate(notif.created_at)}</span>
                            <span>{notif.category}</span>
                            {notif.read && <Badge variant="outline" className="text-[10px]">Read</Badge>}
                          </div>
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

      {/* Send Notification Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Send Notification
            </DialogTitle>
            <DialogDescription>
              Compose and send a notification to users
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={sendForm.target} onValueChange={(v) => setSendForm({...sendForm, target: v})}>
                <SelectTrigger data-testid="send-target-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="role:citizen">All Citizens</SelectItem>
                  <SelectItem value="role:dealer">All Dealers</SelectItem>
                  <SelectItem value="role:admin">All Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={sendForm.category} onValueChange={(v) => setSendForm({...sendForm, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={sendForm.priority} onValueChange={(v) => setSendForm({...sendForm, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title"
                value={sendForm.title}
                onChange={(e) => setSendForm({...sendForm, title: e.target.value})}
                placeholder="Notification title"
                data-testid="send-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea 
                id="message"
                value={sendForm.message}
                onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                placeholder="Notification message..."
                rows={4}
                data-testid="send-message-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action_url">Action URL (optional)</Label>
                <Input 
                  id="action_url"
                  value={sendForm.action_url}
                  onChange={(e) => setSendForm({...sendForm, action_url: e.target.value})}
                  placeholder="/training"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action_label">Button Label</Label>
                <Input 
                  id="action_label"
                  value={sendForm.action_label}
                  onChange={(e) => setSendForm({...sendForm, action_label: e.target.value})}
                  placeholder="View Details"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
            <Button onClick={handleSendNotification} disabled={submitting} data-testid="confirm-send-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trigger Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              {editingTrigger ? 'Edit Trigger' : 'Create Trigger'}
            </DialogTitle>
            <DialogDescription>
              Configure automated notification rules
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trigger_name">Trigger Name *</Label>
              <Input 
                id="trigger_name"
                value={triggerForm.name}
                onChange={(e) => setTriggerForm({...triggerForm, name: e.target.value})}
                placeholder="e.g., License Expiry Warning"
                data-testid="trigger-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger_desc">Description</Label>
              <Input 
                id="trigger_desc"
                value={triggerForm.description}
                onChange={(e) => setTriggerForm({...triggerForm, description: e.target.value})}
                placeholder="Brief description of this trigger"
              />
            </div>

            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={triggerForm.event_type} onValueChange={(v) => setTriggerForm({...triggerForm, event_type: v})}>
                <SelectTrigger data-testid="trigger-event-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((event) => (
                    <SelectItem key={event.value} value={event.value}>{event.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {triggerForm.event_type === "license_expiring" && (
              <div className="space-y-2">
                <Label>Days Before Expiry</Label>
                <Input 
                  type="number"
                  value={triggerForm.conditions.days_before || 30}
                  onChange={(e) => setTriggerForm({...triggerForm, conditions: {...triggerForm.conditions, days_before: parseInt(e.target.value)}})}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="template_title">Notification Title *</Label>
              <Input 
                id="template_title"
                value={triggerForm.template_title}
                onChange={(e) => setTriggerForm({...triggerForm, template_title: e.target.value})}
                placeholder="Your license is expiring soon"
                data-testid="trigger-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_message">Notification Message *</Label>
              <Textarea 
                id="template_message"
                value={triggerForm.template_message}
                onChange={(e) => setTriggerForm({...triggerForm, template_message: e.target.value})}
                placeholder="Use {{user_name}} for placeholders..."
                rows={3}
                data-testid="trigger-message-input"
              />
              <p className="text-xs text-muted-foreground">Available: {"{{user_name}}, {{days_remaining}}, {{license_number}}"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={triggerForm.priority} onValueChange={(v) => setTriggerForm({...triggerForm, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={triggerForm.notification_category} onValueChange={(v) => setTriggerForm({...triggerForm, notification_category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Schedule Interval</Label>
              <Select value={triggerForm.schedule_interval} onValueChange={(v) => setTriggerForm({...triggerForm, schedule_interval: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How often the scheduler should check and run this trigger</p>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="trigger_enabled"
                checked={triggerForm.enabled}
                onChange={(e) => setTriggerForm({...triggerForm, enabled: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="trigger_enabled">Enable this trigger</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTriggerDialog(false); setEditingTrigger(null); }}>Cancel</Button>
            <Button onClick={handleCreateTrigger} disabled={submitting} data-testid="save-trigger-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {editingTrigger ? 'Update Trigger' : 'Create Trigger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Create Template
            </DialogTitle>
            <DialogDescription>
              Save a reusable notification template
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input 
                id="template_name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                placeholder="e.g., Monthly Newsletter"
                data-testid="template-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={templateForm.category} onValueChange={(v) => setTemplateForm({...templateForm, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={templateForm.priority} onValueChange={(v) => setTemplateForm({...templateForm, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tpl_title">Title *</Label>
              <Input 
                id="tpl_title"
                value={templateForm.title}
                onChange={(e) => setTemplateForm({...templateForm, title: e.target.value})}
                placeholder="Notification title"
                data-testid="template-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tpl_message">Message *</Label>
              <Textarea 
                id="tpl_message"
                value={templateForm.message}
                onChange={(e) => setTemplateForm({...templateForm, message: e.target.value})}
                placeholder="Notification message..."
                rows={4}
                data-testid="template-message-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={submitting} data-testid="save-template-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GovernmentNotifications;
