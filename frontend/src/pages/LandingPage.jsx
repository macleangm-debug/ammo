import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, CheckCircle, Lock, ArrowRight, Fingerprint, 
  Activity, Award, GraduationCap, Target, Users, Building,
  ChevronRight, Eye, Sun, Moon, FileText, AlertTriangle, Send, X, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";

const LandingPage = ({ api }) => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  
  // Dialog states
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [showDealerDialog, setShowDealerDialog] = useState(false);
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // License Application form
  const [licenseForm, setLicenseForm] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    applicant_address: "",
    license_type: "firearm",
    purpose: "personal_protection",
    date_of_birth: "",
    id_type: "drivers_license",
    id_number: "",
    has_previous_license: false,
    training_completed: false,
    training_certificate_number: "",
    region: "northeast"
  });
  
  // Dealer Certification form
  const [dealerForm, setDealerForm] = useState({
    business_name: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    business_address: "",
    business_type: "retail",
    tax_id: "",
    business_license_number: "",
    years_in_business: 0,
    has_physical_location: true,
    security_measures: [],
    insurance_provider: "",
    insurance_policy_number: "",
    background_check_consent: false,
    compliance_agreement: false,
    region: "northeast"
  });
  
  // Violation Report form
  const [violationForm, setViolationForm] = useState({
    violation_type: "storage_violation",
    description: "",
    location: "",
    date_observed: "",
    reporter_name: "",
    reporter_email: "",
    severity: "medium",
    subject_name: "",
    evidence_description: "",
    region: "northeast"
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleDealerLogin = () => {
    navigate("/login");
  };

  const handleGovLogin = () => {
    navigate("/login");
  };

  const setupDemo = async () => {
    try {
      await api.post("/demo/setup");
      alert("Demo data created! License: LIC-DEMO-001");
    } catch (error) {
      console.error("Demo setup error:", error);
    }
  };
  
  const handleSubmitLicense = async () => {
    setSubmitting(true);
    try {
      const response = await api.post("/public/license-application", licenseForm);
      toast.success("License application submitted successfully!");
      setShowLicenseDialog(false);
      setLicenseForm({
        applicant_name: "", applicant_email: "", applicant_phone: "", applicant_address: "",
        license_type: "firearm", purpose: "personal_protection", date_of_birth: "",
        id_type: "drivers_license", id_number: "", has_previous_license: false,
        training_completed: false, training_certificate_number: "", region: "northeast"
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleSubmitDealer = async () => {
    if (!dealerForm.background_check_consent || !dealerForm.compliance_agreement) {
      toast.error("Please accept background check consent and compliance agreement");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/public/dealer-certification", dealerForm);
      toast.success("Dealer certification submitted successfully!");
      setShowDealerDialog(false);
      setDealerForm({
        business_name: "", owner_name: "", owner_email: "", owner_phone: "", business_address: "",
        business_type: "retail", tax_id: "", business_license_number: "", years_in_business: 0,
        has_physical_location: true, security_measures: [], insurance_provider: "",
        insurance_policy_number: "", background_check_consent: false, compliance_agreement: false, region: "northeast"
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit certification");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleSubmitViolation = async () => {
    if (!violationForm.description) {
      toast.error("Please provide a description of the violation");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/public/report-violation", violationForm);
      toast.success("Violation report submitted successfully!");
      setShowViolationDialog(false);
      setViolationForm({
        violation_type: "storage_violation", description: "", location: "", date_observed: "",
        reporter_name: "", reporter_email: "", severity: "medium", subject_name: "",
        evidence_description: "", region: "northeast"
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { value: "2.4M+", label: "Licensed Members" },
    { value: "99.9%", label: "Verification Rate" },
    { value: "15K+", label: "Active Dealers" },
    { value: "24/7", label: "Live Monitoring" },
  ];

  const features = [
    {
      icon: Award,
      title: "ARI Score System",
      description: "Responsibility Index (0-100) based on training, compliance, and safe behavior."
    },
    {
      icon: GraduationCap,
      title: "Training Recognition",
      description: "Climb the leaderboard through safety certifications and training hours."
    },
    {
      icon: Shield,
      title: "Tier Benefits",
      description: "Advance from Sentinel to Elite Custodian for priority service and perks."
    },
    {
      icon: Eye,
      title: "Real-Time Oversight",
      description: "Government-grade monitoring with AI-powered risk assessment."
    },
    {
      icon: Target,
      title: "Instant Verification",
      description: "Dealers verify members in seconds with biometric authentication."
    },
    {
      icon: Fingerprint,
      title: "Biometric Security",
      description: "Multi-factor authentication ensures secure transactions."
    },
  ];

  const tiers = [
    { name: "Sentinel", range: "0-59", color: "bg-success", benefits: ["Standard Verification", "Basic Platform Access", "License Wallet"] },
    { name: "Guardian", range: "60-84", color: "bg-info", benefits: ["Faster Verification", "Training Discounts", "Recognition Badge"] },
    { name: "Elite Custodian", range: "85-100", color: "bg-primary", benefits: ["Priority Service", "Insurance Discounts", "Community Mentor"] },
  ];

  return (
    <div className={`min-h-screen bg-background text-foreground ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="font-heading font-bold text-xl">AMMO</span>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Accountable Munitions & Mobility Oversight
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              className="hidden sm:flex"
              onClick={handleLogin}
              data-testid="nav-login-btn"
            >
              Member Portal
            </Button>
            <Button 
              variant="ghost" 
              className="hidden sm:flex"
              onClick={handleDealerLogin}
              data-testid="nav-dealer-btn"
            >
              Dealer Portal
            </Button>
            <Button
              onClick={handleGovLogin}
              data-testid="nav-gov-btn"
            >
              <Lock className="w-4 h-4 mr-2" />
              Government
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Activity className="w-4 h-4" />
                National Oversight Platform
              </div>
              
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                National Responsible
                <span className="block text-primary">Ownership Ecosystem</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl">
                AMMO rewards compliance, safety training, and responsible behavior. 
                Build your Responsibility Index through verified actions, not purchases.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="h-12 px-8"
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
                  className="h-12 px-8"
                  onClick={handleDealerLogin}
                  data-testid="hero-dealer-login-btn"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Dealer Portal
                </Button>
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="relative hidden lg:block">
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Mock Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-danger" />
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-xs text-muted-foreground">AMMO Dashboard</span>
                </div>
                {/* Mock Content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">87</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ARI Score</p>
                      <p className="font-semibold">Elite Custodian</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-2xl font-bold">24.5</p>
                      <p className="text-xs text-muted-foreground">Training Hrs</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-xs text-muted-foreground">Badges</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-2xl font-bold">45</p>
                      <p className="text-xs text-muted-foreground">Day Streak</p>
                    </div>
                  </div>
                  <div className="h-24 bg-muted/30 rounded-lg flex items-end p-2 gap-1">
                    {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/60 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-heading text-3xl sm:text-4xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
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
                className="p-6 bg-card border border-border rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Showcase */}
      <section className="py-20 lg:py-32 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Responsibility Tiers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Progress through tiers by demonstrating responsible ownership.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, index) => (
              <div 
                key={tier.name}
                className="p-6 bg-card border border-border rounded-xl"
              >
                <div className={`inline-block px-3 py-1 rounded-full ${tier.color}/10 text-sm font-medium mb-4`}>
                  <span className={`${tier.color === 'bg-success' ? 'text-success' : tier.color === 'bg-info' ? 'text-info' : 'text-primary'}`}>
                    Tier {index + 1}
                  </span>
                </div>
                
                <h3 className="font-heading text-xl font-semibold mb-2">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">ARI Score: {tier.range}</p>
                
                <ul className="space-y-2">
                  {tier.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-success" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access Points */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Get Started
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose your portal based on your role in the AMMO ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div 
              className="group p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={handleLogin}
              data-testid="citizen-access-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Member Portal</h3>
              <p className="text-sm text-muted-foreground">
                Track ARI score, complete training, earn badges, and manage compliance.
              </p>
            </div>

            <div 
              className="group p-8 bg-card border border-border rounded-xl hover:border-warning/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={handleDealerLogin}
              data-testid="dealer-access-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Building className="w-7 h-7 text-warning" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-warning group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Dealer Portal</h3>
              <p className="text-sm text-muted-foreground">
                Verify members, process transactions, and maintain compliance.
              </p>
            </div>

            <div 
              className="group p-8 bg-card border border-border rounded-xl hover:border-success/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={handleGovLogin}
              data-testid="gov-access-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-success" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-success group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Government</h3>
              <p className="text-sm text-muted-foreground">
                National oversight, risk analytics, and compliance monitoring.
              </p>
            </div>
          </div>

          {/* Demo Setup */}
          <div className="mt-12 text-center">
            <Button 
              variant="outline" 
              onClick={setupDemo}
              data-testid="setup-demo-btn"
            >
              Setup Demo Data
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-heading font-semibold">AMMO</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Accountable Munitions & Mobility Oversight • Safety-First Rewards
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
