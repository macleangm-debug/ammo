import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Settings, LayoutDashboard, FileText, Bell, Activity, 
  AlertTriangle, Palette, Loader2, Users, Shield, Handshake,
  Lock, Unlock, Heart, CheckCircle, Clock, ExternalLink,
  ChevronRight, Wifi, ShieldCheck, BadgeCheck, AlertCircle,
  Building2, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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

const PartnerIntegrations = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/government/partner-integrations");
      setIntegrations(response.data.integrations || []);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast.error("Failed to load partner integrations");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (integration) => {
    try {
      const response = await api.get(`/government/partner-integrations/${integration.integration_id}`);
      setSelectedIntegration(response.data);
      setShowDetailDialog(true);
    } catch (error) {
      toast.error("Failed to load integration details");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getIntegrationIcon = (category) => {
    switch (category) {
      case "storage_compliance":
        return <Lock className="w-8 h-8" />;
      case "coverage_verification":
        return <ShieldCheck className="w-8 h-8" />;
      default:
        return <Handshake className="w-8 h-8" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "seeking_partner":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Seeking Partner</Badge>;
      case "in_development":
        return <Badge variant="secondary">In Development</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navItems={NAV_ITEMS} title="Partner Integrations" subtitle="Government Portal" onLogout={handleLogout} api={api}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navItems={NAV_ITEMS} title="Partner Integrations" subtitle="Government Portal" onLogout={handleLogout} api={api}>
      <div className="space-y-6" data-testid="partner-integrations-page">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="w-7 h-7 text-primary" />
            Partner Integration Opportunities
          </h2>
          <p className="text-muted-foreground max-w-3xl">
            AMMO is designed to connect with industry partners to enhance safety, compliance, and user experience. 
            These integrations are ready for partner onboarding - contact us to discuss collaboration.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Total Integrations</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{integrations.length}</p>
                </div>
                <Zap className="w-10 h-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400">Seeking Partners</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                    {integrations.filter(i => i.status === "seeking_partner").length}
                  </p>
                </div>
                <Handshake className="w-10 h-10 text-amber-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Active Integrations</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {integrations.filter(i => i.is_active).length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.integration_id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                      integration.category === "storage_compliance" 
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                        : "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
                    }`}>
                      {getIntegrationIcon(integration.category)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {integration.category?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Layman Explanation */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    What does this mean for you?
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {integration.layman_explanation}
                  </p>
                </div>

                {/* Benefits Preview */}
                <div>
                  <h4 className="font-medium mb-2">Key Benefits</h4>
                  <ul className="space-y-1">
                    {integration.benefits?.slice(0, 3).map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                    {integration.benefits?.length > 3 && (
                      <li className="text-sm text-muted-foreground pl-6">
                        +{integration.benefits.length - 3} more benefits...
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="bg-muted/30 border-t">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>API v{integration.api_version}</span>
                  </div>
                  <Button variant="outline" onClick={() => handleViewDetails(integration)}>
                    View Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Interested in Partnering with AMMO?</h3>
                  <p className="text-muted-foreground">
                    We're actively seeking partners to enhance firearm safety and compliance.
                  </p>
                </div>
              </div>
              <Button size="lg" className="whitespace-nowrap">
                <Handshake className="w-5 h-5 mr-2" />
                Contact Partnership Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className={`p-2 rounded-lg ${
                    selectedIntegration.category === "storage_compliance" 
                      ? "bg-blue-100 text-blue-600"
                      : "bg-purple-100 text-purple-600"
                  }`}>
                    {getIntegrationIcon(selectedIntegration.category)}
                  </div>
                  {selectedIntegration.name}
                </DialogTitle>
                <DialogDescription>{selectedIntegration.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg flex items-center justify-between ${
                  selectedIntegration.is_active 
                    ? "bg-green-50 border border-green-200" 
                    : "bg-amber-50 border border-amber-200"
                }`}>
                  <div className="flex items-center gap-3">
                    {selectedIntegration.is_active ? (
                      <BadgeCheck className="w-6 h-6 text-green-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-amber-600" />
                    )}
                    <div>
                      <p className={`font-medium ${selectedIntegration.is_active ? "text-green-700" : "text-amber-700"}`}>
                        {selectedIntegration.is_active ? "Integration Active" : "Seeking Integration Partner"}
                      </p>
                      <p className={`text-sm ${selectedIntegration.is_active ? "text-green-600" : "text-amber-600"}`}>
                        {selectedIntegration.is_active 
                          ? `${selectedIntegration.registered_partners?.length || 0} partner(s) connected`
                          : "APIs ready - awaiting partner onboarding"
                        }
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(selectedIntegration.status)}
                </div>

                {/* Layman Explanation */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    In Simple Terms
                  </h4>
                  <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg leading-relaxed">
                    {selectedIntegration.layman_explanation}
                  </p>
                </div>

                <Separator />

                {/* All Benefits */}
                <div>
                  <h4 className="font-semibold mb-3">All Benefits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedIntegration.benefits?.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded bg-green-50 dark:bg-green-950/20">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Technical Requirements */}
                <div>
                  <h4 className="font-semibold mb-3">Technical Requirements for Partners</h4>
                  <ul className="space-y-2">
                    {selectedIntegration.technical_requirements?.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Wifi className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Data We Receive */}
                <div>
                  <h4 className="font-semibold mb-3">Data AMMO Receives</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIntegration.data_we_receive?.map((data, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {data}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    API Version: {selectedIntegration.api_version} • Updated: {selectedIntegration.last_updated}
                  </span>
                  <Button onClick={() => setShowDetailDialog(false)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PartnerIntegrations;
