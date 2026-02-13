import { Shield, CheckCircle, AlertTriangle, Lock, ArrowRight, Fingerprint, MapPin, Activity, Award, GraduationCap } from "lucide-react";
import { Button } from "../components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LandingPage = ({ api }) => {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
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

  return (
    <div className="min-h-screen bg-aegis-navy text-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 hero-glow opacity-50"></div>
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>

        {/* Navigation */}
        <nav className="relative z-10 glass-heavy">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-aegis-signal" />
              <div>
                <span className="font-heading font-bold text-xl tracking-tight">AMMO</span>
                <p className="text-[10px] font-mono text-white/50 -mt-1">Accountable Munitions & Mobility Oversight</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-white/70 hover:text-white hover:bg-white/5"
                onClick={handleLogin}
                data-testid="nav-login-btn"
              >
                Member Portal
              </Button>
              <Button 
                variant="ghost" 
                className="text-white/70 hover:text-white hover:bg-white/5"
                onClick={handleDealerLogin}
                data-testid="nav-dealer-btn"
              >
                Dealer Portal
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-aegis-signal/10 border border-aegis-signal/20 mb-8">
                <Award className="w-4 h-4 text-aegis-signal" />
                <span className="font-mono text-xs text-aegis-signal">RESPONSIBLE OWNERSHIP PLATFORM</span>
              </div>
              
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                National Responsible<br />
                <span className="text-aegis-signal">Ownership Ecosystem</span>
              </h1>
              
              <p className="text-lg text-white/70 mb-10 max-w-xl leading-relaxed">
                AMMO rewards compliance, safety training, and responsible behavior. 
                Build your Responsibility Index through verified actions, not purchases.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="h-12 px-8 bg-aegis-signal hover:bg-blue-600 text-white font-medium rounded-sm shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
                  onClick={handleLogin}
                  data-testid="hero-citizen-login-btn"
                >
                  <Fingerprint className="w-5 h-5 mr-2" />
                  Member Access
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-white/20 text-white hover:bg-white/5 rounded-sm"
                  onClick={handleDealerLogin}
                  data-testid="hero-dealer-login-btn"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Dealer Portal
                </Button>
              </div>

              <div className="mt-8 flex items-center gap-6 text-sm text-white/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-aegis-emerald" />
                  <span>Safety-First Rewards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-aegis-emerald" />
                  <span>Training Recognition</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:block animate-slide-up stagger-2">
              <div className="relative aspect-square max-w-md mx-auto">
                {/* Biometric Visual */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden tactical-border">
                  <img 
                    src="https://images.unsplash.com/photo-1631016042018-448c284aa279?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHw0fHxiaW9tZXRyaWMlMjBkaWdpdGFsJTIwc2VjdXJpdHklMjBzY2FubmluZyUyMGZpbmdlciUyMHByaW50JTIwZnV0dXJpc3RpY3xlbnwwfHx8fDE3NzEwMDM0ODd8MA&ixlib=rb-4.1.0&q=85"
                    alt="Biometric Security"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-aegis-navy via-transparent to-transparent"></div>
                  
                  {/* Scanning Effect */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-full h-1 bg-aegis-signal/50 animate-scan"></div>
                  </div>
                </div>

                {/* Floating Stats Cards */}
                <div className="absolute -right-4 top-8 bg-aegis-slate/90 backdrop-blur-lg rounded-lg p-4 border border-white/10 animate-pulse-glow">
                  <div className="font-mono text-xs text-white/50 mb-1">ARI SCORE</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-aegis-emerald"></div>
                    <span className="font-heading font-bold text-aegis-emerald text-xl">87</span>
                  </div>
                </div>

                <div className="absolute -left-4 bottom-16 bg-aegis-slate/90 backdrop-blur-lg rounded-lg p-4 border border-white/10">
                  <div className="font-mono text-xs text-white/50 mb-1">TIER STATUS</div>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <span className="font-heading font-bold text-purple-400">Elite Custodian</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative bg-aegis-slate/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-semibold mb-4">Responsibility-First Platform</h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              AMMO rewards safe behavior, training completion, and community participation — never purchase volume.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-aegis-navy/50 rounded-lg p-8 border border-white/10 card-hover">
              <div className="w-12 h-12 rounded-lg bg-aegis-signal/10 flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-aegis-signal" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">ARI Score System</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Your Responsibility Index (0-100) reflects training, safe storage, and compliance — not purchases.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-aegis-navy/50 rounded-lg p-8 border border-white/10 card-hover">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6">
                <GraduationCap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">Training Leaderboard</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Climb the ranks through safety training hours and certifications, not transaction volume.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-aegis-navy/50 rounded-lg p-8 border border-white/10 card-hover">
              <div className="w-12 h-12 rounded-lg bg-aegis-emerald/10 flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-aegis-emerald" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">Tier Benefits</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Advance from Sentinel to Elite Custodian for faster verification, insurance discounts, and more.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Showcase */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-semibold mb-4">Responsibility Tiers</h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Progress through tiers by demonstrating responsible ownership and community engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Sentinel Tier */}
          <div className="relative bg-gradient-to-br from-emerald-500/10 to-transparent rounded-lg p-6 border border-emerald-500/20">
            <div className="absolute top-4 right-4">
              <Shield className="w-8 h-8 text-emerald-400/30" />
            </div>
            <div className="mb-4">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono">TIER 1</span>
            </div>
            <h3 className="font-heading text-xl font-semibold text-emerald-400 mb-2">Sentinel</h3>
            <p className="text-white/60 text-sm mb-4">Licensed & Compliant</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Standard Verification
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Basic Platform Access
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40">ARI Score: 0-59</p>
            </div>
          </div>

          {/* Guardian Tier */}
          <div className="relative bg-gradient-to-br from-blue-500/10 to-transparent rounded-lg p-6 border border-blue-500/20">
            <div className="absolute top-4 right-4">
              <Shield className="w-8 h-8 text-blue-400/30" />
            </div>
            <div className="mb-4">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-mono">TIER 2</span>
            </div>
            <h3 className="font-heading text-xl font-semibold text-blue-400 mb-2">Guardian</h3>
            <p className="text-white/60 text-sm mb-4">Advanced Training Complete</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                Faster Verification
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                Training Discounts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                Recognition Badge
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40">ARI Score: 60-84</p>
            </div>
          </div>

          {/* Elite Custodian Tier */}
          <div className="relative bg-gradient-to-br from-purple-500/10 to-transparent rounded-lg p-6 border border-purple-500/20">
            <div className="absolute top-4 right-4">
              <Award className="w-8 h-8 text-purple-400/30" />
            </div>
            <div className="mb-4">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-mono">TIER 3</span>
            </div>
            <h3 className="font-heading text-xl font-semibold text-purple-400 mb-2">Elite Custodian</h3>
            <p className="text-white/60 text-sm mb-4">Exemplary Responsibility</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                Priority Service
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                Insurance Discounts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                Community Mentor Status
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                Renewal Fee Reduction
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40">ARI Score: 85-100</p>
            </div>
          </div>
        </div>
      </div>

      {/* Access Points Section */}
      <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-semibold mb-4">Platform Access</h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Choose your portal based on your role in the AMMO ecosystem.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Member Access */}
          <div 
            className="group bg-gradient-to-br from-white/5 to-transparent rounded-lg p-8 border border-white/10 hover:border-aegis-signal/50 transition-all cursor-pointer"
            onClick={handleLogin}
            data-testid="citizen-access-card"
          >
            <div className="flex items-center justify-between mb-6">
              <Shield className="w-10 h-10 text-aegis-signal" />
              <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-aegis-signal group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-heading text-xl font-semibold mb-2">Member Portal</h3>
            <p className="text-white/60 text-sm mb-4">
              Track ARI score, complete training, earn badges, and manage compliance.
            </p>
            <div className="text-xs font-mono text-aegis-signal">ACCESS LEVEL: MEMBER</div>
          </div>

          {/* Dealer Access */}
          <div 
            className="group bg-gradient-to-br from-white/5 to-transparent rounded-lg p-8 border border-white/10 hover:border-aegis-amber/50 transition-all cursor-pointer"
            onClick={handleDealerLogin}
            data-testid="dealer-access-card"
          >
            <div className="flex items-center justify-between mb-6">
              <Lock className="w-10 h-10 text-aegis-amber" />
              <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-aegis-amber group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-heading text-xl font-semibold mb-2">Dealer Portal</h3>
            <p className="text-white/60 text-sm mb-4">
              Verify members, process transactions, and maintain dealer compliance.
            </p>
            <div className="text-xs font-mono text-aegis-amber">ACCESS LEVEL: AUTHORIZED</div>
          </div>

          {/* Government Access */}
          <div 
            className="group bg-gradient-to-br from-white/5 to-transparent rounded-lg p-8 border border-white/10 hover:border-aegis-emerald/50 transition-all cursor-pointer"
            onClick={handleGovLogin}
            data-testid="gov-access-card"
          >
            <div className="flex items-center justify-between mb-6">
              <Activity className="w-10 h-10 text-aegis-emerald" />
              <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-aegis-emerald group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-heading text-xl font-semibold mb-2">Government Dashboard</h3>
            <p className="text-white/60 text-sm mb-4">
              Oversight, risk analytics, and compliance monitoring.
            </p>
            <div className="text-xs font-mono text-aegis-emerald">ACCESS LEVEL: CLASSIFIED</div>
          </div>
        </div>

        {/* Demo Setup Button */}
        <div className="mt-12 text-center">
          <Button 
            variant="outline" 
            className="text-white/50 border-white/20 hover:bg-white/5"
            onClick={setupDemo}
            data-testid="setup-demo-btn"
          >
            Setup Demo Data
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-aegis-slate/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-aegis-signal" />
              <span className="font-heading font-semibold">AMMO</span>
              <span className="text-xs text-white/40">Accountable Munitions & Mobility Oversight</span>
            </div>
            <div className="text-xs text-white/40 font-mono">
              SAFETY-FIRST REWARDS • TRAINING RECOGNITION • RESPONSIBLE OWNERSHIP
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
