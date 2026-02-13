import { useState, useEffect } from "react";
import { 
  AlertTriangle, Clock, AlertCircle, CheckCircle, 
  RefreshCw, Calendar, Shield, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";

const LicenseAlerts = ({ api, darkMode = false }) => {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get("/citizen/license-alerts");
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching license alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyles = (severity) => {
    const styles = {
      critical: {
        bg: darkMode ? "bg-red-500/10" : "bg-red-50",
        border: "border-red-500/30",
        text: "text-red-500",
        icon: XCircle
      },
      urgent: {
        bg: darkMode ? "bg-amber-500/10" : "bg-amber-50",
        border: "border-amber-500/30",
        text: "text-amber-500",
        icon: AlertTriangle
      },
      warning: {
        bg: darkMode ? "bg-yellow-500/10" : "bg-yellow-50",
        border: "border-yellow-500/30",
        text: "text-yellow-500",
        icon: AlertCircle
      },
      info: {
        bg: darkMode ? "bg-blue-500/10" : "bg-blue-50",
        border: "border-blue-500/30",
        text: "text-blue-500",
        icon: Clock
      }
    };
    return styles[severity] || styles.info;
  };

  if (loading) {
    return (
      <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
        <CardContent className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  const daysUntilExpiry = alerts?.days_until_expiry;
  const complianceScore = alerts?.compliance_score || 100;

  // Calculate expiry progress (365 days = 100%)
  const expiryProgress = daysUntilExpiry !== null 
    ? Math.max(0, Math.min(100, (daysUntilExpiry / 365) * 100))
    : 100;

  return (
    <div className="space-y-4" data-testid="license-alerts">
      {/* License Status Overview */}
      <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className={`flex items-center gap-2 text-base ${darkMode ? "text-white" : ""}`}>
            <Shield className="w-5 h-5 text-blue-500" />
            License Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Days until expiry */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? "text-white/70" : "text-gray-600"}`}>
                License Validity
              </span>
              <span className={`font-mono text-sm ${
                daysUntilExpiry < 0 ? "text-red-500" :
                daysUntilExpiry <= 30 ? "text-amber-500" : 
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                {daysUntilExpiry !== null 
                  ? daysUntilExpiry < 0 
                    ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                    : `${daysUntilExpiry} days remaining`
                  : "N/A"
                }
              </span>
            </div>
            <Progress 
              value={expiryProgress} 
              className={`h-2 ${
                daysUntilExpiry < 0 ? "[&>div]:bg-red-500" :
                daysUntilExpiry <= 30 ? "[&>div]:bg-amber-500" :
                daysUntilExpiry <= 90 ? "[&>div]:bg-yellow-500" : ""
              }`}
            />
          </div>

          {/* Compliance Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? "text-white/70" : "text-gray-600"}`}>
                Compliance Score
              </span>
              <span className={`font-mono text-sm ${
                complianceScore < 70 ? "text-red-500" :
                complianceScore < 90 ? "text-amber-500" :
                "text-emerald-500"
              }`}>
                {complianceScore}%
              </span>
            </div>
            <Progress 
              value={complianceScore} 
              className={`h-2 ${
                complianceScore < 70 ? "[&>div]:bg-red-500" :
                complianceScore < 90 ? "[&>div]:bg-amber-500" :
                "[&>div]:bg-emerald-500"
              }`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Cards */}
      {alerts?.alerts?.length > 0 ? (
        <div className="space-y-3">
          {alerts.alerts.map((alert, index) => {
            const styles = getSeverityStyles(alert.severity);
            const IconComponent = styles.icon;
            
            return (
              <Card 
                key={index}
                className={`${styles.bg} border ${styles.border} ${
                  alert.severity === 'critical' ? 'animate-pulse' : ''
                }`}
                data-testid={`alert-${alert.type}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${styles.text}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {alert.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${styles.text} ${styles.border}`}
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className={`text-sm ${darkMode ? "text-white/70" : "text-gray-600"}`}>
                        {alert.message}
                      </p>
                      
                      {alert.action && (
                        <Button
                          size="sm"
                          className={`mt-3 ${
                            alert.severity === 'critical' 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          data-testid={`alert-action-${alert.type}`}
                        >
                          {alert.action === 'renew_now' && (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Renew Now
                            </>
                          )}
                          {alert.action === 'renew_soon' && (
                            <>
                              <Calendar className="w-4 h-4 mr-1" />
                              Schedule Renewal
                            </>
                          )}
                          {alert.action === 'renew_early' && (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Renew Early (+50 pts)
                            </>
                          )}
                          {alert.action === 'plan_renewal' && (
                            <>
                              <Calendar className="w-4 h-4 mr-1" />
                              Set Reminder
                            </>
                          )}
                          {alert.action === 'improve_compliance' && (
                            <>
                              <Shield className="w-4 h-4 mr-1" />
                              View Recommendations
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
              All Clear!
            </p>
            <p className={`text-sm ${darkMode ? "text-white/50" : "text-gray-500"}`}>
              Your license is in good standing with no alerts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LicenseAlerts;
