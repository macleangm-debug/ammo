import { useState, useEffect } from "react";
import { 
  Award, Shield, GraduationCap, Lock, CheckCircle, 
  Users, Target, Trophy, Medal, Clock, BookOpen,
  AlertCircle, Heart, Star, TrendingUp, Calendar, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";

const BADGE_ICONS = {
  "award": Award,
  "trophy": Trophy,
  "graduation-cap": GraduationCap,
  "medal": Medal,
  "target": Target,
  "lock": Lock,
  "check-circle": CheckCircle,
  "users": Users,
  "heart-handshake": Heart,
  "clock": Clock,
  "alert-circle": AlertCircle,
  "book-open": BookOpen,
};

const TIER_COLORS = {
  "sentinel": { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  "guardian": { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  "elite_custodian": { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" }
};

const GamificationPanel = ({ api, darkMode = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingChallenge, setProcessingChallenge] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get("/citizen/responsibility");
      setData(response.data);
    } catch (error) {
      console.error("Error fetching responsibility data:", error);
      // Fall back to old endpoint for compatibility
      try {
        const fallback = await api.get("/citizen/gamification");
        setData(fallback.data);
      } catch (e) {
        console.error("Fallback also failed:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const response = await api.post("/citizen/check-in");
      toast.success(response.data.message, {
        description: `Compliance streak: ${response.data.streak} days`
      });
      fetchData();
    } catch (error) {
      toast.info(error.response?.data?.message || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCompleteChallenge = async (challengeId) => {
    setProcessingChallenge(challengeId);
    try {
      const response = await api.post("/citizen/complete-challenge", { challenge_id: challengeId });
      if (response.data.already_completed) {
        toast.info(response.data.message);
      } else {
        toast.success(response.data.message, {
          description: `+${response.data.ari_boost} ARI boost`
        });
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to complete challenge");
    } finally {
      setProcessingChallenge(null);
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

  const tier = data?.tier || { tier_id: "sentinel", name: "Sentinel", color: "green" };
  const tierStyle = TIER_COLORS[tier.tier_id] || TIER_COLORS.sentinel;
  const ariScore = data?.ari_score || data?.points || 0;

  return (
    <div className="space-y-6" data-testid="responsibility-panel">
      {/* ARI Score & Tier Card */}
      <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : ""}`}>
              <Award className="w-5 h-5 text-amber-500" />
              AMMO Responsibility Index
            </CardTitle>
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
          </div>
          <CardDescription className={darkMode ? "text-white/50" : ""}>
            Your responsibility score based on training, safety, and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* ARI Score */}
            <div className="text-center">
              <div className={`text-4xl font-heading font-bold ${
                ariScore >= 85 ? "text-purple-400" :
                ariScore >= 60 ? "text-blue-400" : "text-emerald-400"
              }`}>
                {ariScore}
              </div>
              <p className={`text-sm ${darkMode ? "text-white/50" : "text-gray-500"}`}>ARI Score</p>
            </div>
            
            {/* Tier */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${tierStyle.bg} ${tierStyle.border} border`}>
                <Shield className={`w-4 h-4 ${tierStyle.text}`} />
                <span className={`font-medium ${tierStyle.text}`}>{tier.name}</span>
              </div>
              <p className={`text-sm mt-1 ${darkMode ? "text-white/50" : "text-gray-500"}`}>Current Tier</p>
            </div>
            
            {/* Streak */}
            <div className="text-center">
              <p className={`text-4xl font-heading font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                {data?.compliance_streak || 0}
              </p>
              <p className={`text-sm ${darkMode ? "text-white/50" : "text-gray-500"}`}>Day Streak</p>
            </div>
          </div>

          {/* Progress to Next Tier */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={darkMode ? "text-white/70" : "text-gray-600"}>
                Progress to {ariScore >= 85 ? "Max Level" : ariScore >= 60 ? "Elite Custodian" : "Guardian"}
              </span>
              <span className={darkMode ? "text-white/50" : "text-gray-500"}>
                {ariScore} / {ariScore >= 85 ? "100" : ariScore >= 60 ? "85" : "60"}
              </span>
            </div>
            <Progress 
              value={ariScore >= 85 ? 100 : ariScore >= 60 ? ((ariScore - 60) / 25) * 100 : (ariScore / 60) * 100} 
              className={`h-2 ${
                ariScore >= 85 ? "[&>div]:bg-purple-500" :
                ariScore >= 60 ? "[&>div]:bg-blue-500" : "[&>div]:bg-emerald-500"
              }`}
            />
          </div>
        </CardContent>
      </Card>

      {/* ARI Factors Breakdown */}
      {data?.ari_factors && (
        <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-base ${darkMode ? "text-white" : ""}`}>
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.ari_factors).map(([key, factor]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={`capitalize ${darkMode ? "text-white/70" : "text-gray-600"}`}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className={darkMode ? "text-white/50" : "text-gray-500"}>
                    {Math.round(factor.score)}%
                  </span>
                </div>
                <Progress value={factor.score} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Training Stats */}
      {data?.training && (
        <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-base ${darkMode ? "text-white" : ""}`}>
              <GraduationCap className="w-5 h-5 text-purple-500" />
              Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={darkMode ? "text-white/70" : "text-gray-600"}>Hours Completed</span>
              <span className={`font-mono ${darkMode ? "text-white" : "text-gray-900"}`}>
                {data.training.hours} / {data.training.target_hours}
              </span>
            </div>
            <Progress value={(data.training.hours / data.training.target_hours) * 100} className="h-2" />
            <p className={`text-xs mt-2 ${darkMode ? "text-white/40" : "text-gray-400"}`}>
              Complete training to boost your ARI score
            </p>
          </CardContent>
        </Card>
      )}

      {/* Monthly Challenges */}
      {data?.monthly_challenges && (
        <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-base ${darkMode ? "text-white" : ""}`}>
              <Zap className="w-5 h-5 text-amber-500" />
              Monthly Challenges ({data.challenges_completed_this_month || 0}/6)
            </CardTitle>
            <CardDescription className={darkMode ? "text-white/50" : ""}>
              Complete challenges to boost your Responsibility Index
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.monthly_challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    challenge.completed
                      ? darkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                      : darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {challenge.completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <div className={`w-5 h-5 rounded-full border-2 ${darkMode ? "border-white/20" : "border-gray-300"}`} />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {challenge.name}
                      </p>
                      <p className={`text-xs ${darkMode ? "text-white/50" : "text-gray-500"}`}>
                        {challenge.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${darkMode ? "border-white/20 text-white/60" : ""}`}>
                      +{challenge.ari_boost} ARI
                    </Badge>
                    {!challenge.completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteChallenge(challenge.id)}
                        disabled={processingChallenge === challenge.id}
                        className={darkMode ? "border-white/20 text-white hover:bg-white/10" : ""}
                        data-testid={`challenge-${challenge.id}`}
                      >
                        {processingChallenge === challenge.id ? "..." : "Complete"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges Earned */}
      <Card className={darkMode ? "bg-aegis-slate border-white/10" : ""}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : ""}`}>
            <Star className="w-5 h-5 text-amber-500" />
            Responsibility Badges ({data?.badges_earned?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.badges_earned?.length || 0) === 0 ? (
            <p className={`text-center py-4 ${darkMode ? "text-white/50" : "text-gray-500"}`}>
              Complete training and challenges to earn badges!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data?.badges_earned?.map((badge) => {
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
                      +{badge.ari_boost} ARI
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anti-Gamification Notice */}
      <div className={`text-center p-4 rounded-lg ${darkMode ? "bg-white/5" : "bg-gray-100"}`}>
        <p className={`text-xs ${darkMode ? "text-white/40" : "text-gray-500"}`}>
          AMMO rewards responsible behavior, training, and safety — never purchase volume.
        </p>
      </div>
    </div>
  );
};

export default GamificationPanel;
