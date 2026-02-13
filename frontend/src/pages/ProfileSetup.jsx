import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, Building, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

const ProfileSetup = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profileType, setProfileType] = useState(user?.role === 'dealer' ? 'dealer' : 'citizen');
  
  const [citizenData, setCitizenData] = useState({
    license_number: "",
    license_type: "firearm",
    address: "",
    phone: ""
  });
  
  const [dealerData, setDealerData] = useState({
    business_name: "",
    license_number: "",
    gps_lat: 40.7128,
    gps_lng: -74.0060
  });

  const handleCitizenSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post("/citizen/profile", citizenData);
      toast.success("Profile created successfully!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDealerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post("/dealer/profile", dealerData);
      toast.success("Dealer profile created successfully!");
      navigate("/dealer", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const isDarkMode = user?.role === 'dealer' || user?.role === 'admin';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-aegis-navy text-white' : 'bg-gray-50'}`} data-testid="profile-setup">
      {/* Header */}
      <header className={`${isDarkMode ? 'glass-heavy' : 'bg-white border-b border-gray-200'} sticky top-0 z-40`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className={isDarkMode ? 'text-white/70 hover:text-white' : ''}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className={`w-7 h-7 ${isDarkMode ? 'text-aegis-signal' : 'text-blue-600'}`} />
            <span className={`font-heading font-bold text-lg ${isDarkMode ? '' : 'text-gray-900'}`}>
              Profile Setup
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Type Selector */}
        {user?.role === 'admin' && (
          <div className="mb-8">
            <Label className={isDarkMode ? 'text-white/70' : 'text-gray-700'}>Profile Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                onClick={() => setProfileType('citizen')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  profileType === 'citizen'
                    ? isDarkMode 
                      ? 'border-aegis-signal bg-aegis-signal/10' 
                      : 'border-blue-500 bg-blue-50'
                    : isDarkMode
                      ? 'border-white/10 hover:border-white/20'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className={`w-8 h-8 mx-auto mb-2 ${
                  profileType === 'citizen' 
                    ? isDarkMode ? 'text-aegis-signal' : 'text-blue-500'
                    : isDarkMode ? 'text-white/50' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${isDarkMode ? '' : 'text-gray-900'}`}>Citizen</p>
              </button>
              <button
                onClick={() => setProfileType('dealer')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  profileType === 'dealer'
                    ? isDarkMode 
                      ? 'border-aegis-signal bg-aegis-signal/10' 
                      : 'border-blue-500 bg-blue-50'
                    : isDarkMode
                      ? 'border-white/10 hover:border-white/20'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Building className={`w-8 h-8 mx-auto mb-2 ${
                  profileType === 'dealer' 
                    ? isDarkMode ? 'text-aegis-signal' : 'text-blue-500'
                    : isDarkMode ? 'text-white/50' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${isDarkMode ? '' : 'text-gray-900'}`}>Dealer</p>
              </button>
            </div>
          </div>
        )}

        {/* Citizen Form */}
        {profileType === 'citizen' && (
          <Card className={isDarkMode ? 'bg-aegis-slate border-white/10' : ''}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                <User className={`w-5 h-5 ${isDarkMode ? 'text-aegis-signal' : 'text-blue-600'}`} />
                Citizen Profile
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-white/50' : ''}>
                Register your firearm license to enable digital verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCitizenSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className={isDarkMode ? 'text-white/70' : ''}>License Number</Label>
                  <Input
                    placeholder="e.g., LIC-12345678"
                    value={citizenData.license_number}
                    onChange={(e) => setCitizenData({ ...citizenData, license_number: e.target.value.toUpperCase() })}
                    className={isDarkMode ? 'bg-aegis-navy border-white/10 text-white placeholder:text-white/30' : ''}
                    required
                    data-testid="citizen-license-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className={isDarkMode ? 'text-white/70' : ''}>License Type</Label>
                  <Select
                    value={citizenData.license_type}
                    onValueChange={(value) => setCitizenData({ ...citizenData, license_type: value })}
                  >
                    <SelectTrigger 
                      className={isDarkMode ? 'bg-aegis-navy border-white/10 text-white' : ''}
                      data-testid="citizen-license-type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firearm">Firearm License</SelectItem>
                      <SelectItem value="ammunition">Ammunition Only</SelectItem>
                      <SelectItem value="both">Firearm & Ammunition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className={isDarkMode ? 'text-white/70' : ''}>Address</Label>
                  <Input
                    placeholder="Your registered address"
                    value={citizenData.address}
                    onChange={(e) => setCitizenData({ ...citizenData, address: e.target.value })}
                    className={isDarkMode ? 'bg-aegis-navy border-white/10 text-white placeholder:text-white/30' : ''}
                    data-testid="citizen-address-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className={isDarkMode ? 'text-white/70' : ''}>Phone Number</Label>
                  <Input
                    placeholder="+1-555-0100"
                    value={citizenData.phone}
                    onChange={(e) => setCitizenData({ ...citizenData, phone: e.target.value })}
                    className={isDarkMode ? 'bg-aegis-navy border-white/10 text-white placeholder:text-white/30' : ''}
                    data-testid="citizen-phone-input"
                  />
                </div>
                
                <Button 
                  type="submit"
                  className={`w-full h-12 ${isDarkMode ? 'bg-aegis-signal hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                  disabled={loading}
                  data-testid="submit-citizen-profile"
                >
                  {loading ? (
                    "Creating Profile..."
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Profile
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Dealer Form */}
        {profileType === 'dealer' && (
          <Card className={isDarkMode ? 'bg-aegis-slate border-white/10' : ''}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                <Building className={`w-5 h-5 ${isDarkMode ? 'text-aegis-signal' : 'text-blue-600'}`} />
                Dealer Profile
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-white/50' : ''}>
                Register your dealership to initiate buyer verifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDealerSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className={isDarkMode ? 'text-white/70' : ''}>Business Name</Label>
                  <Input
                    placeholder="Your business name"
                    value={dealerData.business_name}
                    onChange={(e) => setDealerData({ ...dealerData, business_name: e.target.value })}
                    className={isDarkMode ? 'bg-aegis-navy border-white/10 text-white placeholder:text-white/30' : ''}
                    required
                    data-testid="dealer-business-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className={isDarkMode ? 'text-white/70' : ''}>Dealer License Number</Label>
                  <Input
                    placeholder="e.g., DLR-12345678"
                    value={dealerData.license_number}
                    onChange={(e) => setDealerData({ ...dealerData, license_number: e.target.value.toUpperCase() })}
                    className={isDarkMode ? 'bg-aegis-navy border-white/10 text-white placeholder:text-white/30' : ''}
                    required
                    data-testid="dealer-license-input"
                  />
                </div>
                
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-aegis-navy/50 border border-white/10' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-gray-500'} mb-2`}>
                    GPS Location (Auto-detected)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>Latitude</Label>
                      <p className="font-mono text-sm">{dealerData.gps_lat.toFixed(6)}</p>
                    </div>
                    <div>
                      <Label className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>Longitude</Label>
                      <p className="font-mono text-sm">{dealerData.gps_lng.toFixed(6)}</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit"
                  className={`w-full h-12 ${isDarkMode ? 'bg-aegis-signal hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                  disabled={loading}
                  data-testid="submit-dealer-profile"
                >
                  {loading ? (
                    "Creating Profile..."
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Dealer Profile
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ProfileSetup;
