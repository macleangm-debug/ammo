import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Activity, AlertTriangle, Settings,
  FileText, Users, Search, Filter, RefreshCw, Loader2,
  User, Mail, Calendar, MapPin, Shield, Bell, Eye,
  ChevronRight, ChevronDown, Download, Palette, UserCheck,
  Phone, Building, CreditCard, Clock, CheckCircle, XCircle,
  DollarSign, Target, Crosshair, Handshake, LayoutGrid, List,
  Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const NAV_ITEMS = [
  { id: 'dashboard', path: '/government', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'owners', path: '/government/owners', label: 'Owners', icon: Users },
  { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
  { id: 'templates', path: '/government/templates', label: 'Templates', icon: FileText },
  { id: 'cert-config', path: '/government/certificate-config', label: 'Cert Config', icon: Palette },
  { id: 'notifications', path: '/government/notifications', label: 'Notifications', icon: Bell },
  { id: 'predictive', path: '/government/predictive', label: 'Analytics', icon: Activity },
  { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
  { id: 'flagging', path: '/government/flagging', label: 'Flagging', icon: Flag },
    { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
  { id: 'partners', path: '/government/partners', label: 'Partners', icon: Handshake },
  { id: 'settings', path: '/government/settings', label: 'Settings', icon: Settings },
];

const FirearmOwners = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});
  const [firearmsRegistry, setFirearmsRegistry] = useState([]);
  const [feesOverview, setFeesOverview] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState("citizen");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [exporting, setExporting] = useState(false);
  
  // View mode: "cards" or "table"
  const [viewMode, setViewMode] = useState("cards");
  
  // Infinite scroll
  const [displayCount, setDisplayCount] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(20);
  }, [roleFilter, statusFilter, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter && roleFilter !== "all") params.append("role", roleFilter);
      params.append("limit", "200");
      
      const [usersRes, profilesRes, firearmsRes, feesRes] = await Promise.all([
        api.get(`/government/users-list?${params.toString()}`),
        api.get("/government/citizen-profiles").catch(() => ({ data: { profiles: [] } })),
        api.get("/government/firearms-registry").catch(() => ({ data: { firearms: [], stats: {} } })),
        api.get("/government/fees-overview").catch(() => ({ data: null }))
      ]);
      
      setUsers(usersRes.data.users || []);
      setRoleCounts(usersRes.data.role_counts || {});
      setProfiles(profilesRes.data.profiles || []);
      setFirearmsRegistry(firearmsRes.data.firearms || []);
      setFeesOverview(feesRes.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Get firearms count for a specific user
  const getUserFirearmsCount = useCallback((userId) => {
    return firearmsRegistry.filter(f => f.user_id === userId && f.status === "active").length;
  }, [firearmsRegistry]);

  // Get user's total annual fees
  const getUserTotalFees = useCallback((userId) => {
    const profile = profiles.find(p => p.user_id === userId);
    const licenseFee = profile?.member_annual_fee || 150;
    const userFirearms = firearmsRegistry.filter(f => f.user_id === userId && f.status === "active");
    const firearmsFee = userFirearms.reduce((sum, f) => sum + (f.annual_fee || 50), 0);
    return { licenseFee, firearmsFee, total: licenseFee + firearmsFee, firearmsCount: userFirearms.length };
  }, [profiles, firearmsRegistry]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (roleFilter && roleFilter !== "all") params.append("role", roleFilter);
      
      const response = await api.get(`/government/users-export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `firearm_owners_${roleFilter || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${filteredUsers.length} records to CSV`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const getUserProfile = useCallback((userId) => {
    return profiles.find(p => p.user_id === userId);
  }, [profiles]);

  const handleViewUser = async (u) => {
    setSelectedUser(u);
    setLoadingProfile(true);
    try {
      // Fetch profile details
      const profileRes = await api.get(`/government/user-profile/${u.user_id}`).catch(() => null);
      setUserProfile(profileRes?.data || null);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.user_id?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== "all") {
        const profile = profiles.find(p => p.user_id === u.user_id);
        const licenseStatus = profile ? getLicenseStatus(profile) : "pending";
        if (licenseStatus !== statusFilter) return false;
      }
      
      return true;
    });
  }, [users, searchQuery, statusFilter, profiles]);
  
  // Displayed users (for infinite scroll)
  const displayedUsers = useMemo(() => {
    return filteredUsers.slice(0, displayCount);
  }, [filteredUsers, displayCount]);
  
  const hasMore = displayCount < filteredUsers.length;
  
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + 20, filteredUsers.length));
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMore, filteredUsers.length]);
  
  // Intersection observer for infinite scroll
  const observerRef = useRef(null);
  const lastUserRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, loadMore]);
  
  // Generate avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-purple-500 to-purple-600",
      "from-green-500 to-green-600",
      "from-orange-500 to-orange-600",
      "from-pink-500 to-pink-600",
      "from-teal-500 to-teal-600",
      "from-indigo-500 to-indigo-600",
      "from-rose-500 to-rose-600"
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    suspended: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800"
  };

  const getLicenseStatus = (profile) => {
    if (!profile?.license_expiry) return "pending";
    const expiry = new Date(profile.license_expiry);
    if (expiry < new Date()) return "expired";
    return profile.status || "active";
  };

  return (
    <DashboardLayout 
      user={user} 
      navItems={NAV_ITEMS} 
      title="Firearm Owners Registry"
      subtitle="Government Portal"
      onLogout={handleLogout}
      api={api}
    >
      <div className="space-y-6" data-testid="firearm-owners-page">
        {/* Summary Cards - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer hover:border-primary/50 transition-colors ${roleFilter === 'citizen' ? 'border-primary ring-1 ring-primary' : ''}`}
            onClick={() => setRoleFilter("citizen")}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{roleCounts.citizen || 0}</div>
                  <div className="text-xs text-muted-foreground">Citizens</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:border-primary/50 transition-colors ${roleFilter === 'dealer' ? 'border-primary ring-1 ring-primary' : ''}`}
            onClick={() => setRoleFilter("dealer")}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{roleCounts.dealer || 0}</div>
                  <div className="text-xs text-muted-foreground">Dealers</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Crosshair className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{firearmsRegistry.filter(f => f.status === 'active').length}</div>
                  <div className="text-xs text-muted-foreground">Reg. Firearms</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    ${feesOverview ? ((feesOverview.total_expected_revenue || 0) / 1000).toFixed(1) + 'K' : '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Annual Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Search by name, email, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="user-search-input"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]" data-testid="role-filter-select">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="citizen">Citizens</SelectItem>
                  <SelectItem value="dealer">Dealers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="status-filter-select">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              
              {/* View Toggle */}
              <div className="flex items-center border rounded-lg">
                <Button 
                  variant={viewMode === "cards" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === "table" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <Button variant="outline" onClick={fetchUsers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                disabled={exporting || filteredUsers.length === 0}
                data-testid="export-csv-btn"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {roleFilter === "citizen" ? "Registered Firearm Owners" : roleFilter === "dealer" ? "Licensed Dealers" : "All Users"} 
                <Badge variant="outline">{filteredUsers.length}</Badge>
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Showing {displayedUsers.length} of {filteredUsers.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No users found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => {
                  const profile = getUserProfile(u.user_id);
                  const licenseStatus = profile ? getLicenseStatus(profile) : "pending";
                  const userFees = getUserTotalFees(u.user_id);
                  
                  return (
                    <div 
                      key={u.user_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleViewUser(u)}
                      data-testid={`user-item-${u.user_id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
                          {u.picture ? (
                            <img src={u.picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold text-lg">
                              {u.name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.name || "Unknown"}</span>
                            <Badge variant="outline" className="text-xs">
                              {u.role}
                            </Badge>
                            {userFees.firearmsCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Crosshair className="w-3 h-3 mr-1" />
                                {userFees.firearmsCount} firearm{userFees.firearmsCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {u.email}
                            </span>
                            {profile?.region && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {profile.region}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Annual Fees */}
                        <div className="text-right border-r pr-4">
                          <div className="text-sm font-semibold text-green-600">
                            ${userFees.total.toFixed(0)}/yr
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Annual Fees
                          </div>
                        </div>
                        {profile && (
                          <>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {profile.license_type || "N/A"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Expires: {formatDate(profile.license_expiry)}
                              </div>
                            </div>
                            <Badge className={statusColors[licenseStatus]}>
                              {licenseStatus}
                            </Badge>
                          </>
                        )}
                        {!profile && (
                          <Badge variant="outline" className="text-muted-foreground">
                            No License
                          </Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setUserProfile(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
                {selectedUser?.picture ? (
                  <img src={selectedUser.picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-lg">
                    {selectedUser?.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div>
                <div>{selectedUser?.name || "Unknown User"}</div>
                <div className="text-sm font-normal text-muted-foreground">{selectedUser?.email}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {loadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="profile" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="license">License</TabsTrigger>
                <TabsTrigger value="firearms">Firearms</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">User ID</div>
                    <div className="font-mono text-sm">{selectedUser?.user_id}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Role</div>
                    <div className="font-medium capitalize">{selectedUser?.role}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Registered</div>
                    <div className="font-medium">{formatDate(selectedUser?.created_at)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Last Login</div>
                    <div className="font-medium">{formatDate(selectedUser?.last_login) || "N/A"}</div>
                  </div>
                </div>
                
                {userProfile && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Contact Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="ml-2">{userProfile.phone || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Address:</span>
                        <span className="ml-2">{userProfile.address || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Region:</span>
                        <span className="ml-2">{userProfile.region || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">State:</span>
                        <span className="ml-2">{userProfile.state || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="license" className="space-y-4 mt-4">
                {userProfile ? (
                  <>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">License Status</div>
                        <Badge className={`mt-1 ${statusColors[getLicenseStatus(userProfile)]}`}>
                          {getLicenseStatus(userProfile)}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Compliance Score</div>
                        <div className="text-2xl font-bold">{userProfile.compliance_score || "N/A"}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">License Type</div>
                        <div className="font-semibold capitalize">{userProfile.license_type || "N/A"}</div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">License Number</div>
                        <div className="font-mono">{userProfile.license_number || "N/A"}</div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">Issue Date</div>
                        <div className="font-medium">{formatDate(userProfile.license_issued)}</div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">Expiry Date</div>
                        <div className="font-medium">{formatDate(userProfile.license_expiry)}</div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">Training & Certifications</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Training Hours:</span>
                          <span className="ml-2 font-medium">{userProfile.training_hours || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Certifications:</span>
                          <span className="ml-2 font-medium">{userProfile.certifications?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No license information available for this user.</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Firearms Tab */}
              <TabsContent value="firearms" className="mt-4">
                {(() => {
                  const userFirearms = selectedUser ? firearmsRegistry.filter(f => f.user_id === selectedUser.user_id) : [];
                  return userFirearms.length > 0 ? (
                    <div className="space-y-3">
                      {userFirearms.map((firearm) => (
                        <div key={firearm.firearm_id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Crosshair className="w-5 h-5 text-orange-600" />
                              <span className="font-semibold">{firearm.make} {firearm.model}</span>
                            </div>
                            <Badge variant={firearm.status === 'active' ? 'default' : 'secondary'}>
                              {firearm.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Serial:</span>
                              <span className="ml-2 font-mono">{firearm.serial_number}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <span className="ml-2 capitalize">{firearm.firearm_type}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Caliber:</span>
                              <span className="ml-2">{firearm.caliber}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Registered:</span>
                              <span className="ml-2">{formatDate(firearm.registration_date)}</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t flex items-center justify-between">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Annual Fee:</span>
                              <span className="ml-2 font-semibold text-green-600">${firearm.annual_fee || 50}/yr</span>
                            </div>
                            <Badge variant={firearm.fee_status === 'paid' ? 'default' : firearm.fee_status === 'overdue' ? 'destructive' : 'secondary'}>
                              {firearm.fee_status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Crosshair className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No firearms registered for this user.</p>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* Fees Tab */}
              <TabsContent value="fees" className="mt-4">
                {(() => {
                  const fees = selectedUser ? getUserTotalFees(selectedUser.user_id) : { licenseFee: 150, firearmsFee: 0, total: 150, firearmsCount: 0 };
                  const profile = selectedUser ? getUserProfile(selectedUser.user_id) : null;
                  return (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">${fees.licenseFee}</div>
                          <div className="text-xs text-muted-foreground">License Fee/yr</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">${fees.firearmsFee}</div>
                          <div className="text-xs text-muted-foreground">Firearms Fee/yr</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">${fees.total}</div>
                          <div className="text-xs text-muted-foreground">Total Annual</div>
                        </div>
                      </div>

                      {/* Fee Breakdown */}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Annual Fee Breakdown
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b">
                            <div>
                              <div className="font-medium">Member License Fee</div>
                              <div className="text-xs text-muted-foreground">Annual fee to hold a firearm license</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${fees.licenseFee}/yr</div>
                              <Badge variant={profile?.fee_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                                {profile?.fee_status || 'pending'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <div>
                              <div className="font-medium">Firearm Registration Fees</div>
                              <div className="text-xs text-muted-foreground">{fees.firearmsCount} firearm(s) × $50/yr each</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${fees.firearmsFee}/yr</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-2 font-semibold text-lg">
                            <div>Total Annual Fees</div>
                            <div className="text-green-600">${fees.total}/yr</div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Status */}
                      {profile?.fee_paid_until && (
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>License fees paid until: <strong>{formatDate(profile.fee_paid_until)}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => navigate(`/government/reviews?user=${selectedUser?.user_id}`)}>
              <FileText className="w-4 h-4 mr-2" />
              View Reviews
            </Button>
            <Button variant="outline" onClick={() => { setSelectedUser(null); setUserProfile(null); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FirearmOwners;
