import { useState, useEffect } from "react";
import { MapPin, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const RiskHeatmaps = ({ api }) => {
  const [geoData, setGeoData] = useState([]);
  const [temporalData, setTemporalData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      const [geoRes, temporalRes] = await Promise.all([
        api.get("/admin/heatmap/geographic"),
        api.get("/admin/heatmap/temporal")
      ]);
      setGeoData(geoRes.data || []);
      setTemporalData(temporalRes.data || []);
    } catch (error) {
      console.error("Error fetching heatmap data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 70) return "text-tactical-danger";
    if (riskScore >= 40) return "text-tactical-warning";
    return "text-tactical-success";
  };

  if (loading) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-6 text-center">
          <div className="loading-radar mx-auto mb-4" />
          <p className="font-mono text-sm text-muted-foreground">LOADING HEATMAPS...</p>
        </CardContent>
      </Card>
    );
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const temporalGrid = {};
  temporalData.forEach(cell => {
    const key = `${cell.day_index}-${cell.hour}`;
    temporalGrid[key] = cell;
  });

  return (
    <div className="space-y-6" data-testid="risk-heatmaps">
      <Tabs defaultValue="temporal" className="w-full">
        <TabsList className="bg-card border border-border mb-4">
          <TabsTrigger value="temporal" className="font-mono text-xs data-[state=active]:bg-primary/10">
            <Clock className="w-4 h-4 mr-2" />
            TIME PATTERNS
          </TabsTrigger>
          <TabsTrigger value="geographic" className="font-mono text-xs data-[state=active]:bg-primary/10">
            <MapPin className="w-4 h-4 mr-2" />
            GEOGRAPHIC
          </TabsTrigger>
        </TabsList>

        {/* Temporal Heatmap */}
        <TabsContent value="temporal">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm">
                <Clock className="w-5 h-5 text-primary" />
                TRANSACTION PATTERNS BY TIME
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Shows when transactions occur and their associated risk levels
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Hour labels */}
                  <div className="flex mb-2">
                    <div className="w-12"></div>
                    {hours.map(hour => (
                      <div 
                        key={hour} 
                        className="flex-1 text-center font-mono text-xxs text-muted-foreground"
                      >
                        {hour % 3 === 0 ? `${hour.toString().padStart(2, '0')}` : ''}
                      </div>
                    ))}
                  </div>
                  
                  {/* Grid */}
                  {days.map((day, dayIndex) => (
                    <div key={day} className="flex items-center mb-1">
                      <div className="w-12 font-mono text-xxs text-muted-foreground">{day}</div>
                      {hours.map(hour => {
                        const cell = temporalGrid[`${dayIndex}-${hour}`] || { count: 0, avg_risk: 0 };
                        const intensity = Math.min(100, cell.count * 15);
                        return (
                          <div
                            key={`${day}-${hour}`}
                            className="flex-1 aspect-square mx-px group relative"
                            title={`${day} ${hour}:00 - ${cell.count} transactions, Avg Risk: ${cell.avg_risk}`}
                          >
                            <div
                              className={`w-full h-full rounded-sm transition-all ${
                                cell.count === 0 
                                  ? 'bg-muted/20' 
                                  : cell.avg_risk >= 50 
                                    ? 'bg-tactical-danger' 
                                    : cell.avg_risk >= 30 
                                      ? 'bg-tactical-warning' 
                                      : 'bg-tactical-success'
                              }`}
                              style={{ opacity: cell.count === 0 ? 0.2 : Math.max(0.3, intensity / 100) }}
                            />
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card border border-border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              <div className="font-medium">{day} {hour}:00</div>
                              <div className="text-muted-foreground">{cell.count} transactions</div>
                              <div className={getRiskColor(cell.avg_risk)}>Risk: {cell.avg_risk}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-tactical-success"></div>
                      <span className="font-mono text-xxs text-muted-foreground">LOW (&lt;30)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-tactical-warning"></div>
                      <span className="font-mono text-xxs text-muted-foreground">MEDIUM (30-50)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-tactical-danger"></div>
                      <span className="font-mono text-xxs text-muted-foreground">HIGH (&gt;50)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic Heatmap */}
        <TabsContent value="geographic">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm">
                <MapPin className="w-5 h-5 text-primary" />
                GEOGRAPHIC RISK DISTRIBUTION
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Transaction locations with risk level indicators
              </p>
            </CardHeader>
            <CardContent>
              {geoData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-mono text-sm">NO GEOGRAPHIC DATA AVAILABLE</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-tactical-success/10 rounded-lg p-4 text-center border border-tactical-success/30">
                      <p className="font-heading text-2xl font-bold text-tactical-success">
                        {geoData.reduce((sum, loc) => sum + loc.low_risk, 0)}
                      </p>
                      <p className="font-mono text-xxs text-muted-foreground">LOW RISK</p>
                    </div>
                    <div className="bg-tactical-warning/10 rounded-lg p-4 text-center border border-tactical-warning/30">
                      <p className="font-heading text-2xl font-bold text-tactical-warning">
                        {geoData.reduce((sum, loc) => sum + loc.medium_risk, 0)}
                      </p>
                      <p className="font-mono text-xxs text-muted-foreground">MEDIUM RISK</p>
                    </div>
                    <div className="bg-tactical-danger/10 rounded-lg p-4 text-center border border-tactical-danger/30">
                      <p className="font-heading text-2xl font-bold text-tactical-danger">
                        {geoData.reduce((sum, loc) => sum + loc.high_risk, 0)}
                      </p>
                      <p className="font-mono text-xxs text-muted-foreground">HIGH RISK</p>
                    </div>
                  </div>

                  {/* Location list */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {geoData.sort((a, b) => b.avg_risk_score - a.avg_risk_score).map((location, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border hover:border-primary/30 transition-colors animate-slide-up stagger-${(idx % 5) + 1}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            location.avg_risk_score >= 50 ? 'bg-tactical-danger/10 border border-tactical-danger/30' :
                            location.avg_risk_score >= 30 ? 'bg-tactical-warning/10 border border-tactical-warning/30' : 
                            'bg-tactical-success/10 border border-tactical-success/30'
                          }`}>
                            <MapPin className={`w-5 h-5 ${
                              location.avg_risk_score >= 50 ? 'text-tactical-danger' :
                              location.avg_risk_score >= 30 ? 'text-tactical-warning' : 'text-tactical-success'
                            }`} />
                          </div>
                          <div>
                            <p className="font-mono text-sm">
                              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                            </p>
                            <p className="font-mono text-xxs text-muted-foreground">
                              {location.total} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-heading text-lg font-bold ${
                            location.avg_risk_score >= 50 ? 'text-tactical-danger' :
                            location.avg_risk_score >= 30 ? 'text-tactical-warning' : 'text-tactical-success'
                          }`}>
                            {Math.round(location.avg_risk_score)}%
                          </div>
                          <p className="font-mono text-xxs text-muted-foreground">AVG RISK</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskHeatmaps;
