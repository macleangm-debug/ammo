import { useState, useEffect } from "react";
import { 
  AlertTriangle, Clock, AlertCircle, CheckCircle, 
  RefreshCw, Calendar, Shield, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";

const LicenseAlerts = ({ api }) => {
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
        bg: "bg-tactical-danger/10",
        border: "border-tactical-danger/30",
        text: "text-tactical-danger",
        icon: XCircle
      },
      urgent: {
        bg: "bg-tactical-warning/10",
        border: "border-tactical-warning/30",
        text: "text-tactical-warning",
        icon: AlertTriangle
      },
      warning: {
        bg: "bg-tactical-warning/10",
        border: "border-tactical-warning/30",
        text: "text-tactical-warning",
        icon: AlertCircle
      },
      info: {
        bg: "bg-primary/10",
        border: "border-primary/30",
        text: "text-primary",
        icon: Clock
      }
    };
    return styles[severity] || styles.info;
  };

  if (loading) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-6 text-center">
          <div className="loading-radar mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const daysUntilExpiry = alerts?.days_until_expiry;
  const complianceScore = alerts?.compliance_score || 100;

  const expiryProgress = daysUntilExpiry !== null 
    ? Math.max(0, Math.min(100, (daysUntilExpiry / 365) * 100))
    : 100;

  return (
    <div className="space-y-4" data-testid="license-alerts">
      {/* License Status Overview */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Shield className="w-5 h-5 text-primary" />
            LICENSE STATUS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Days until expiry */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">License Validity</span>
              <span className={`font-mono text-sm ${
                daysUntilExpiry < 0 ? "text-tactical-danger" :
                daysUntilExpiry <= 30 ? "text-tactical-warning" : ""
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
              className="h-2"
            />
          </div>

          {/* Compliance Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Compliance Score</span>
              <span className={`font-mono text-sm ${
                complianceScore < 70 ? "text-tactical-danger" :
                complianceScore < 90 ? "text-tactical-warning" :
                "text-tactical-success"
              }`}>
                {complianceScore}%
              </span>
            </div>
            <Progress value={complianceScore} className="h-2" />
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
                } animate-slide-up stagger-${(index % 5) + 1}`}
                data-testid={`alert-${alert.type}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${styles.text}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant="outline" className={`font-mono text-xxs ${styles.text} ${styles.border}`}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      
                      {alert.action && (
                        <Button
                          size="sm"
                          className={`mt-3 font-mono text-xs ${
                            alert.severity === 'critical' 
                              ? 'bg-tactical-danger hover:bg-tactical-danger/90' 
                              : 'bg-primary hover:bg-primary/90'
                          }`}
                          data-testid={`alert-action-${alert.type}`}
                        >
                          {alert.action === 'renew_now' && (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1" />
                              RENEW NOW
                            </>
                          )}
                          {alert.action === 'renew_soon' && (
                            <>
                              <Calendar className="w-4 h-4 mr-1" />
                              SCHEDULE RENEWAL
                            </>
                          )}
                          {alert.action === 'renew_early' && (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              RENEW EARLY (+50 PTS)
                            </>
                          )}
                          {alert.action === 'plan_renewal' && (
                            <>
                              <Calendar className="w-4 h-4 mr-1" />
                              SET REMINDER
                            </>
                          )}
                          {alert.action === 'improve_compliance' && (
                            <>
                              <Shield className="w-4 h-4 mr-1" />
                              VIEW RECOMMENDATIONS
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
        <Card className="glass-card border-border">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-tactical-success" />
            <p className="font-medium">All Clear!</p>
            <p className="text-sm text-muted-foreground">
              Your license is in good standing with no alerts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LicenseAlerts;
