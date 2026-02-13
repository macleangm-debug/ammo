import { useState, useEffect } from "react";
import { 
  Award, Shield, Flame, Crown, Clock, Fingerprint, 
  Lock, GraduationCap, Users, CheckCircle, Star,
  TrendingUp, Calendar, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";

const BADGE_ICONS = {
  "award": Award,
  "shield-check": Shield,
  "flame": Flame,
  "crown": Crown,
  "clock": Clock,
  "fingerprint": Fingerprint,
  "lock": Lock,
  "graduation-cap": GraduationCap,
  "users": Users,
  "check-circle": CheckCircle,
};

const GamificationPanel = ({ api, darkMode = false }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/citizen/gamification");
      setStats(response.data);
      
      // Show new badge notifications
      if (response.data.new_badges?.length > 0) {
        response.data.new_badges.forEach(badge => {
          toast.success(`Badge Earned: ${badge.name}!`, {
            description: badge.description,
            duration: 5000
          });
        });
      }
    } catch (error) {
      console.error("Error fetching gamification stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const response = await api.post("/citizen/check-in");
      toast.success(response.data.message, {
        description: `+${response.data.points_earned} points • Streak: ${response.data.streak} days`
      });
      
      if (response.data.new_badges?.length > 0) {
        response.data.new_badges.forEach(badge => {
          toast.success(`Badge Earned: ${badge.name}!`, {
            description: badge.description
          });
        });
      }
      
      fetchStats();
    } catch (error) {
      toast.info(error.response?.data?.message || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
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

  const level = stats?.level || { level: 1, name: "Novice", min_points: 0, max_points: 99 };
  const progressToNext = level.max_points === Infinity 
    ? 100 
    : ((stats?.points - level.min_points) / (level.max_points - level.min_points)) * 100;

  return (
    <div className="space-y-6" data-testid="gamification-panel">
      {/* Level & Points Card */}
      <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className={`flex items-center justify-between ${darkMode ? "text-white" : ""}`}>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Your Progress
            </div>
            <Button
              size="sm"
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="daily-checkin-btn"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Daily Check-in
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className={`text-3xl font-heading font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                {stats?.points || 0}
              </p>
              <p className={`text-sm ${darkMode ? "text-white/50" : "text-gray-500"}`}>Points</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-heading font-bold text-amber-500`}>
                Lv.{level.level}
              </p>
              <p className={`text-sm ${darkMode ? "text-white/50" : "text-gray-500"}`}>{level.name}</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-heading font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                {stats?.current_streak || 0}
              </p>
              <p className={`text-sm ${darkMode ? "text-white/50" : "text-gray-500"}`}>Day Streak</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={darkMode ? "text-white/70" : "text-gray-600"}>Progress to Level {level.level + 1}</span>
              <span className={darkMode ? "text-white/50" : "text-gray-500"}>
                {stats?.points || 0} / {level.max_points === Infinity ? "MAX" : level.max_points}
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Badges Earned */}
      <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : ""}`}>
            <Award className="w-5 h-5 text-amber-500" />
            Badges Earned ({stats?.badges_earned?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.badges_earned?.length === 0 ? (
            <p className={`text-center py-4 ${darkMode ? "text-white/50" : "text-gray-500"}`}>
              Complete activities to earn badges!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats?.badges_earned?.map((badge) => {
                const IconComponent = BADGE_ICONS[badge.icon] || Award;
                return (
                  <div
                    key={badge.badge_id}
                    className={`p-3 rounded-lg border text-center ${
                      darkMode 
                        ? "bg-amber-500/10 border-amber-500/30" 
                        : "bg-amber-50 border-amber-200"
                    }`}
                    data-testid={`badge-${badge.badge_id}`}
                  >
                    <IconComponent className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {badge.name}
                    </p>
                    <p className={`text-xs ${darkMode ? "text-white/50" : "text-gray-500"}`}>
                      +{badge.points} pts
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Badges */}
      <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : ""}`}>
            <Zap className="w-5 h-5 text-blue-500" />
            Badges to Unlock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats?.badges_available?.slice(0, 4).map((badge) => {
              const IconComponent = BADGE_ICONS[badge.icon] || Award;
              return (
                <div
                  key={badge.badge_id}
                  className={`p-3 rounded-lg border flex items-center gap-3 ${
                    darkMode 
                      ? "bg-white/5 border-white/10" 
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    darkMode ? "bg-white/10" : "bg-gray-200"
                  }`}>
                    <IconComponent className={`w-5 h-5 ${darkMode ? "text-white/40" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${darkMode ? "text-white/70" : "text-gray-700"}`}>
                      {badge.name}
                    </p>
                    <p className={`text-xs ${darkMode ? "text-white/40" : "text-gray-500"}`}>
                      {badge.description}
                    </p>
                  </div>
                  <Badge variant="outline" className={darkMode ? "border-white/20 text-white/50" : ""}>
                    +{badge.points}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GamificationPanel;
