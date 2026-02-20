import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, CheckCircle, Lock, ArrowRight, Fingerprint, 
  Activity, Award, GraduationCap, Target, Users, Building,
  ChevronRight, Eye, Sun, Moon, FileText, AlertTriangle, Send, X, Loader2,
  QrCode, Download, BarChart3, Bell, Palette, ClipboardList
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
      icon: QrCode,
      title: "Verified Certificates",
      description: "QR-code enabled certificates with instant public verification for fraud prevention."
    },
    {
      icon: Eye,
      title: "Real-Time Oversight",
      description: "Government-grade monitoring with AI-powered risk assessment."
    },
    {
      icon: Users,
      title: "Owners Registry",
      description: "Comprehensive firearm owners database with export capabilities for compliance reporting."
    },
    {
      icon: Fingerprint,
      title: "Biometric Security",
      description: "Multi-factor authentication ensures secure transactions."
    },
  ];

  const govFeatures = [
    {
      icon: Users,
      title: "Firearm Owners Registry",
      description: "View all registered citizens and dealers with license status, compliance scores, and export to CSV."
    },
    {
      icon: QrCode,
      title: "Verified Certificates",
      description: "Issue fraud-proof certificates with embedded QR codes for instant public verification."
    },
    {
      icon: Palette,
      title: "Certificate Designer",
      description: "Customize certificate templates, seals, colors, and authorized signatures."
    },
    {
      icon: ClipboardList,
      title: "Review Management",
      description: "Process license applications, dealer certifications, and violation reports with full audit trails."
    },
    {
      icon: Bell,
      title: "Automated Notifications",
      description: "Set up triggers for license expiry, compliance warnings, and training reminders."
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Regional compliance rates, review queues, revenue tracking, and predictive insights."
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

      {/* Government Capabilities Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-success/5 to-transparent border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
              <Lock className="w-4 h-4" />
              Government Portal
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              National Oversight Capabilities
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for monitoring, certification, and compliance management across all regions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {govFeatures.map((feature) => (
              <div 
                key={feature.title}
                className="p-6 bg-card border border-border rounded-xl hover:border-success/50 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Verify Certificate CTA */}
          <div className="mt-12 p-8 bg-card border border-border rounded-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold">Verify a Certificate</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan the QR code on any AMMO certificate to verify its authenticity instantly.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-success text-success hover:bg-success/10"
                onClick={() => navigate('/verify')}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Verify Certificate
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Showcase */}
      <section className="py-20 lg:py-32">
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
              <h3 className="font-heading text-xl font-semibold mb-2">Government Portal</h3>
              <p className="text-sm text-muted-foreground mb-3">
                National oversight with owners registry, certificate management, and compliance monitoring.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">Owners Registry</span>
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">QR Certificates</span>
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">CSV Export</span>
              </div>
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

      {/* Apply Now Section */}
      <section className="py-20 lg:py-32 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Apply or Report
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start your application process or report a compliance concern.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* License Application Card */}
            <div 
              className="group p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setShowLicenseDialog(true)}
              data-testid="apply-license-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">License Application</h3>
              <p className="text-sm text-muted-foreground">
                Apply for a new firearm or ammunition ownership license.
              </p>
            </div>

            {/* Dealer Certification Card */}
            <div 
              className="group p-8 bg-card border border-border rounded-xl hover:border-warning/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setShowDealerDialog(true)}
              data-testid="apply-dealer-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Building className="w-7 h-7 text-warning" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-warning group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Dealer Certification</h3>
              <p className="text-sm text-muted-foreground">
                Apply to become a certified firearms dealer on the AMMO platform.
              </p>
            </div>

            {/* Report Violation Card */}
            <div 
              className="group p-8 bg-card border border-border rounded-xl hover:border-danger/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setShowViolationDialog(true)}
              data-testid="report-violation-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-danger/10 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-danger" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-danger group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">Report Violation</h3>
              <p className="text-sm text-muted-foreground">
                Report a compliance concern or violation anonymously.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* License Application Dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              License Application
            </DialogTitle>
            <DialogDescription>
              Apply for a new firearm or ammunition ownership license.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant_name">Full Name *</Label>
                <Input 
                  id="applicant_name" 
                  value={licenseForm.applicant_name}
                  onChange={(e) => setLicenseForm({...licenseForm, applicant_name: e.target.value})}
                  data-testid="license-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicant_email">Email *</Label>
                <Input 
                  id="applicant_email" 
                  type="email"
                  value={licenseForm.applicant_email}
                  onChange={(e) => setLicenseForm({...licenseForm, applicant_email: e.target.value})}
                  data-testid="license-email-input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant_phone">Phone</Label>
                <Input 
                  id="applicant_phone" 
                  value={licenseForm.applicant_phone}
                  onChange={(e) => setLicenseForm({...licenseForm, applicant_phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input 
                  id="date_of_birth" 
                  type="date"
                  value={licenseForm.date_of_birth}
                  onChange={(e) => setLicenseForm({...licenseForm, date_of_birth: e.target.value})}
                  data-testid="license-dob-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicant_address">Address *</Label>
              <Input 
                id="applicant_address" 
                value={licenseForm.applicant_address}
                onChange={(e) => setLicenseForm({...licenseForm, applicant_address: e.target.value})}
                data-testid="license-address-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Type *</Label>
                <Select value={licenseForm.license_type} onValueChange={(v) => setLicenseForm({...licenseForm, license_type: v})}>
                  <SelectTrigger data-testid="license-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firearm">Firearm</SelectItem>
                    <SelectItem value="ammunition">Ammunition</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purpose *</Label>
                <Select value={licenseForm.purpose} onValueChange={(v) => setLicenseForm({...licenseForm, purpose: v})}>
                  <SelectTrigger data-testid="license-purpose-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal_protection">Personal Protection</SelectItem>
                    <SelectItem value="sport">Sport/Recreation</SelectItem>
                    <SelectItem value="hunting">Hunting</SelectItem>
                    <SelectItem value="collection">Collection</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID Type *</Label>
                <Select value={licenseForm.id_type} onValueChange={(v) => setLicenseForm({...licenseForm, id_type: v})}>
                  <SelectTrigger data-testid="license-id-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="state_id">State ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_number">ID Number *</Label>
                <Input 
                  id="id_number" 
                  value={licenseForm.id_number}
                  onChange={(e) => setLicenseForm({...licenseForm, id_number: e.target.value})}
                  data-testid="license-id-number-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Region *</Label>
              <Select value={licenseForm.region} onValueChange={(v) => setLicenseForm({...licenseForm, region: v})}>
                <SelectTrigger data-testid="license-region-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="northeast">Northeast</SelectItem>
                  <SelectItem value="southeast">Southeast</SelectItem>
                  <SelectItem value="midwest">Midwest</SelectItem>
                  <SelectItem value="southwest">Southwest</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={licenseForm.training_completed}
                  onChange={(e) => setLicenseForm({...licenseForm, training_completed: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">I have completed safety training</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLicenseDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitLicense} disabled={submitting} data-testid="submit-license-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dealer Certification Dialog */}
      <Dialog open={showDealerDialog} onOpenChange={setShowDealerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-warning" />
              Dealer Certification
            </DialogTitle>
            <DialogDescription>
              Apply to become a certified firearms dealer on the AMMO platform.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input 
                id="business_name" 
                value={dealerForm.business_name}
                onChange={(e) => setDealerForm({...dealerForm, business_name: e.target.value})}
                data-testid="dealer-business-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name *</Label>
                <Input 
                  id="owner_name" 
                  value={dealerForm.owner_name}
                  onChange={(e) => setDealerForm({...dealerForm, owner_name: e.target.value})}
                  data-testid="dealer-owner-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_email">Owner Email *</Label>
                <Input 
                  id="owner_email" 
                  type="email"
                  value={dealerForm.owner_email}
                  onChange={(e) => setDealerForm({...dealerForm, owner_email: e.target.value})}
                  data-testid="dealer-owner-email-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_phone">Phone *</Label>
                <Input 
                  id="owner_phone" 
                  value={dealerForm.owner_phone}
                  onChange={(e) => setDealerForm({...dealerForm, owner_phone: e.target.value})}
                  data-testid="dealer-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Type *</Label>
                <Select value={dealerForm.business_type} onValueChange={(v) => setDealerForm({...dealerForm, business_type: v})}>
                  <SelectTrigger data-testid="dealer-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="gunsmith">Gunsmith</SelectItem>
                    <SelectItem value="range">Shooting Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_address">Business Address *</Label>
              <Input 
                id="business_address" 
                value={dealerForm.business_address}
                onChange={(e) => setDealerForm({...dealerForm, business_address: e.target.value})}
                data-testid="dealer-address-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID / EIN *</Label>
                <Input 
                  id="tax_id" 
                  value={dealerForm.tax_id}
                  onChange={(e) => setDealerForm({...dealerForm, tax_id: e.target.value})}
                  data-testid="dealer-tax-id-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_license_number">Business License # *</Label>
                <Input 
                  id="business_license_number" 
                  value={dealerForm.business_license_number}
                  onChange={(e) => setDealerForm({...dealerForm, business_license_number: e.target.value})}
                  data-testid="dealer-license-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Region *</Label>
              <Select value={dealerForm.region} onValueChange={(v) => setDealerForm({...dealerForm, region: v})}>
                <SelectTrigger data-testid="dealer-region-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="northeast">Northeast</SelectItem>
                  <SelectItem value="southeast">Southeast</SelectItem>
                  <SelectItem value="midwest">Midwest</SelectItem>
                  <SelectItem value="southwest">Southwest</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={dealerForm.background_check_consent}
                  onChange={(e) => setDealerForm({...dealerForm, background_check_consent: e.target.checked})}
                  className="rounded"
                  data-testid="dealer-bg-check-input"
                />
                <span className="text-sm">I consent to a background check *</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={dealerForm.compliance_agreement}
                  onChange={(e) => setDealerForm({...dealerForm, compliance_agreement: e.target.checked})}
                  className="rounded"
                  data-testid="dealer-compliance-input"
                />
                <span className="text-sm">I agree to AMMO compliance requirements *</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDealerDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitDealer} disabled={submitting} data-testid="submit-dealer-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Certification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Violation Report Dialog */}
      <Dialog open={showViolationDialog} onOpenChange={setShowViolationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" />
              Report a Violation
            </DialogTitle>
            <DialogDescription>
              Report a compliance concern or violation. You may report anonymously.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Violation Type *</Label>
                <Select value={violationForm.violation_type} onValueChange={(v) => setViolationForm({...violationForm, violation_type: v})}>
                  <SelectTrigger data-testid="violation-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="illegal_sale">Illegal Sale</SelectItem>
                    <SelectItem value="storage_violation">Storage Violation</SelectItem>
                    <SelectItem value="license_violation">License Violation</SelectItem>
                    <SelectItem value="safety_violation">Safety Violation</SelectItem>
                    <SelectItem value="documentation_issue">Documentation Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={violationForm.severity} onValueChange={(v) => setViolationForm({...violationForm, severity: v})}>
                  <SelectTrigger data-testid="violation-severity-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description" 
                value={violationForm.description}
                onChange={(e) => setViolationForm({...violationForm, description: e.target.value})}
                placeholder="Describe the violation in detail..."
                rows={4}
                data-testid="violation-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  value={violationForm.location}
                  onChange={(e) => setViolationForm({...violationForm, location: e.target.value})}
                  placeholder="Where did this occur?"
                  data-testid="violation-location-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_observed">Date Observed</Label>
                <Input 
                  id="date_observed" 
                  type="date"
                  value={violationForm.date_observed}
                  onChange={(e) => setViolationForm({...violationForm, date_observed: e.target.value})}
                  data-testid="violation-date-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={violationForm.region} onValueChange={(v) => setViolationForm({...violationForm, region: v})}>
                <SelectTrigger data-testid="violation-region-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="northeast">Northeast</SelectItem>
                  <SelectItem value="southeast">Southeast</SelectItem>
                  <SelectItem value="midwest">Midwest</SelectItem>
                  <SelectItem value="southwest">Southwest</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Contact information (optional - leave blank for anonymous report)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reporter_name">Your Name</Label>
                  <Input 
                    id="reporter_name" 
                    value={violationForm.reporter_name}
                    onChange={(e) => setViolationForm({...violationForm, reporter_name: e.target.value})}
                    data-testid="violation-reporter-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporter_email">Your Email</Label>
                  <Input 
                    id="reporter_email" 
                    type="email"
                    value={violationForm.reporter_email}
                    onChange={(e) => setViolationForm({...violationForm, reporter_email: e.target.value})}
                    data-testid="violation-reporter-email-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViolationDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitViolation} disabled={submitting} data-testid="submit-violation-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
