import { useState, useEffect } from "react";
import { 
  Shield, CheckCircle, Lock, ArrowRight, Fingerprint, 
  Activity, Award, GraduationCap, Target, Users, Building,
  ChevronRight, Zap, Eye, Radio
} from "lucide-react";
import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LandingPage = ({ api }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleDealerLogin = () => {
    const redirectUrl = window.location.origin + '/dealer';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleGovLogin = () => {
    const redirectUrl = window.location.origin + '/government';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const setupDemo = async () => {
    try {
      await api.post("/demo/setup");
      alert("Demo data created! License: LIC-DEMO-001");
    } catch (error) {
      console.error("Demo setup error:", error);
    }
  };

  const stats = [
    { value: "2.4M+", label: "Licensed Members", icon: Users },
    { value: "99.9%", label: "Verification Rate", icon: CheckCircle },
    { value: "15K+", label: "Active Dealers", icon: Building },
    { value: "24/7", label: "Live Monitoring", icon: Radio },
  ];

  const features = [
    {
      icon: Award,
      title: "ARI Score System",
      description: "Responsibility Index (0-100) based on training, compliance, and safe behavior - never purchases.",
      color: "text-tactical-primary"
    },
    {
      icon: GraduationCap,
      title: "Training Recognition",
      description: "Climb the leaderboard through safety certifications and training hours completed.",
      color: "text-tactical-elite"
    },
    {
      icon: Shield,
      title: "Tier Benefits",
      description: "Advance from Sentinel to Elite Custodian for priority service and exclusive perks.",
      color: "text-tactical-success"
    },
    {
      icon: Eye,
      title: "Real-Time Oversight",
      description: "Government-grade monitoring with AI-powered risk assessment and compliance tracking.",
      color: "text-tactical-cyan"
    },
    {
      icon: Target,
      title: "Instant Verification",
      description: "Dealers verify members in seconds with biometric authentication and GPS validation.",
      color: "text-tactical-warning"
    },
    {
      icon: Zap,
      title: "Silent Distress",
      description: "Covert emergency protocols protect members during any suspicious transaction.",
      color: "text-tactical-danger"
    },
  ];

  const tiers = [
    {
      name: "Sentinel",
      range: "0-59",
      color: "tactical-success",
      gradient: "from-tactical-success/20",
      icon: Shield,
      benefits: ["Standard Verification", "Basic Platform Access", "License Wallet"],
      description: "Entry tier for licensed and compliant members"
    },
    {
      name: "Guardian",
      range: "60-84",
      color: "tactical-primary",
      gradient: "from-tactical-primary/20",
      icon: Shield,
      benefits: ["Faster Verification", "Training Discounts", "Recognition Badge", "Priority Support"],
      description: "Advanced training and perfect renewal record"
    },
    {
      name: "Elite Custodian",
      range: "85-100",
      color: "tactical-elite",
      gradient: "from-tactical-elite/20",
      icon: Award,
      benefits: ["Priority Service", "Insurance Discounts", "Community Mentor Status", "Renewal Fee Reduction"],
      description: "Exemplary long-term compliance excellence"
    },
  ];

  return (
    <div className={`min-h-screen bg-background text-foreground overflow-hidden ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-heavy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
            </div>
            <div>
              <span className="font-heading font-bold text-lg tracking-tight">AMMO</span>
              <p className="text-xxs font-mono text-muted-foreground hidden sm:block">
                Accountable Munitions & Mobility Oversight
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground hover:bg-accent hidden sm:flex"
              onClick={handleLogin}
              data-testid="nav-login-btn"
            >
              Member Portal
            </Button>
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground hover:bg-accent hidden sm:flex"
              onClick={handleDealerLogin}
              data-testid="nav-dealer-btn"
            >
              Dealer Portal
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs"
              onClick={handleGovLogin}
              data-testid="nav-gov-btn"
            >
              <Lock className="w-3 h-3 mr-1" />
              GOV
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 hero-glow">
        {/* Grid Pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        
        {/* Scanlines */}
        <div className="absolute inset-0 scanlines" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-primary/10 border border-primary/20">
                <Radio className="w-3 h-3 text-primary animate-pulse" />
                <span className="font-mono text-xs text-primary tracking-wide">
                  NATIONAL OVERSIGHT PLATFORM
                </span>
              </div>
              
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                National Responsible
                <span className="block text-primary">Ownership Ecosystem</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                AMMO rewards compliance, safety training, and responsible behavior. 
                Build your Responsibility Index through verified actions, not purchases.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-sm tracking-wide shadow-tactical hover:shadow-tactical-lg transition-all"
                  onClick={handleLogin}
                  data-testid="hero-citizen-login-btn"
                >
                  <Fingerprint className="w-5 h-5 mr-2" />
                  MEMBER ACCESS
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-border hover:bg-accent font-mono text-sm tracking-wide"
                  onClick={handleDealerLogin}
                  data-testid="hero-dealer-login-btn"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  DEALER PORTAL
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="status-indicator status-active" />
                  <span className="font-mono text-xs">SYSTEM ONLINE</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-tactical-success" />
                  <span>Safety-First Rewards</span>
                </div>
              </div>
            </div>

            {/* Right Visual - ARI Score Display */}
            <div className="relative hidden lg:block">
              <div className="relative aspect-square max-w-md mx-auto">
                {/* Main Card */}
                <div className="absolute inset-0 glass-card rounded-lg p-8 tactical-corners overflow-hidden">
                  <div className="corner-bl" />
                  <div className="corner-br" />
                  
                  {/* Scanline Effect */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground tracking-wider mb-2">
                        RESPONSIBILITY INDEX
                      </p>
                      <div className="flex items-end gap-2">
                        <span className="font-heading text-7xl font-bold text-tactical-success">87</span>
                        <span className="font-mono text-sm text-muted-foreground mb-3">/100</span>
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-xs text-muted-foreground">TRAINING</span>
                          <span className="font-mono text-xs text-primary">92%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-xs text-muted-foreground">COMPLIANCE</span>
                          <span className="font-mono text-xs text-tactical-success">100%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-tactical-success rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-xs text-muted-foreground">SAFE STORAGE</span>
                          <span className="font-mono text-xs text-tactical-cyan">85%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-tactical-cyan rounded-full" style={{ width: '85%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Tier Badge */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-tactical-elite" />
                        <span className="font-heading font-semibold text-tactical-elite">Elite Custodian</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">TIER 3</span>
                    </div>
                  </div>
                </div>

                {/* Floating Stats */}
                <div className="absolute -right-4 top-8 glass-card rounded-lg p-4 animate-slide-up stagger-1">
                  <div className="font-mono text-xs text-muted-foreground mb-1">TRAINING HOURS</div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-tactical-elite" />
                    <span className="font-heading font-bold text-lg">24.5</span>
                  </div>
                </div>

                <div className="absolute -left-4 bottom-16 glass-card rounded-lg p-4 animate-slide-up stagger-2">
                  <div className="font-mono text-xs text-muted-foreground mb-1">BADGES EARNED</div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-tactical-warning" />
                    <span className="font-heading font-bold text-lg">12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className={`text-center animate-slide-up stagger-${index + 1}`}
              >
                <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="font-heading text-2xl sm:text-3xl font-bold">{stat.value}</p>
                <p className="font-mono text-xs text-muted-foreground tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Responsibility-First Platform
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              AMMO rewards safe behavior, training completion, and community participation — never purchase volume.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className={`glass-card rounded-lg p-6 card-tactical animate-slide-up stagger-${(index % 6) + 1}`}
              >
                <div className={`w-12 h-12 rounded-lg bg-card flex items-center justify-center mb-4 border border-border`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Showcase */}
      <section className="relative py-20 lg:py-32 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Responsibility Tiers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Progress through tiers by demonstrating responsible ownership and community engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, index) => (
              <div 
                key={tier.name}
                className={`relative rounded-lg p-6 border border-border bg-gradient-to-br ${tier.gradient} to-transparent card-tactical animate-slide-up stagger-${index + 1}`}
              >
                <div className="absolute top-4 right-4">
                  <tier.icon className={`w-8 h-8 text-${tier.color}/30`} />
                </div>
                
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-sm bg-${tier.color}/20 text-${tier.color} text-xs font-mono`}>
                    TIER {index + 1}
                  </span>
                </div>
                
                <h3 className={`font-heading text-xl font-semibold text-${tier.color} mb-2`}>
                  {tier.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>
                
                <ul className="space-y-2">
                  {tier.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className={`w-4 h-4 text-${tier.color}`} />
                      {benefit}
                    </li>
                  ))}
                </ul>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-mono text-muted-foreground">ARI Score: {tier.range}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access Points Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Platform Access
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose your portal based on your role in the AMMO ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Member Access */}
            <div 
              className="group relative glass-card rounded-lg p-8 card-tactical cursor-pointer animate-slide-up stagger-1"
              onClick={handleLogin}
              data-testid="citizen-access-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Member Portal</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Track ARI score, complete training, earn badges, and manage compliance.
              </p>
              <div className="text-xs font-mono text-primary">ACCESS LEVEL: MEMBER</div>
            </div>

            {/* Dealer Access */}
            <div 
              className="group relative glass-card rounded-lg p-8 card-tactical cursor-pointer animate-slide-up stagger-2"
              onClick={handleDealerLogin}
              data-testid="dealer-access-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-lg bg-tactical-warning/10 flex items-center justify-center border border-tactical-warning/20">
                  <Lock className="w-7 h-7 text-tactical-warning" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-tactical-warning group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Dealer Portal</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Verify members, process transactions, and maintain dealer compliance.
              </p>
              <div className="text-xs font-mono text-tactical-warning">ACCESS LEVEL: AUTHORIZED</div>
            </div>

            {/* Government Access */}
            <div 
              className="group relative glass-card rounded-lg p-8 card-tactical cursor-pointer animate-slide-up stagger-3"
              onClick={handleGovLogin}
              data-testid="gov-access-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-lg bg-tactical-success/10 flex items-center justify-center border border-tactical-success/20">
                  <Activity className="w-7 h-7 text-tactical-success" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-tactical-success group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Government Dashboard</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Oversight, risk analytics, and compliance monitoring.
              </p>
              <div className="text-xs font-mono text-tactical-success">ACCESS LEVEL: CLASSIFIED</div>
            </div>
          </div>

          {/* Demo Setup Button */}
          <div className="mt-12 text-center">
            <Button 
              variant="outline" 
              className="text-muted-foreground border-border hover:bg-accent"
              onClick={setupDemo}
              data-testid="setup-demo-btn"
            >
              Setup Demo Data
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-heading font-semibold">AMMO</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Accountable Munitions & Mobility Oversight
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono text-center md:text-right">
              SAFETY-FIRST REWARDS • TRAINING RECOGNITION • RESPONSIBLE OWNERSHIP
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
