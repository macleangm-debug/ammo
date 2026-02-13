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

  const getHeatColor = (value, max = 100) => {
    const percentage = value / max;
    if (percentage >= 0.7) return "bg-red-500";
    if (percentage >= 0.4) return "bg-amber-500";
    if (percentage >= 0.2) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 70) return "text-red-400";
    if (riskScore >= 40) return "text-amber-400";
    return "text-emerald-400";
  };

  if (loading) {
    return (
      <Card className="bg-aegis-slate border-white/10">
        <CardContent className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-aegis-signal border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white/50 mt-2 text-sm">Loading heatmaps...</p>
        </CardContent>
      </Card>
    );
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Build temporal grid
  const temporalGrid = {};
  temporalData.forEach(cell => {
    const key = `${cell.day_index}-${cell.hour}`;
    temporalGrid[key] = cell;
  });

  return (
    <div className="space-y-6" data-testid="risk-heatmaps">
      <Tabs defaultValue="temporal" className="w-full">
        <TabsList className="bg-aegis-navy border border-white/10">
          <TabsTrigger value="temporal" className="data-[state=active]:bg-aegis-signal">
            <Clock className="w-4 h-4 mr-2" />
            Time Patterns
          </TabsTrigger>
          <TabsTrigger value="geographic" className="data-[state=active]:bg-aegis-signal">
            <MapPin className="w-4 h-4 mr-2" />
            Geographic
          </TabsTrigger>
        </TabsList>

        {/* Temporal Heatmap */}
        <TabsContent value="temporal">
          <Card className="bg-aegis-slate border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-aegis-signal" />
                Transaction Patterns by Time
              </CardTitle>
              <p className="text-sm text-white/50">
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
                        className="flex-1 text-center text-xs text-white/40 font-mono"
                      >
                        {hour % 3 === 0 ? `${hour.toString().padStart(2, '0')}` : ''}
                      </div>
                    ))}
                  </div>
                  
                  {/* Grid */}
                  {days.map((day, dayIndex) => (
                    <div key={day} className="flex items-center mb-1">
                      <div className="w-12 text-xs text-white/50 font-mono">{day}</div>
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
                                  ? 'bg-white/5' 
                                  : cell.avg_risk >= 50 
                                    ? 'bg-red-500' 
                                    : cell.avg_risk >= 30 
                                      ? 'bg-amber-500' 
                                      : 'bg-emerald-500'
                              }`}
                              style={{ opacity: cell.count === 0 ? 0.2 : Math.max(0.3, intensity / 100) }}
                            />
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-aegis-navy border border-white/20 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              <div className="font-medium">{day} {hour}:00</div>
                              <div className="text-white/60">{cell.count} transactions</div>
                              <div className={getRiskColor(cell.avg_risk)}>Risk: {cell.avg_risk}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-emerald-500"></div>
                      <span className="text-xs text-white/60">Low Risk (&lt;30)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-amber-500"></div>
                      <span className="text-xs text-white/60">Medium (30-50)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-red-500"></div>
                      <span className="text-xs text-white/60">High Risk (&gt;50)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic Heatmap */}
        <TabsContent value="geographic">
          <Card className="bg-aegis-slate border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5 text-aegis-signal" />
                Geographic Risk Distribution
              </CardTitle>
              <p className="text-sm text-white/50">
                Transaction locations with risk level indicators
              </p>
            </CardHeader>
            <CardContent>
              {geoData.length === 0 ? (
                <div className="text-center py-12 text-white/50">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p>No geographic data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-aegis-navy/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-heading font-bold text-emerald-400">
                        {geoData.reduce((sum, loc) => sum + loc.low_risk, 0)}
                      </p>
                      <p className="text-xs text-white/50">Low Risk</p>
                    </div>
                    <div className="bg-aegis-navy/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-heading font-bold text-amber-400">
                        {geoData.reduce((sum, loc) => sum + loc.medium_risk, 0)}
                      </p>
                      <p className="text-xs text-white/50">Medium Risk</p>
                    </div>
                    <div className="bg-aegis-navy/50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-heading font-bold text-red-400">
                        {geoData.reduce((sum, loc) => sum + loc.high_risk, 0)}
                      </p>
                      <p className="text-xs text-white/50">High Risk</p>
                    </div>
                  </div>

                  {/* Location list */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {geoData.sort((a, b) => b.avg_risk_score - a.avg_risk_score).map((location, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-aegis-navy/50 rounded-lg border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            location.avg_risk_score >= 50 ? 'bg-red-500/20' :
                            location.avg_risk_score >= 30 ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                          }`}>
                            <MapPin className={`w-5 h-5 ${
                              location.avg_risk_score >= 50 ? 'text-red-400' :
                              location.avg_risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-mono text-sm text-white">
                              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                            </p>
                            <p className="text-xs text-white/50">
                              {location.total} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            location.avg_risk_score >= 50 ? 'text-red-400' :
                            location.avg_risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {Math.round(location.avg_risk_score)}%
                          </div>
                          <p className="text-xs text-white/40">Avg Risk</p>
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
