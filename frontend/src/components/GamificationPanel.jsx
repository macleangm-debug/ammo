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
  "sentinel": { bg: "bg-tactical-success/10", border: "border-tactical-success/30", text: "text-tactical-success" },
  "guardian": { bg: "bg-tactical-primary/10", border: "border-tactical-primary/30", text: "text-tactical-primary" },
  "elite_custodian": { bg: "bg-tactical-elite/10", border: "border-tactical-elite/30", text: "text-tactical-elite" }
};

const GamificationPanel = ({ api }) => {
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
      <Card className="glass-card border-border">
        <CardContent className="p-6 text-center">
          <div className="loading-radar mx-auto" />
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
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <Award className="w-5 h-5 text-tactical-warning" />
              AMMO RESPONSIBILITY INDEX
            </CardTitle>
            <Button
              size="sm"
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="bg-primary hover:bg-primary/90 font-mono text-xs"
              data-testid="daily-checkin-btn"
            >
              <Calendar className="w-4 h-4 mr-1" />
              CHECK-IN
            </Button>
          </div>
          <CardDescription>
            Your responsibility score based on training, safety, and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* ARI Score */}
            <div className="text-center">
              <div className={`font-heading text-4xl font-bold ${
                ariScore >= 85 ? "text-tactical-elite" :
                ariScore >= 60 ? "text-tactical-primary" : "text-tactical-success"
              }`}>
                {ariScore}
              </div>
              <p className="font-mono text-xxs text-muted-foreground">ARI SCORE</p>
            </div>
            
            {/* Tier */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm ${tierStyle.bg} ${tierStyle.border} border`}>
                <Shield className={`w-4 h-4 ${tierStyle.text}`} />
                <span className={`font-medium text-sm ${tierStyle.text}`}>{tier.name}</span>
              </div>
              <p className="font-mono text-xxs text-muted-foreground mt-1">CURRENT TIER</p>
            </div>
            
            {/* Streak */}
            <div className="text-center">
              <p className="font-heading text-4xl font-bold">
                {data?.compliance_streak || 0}
              </p>
              <p className="font-mono text-xxs text-muted-foreground">DAY STREAK</p>
            </div>
          </div>

          {/* Progress to Next Tier */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-muted-foreground">
                Progress to {ariScore >= 85 ? "Max Level" : ariScore >= 60 ? "Elite Custodian" : "Guardian"}
              </span>
              <span className="text-muted-foreground">
                {ariScore} / {ariScore >= 85 ? "100" : ariScore >= 60 ? "85" : "60"}
              </span>
            </div>
            <Progress 
              value={ariScore >= 85 ? 100 : ariScore >= 60 ? ((ariScore - 60) / 25) * 100 : (ariScore / 60) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* ARI Factors Breakdown */}
      {data?.ari_factors && (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
              SCORE BREAKDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.ari_factors).map(([key, factor]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-muted-foreground uppercase">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-foreground">
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
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <GraduationCap className="w-5 h-5 text-tactical-elite" />
              TRAINING PROGRESS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Hours Completed</span>
              <span className="font-mono text-sm">
                {data.training.hours} / {data.training.target_hours}
              </span>
            </div>
            <Progress value={(data.training.hours / data.training.target_hours) * 100} className="h-2" />
            <p className="font-mono text-xxs text-muted-foreground mt-2">
              Complete training to boost your ARI score
            </p>
          </CardContent>
        </Card>
      )}

      {/* Monthly Challenges */}
      {data?.monthly_challenges && (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <Zap className="w-5 h-5 text-tactical-warning" />
              MONTHLY CHALLENGES ({data.challenges_completed_this_month || 0}/6)
            </CardTitle>
            <CardDescription>
              Complete challenges to boost your Responsibility Index
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.monthly_challenges.map((challenge, index) => (
                <div
                  key={challenge.id}
                  className={`p-3 rounded-lg border flex items-center justify-between animate-slide-up stagger-${(index % 5) + 1} ${
                    challenge.completed
                      ? "bg-tactical-success/10 border-tactical-success/30"
                      : "bg-card/50 border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {challenge.completed ? (
                      <CheckCircle className="w-5 h-5 text-tactical-success" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{challenge.name}</p>
                      <p className="text-xs text-muted-foreground">{challenge.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xxs">
                      +{challenge.ari_boost} ARI
                    </Badge>
                    {!challenge.completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteChallenge(challenge.id)}
                        disabled={processingChallenge === challenge.id}
                        className="font-mono text-xxs"
                        data-testid={`challenge-${challenge.id}`}
                      >
                        {processingChallenge === challenge.id ? "..." : "COMPLETE"}
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
      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Star className="w-5 h-5 text-tactical-warning" />
            RESPONSIBILITY BADGES ({data?.badges_earned?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.badges_earned?.length || 0) === 0 ? (
            <p className="text-center py-4 text-muted-foreground font-mono text-sm">
              COMPLETE TRAINING AND CHALLENGES TO EARN BADGES
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data?.badges_earned?.map((badge, index) => {
                const IconComponent = BADGE_ICONS[badge.icon] || Award;
                return (
                  <div
                    key={badge.badge_id}
                    className={`p-3 rounded-lg border text-center bg-tactical-warning/10 border-tactical-warning/30 animate-slide-up stagger-${(index % 5) + 1}`}
                    data-testid={`badge-${badge.badge_id}`}
                  >
                    <IconComponent className="w-8 h-8 mx-auto mb-2 text-tactical-warning" />
                    <p className="text-sm font-medium">{badge.name}</p>
                    <p className="font-mono text-xxs text-muted-foreground">+{badge.ari_boost} ARI</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anti-Gamification Notice */}
      <div className="text-center p-4 rounded-lg bg-card border border-border">
        <p className="font-mono text-xxs text-muted-foreground">
          AMMO REWARDS RESPONSIBLE BEHAVIOR, TRAINING, AND SAFETY — NEVER PURCHASE VOLUME.
        </p>
      </div>
    </div>
  );
};

export default GamificationPanel;
